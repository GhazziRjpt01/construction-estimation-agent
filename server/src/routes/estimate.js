import { estimateHouse } from "../estimators/estimateHouse.js"
import { HttpError, asEstimateError } from "../httpError.js"
import { asyncRoute } from "../middleware/errorHandler.js"
import { estimateToPdf, estimateToXlsx } from "./exportFiles.js"
import {
  exportQuerySchema,
  houseInputSchema,
  idParamSchema,
  validate,
} from "./schemas.js"

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

function projectName(inputs) {
  const stories = inputs.stories ?? 1
  const place = inputs.zip ?? inputs.region ?? "US-default"
  return `${inputs.footprintSqft} sqft, ${stories} stories, ${place}`
}

export function registerEstimateRoutes(router, deps) {
  router.post(
    "/estimate",
    validate(houseInputSchema, "body"),
    asyncRoute(async (req, res) => {
      const inputs = req.validated.body
      const region = inputs.region ?? "US-default"
      let result
      try {
        const catalog = await deps.loadCatalog(region)
        result = estimateHouse(inputs, catalog)
      } catch (err) {
        throw asEstimateError(err)
      }

      const saved = await deps.saveEstimate({
        name: projectName(inputs),
        inputs,
        result,
      })

      res.status(201).json({
        id: saved.id,
        projectId: saved.projectId,
        ...result,
      })
    })
  )

  router.post(
    "/estimate/:id/export",
    validate(idParamSchema, "params"),
    validate(exportQuerySchema, "query"),
    asyncRoute(async (req, res) => {
      const { id } = req.validated.params
      const saved = await deps.getEstimate(id)
      if (!saved?.result) {
        throw new HttpError(404, `No estimate ${id}`)
      }

      const format = req.validated.query.format
      const file =
        format === "xlsx"
          ? await estimateToXlsx(saved)
          : await estimateToPdf(saved)
      res.setHeader("Content-Type", format === "xlsx" ? XLSX_TYPE : "application/pdf")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="estimate-${id}.${format}"`
      )
      res.send(Buffer.from(file))
    })
  )
}
