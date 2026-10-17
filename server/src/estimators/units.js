// Physical conversions for the two unit systems. A new region chooses
// imperial or metric in the database. It does not need a code change.
// Dimensional quantities are stored as m, m2, m3, or L.

const METRE = 0.3048
const LITRE_PER_GALLON = 3.785411784
const FT2_PER_M2 = 1 / METRE ** 2
const YD3_PER_M3 = 1 / 0.9144 ** 3

const IMPERIAL_PER_SI = {
  m: { unit: "LF", factor: 1 / METRE },
  m2: { unit: "ft2", factor: FT2_PER_M2 },
  m3: { unit: "yd3", factor: YD3_PER_M3 },
  L: { unit: "gallons", factor: 1 / LITRE_PER_GALLON },
}

const DISCRETE_UNITS = new Set([
  "ea",
  "sheet",
  "batt",
  "truss",
  "stud",
  "outlet",
  "anchor bolt",
  "anchor bolts",
])

const CONTINUOUS_UNITS = new Set(["m", "m2", "m3", "l"])

const UNIT_SYSTEMS = new Set(["imperial", "metric"])

function assertSystem(unitSystem) {
  if (!UNIT_SYSTEMS.has(unitSystem)) {
    throw new Error(`Unknown unit system ${unitSystem}`)
  }
}

function assertQuantity(value) {
  if (!Number.isFinite(value)) {
    throw new Error("Quantity must be a finite number")
  }
}

export function roundQuantity(quantity, unit) {
  assertQuantity(quantity)
  const normalized = String(unit ?? "")
    .trim()
    .toLowerCase()
  if (DISCRETE_UNITS.has(normalized)) {
    const scaled = Math.round(quantity * 1e9) / 1e9
    return Math.ceil(scaled - 1e-9)
  }
  if (CONTINUOUS_UNITS.has(normalized)) {
    return Math.round(quantity * 100) / 100
  }
  return quantity
}

function isRoofing(context) {
  const category = String(context?.category ?? "").toLowerCase()
  const code = String(context?.code ?? "").toLowerCase()
  const name = String(context?.name ?? "").toLowerCase()
  return (
    category === "roofing" || code.includes("shingle") || name.includes("shingle")
  )
}

export function toDisplayQuantity(siValue, siUnit, unitSystem, context) {
  assertQuantity(siValue)
  assertSystem(unitSystem)

  if (unitSystem === "imperial" && siUnit === "m2" && isRoofing(context)) {
    return { value: (siValue * FT2_PER_M2) / 100, unit: "squares" }
  }

  const imperial = IMPERIAL_PER_SI[siUnit]
  if (!imperial || unitSystem === "metric") {
    if (!imperial && unitSystem === "imperial" && !isCountUnit(siUnit)) {
      throw new Error(`Unknown unit ${siUnit}`)
    }
    return { value: siValue, unit: siUnit }
  }

  return {
    value: siValue * imperial.factor,
    unit: imperial.unit,
  }
}

export function toSiQuantity(displayValue, siUnit, unitSystem) {
  assertQuantity(displayValue)
  assertSystem(unitSystem)

  const displayed = toDisplayQuantity(1, siUnit, unitSystem)
  if (displayed.unit === siUnit) {
    return displayValue
  }

  return displayValue / displayed.value
}

function isCountUnit(unit) {
  return !["m", "m2", "m3", "L"].includes(unit) && unit !== undefined && unit !== ""
}

export function displayQuantity(siValue, siUnit, region, context) {
  return toDisplayQuantity(siValue, siUnit, region.unitSystem, context)
}
