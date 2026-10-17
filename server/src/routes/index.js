import express from "express"

import { DEFAULT_MODEL } from "../agent/openai.js"
import { createSessionStore } from "../agent/sessions.js"
import { createDbClient } from "../db/client.js"
import { getEstimate, saveEstimate } from "../db/estimates.js"
import { loadCatalog, loadRates } from "../db/loader.js"
import { savePlanFile } from "../uploads/store.js"
import { registerChatRoutes } from "./chat.js"
import { registerUploadRoutes } from "./uploads.js"
import { registerEstimateRoutes } from "./estimate.js"
import { registerEstimateReadRoutes } from "./estimates.js"
import { registerRatesRoutes } from "./rates.js"

export function createApiRouter(deps = {}) {
  let client
  function db() {
    if (deps.client) {
      return deps.client
    }
    client ??= createDbClient()
    return client
  }

  const api = {
    loadCatalog: deps.loadCatalog ?? ((region) => loadCatalog(db(), region)),
    loadRates: deps.loadRates ?? ((region) => loadRates(db(), region)),
    saveEstimate: deps.saveEstimate ?? ((payload) => saveEstimate(db(), payload)),
    getEstimate: deps.getEstimate ?? ((id) => getEstimate(db(), id)),
    sessions: deps.sessions ?? createSessionStore(),
    savePlan:
      deps.savePlan ??
      ((payload) => savePlanFile(deps.client ?? db(), payload)),
    openai: deps.openai,
    model: deps.model || process.env.OPENAI_MODEL || DEFAULT_MODEL,
  }

  const router = express.Router()
  registerEstimateRoutes(router, api)
  registerEstimateReadRoutes(router, api)
  registerRatesRoutes(router, api)
  registerChatRoutes(router, api)
  registerUploadRoutes(router, api)
  return router
}
