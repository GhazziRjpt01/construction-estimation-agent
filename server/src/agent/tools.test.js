import { describe, expect, it } from "vitest"

import { DISCLAIMER, estimateHouse } from "../estimators/estimateHouse.js"
import { houseCatalog } from "../estimators/houseCatalog.js"
import { SYSTEM_PROMPT } from "./prompt.js"
import { createSessionStore } from "./sessions.js"
import { diffEstimates, executeTool, missingRequired } from "./tools.js"

const ready = { zip: "97201", footprintSqft: 1500, stories: 2 }

function context(session, extras = {}) {
  return {
    session,
    loadCatalog: async () => houseCatalog(),
    loadRates: async (region) => ({ region, materials: [], prices: [], laborRates: [] }),
    ...extras,
  }
}

describe("house agent tools", () => {
  it("asks only for ZIP, footprint, and stories", () => {
    expect(missingRequired({})).toEqual(["ZIP", "footprint", "stories"])
    expect(SYSTEM_PROMPT).toContain(DISCLAIMER)
    expect(SYSTEM_PROMPT).toMatch(/Ask only for required fields/)
    expect(SYSTEM_PROMPT).toMatch(/Never compute/)
    expect(SYSTEM_PROMPT).toMatch(/politely decline/)
  })

  it("keeps earlier inputs and reports the fields still missing", async () => {
    const session = { inputs: {}, estimate: null }
    await executeTool(
      "extract_house_inputs",
      JSON.stringify({ zip: "97201", footprintSqft: 1500 }),
      context(session)
    )
    const result = await executeTool(
      "extract_house_inputs",
      JSON.stringify({ stories: 2, foundation: null }),
      context(session)
    )

    expect(result.missing).toEqual([])
    expect(result.inputs).toEqual(ready)
  })

  it("does not replace stored inputs when a field is invalid", async () => {
    const session = { inputs: { zip: "97201" }, estimate: null }
    const result = await executeTool(
      "extract_house_inputs",
      JSON.stringify({ foundation: "pier", footprintSqft: 1800 }),
      context(session)
    )

    expect(result.error).toBe("Invalid house inputs")
    expect(session.inputs).toEqual({ zip: "97201" })
  })

  it("refuses to estimate until the required fields are present", async () => {
    let called = false
    const session = {
      inputs: { zip: "97201", footprintSqft: 1500 },
      estimate: null,
    }
    const result = await executeTool(
      "run_estimate",
      "{}",
      context(session, {
        loadCatalog: async () => {
          called = true
          return houseCatalog()
        },
      })
    )

    expect(result.missing).toEqual(["stories"])
    expect(called).toBe(false)
    expect(session.estimate).toBeNull()
  })

  it("returns the estimateHouse result", async () => {
    const session = { inputs: { ...ready }, estimate: null }
    const result = await executeTool("run_estimate", "{}", context(session))
    const expected = estimateHouse(ready, houseCatalog())

    expect(result.totals.total).toBeCloseTo(expected.totals.total)
    expect(result.disclaimer).toBe(DISCLAIMER)
    expect(session.estimate.totals.total).toBeCloseTo(expected.totals.total)
  })

  it("diffs two estimates without changing the stored house", async () => {
    const session = { inputs: { ...ready }, estimate: null }
    const result = await executeTool(
      "compare_scenarios",
      JSON.stringify({ changes: { stories: 1 } }),
      context(session)
    )
    const base = estimateHouse(ready, houseCatalog())
    const scenario = estimateHouse({ ...ready, stories: 1 }, houseCatalog())

    expect(result.diff.totals.total).toEqual(diffEstimates(base, scenario).totals.total)
    expect(result.diff.totals.total.delta).toBeCloseTo(
      scenario.totals.total - base.totals.total
    )
    expect(session.inputs.stories).toBe(2)
    expect(session.estimate.totals.total).toBeCloseTo(scenario.totals.total)
  })

  it("reads rates for the requested region", async () => {
    let region
    const result = await executeTool(
      "get_rates",
      JSON.stringify({ region: "US-default" }),
      context(
        { inputs: {}, estimate: null },
        {
          loadRates: async (code) => {
            region = code
            return { materials: [{ code: "stud-2x6" }], prices: [], laborRates: [] }
          },
        }
      )
    )

    expect(region).toBe("US-default")
    expect(result.materials[0].code).toBe("stud-2x6")
  })
})

describe("sessions", () => {
  it("keeps inputs and the latest estimate on one session", () => {
    const store = createSessionStore()
    const session = store.create()
    session.inputs = { ...ready }
    session.estimate = { totals: { total: 10 } }

    expect(store.get(session.id).inputs.footprintSqft).toBe(1500)
    expect(store.get("00000000-0000-4000-8000-000000000000")).toBeNull()
  })
})
