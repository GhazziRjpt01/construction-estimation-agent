import { randomUUID } from "node:crypto"

export function createSessionStore() {
  const sessions = new Map()

  return {
    create() {
      const session = {
        id: randomUUID(),
        messages: [],
        inputs: {},
        estimate: null,
      }
      sessions.set(session.id, session)
      return session
    },

    get(id) {
      return sessions.get(id) ?? null
    },
  }
}
