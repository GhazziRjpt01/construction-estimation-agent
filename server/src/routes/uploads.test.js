import { randomUUID } from "node:crypto"

import request from "supertest"
import { describe, expect, it } from "vitest"

import { createSessionStore } from "../agent/sessions.js"
import { createApp } from "../app.js"

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
])

function uploadApp() {
  const sessions = createSessionStore()
  const saved = []
  const app = createApp({
    sessions,
    savePlan: async (payload) => {
      const fileId = randomUUID()
      saved.push({ ...payload, fileId })
      return { fileId, path: `${payload.sessionId}/${fileId}.png` }
    },
    loadCatalog: async () => {
      throw new Error("unused")
    },
    loadRates: async () => ({ materials: [], prices: [], laborRates: [] }),
    saveEstimate: async () => {
      throw new Error("unused")
    },
    getEstimate: async () => null,
  })
  return { app, sessions, saved }
}

describe("POST /api/uploads", () => {
  it("stores a PNG in the session folder and returns a file id", async () => {
    const { app, sessions, saved } = uploadApp()

    const response = await request(app)
      .post("/api/uploads")
      .attach("file", png, "kitchen.png")
      .expect(201)

    expect(response.body.fileId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(sessions.get(response.body.sessionId).uploads[response.body.fileId].contentType).toBe(
      "image/png"
    )
    expect(saved[0].sessionId).toBe(response.body.sessionId)
    expect(saved[0].contentType).toBe("image/png")
  })

  it("rejects a file whose bytes are not a PNG, JPG, or PDF", async () => {
    const { app } = uploadApp()
    const response = await request(app)
      .post("/api/uploads")
      .attach("file", Buffer.from("not a plan"), "notes.txt")
      .expect(415)

    expect(response.body.error).toMatch(/PNG, JPG, or PDF/)
  })

  it("rejects a file larger than 10 MB", async () => {
    const { app } = uploadApp()
    const response = await request(app)
      .post("/api/uploads")
      .attach("file", Buffer.alloc(10 * 1024 * 1024 + 1), "huge.png")
      .expect(413)

    expect(response.body.error).toBe("Each file must be 10 MB or smaller.")
  })
})
