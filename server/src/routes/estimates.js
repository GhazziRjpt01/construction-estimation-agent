import { HttpError } from "../httpError.js"
import { asyncRoute } from "../middleware/errorHandler.js"
import { idParamSchema, validate } from "./schemas.js"

export function registerEstimateReadRoutes(router, deps) {
  router.get(
    "/estimates/:id",
    validate(idParamSchema, "params"),
    asyncRoute(async (req, res) => {
      const { id } = req.validated.params
      const saved = await deps.getEstimate(id)
      if (!saved) {
        throw new HttpError(404, `No estimate ${id}`)
      }
      res.json(saved)
    })
  )
}
