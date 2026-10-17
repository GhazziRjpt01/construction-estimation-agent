import { deriveGeometry } from "../estimators/geometry.js"
import { createOpenAI } from "../agent/openai.js"
import { runTurn, safeClientReason } from "../agent/run.js"
import { HttpError } from "../httpError.js"
import { asyncRoute } from "../middleware/errorHandler.js"
import { chatSchema, validate } from "./schemas.js"

let sharedOpenAI

function openAIClient() {
  sharedOpenAI ??= createOpenAI()
  return sharedOpenAI
}

function publishedInputs(session) {
  if (!session.estimate || !session.inputs?.footprintSqft) {
    return session.inputs
  }
  const geometry = deriveGeometry(session.inputs)
  return {
    zip: session.inputs.zip,
    region: geometry.region,
    footprintSqft: geometry.footprintSqft,
    stories: geometry.stories,
    foundation: geometry.foundation,
    roofPitch: geometry.roofPitch,
    garage: geometry.garageSqft,
    bedrooms: geometry.bedrooms,
    bathrooms: geometry.bathrooms,
    finishGrade: geometry.finishGrade,
    hvacType: geometry.hvacType,
  }
}

function send(res, event, data) {
  if (res.writableEnded || res.destroyed) {
    return
  }
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export function registerChatRoutes(router, api) {
  router.post(
    "/chat",
    validate(chatSchema, "body"),
    asyncRoute(async (req, res) => {
      const { sessionId, message, fileIds = [] } = req.validated.body
      const session = sessionId
        ? api.sessions.get(sessionId)
        : api.sessions.create()
      if (!session) {
        throw new HttpError(404, `No session ${sessionId}`)
      }
      const known = session.uploads ?? {}
      const missing = fileIds.filter((fileId) => !known[fileId])
      if (missing.length > 0) {
        throw new HttpError(400, "That attachment is not on this session.")
      }
      const spoken = message || "Attached floor plan."
      const turnMessage =
        fileIds.length > 0
          ? `${spoken}\n\nAttached floor plan file ids: ${fileIds.join(", ")}. Do not infer measurements from these ids.`
          : spoken

      let openai
      try {
        openai = api.openai ?? openAIClient()
      } catch (err) {
        throw new HttpError(500, err.message)
      }

      res.status(200)
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
      res.setHeader("Cache-Control", "no-cache, no-transform")
      res.setHeader("Connection", "keep-alive")
      res.setHeader("X-Accel-Buffering", "no")
      res.flushHeaders?.()
      send(res, "session", { sessionId: session.id })

      try {
        const outcome = await runTurn({
          openai,
          model: api.model,
          session,
          message: turnMessage,
          loadCatalog: api.loadCatalog,
          loadRates: api.loadRates,
          onDelta: (text) => send(res, "delta", { text }),
          onTool: (name) => send(res, "tool", { name }),
          isClosed: () => res.destroyed,
        })
        send(res, "done", {
          sessionId: session.id,
          text: outcome.text,
          estimate: session.estimate,
          inputs: publishedInputs(session),
        })
      } catch (err) {
        console.error(err)
        send(res, "error", { error: safeClientReason(err) })
      }

      res.end()
    })
  )
}
