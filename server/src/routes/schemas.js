import { z } from "zod"

export const houseInputSchema = z
  .object({
    zip: z.string().trim().min(1).max(16).optional(),
    region: z.string().trim().min(1).optional(),
    footprintSqft: z.number().positive(),
    stories: z.number().positive().optional(),
    foundation: z.enum(["slab", "crawlspace", "basement"]).optional(),
    roofPitch: z
      .union([
        z.number().nonnegative(),
        z.string().regex(/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/),
      ])
      .optional(),
    garage: z.union([z.boolean(), z.number().nonnegative()]).optional(),
    bedrooms: z.number().positive().optional(),
    bathrooms: z.number().positive().optional(),
    finishGrade: z.enum(["economy", "standard", "premium"]).optional(),
    hvacType: z.string().trim().min(1).optional(),
  })
  .strict()

export const idParamSchema = z.object({
  id: z.string().uuid(),
})

export const exportQuerySchema = z
  .object({
    format: z.enum(["xlsx", "pdf"]),
  })
  .strict()

export const chatSchema = z
  .object({
    sessionId: z.string().uuid().optional(),
    message: z.string().trim().max(8000).optional().default(""),
    fileIds: z.array(z.string().uuid()).max(3).optional(),
  })
  .strict()
  .refine((value) => value.message.length > 0 || (value.fileIds?.length ?? 0) > 0, {
    message: "Send a message or attach a floor plan.",
  })

export const ratesQuerySchema = z
  .object({
    region: z.string().trim().min(1).optional(),
  })
  .strict()

export function validate(schema, source) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source])
    if (!parsed.success) {
      next(parsed.error)
      return
    }
    req.validated = { ...req.validated, [source]: parsed.data }
    next()
  }
}
