import { describe, expect, it } from "vitest"

import { priceAssembly } from "./assembly.js"

const slab = {
  code: "slab-foundation",
  items: [
    { kind: "material", code: "concrete-yd3", quantityPerUnit: 0.1234, unit: "m3" },
    { kind: "labor", trade: "concrete", quantityPerUnit: 0.5382, unit: "hr" },
  ],
}

describe("priceAssembly", () => {
  it("prices material and labor from the catalog", () => {
    const priced = priceAssembly(slab, 10, {
      "concrete-yd3": { name: "Concrete", unitCost: 196.1926 },
    }, {
      concrete: { hourlyRate: 70 },
    })

    expect(priced.lines[0].quantity).toBe(1.23)
    expect(priced.materialCost).toBeCloseTo(1.23 * 196.1926)
    expect(priced.laborHours).toBeCloseTo(5.382)
    expect(priced.laborCost).toBeCloseTo(5.382 * 70)
  })

  it("throws a clear error when a price is missing", () => {
    expect(() => priceAssembly(slab, 10, {}, { concrete: { hourlyRate: 70 } })).toThrow(
      'Missing price for "concrete-yd3"'
    )
  })
})
