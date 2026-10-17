import cors from "cors"
import express from "express"

import { errorHandler, notFound } from "./middleware/errorHandler.js"
import { createApiRouter } from "./routes/index.js"

function allowedOrigins() {
  return (process.env.CLIENT_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function createApp(deps = {}) {
  const app = express()
  app.disable("x-powered-by")
  const origins = allowedOrigins()
  app.use(
    cors({
      origin: origins.length > 0 ? origins : true,
    })
  )
  app.use(express.json({ limit: "1mb" }))
  app.get("/health", (req, res) => {
    res.json({ ok: true })
  })
  app.use("/api", createApiRouter(deps))
  app.use(notFound)
  app.use(errorHandler)
  return app
}
