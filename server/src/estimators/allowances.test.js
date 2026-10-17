import { describe, expect, it } from "vitest"

import { applyAllowances } from "./allowances.js"

describe("applyAllowances", () => {
  it("applies the percentages from the region", () => {
    const us = applyAllowances(1000, {
      defaultOverheadProfit: 0.2,
      defaultContingency: 0.1,
    })
    expect(us).toEqual({
      directCost: 1000,
      overheadProfit: 200,
      contingency: 120,
      total: 1320,
    })

    const other = applyAllowances(1000, {
      defaultOverheadProfit: 0.05,
      defaultContingency: 0.25,
    })
    expect(other.overheadProfit).toBe(50)
    expect(other.contingency).toBe(262.5)
    expect(other.total).toBe(1312.5)
  })
})
