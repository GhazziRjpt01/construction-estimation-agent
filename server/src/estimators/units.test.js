import { describe, expect, it } from "vitest"

import {
  displayQuantity,
  roundQuantity,
  toDisplayQuantity,
  toSiQuantity,
} from "./units.js"

describe("toDisplayQuantity", () => {
  it("keeps metric quantities in SI", () => {
    expect(toDisplayQuantity(10, "m2", "metric")).toEqual({
      value: 10,
      unit: "m2",
    })
    expect(toDisplayQuantity(2, "m3", "metric")).toEqual({
      value: 2,
      unit: "m3",
    })
  })

  it("converts SI quantities to imperial display units", () => {
    expect(toDisplayQuantity(1, "m", "imperial").unit).toBe("LF")
    expect(toDisplayQuantity(1, "m", "imperial").value).toBeCloseTo(3.2808399, 5)
    expect(toDisplayQuantity(1, "m2", "imperial").unit).toBe("ft2")
    expect(toDisplayQuantity(1, "m2", "imperial").value).toBeCloseTo(10.7639104, 5)
    expect(toDisplayQuantity(1, "m3", "imperial").unit).toBe("yd3")
    expect(toDisplayQuantity(1, "L", "imperial").unit).toBe("gallons")
    const squares = toDisplayQuantity(9.290304, "m2", "imperial", {
      code: "shingle-square",
    })
    expect(squares.unit).toBe("squares")
    expect(squares.value).toBeCloseTo(1, 6)
  })

  it("leaves count units unchanged", () => {
    expect(toDisplayQuantity(4, "ea", "imperial")).toEqual({ value: 4, unit: "ea" })
    expect(toDisplayQuantity(6, "hr", "metric")).toEqual({ value: 6, unit: "hr" })
  })

  it("rejects an unknown unit system", () => {
    expect(() => toDisplayQuantity(1, "m2", "US-default")).toThrow(/unit system/)
  })
})

describe("toSiQuantity", () => {
  it("round-trips imperial display values back to SI", () => {
    const displayed = toDisplayQuantity(12.5, "m2", "imperial")
    expect(toSiQuantity(displayed.value, "m2", "imperial")).toBeCloseTo(12.5, 8)
  })

  it("keeps metric input in SI", () => {
    expect(toSiQuantity(12.5, "m2", "metric")).toBe(12.5)
  })
})

describe("roundQuantity", () => {
  it("rounds discrete units up and continuous units to 2 decimals", () => {
    expect(roundQuantity(2.01, "ea")).toBe(3)
    expect(roundQuantity(2, "sheet")).toBe(2)
    expect(roundQuantity(1.1, "batt")).toBe(2)
    expect(roundQuantity(1.234, "m2")).toBe(1.23)
    expect(roundQuantity(1.235, "m3")).toBe(1.24)
    expect(roundQuantity(4.5, "hr")).toBe(4.5)
  })
})

describe("displayQuantity", () => {
  it("uses the region unit system", () => {
    const shown = displayQuantity(1, "m2", { unitSystem: "imperial" })
    expect(shown.unit).toBe("ft2")
  })
})
