import { HttpError } from "../httpError.js"
import { asyncRoute } from "../middleware/errorHandler.js"
import { ratesQuerySchema, validate } from "./schemas.js"

export function registerRatesRoutes(router, deps) {
  router.get(
    "/rates",
    validate(ratesQuerySchema, "query"),
    asyncRoute(async (req, res) => {
      const region = req.validated.query.region ?? "US-default"
      try {
        const rates = await deps.loadRates(region)
        res.json(rates)
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("No region")) {
          throw new HttpError(404, err.message)
        }
        throw err
      }
    })
  )
}
