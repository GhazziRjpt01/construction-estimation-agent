import {
  DEFAULT_LABOR_BURDEN_RATE,
  DEFAULT_SALES_TAX_RATE,
  ESTIMATE_RANGE,
  buildUp,
} from "./buildUp.js"
import { takeoffHouse } from "./quantities.js"
import { displayQuantity } from "./units.js"

export const DISCLAIMER =
  "Budget estimate only. Not a bid or structural design."

export const PARTIAL_LABEL = "Partial estimate"

export const NOT_INCLUDED = [
  "Permits and fees",
  "Cabinets and countertops",
  "Appliances",
  "Garage",
  "Landscaping",
]

export function estimateHouse(inputs, dbData) {
  if (!dbData?.region) {
    throw new Error("Database region is required")
  }
  if (!dbData.locationFactor) {
    throw new Error("Database location factor is required")
  }
  if (
    inputs?.region != null &&
    inputs.region !== dbData.region.id
  ) {
    throw new Error(
      `Inputs region "${inputs.region}" does not match catalog region "${dbData.region.id}"`
    )
  }

  const takeoff = presentQuantities(takeoffHouse(inputs, dbData), dbData.region)
  const salesTaxRate = rateFrom(dbData, "defaultSalesTax", "salesTaxRate")
  const laborBurdenRate = rateFrom(dbData, "defaultLaborBurden", "laborBurdenRate")
  const salesTaxUsed = salesTaxRate ?? DEFAULT_SALES_TAX_RATE
  const laborBurdenUsed = laborBurdenRate ?? DEFAULT_LABOR_BURDEN_RATE
  const overheadProfitRate = dbData.region.defaultOverheadProfit
  const contingencyRate = dbData.region.defaultContingency
  const built = buildUp({
    materialCost: sum(takeoff.divisions, "materialCost"),
    laborCost: sum(takeoff.divisions, "laborCost"),
    salesTaxRate: salesTaxUsed,
    laborBurdenRate: laborBurdenUsed,
    overheadProfitRate,
    contingencyRate,
    materialFactor: dbData.locationFactor.materialFactor,
    laborFactor: dbData.locationFactor.laborFactor,
  })

  const assumptions = [...takeoff.assumptions]
  if (salesTaxRate == null) {
    assumptions.push(
      `Warning: ${dbData.region.taxLabel} has no rate in the database and was treated as ${DEFAULT_SALES_TAX_RATE}.`
    )
  } else {
    assumptions.push(
      `Sales tax rate ${salesTaxRate} (${dbData.region.taxLabel}) from region ${dbData.region.id}.`
    )
  }
  if (laborBurdenRate == null) {
    assumptions.push(
      `Warning: labor burden has no rate in the database and was treated as ${DEFAULT_LABOR_BURDEN_RATE}.`
    )
  } else {
    assumptions.push(
      `Labor burden rate ${laborBurdenRate} from region ${dbData.region.id}.`
    )
  }
  assumptions.push(
    `Location factors ${dbData.locationFactor.materialFactor} materials and ${dbData.locationFactor.laborFactor} labor.`
  )
  assumptions.push(
    `Total = (direct + sales tax + labor burden) × (1 + ${overheadProfitRate}) × (1 + ${contingencyRate}). Overhead and profit is applied first, then contingency is applied to that result.`
  )
  assumptions.push(
    `Low/high is the total ±${ESTIMATE_RANGE * 100}%. This band is a documented estimate range, not a database rate.`
  )
  if (usesPlaceholder(dbData)) {
    assumptions.push(
      "One or more catalog numbers are marked PLACEHOLDER and must be verified."
    )
  }

  return {
    assumptions,
    disclaimer: DISCLAIMER,
    currency: dbData.region.currency,
    unitSystem: dbData.region.unitSystem,
    notIncluded: NOT_INCLUDED,
    divisions: takeoff.divisions,
    materials: takeoff.materials,
    totals: {
      direct: built.direct,
      total: built.total,
      low: built.low,
      high: built.high,
      perSqft: built.total / takeoff.geometry.floorSqft,
      overheadProfit: built.overheadProfit,
      contingency: built.contingency,
      overheadAndContingency: built.overheadProfit + built.contingency,
      scopeLabel: PARTIAL_LABEL,
    },
  }
}

function rateFrom(dbData, regionKey, catalogKey) {
  if (dbData.region[regionKey] != null) {
    return dbData.region[regionKey]
  }
  if (dbData[catalogKey] != null) {
    return dbData[catalogKey]
  }
  return null
}

function presentQuantities(takeoff, region) {
  const present = (item) => {
    const shown = displayQuantity(item.quantity, item.unit, region, item)
    return {
      ...item,
      displayQuantity: shown.value,
      displayUnit: shown.unit,
    }
  }
  return {
    ...takeoff,
    divisions: takeoff.divisions.map((division) => ({
      ...division,
      materials: division.materials.map(present),
    })),
    materials: takeoff.materials.map(present),
  }
}

function sum(divisions, key) {
  return divisions.reduce((total, division) => total + division[key], 0)
}

function usesPlaceholder(dbData) {
  const prices = Object.values(dbData.prices ?? {})
  const labor = Object.values(dbData.laborRates ?? {})
  return (
    prices.some((price) => price.placeholder) ||
    labor.some((rate) => rate.placeholder) ||
    dbData.locationFactor.placeholder === true
  )
}
