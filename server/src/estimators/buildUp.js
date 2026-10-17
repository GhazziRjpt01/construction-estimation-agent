import { applyAllowances } from "./allowances.js"

export const DEFAULT_SALES_TAX_RATE = 0
export const DEFAULT_LABOR_BURDEN_RATE = 0
export const ESTIMATE_RANGE = 0.15

export function buildUp({
  materialCost,
  laborCost,
  salesTaxRate = DEFAULT_SALES_TAX_RATE,
  laborBurdenRate = DEFAULT_LABOR_BURDEN_RATE,
  overheadProfitRate,
  contingencyRate,
  materialFactor,
  laborFactor,
  range = ESTIMATE_RANGE,
}) {
  for (const [label, value] of [
    ["materialCost", materialCost],
    ["laborCost", laborCost],
    ["salesTaxRate", salesTaxRate],
    ["laborBurdenRate", laborBurdenRate],
    ["overheadProfitRate", overheadProfitRate],
    ["contingencyRate", contingencyRate],
    ["materialFactor", materialFactor],
    ["laborFactor", laborFactor],
    ["range", range],
  ]) {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be a finite number`)
    }
  }

  const material = materialCost * materialFactor
  const labor = laborCost * laborFactor
  const direct = material + labor
  const salesTax = material * salesTaxRate
  const laborBurden = labor * laborBurdenRate
  const allowances = applyAllowances(direct + salesTax + laborBurden, {
    defaultOverheadProfit: overheadProfitRate,
    defaultContingency: contingencyRate,
  })
  const total = allowances.total

  return {
    material,
    labor,
    direct,
    salesTax,
    laborBurden,
    overheadProfit: allowances.overheadProfit,
    contingency: allowances.contingency,
    total,
    low: total * (1 - range),
    high: total * (1 + range),
  }
}
