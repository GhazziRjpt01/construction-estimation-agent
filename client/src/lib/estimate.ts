export const DISCLAIMER =
  "Budget estimate only. Not a bid or structural design."

export const NOT_INCLUDED = [
  "Permits and fees",
  "Cabinets and countertops",
  "Appliances",
  "Garage",
  "Landscaping",
]

export type MaterialLine = {
  code: string
  name: string
  quantity: number
  unit: string
  cost: number
  category?: string | null
  displayQuantity?: number
  displayUnit?: string
}

export type Division = {
  code: string
  name: string
  materials: MaterialLine[]
  materialCost: number
  laborHours: number
  laborCost: number
}

export type Estimate = {
  assumptions: string[]
  disclaimer: string
  currency?: string
  unitSystem?: string
  notIncluded?: string[]
  divisions: Division[]
  materials: MaterialLine[]
  totals: {
    direct: number
    total: number
    low: number
    high: number
    perSqft: number
    overheadProfit?: number
    contingency?: number
    overheadAndContingency?: number
    scopeLabel?: string
  }
}

export type SavedEstimate = {
  id: string
  projectId: string
  name: string | null
  inputs: HouseInputs | null
  result: Estimate
  createdAt: string
}

export type HouseInputs = {
  zip?: string
  region?: string
  footprintSqft?: number
  stories?: number
  foundation?: "slab" | "crawlspace" | "basement"
  roofPitch?: number | string
  garage?: number | boolean
  bedrooms?: number
  bathrooms?: number
  finishGrade?: "economy" | "standard" | "premium"
  hvacType?: string
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value)
}

export function shownQuantity(item: MaterialLine) {
  return item.displayQuantity ?? item.quantity
}

export function shownUnit(item: MaterialLine) {
  return item.displayUnit ?? item.unit
}

export function assumptionLines(estimate: Estimate) {
  return estimate.assumptions.filter(
    (line) => line && line !== estimate.disclaimer && line !== DISCLAIMER
  )
}

export function divisionCost(division: Division) {
  return division.materialCost + division.laborCost
}
