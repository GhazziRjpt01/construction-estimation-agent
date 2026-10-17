import { describe, expect, it } from "vitest"

import { houseCatalog } from "./houseCatalog.js"
import { takeoffHouse } from "./quantities.js"
import { roundQuantity } from "./units.js"

const EXAMPLE = { footprintSqft: 1500, stories: 2 }

function plan() {
  const metre = 0.3048
  const footprintM2 = 1500 * metre ** 2
  const widthM = Math.sqrt(footprintM2 / 1.5)
  const perimeterM = 2 * (widthM + widthM * 1.5)
  return {
    foundationM2: footprintM2,
    wallM2: perimeterM * 8 * metre * 2,
    roofM2: footprintM2 * Math.sqrt(1.25),
    floorM2: footprintM2 * 2,
  }
}

describe("takeoffHouse", () => {
  it("prices the 1,500 sqft, 2-story worked example by CSI division", () => {
    const areas = plan()
    const takeoff = takeoffHouse(EXAMPLE, houseCatalog())
    const concrete = takeoff.divisions.find((division) => division.code === "03")

    expect(takeoff.divisions.map((division) => division.name)).toEqual([
      "Earthwork",
      "Concrete",
      "Wood",
      "Thermal and Moisture",
      "Openings",
      "Finishes",
      "Plumbing",
      "HVAC",
      "Electrical",
    ])
    for (const division of takeoff.divisions) {
      expect(division.materialCost + division.laborCost).toBeGreaterThan(0)
    }
    const concreteQty = roundQuantity(areas.foundationM2 * 0.1234, "m3")
    const rebarQty = roundQuantity(areas.foundationM2 * 4.9213, "m")
    expect(concrete.materials.find((item) => item.code === "concrete-yd3").quantity).toBeCloseTo(
      concreteQty
    )
    expect(concrete.materialCost).toBeCloseTo(
      concreteQty * 196.1926 + rebarQty * 4.9213
    )
    expect(concrete.laborHours).toBeCloseTo(areas.foundationM2 * 0.5382)
    expect(concrete.laborCost).toBeCloseTo(areas.foundationM2 * 0.5382 * 70)

    const wood = takeoff.divisions.find((division) => division.code === "06")
    const osb = wood.materials.find((item) => item.code === "osb-sheet")
    expect(osb.quantity).toBe(
      roundQuantity(areas.wallM2 * 0.4306, "sheet") +
        roundQuantity(areas.roofM2 * 0.4306, "sheet")
    )
    expect(wood.laborHours).toBeGreaterThan(0)

    const plumbing = takeoff.divisions.find((division) => division.code === "22")
    expect(plumbing.materials[0].quantity).toBe(7)
    expect(plumbing.laborHours).toBeCloseTo(7 * 4.6 + 8)

    const openings = takeoff.divisions.find((division) => division.code === "08")
    expect(openings.materials.find((item) => item.code === "window-unit").quantity).toBe(30)
    expect(openings.materials.find((item) => item.code === "exterior-door").quantity).toBe(2)
    expect(openings.materials.find((item) => item.code === "interior-door").quantity).toBe(7)

    const hvac = takeoff.divisions.find((division) => division.code === "23")
    const duct = hvac.materials.find((item) => item.code === "ductwork")
    expect(duct.quantity).toBe(roundQuantity(areas.floorM2 * 0.45, "m"))
    expect(duct.quantity).not.toBe(25)

    expect(takeoff.geometry.stairRuns).toBe(1)
    expect(wood.materials.find((item) => item.code === "stair-run").quantity).toBe(1)
  })

  it("uses csi division before the category fallback", () => {
    const catalog = houseCatalog()
    catalog.prices["house-wrap"].csiDivision = "06"
    catalog.prices["house-wrap"].category = "moisture"

    const takeoff = takeoffHouse(EXAMPLE, catalog)
    const wood = takeoff.divisions.find((division) => division.code === "06")
    const moisture = takeoff.divisions.find((division) => division.code === "07")

    expect(wood.materials.some((item) => item.code === "house-wrap")).toBe(true)
    expect(moisture.materials.some((item) => item.code === "house-wrap")).toBe(false)
  })

  it("uses the category map when csi division is missing", () => {
    const catalog = houseCatalog()
    delete catalog.prices["house-wrap"].csiDivision
    catalog.prices["house-wrap"].category = "moisture"

    const takeoff = takeoffHouse(EXAMPLE, catalog)
    const moisture = takeoff.divisions.find((division) => division.code === "07")

    expect(moisture.materials.some((item) => item.code === "house-wrap")).toBe(true)
  })

  it("throws a clear error when a price is missing", () => {
    const catalog = houseCatalog()
    delete catalog.prices["stud-2x6"]

    expect(() => takeoffHouse(EXAMPLE, catalog)).toThrow('Missing price for "stud-2x6"')
  })
})
