import { describe, expect, it } from "vitest"

import { formatCurrency, formatRegionCurrency } from "./money.js"

describe("formatCurrency", () => {
  it("formats with the given currency", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50")
    expect(formatCurrency(1234.5, "EUR")).toBe("€1,234.50")
  })

  it("rejects a missing currency", () => {
    expect(() => formatCurrency(10, "")).toThrow(/Currency/)
  })
})

describe("formatRegionCurrency", () => {
  it("uses the region currency instead of a fixed code", () => {
    expect(formatRegionCurrency(80, { currency: "CAD" })).toBe("CA$80.00")
  })
})
