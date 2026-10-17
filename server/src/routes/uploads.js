import multer from "multer"
import { z } from "zod"

import { HttpError } from "../httpError.js"
import { asyncRoute } from "../middleware/errorHandler.js"
import { sniffPlanType } from "../uploads/sniff.js"

const MAX_BYTES = 10 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
})

function receiveFile(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) {
      next()
      return
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      next(new HttpError(413, "Each file must be 10 MB or smaller."))
      return
    }
    next(new HttpError(400, "Could not read that file."))
  })
}

export function registerUploadRoutes(router, api) {
  router.post(
    "/uploads",
    receiveFile,
    asyncRoute(async (req, res) => {
      const file = req.file
      if (!file) {
        throw new HttpError(400, "Choose a PNG, JPG, or PDF.")
      }

      const contentType = sniffPlanType(file.buffer)
      if (!contentType) {
        throw new HttpError(
          415,
          "Use a PNG, JPG, or PDF. Other file types are not accepted."
        )
      }

      const rawSession =
        typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : ""
      if (rawSession && !z.string().uuid().safeParse(rawSession).success) {
        throw new HttpError(400, "That session id is not valid.")
      }

      const session = rawSession
        ? api.sessions.get(rawSession)
        : api.sessions.create()
      if (!session) {
        throw new HttpError(404, `No session ${rawSession}`)
      }

      const saved = await api.savePlan({
        sessionId: session.id,
        bytes: file.buffer,
        contentType,
        originalName: file.originalname,
      })

      session.uploads ??= {}
      session.uploads[saved.fileId] = {
        path: saved.path,
        contentType,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      }

      res.status(201).json({ fileId: saved.fileId, sessionId: session.id })
    })
  )
}
