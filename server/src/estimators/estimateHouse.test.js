import { describe, expect, it } from "vitest"

import { DISCLAIMER, estimateHouse } from "./estimateHouse.js"
import { houseCatalog } from "./houseCatalog.js"

const EXAMPLE = { footprintSqft: 1500, stories: 2, zip: "97201" }

describe("estimateHouse", () => {
  it("builds the 1,500 sqft, 2-story estimate from the takeoff", () => {
    const estimate = estimateHouse(EXAMPLE, houseCatalog())
    const direct =
      estimate.divisions.reduce((sum, division) => sum + division.materialCost, 0) +
      estimate.divisions.reduce((sum, division) => sum + division.laborCost, 0)

    const overhead = direct * 0.2
    const contingency = (direct + overhead) * 0.1

    expect(estimate.totals.direct).toBeCloseTo(direct)
    expect(estimate.totals.total).toBeCloseTo(direct + overhead + contingency)
    expect(estimate.totals.low).toBeCloseTo(estimate.totals.total * 0.85)
    expect(estimate.totals.high).toBeCloseTo(estimate.totals.total * 1.15)
    expect(estimate.totals.low).toBeLessThan(estimate.totals.total)
    expect(estimate.totals.high).toBeGreaterThan(estimate.totals.total)
    expect(estimate.totals.perSqft).toBeCloseTo(estimate.totals.total / 3000)
    expect(estimate.totals.overheadProfit).toBeCloseTo(overhead)
    expect(estimate.totals.contingency).toBeCloseTo(contingency)
    expect(estimate.totals.overheadAndContingency).toBeCloseTo(overhead + contingency)
    expect(estimate.totals.scopeLabel).toBe("Partial estimate")
    expect(estimate.notIncluded).toEqual([
      "Permits and fees",
      "Cabinets and countertops",
      "Appliances",
      "Garage",
      "Landscaping",
    ])
    expect(estimate.disclaimer).toBe(DISCLAIMER)
    expect(estimate.assumptions).not.toContain(DISCLAIMER)
    expect(estimate.assumptions.join(" ")).toMatch(/Bedrooms defaulted to 3/)
    expect(estimate.assumptions.join(" ")).toMatch(/treated as 0/)
    expect(estimate.assumptions.join(" ")).toMatch(
      /Total = \(direct \+ sales tax \+ labor burden\) × \(1 \+ 0\.2\) × \(1 \+ 0\.1\)/
    )
    expect(estimate.assumptions.join(" ")).toMatch(/ZIP 97201/)
    const studs = estimate.materials.find((item) => item.code === "stud-2x6")
    expect(Number.isInteger(studs.quantity)).toBe(true)
    expect(studs.cost).toBeCloseTo(studs.quantity * 9)
    expect(estimate.materials.find((item) => item.code === "heat-pump").quantity).toBe(1)
    expect(estimate.materials.find((item) => item.code === "shingle-square").unit).toBe("m2")
    expect(estimate.materials.find((item) => item.code === "shingle-square").displayUnit).toBe(
      "squares"
    )
    expect(estimate.materials.find((item) => item.code === "interior-paint").displayUnit).toBe(
      "gallons"
    )
    expect(estimate.materials.find((item) => item.code === "concrete-yd3").displayUnit).toBe(
      "yd3"
    )
  })

  it("raises the total when sales tax and labor burden are non-zero", () => {
    const baseline = estimateHouse(EXAMPLE, houseCatalog())
    const catalog = houseCatalog()
    catalog.region.defaultSalesTax = 0.06
    catalog.region.defaultLaborBurden = 0.3

    const taxed = estimateHouse(EXAMPLE, catalog)

    expect(taxed.totals.total).toBeGreaterThan(baseline.totals.total)
    expect(taxed.assumptions.join(" ")).toMatch(/Sales tax rate 0.06/)
    expect(taxed.assumptions.join(" ")).toMatch(/Labor burden rate 0.3/)
    expect(taxed.assumptions.join(" ")).not.toMatch(/treated as 0/)
  })

  it("throws a clear error when a price is missing", () => {
    const catalog = houseCatalog()
    delete catalog.prices["concrete-yd3"]

    expect(() => estimateHouse(EXAMPLE, catalog)).toThrow(
      'Missing price for "concrete-yd3"'
    )
  })
})
