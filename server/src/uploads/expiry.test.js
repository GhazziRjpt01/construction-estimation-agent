import { describe, expect, it } from "vitest"

import { collectExpiredPaths, pathsOlderThan, PLAN_TTL_MS } from "./expiry.js"

const now = Date.parse("2026-10-14T00:00:00.000Z")

describe("plan expiry", () => {
  it("keeps files that are newer than 7 days", () => {
    const recent = new Date(now - PLAN_TTL_MS + 1000).toISOString()
    expect(
      pathsOlderThan([{ path: "session/new.png", createdAt: recent }], now)
    ).toEqual([])
  })

  it("collects files older than 7 days from session folders", async () => {
    const old = new Date(now - PLAN_TTL_MS - 1000).toISOString()
    const recent = new Date(now - 1000).toISOString()
    const storage = {
      async list(prefix) {
        if (prefix === "") {
          return {
            data: [{ name: "session-a", id: null }],
            error: null,
          }
        }
        return {
          data: [
            { name: "old.png", id: "1", created_at: old },
            { name: "new.jpg", id: "2", created_at: recent },
          ],
          error: null,
        }
      },
    }

    expect(await collectExpiredPaths(storage, now)).toEqual([
      "session-a/old.png",
    ])
  })
})
