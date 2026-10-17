import { describe, expect, it } from "vitest"

import { buildUp } from "./buildUp.js"

describe("buildUp", () => {
  it("applies location, tax, burden, overhead, and contingency", () => {
    const built = buildUp({
      materialCost: 1000,
      laborCost: 400,
      salesTaxRate: 0.08,
      laborBurdenRate: 0.3,
      overheadProfitRate: 0.2,
      contingencyRate: 0.1,
      materialFactor: 1.1,
      laborFactor: 1.2,
    })

    const material = 1100
    const labor = 480
    const direct = 1580
    const base = direct + 1100 * 0.08 + 480 * 0.3

    expect(built.direct).toBeCloseTo(direct)
    expect(built.total).toBeCloseTo(base * 1.2 * 1.1)
    expect(built.low).toBeCloseTo(built.total * 0.85)
    expect(built.high).toBeCloseTo(built.total * 1.15)
  })
})
