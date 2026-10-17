import { describe, expect, it } from "vitest"

import { deriveGeometry } from "./geometry.js"

describe("deriveGeometry", () => {
  it("derives a 1,500 sqft, 2-story slab from the documented plan", () => {
    const metre = 0.3048
    const footprintM2 = 1500 * metre ** 2
    const widthM = Math.sqrt(footprintM2 / 1.5)
    const perimeterM = 2 * (widthM + widthM * 1.5)
    const geometry = deriveGeometry({ footprintSqft: 1500, stories: 2 })

    expect(geometry.footprintM2).toBeCloseTo(footprintM2)
    expect(geometry.floorM2).toBeCloseTo(footprintM2 * 2)
    expect(geometry.floorSqft).toBe(3000)
    expect(geometry.perimeterM).toBeCloseTo(perimeterM)
    expect(geometry.exteriorWallM2).toBeCloseTo(perimeterM * 8 * metre * 2)
    expect(geometry.roofM2).toBeCloseTo(footprintM2 * Math.sqrt(1.25))
    expect(geometry.foundationM2).toBeCloseTo(footprintM2)
    expect(geometry.fixtures).toBe(7)
    expect(geometry.electricalPoints).toBe(30)
    expect(geometry.hvacSystems).toBe(1)
    expect(geometry.windowCount).toBe(30)
    expect(geometry.exteriorDoorCount).toBe(2)
    expect(geometry.interiorDoorCount).toBe(7)
    expect(geometry.lightFixtures).toBe(38)
    expect(geometry.stairRuns).toBe(1)
    expect(geometry.headerCount).toBe(32)
    expect(geometry.waterHeaters).toBe(1)
    expect(geometry.breakerPanels).toBe(1)
    const wallRunM = perimeterM * 2
    expect(geometry.exteriorStuds).toBeCloseTo(
      wallRunM / (16 * 0.0254) + 4 * 3 * 2 + 32 * 3
    )
    expect(geometry.plateLengthM).toBeCloseTo(wallRunM * 3)
    const text = geometry.assumptions.join(" ")
    expect(text).toMatch(/Bedrooms defaulted to 3/)
    expect(text).toMatch(/Bathrooms defaulted to 2/)
    expect(text).toMatch(/No garage was assumed/)
    expect(text).toMatch(/Roof pitch defaulted to 6\/12/)
    expect(text).toMatch(/Foundation defaulted to slab/)
    expect(text).toMatch(/valves and fittings/)
    expect(text).toMatch(/Water heater quantity is 1/)
    expect(text).toMatch(/one box/)
    expect(text).toMatch(/Breaker panel quantity is 1/)
    expect(text).toMatch(/Light fixtures/)
    expect(text).toMatch(/Ductwork is priced from floor area/)
    expect(text).toMatch(/Windows = 1 per 100 sqft/)
    expect(text).toMatch(/Exterior doors = 2/)
    expect(text).toMatch(/Interior doors/)
    expect(text).toMatch(/Exterior plates/)
    expect(text).toMatch(/one header/)
    expect(text).toMatch(/Interior partitions/)
    expect(text).toMatch(/Stairs = stories/)
    expect(text).toMatch(/Excavation and grading/)
  })

  it("counts 2.5 bathrooms as 2 full baths and 1 half bath", () => {
    const geometry = deriveGeometry({
      footprintSqft: 1500,
      stories: 2,
      bedrooms: 3,
      bathrooms: 2.5,
    })

    expect(geometry.fixtures).toBe(2 * 3 + 2 + 1)
    expect(geometry.electricalPoints).toBe(3 * 6 + 2 * 3 + 2 + 6)
    expect(Number.isInteger(geometry.fixtures)).toBe(true)
    expect(Number.isInteger(geometry.electricalPoints)).toBe(true)
    expect(geometry.interiorDoorCount).toBe(3 + 2 + 1 + 2)
  })

  it("omits stairs on a one-story house", () => {
    const geometry = deriveGeometry({ footprintSqft: 1500, stories: 1 })

    expect(geometry.stairRuns).toBe(0)
    expect(geometry.assumptions.join(" ")).toMatch(/Stairs = 0/)
  })

  it("rejects a missing footprint", () => {
    expect(() => deriveGeometry({ stories: 2 })).toThrow(/footprintSqft/)
  })
})
