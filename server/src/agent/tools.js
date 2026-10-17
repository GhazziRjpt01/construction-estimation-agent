import { z } from "zod"

import { estimateHouse } from "../estimators/estimateHouse.js"

const REQUIRED = [
  ["zip", "ZIP"],
  ["footprintSqft", "footprint"],
  ["stories", "stories"],
]

const houseFields = {
  zip: z.string().trim().min(1).max(16).optional(),
  region: z.string().trim().min(1).optional(),
  footprintSqft: z.number().positive().optional(),
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
}

const houseSchema = z.object(houseFields)

const extractSchema = houseSchema
const estimateSchema = z.object({
  inputs: houseSchema.optional(),
})
const compareSchema = z.object({
  baseInputs: houseSchema.optional(),
  changes: houseSchema.optional(),
})
const ratesSchema = z.object({
  region: z.string().trim().min(1).optional(),
})

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "extract_house_inputs",
      description:
        "Store house inputs from the user. Returns the stored inputs and any missing required fields: ZIP, footprint, stories. Does not calculate cost.",
      parameters: {
        type: "object",
        properties: houseProperties(),
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_estimate",
      description:
        "Run the house estimate from stored inputs. Call this only after ZIP, footprint, and stories are present. Returns the estimate, including assumptions, totals, and the disclaimer. Do not calculate the numbers yourself.",
      parameters: {
        type: "object",
        properties: {
          inputs: {
            type: "object",
            properties: houseProperties(),
            additionalProperties: false,
            description: "Optional inputs to store before estimating.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_scenarios",
      description:
        "Estimate a base house and a changed house. Returns both estimates and a diff computed by the server. Do not calculate the difference yourself.",
      parameters: {
        type: "object",
        properties: {
          baseInputs: {
            type: "object",
            properties: houseProperties(),
            additionalProperties: false,
          },
          changes: {
            type: "object",
            properties: houseProperties(),
            additionalProperties: false,
            description: "Fields that change from the base.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_rates",
      description:
        "Read material prices and labor rates for a region. Does not calculate a house total.",
      parameters: {
        type: "object",
        properties: {
          region: {
            type: "string",
            description: "Region id. Defaults to US-default.",
          },
        },
        additionalProperties: false,
      },
    },
  },
]

export function missingRequired(inputs) {
  return REQUIRED.filter(([key]) => {
    const value = inputs?.[key]
    return value === undefined || value === null || value === ""
  }).map(([, label]) => label)
}

export function diffEstimates(base, scenario) {
  return {
    totals: diffTotals(base.totals, scenario.totals),
    divisions: scenario.divisions.map((division) => {
      const other = base.divisions.find((item) => item.code === division.code)
      return {
        code: division.code,
        name: division.name,
        materialCost: diffValue(other?.materialCost ?? 0, division.materialCost),
        laborHours: diffValue(other?.laborHours ?? 0, division.laborHours),
        laborCost: diffValue(other?.laborCost ?? 0, division.laborCost),
      }
    }),
  }
}

export async function executeTool(name, rawArguments, ctx) {
  let args
  try {
    args = rawArguments ? JSON.parse(rawArguments) : {}
  } catch {
    return { error: "Tool arguments were not valid JSON" }
  }

  try {
    if (name === "extract_house_inputs") {
      return extractHouseInputs(args, ctx)
    }
    if (name === "run_estimate") {
      return runEstimate(args, ctx)
    }
    if (name === "compare_scenarios") {
      return compareScenarios(args, ctx)
    }
    if (name === "get_rates") {
      return getRates(args, ctx)
    }
    return { error: `Unknown tool ${name}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tool failed" }
  }
}

function extractHouseInputs(args, ctx) {
  const parsed = extractSchema.safeParse(withoutNulls(args))
  if (!parsed.success) {
    return invalid(parsed.error)
  }
  ctx.session.inputs = { ...ctx.session.inputs, ...defined(parsed.data) }
  return {
    inputs: ctx.session.inputs,
    missing: missingRequired(ctx.session.inputs),
  }
}

async function runEstimate(args, ctx) {
  const parsed = estimateSchema.safeParse(withoutNulls(args))
  if (!parsed.success) {
    return invalid(parsed.error)
  }
  if (parsed.data.inputs) {
    const stored = extractHouseInputs(parsed.data.inputs, ctx)
    if (stored.error) {
      return stored
    }
  }
  const missing = missingRequired(ctx.session.inputs)
  if (missing.length > 0) {
    return { inputs: ctx.session.inputs, missing }
  }
  const estimate = estimateHouse(
    ctx.session.inputs,
    await ctx.loadCatalog(ctx.session.inputs.region ?? "US-default")
  )
  ctx.session.estimate = estimate
  return estimate
}

async function compareScenarios(args, ctx) {
  const parsed = compareSchema.safeParse(withoutNulls(args))
  if (!parsed.success) {
    return invalid(parsed.error)
  }

  const baseInputs = {
    ...ctx.session.inputs,
    ...defined(parsed.data.baseInputs ?? {}),
  }
  const scenarioInputs = {
    ...baseInputs,
    ...defined(parsed.data.changes ?? {}),
  }
  const missing = [
    ...new Set([
      ...missingRequired(baseInputs),
      ...missingRequired(scenarioInputs),
    ]),
  ]
  if (missing.length > 0) {
    return { missing }
  }

  const base = estimateHouse(
    baseInputs,
    await ctx.loadCatalog(baseInputs.region ?? "US-default")
  )
  const scenario = estimateHouse(
    scenarioInputs,
    await ctx.loadCatalog(scenarioInputs.region ?? "US-default")
  )
  ctx.session.estimate = scenario
  return {
    base,
    scenario,
    diff: diffEstimates(base, scenario),
  }
}

async function getRates(args, ctx) {
  const parsed = ratesSchema.safeParse(withoutNulls(args))
  if (!parsed.success) {
    return invalid(parsed.error)
  }
  const region =
    parsed.data.region ?? ctx.session.inputs.region ?? "US-default"
  return ctx.loadRates(region)
}

function houseProperties() {
  return {
    zip: { type: "string", description: "ZIP or postal code." },
    region: { type: "string", description: "Catalog region id. Defaults to US-default." },
    footprintSqft: {
      type: "number",
      description: "Footprint in square feet, not the total floor area.",
    },
    stories: { type: "number", description: "Number of stories." },
    foundation: { type: "string", enum: ["slab", "crawlspace", "basement"] },
    roofPitch: {
      description: "Rise/run as a number, or a string such as 6/12.",
    },
    garage: {
      description: "False or 0 for none, true for the default garage, or square feet.",
    },
    bedrooms: { type: "number" },
    bathrooms: { type: "number" },
    finishGrade: { type: "string", enum: ["economy", "standard", "premium"] },
    hvacType: { type: "string" },
  }
}

function withoutNulls(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  const entries = []
  for (const [key, item] of Object.entries(value)) {
    if (item === null) {
      continue
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      entries.push([key, withoutNulls(item)])
    } else {
      entries.push([key, item])
    }
  }
  return Object.fromEntries(entries)
}

function defined(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  )
}

function invalid(error) {
  return {
    error: "Invalid house inputs",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  }
}

function diffTotals(base, scenario) {
  const totals = {}
  for (const key of ["direct", "total", "low", "high", "perSqft"]) {
    totals[key] = diffValue(base[key], scenario[key])
  }
  return totals
}

function diffValue(base, scenario) {
  return {
    base,
    scenario,
    delta: scenario - base,
  }
}
