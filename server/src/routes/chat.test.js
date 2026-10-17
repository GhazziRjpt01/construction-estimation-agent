import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../app.js"
import { applyToolDelta } from "../agent/run.js"
import { createSessionStore } from "../agent/sessions.js"
import { DISCLAIMER, estimateHouse } from "../estimators/estimateHouse.js"
import { houseCatalog } from "../estimators/houseCatalog.js"
import { SYSTEM_PROMPT } from "../agent/prompt.js"

const UNKNOWN_SESSION = "33333333-3333-4333-8333-333333333333"

function parseSse(text) {
  return text
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      let event = "message"
      const data = []
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim()
        }
        if (line.startsWith("data:")) {
          data.push(line.slice(5).trim())
        }
      }
      return { event, data: JSON.parse(data.join("\n")) }
    })
}

function scriptedOpenAI(rounds) {
  let cursor = 0
  const seen = []
  return {
    seen,
    chat: {
      completions: {
        create: async (body) => {
          const round = rounds[cursor]
          cursor += 1
          if (!round) {
            throw new Error("The scripted model ran out of replies")
          }
          seen.push(body)
          return streamOf(round)
        },
      },
    },
  }
}

async function* streamOf(round) {
  for (const chunk of round.argumentChunks ?? []) {
    yield { choices: [{ delta: { tool_calls: [chunk] } }] }
  }
  for (const [index, call] of (round.toolCalls ?? []).entries()) {
    yield {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index,
                id: call.id,
                function: {
                  name: call.name,
                  arguments: JSON.stringify(call.arguments ?? {}),
                },
              },
            ],
          },
        },
      ],
    }
  }
  if (round.content) {
    const midpoint = Math.ceil(round.content.length / 2)
    yield { choices: [{ delta: { content: round.content.slice(0, midpoint) } }] }
    yield { choices: [{ delta: { content: round.content.slice(midpoint) } }] }
  }
}

function chatApp(openai, sessions = createSessionStore()) {
  const app = createApp({
    sessions,
    openai,
    loadCatalog: async () => houseCatalog(),
    loadRates: async () => ({ materials: [], prices: [], laborRates: [] }),
    saveEstimate: async () => {
      throw new Error("chat should not save")
    },
    getEstimate: async () => null,
  })
  return { app, sessions }
}

