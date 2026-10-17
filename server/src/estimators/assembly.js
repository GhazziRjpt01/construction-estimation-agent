import { roundQuantity } from "./units.js"

export function priceAssembly(assembly, quantity, prices, laborRates) {
  if (!assembly) {
    throw new Error("Missing assembly")
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error(`Quantity for "${assembly.code}" must be zero or greater`)
  }

  const lines = []
  let materialCost = 0
  let laborHours = 0
  let laborCost = 0

  for (const item of assembly.items) {
    const lineQuantity = roundQuantity(quantity * item.quantityPerUnit, item.unit)
    if (item.kind === "material") {
      const price = prices?.[item.code]
      if (!price) {
        throw new Error(`Missing price for "${item.code}"`)
      }
      const cost = lineQuantity * price.unitCost
      materialCost += cost
      lines.push({
        kind: "material",
        code: item.code,
        name: price.name,
        quantity: lineQuantity,
        unit: item.unit,
        unitCost: price.unitCost,
        cost,
        csiDivision: price.csiDivision || price.csi_division || null,
        category: price.category ?? null,
        placeholder: price.placeholder === true,
      })
    } else {
      const rate = laborRates?.[item.trade]
      if (!rate) {
        throw new Error(`Missing labor rate for "${item.trade}"`)
      }
      const cost = lineQuantity * rate.hourlyRate
      laborHours += lineQuantity
      laborCost += cost
      lines.push({
        kind: "labor",
        trade: item.trade,
        quantity: lineQuantity,
        unit: item.unit,
        hourlyRate: rate.hourlyRate,
        cost,
        placeholder: rate.placeholder === true,
      })
    }
  }

  return { lines, materialCost, laborHours, laborCost }
}
