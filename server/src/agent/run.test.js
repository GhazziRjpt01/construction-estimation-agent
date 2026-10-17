import { beforeEach, describe, expect, it, vi } from "vitest"

import { runTurn, safeClientReason } from "./run.js"

vi.mock("./tools.js", async () => {
  const actual = await vi.importActual("./tools.js")
  return {
    ...actual,
    executeTool: vi.fn(),
  }
})

const { executeTool } = await import("./tools.js")

function stream(deltas) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const delta of deltas) {
        yield { choices: [{ delta }] }
      }
    },
  }
}

function toolCallStream() {
  return stream([
    {
      tool_calls: [
        {
          index: 0,
          id: "call_1",
          function: { name: "run_estimate", arguments: "" },
        },
      ],
    },
    {
      tool_calls: [{ index: 0, function: { arguments: "{}" } }],
    },
  ])
}

function historyIsValid(messages) {
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (message.role !== "assistant" || !message.tool_calls?.length) {
      continue
    }
    const pending = new Set(message.tool_calls.map((call) => call.id))
    for (
      let next = index + 1;
      next < messages.length && messages[next].role === "tool";
      next += 1
    ) {
      pending.delete(messages[next].tool_call_id)
    }
    if (pending.size > 0) {
      return false
    }
  }
  return true
}

describe("safeClientReason", () => {
  it("keeps a short estimator error and hides secrets", () => {
    expect(safeClientReason(new Error('No CSI division for "vapor-barrier"'))).toBe(
      'No CSI division for "vapor-barrier"'
    )
    expect(safeClientReason(new Error("OpenAI request failed sk-test-secret"))).toBe(
      "The assistant could not finish the reply."
    )
  })
})

describe("runTurn", () => {
  beforeEach(() => {
    executeTool.mockReset()
  })

  it("keeps a tool reply when the tool throws, so the next turn is valid", async () => {
    executeTool.mockRejectedValue(
      new Error('No CSI division for "vapor-barrier"\n    at estimateHouse')
    )
    const seen = []
    let round = 0
    const openai = {
      chat: {
        completions: {
          create: async ({ messages }) => {
            seen.push(messages)
            round += 1
            if (round === 1) {
              return toolCallStream()
            }
            return stream([{ content: "The estimate did not run." }])
          },
        },
      },
    }
    const session = { messages: [], inputs: {}, estimate: null }

    const first = await runTurn({
      openai,
      model: "test",
      session,
      message: "Estimate this house",
      loadCatalog: async () => {
        throw new Error("catalog should not load")
      },
      loadRates: async () => {
        throw new Error("rates should not load")
      },
    })

    expect(first.text).toBe("The estimate did not run.")
    expect(historyIsValid(session.messages)).toBe(true)
    const toolMessage = session.messages.find((message) => message.role === "tool")
    expect(toolMessage.tool_call_id).toBe("call_1")
    expect(JSON.parse(toolMessage.content)).toEqual({
      error: 'No CSI division for "vapor-barrier"',
    })
    expect(toolMessage.content).not.toContain("at estimateHouse")

    round = 0
    await runTurn({
      openai,
      model: "test",
      session,
      message: "Try again",
      loadCatalog: async () => ({}),
      loadRates: async () => ({}),
    })

    expect(historyIsValid(session.messages)).toBe(true)
    const nextRequest = seen.at(-1)
    expect(nextRequest.some((message) => message.role === "tool")).toBe(true)
    expect(nextRequest.map((message) => message.role)).toContain("user")
  })

  it("rolls the session back when a turn fails after a tool call", async () => {
    executeTool.mockResolvedValue({ ok: true })
    let round = 0
    const openai = {
      chat: {
        completions: {
          create: async () => {
            round += 1
            if (round === 1) {
              return toolCallStream()
            }
            throw new Error("OpenAI request failed sk-test-secret")
          },
        },
      },
    }
    const earlier = { role: "assistant", content: "Earlier reply" }
    const session = { messages: [earlier], inputs: {}, estimate: null }

    await expect(
      runTurn({
        openai,
        model: "test",
        session,
        message: "Estimate this house",
        loadCatalog: async () => ({}),
        loadRates: async () => ({}),
      })
    ).rejects.toThrow(/sk-test-secret/)

    expect(session.messages).toEqual([earlier])
  })
})