describe("POST /api/chat", () => {
  it("streams the reply and keeps the latest estimate on the session", async () => {
    const answer = `The total is in the estimate. ${DISCLAIMER}`
    const openai = scriptedOpenAI([
      {
        argumentChunks: [
          {
            index: 0,
            id: "call_extract",
            function: {
              name: "extract_house_inputs",
              arguments: '{"zip":"97201",',
            },
          },
          {
            index: 0,
            function: { arguments: '"footprintSqft":1500}' },
          },
        ],
      },
      { content: "What is the number of stories?" },
      {
        toolCalls: [
          {
            id: "call_stories",
            name: "extract_house_inputs",
            arguments: { stories: 2 },
          },
          { id: "call_estimate", name: "run_estimate", arguments: {} },
        ],
      },
      { content: answer },
    ])
    const { app, sessions } = chatApp(openai)

    const first = await request(app)
      .post("/api/chat")
      .send({ message: "1500 square foot house in 97201" })
      .expect(200)

    expect(first.headers["content-type"]).toMatch(/text\/event-stream/)
    const firstEvents = parseSse(first.text)
    const firstDone = firstEvents.find((event) => event.event === "done")
    expect(firstDone.data.estimate).toBeNull()
    expect(firstDone.data.text).toBe("What is the number of stories?")
    expect(firstEvents.some((event) => event.event === "tool" && event.data.name === "extract_house_inputs")).toBe(true)
    expect(openai.seen[0].messages[0]).toEqual({
      role: "system",
      content: SYSTEM_PROMPT,
    })
    expect(openai.seen[0].tools.map((tool) => tool.function.name)).toEqual([
      "extract_house_inputs",
      "run_estimate",
      "compare_scenarios",
      "get_rates",
    ])

    const session = sessions.get(firstDone.data.sessionId)
    expect(session.inputs).toEqual({ zip: "97201", footprintSqft: 1500 })

    const second = await request(app)
      .post("/api/chat")
      .send({ sessionId: session.id, message: "2 stories" })
      .expect(200)
    const secondEvents = parseSse(second.text)
    const deltas = secondEvents
      .filter((event) => event.event === "delta")
      .map((event) => event.data.text)
      .join("")
    const done = secondEvents.find((event) => event.event === "done")
    const expected = estimateHouse(
      { zip: "97201", footprintSqft: 1500, stories: 2 },
      houseCatalog()
    )

    expect(deltas).toBe(answer)
    expect(done.data.text).toBe(answer)
    expect(done.data.inputs).toMatchObject({
      zip: "97201",
      footprintSqft: 1500,
      stories: 2,
      foundation: "slab",
      finishGrade: "standard",
    })
    expect(done.data.estimate.totals.total).toBeCloseTo(expected.totals.total)
    expect(done.data.estimate.disclaimer).toBe(DISCLAIMER)
    expect(session.inputs.stories).toBe(2)
    expect(session.messages.filter((message) => message.role === "user")).toHaveLength(2)
  })

  it("rejects an empty message", async () => {
    const { app } = chatApp(scriptedOpenAI([]))
    const response = await request(app).post("/api/chat").send({ message: " " }).expect(400)
    expect(response.body.error).toBe("Invalid request")
  })

  it("passes attached file ids to the model without treating them as measurements", async () => {
    const sessions = createSessionStore()
    const session = sessions.create()
    const fileId = "11111111-1111-4111-8111-111111111111"
    session.uploads = {
      [fileId]: { path: `${session.id}/${fileId}.png`, contentType: "image/png" },
    }
    const openai = scriptedOpenAI([
      { content: `Share the ZIP, footprint, and stories. ${DISCLAIMER}` },
    ])
    const { app } = chatApp(openai, sessions)

    const response = await request(app)
      .post("/api/chat")
      .send({ sessionId: session.id, message: "", fileIds: [fileId] })
      .expect(200)

    const done = parseSse(response.text).find((event) => event.event === "done")
    expect(done.data.text).toMatch(/ZIP, footprint, and stories/)
    expect(openai.seen[0].messages.at(-1).content).toContain(fileId)
    expect(openai.seen[0].messages.at(-1).content).toMatch(/Do not infer measurements/)
  })

  it("rejects a file id that was not uploaded on the session", async () => {
    const sessions = createSessionStore()
    const session = sessions.create()
    const { app } = chatApp(scriptedOpenAI([]), sessions)
    const response = await request(app)
      .post("/api/chat")
      .send({
        sessionId: session.id,
        message: "See the plan",
        fileIds: ["11111111-1111-4111-8111-111111111111"],
      })
      .expect(400)

    expect(response.body.error).toBe("That attachment is not on this session.")
  })

  it("returns 404 for an unknown session", async () => {
    const { app } = chatApp(scriptedOpenAI([]))
    const response = await request(app)
      .post("/api/chat")
      .send({ sessionId: UNKNOWN_SESSION, message: "Hello" })
      .expect(404)

    expect(response.body.error).toBe(`No session ${UNKNOWN_SESSION}`)
  })
})

describe("applyToolDelta", () => {
  it("joins tool call arguments that arrive in pieces", () => {
    const calls = []
    applyToolDelta(calls, {
      index: 0,
      id: "call_1",
      function: { name: "get_rates", arguments: "{\"region\":" },
    })
    applyToolDelta(calls, {
      index: 0,
      function: { arguments: "\"US-default\"}" },
    })

    expect(calls[0]).toEqual({
      id: "call_1",
      name: "get_rates",
      arguments: '{"region":"US-default"}',
    })
  })
})
