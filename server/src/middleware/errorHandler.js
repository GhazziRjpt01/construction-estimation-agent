import { ZodError } from "zod"

import { HttpError } from "../httpError.js"

export function notFound(req, res) {
  res.status(404).json({ error: `No route ${req.method} ${req.path}` })
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Invalid request",
      issues: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    })
    return
  }

  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON" })
    return
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  console.error(err)
  res.status(500).json({ error: "Internal server error" })
}

export function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}
