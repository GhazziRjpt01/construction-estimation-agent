import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { shapeCatalog } from "../db/loader.js"
import { estimateHouse } from "./estimateHouse.js"
import { CATEGORY_DIVISION, DIVISION_ORDER } from "./quantities.js"

const seedSql = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/seed.sql"),
  "utf8"
)

const HOUSE = {
  zip: "75201",
  footprintSqft: 1500,
  stories: 2,
  foundation: "slab",
  bedrooms: 3,
  bathrooms: 2.5,
  finishGrade: "standard",
}

describe("seed estimate", () => {
  it("prices every CSI division from the seed catalog", () => {
    const catalog = catalogFromSeed(seedSql)
    const categories = new Set(
      Object.values(catalog.prices).map((price) => price.category)
    )
    for (const category of categories) {
      expect(CATEGORY_DIVISION[category], category).toBeTruthy()
    }

    const estimate = estimateHouse(HOUSE, catalog)

    expect(estimate.divisions.map((division) => division.code)).toEqual(
      DIVISION_ORDER.map(([code]) => code)
    )
    for (const division of estimate.divisions) {
      expect(division.materialCost + division.laborCost).toBeGreaterThan(0)
    }
    expect(estimate.totals.direct).toBeGreaterThan(0)
    expect(estimate.totals.total).toBeGreaterThan(0)
    expect(estimate.totals.low).toBeGreaterThan(0)
    expect(estimate.totals.high).toBeGreaterThan(estimate.totals.total)
    expect(estimate.totals.perSqft).toBeGreaterThan(0)

    const duct = estimate.materials.find((item) => item.code === "ductwork")
    expect(duct.quantity).toBeGreaterThan(25)
    expect(estimate.materials.find((item) => item.code === "window-unit").quantity).toBe(30)
    expect(estimate.materials.find((item) => item.code === "stair-run").quantity).toBe(1)
    expect(estimate.materials.find((item) => item.code === "water-heater").quantity).toBe(1)
    expect(estimate.materials.find((item) => item.code === "breaker-panel").quantity).toBe(1)
    expect(estimate.materials.find((item) => item.code === "excavation").quantity).toBeGreaterThan(0)
  })
})

function catalogFromSeed(sql) {
  const materials = insertRows(sql, "materials")
  const prices = insertRows(sql, "material_prices")
  const laborRates = insertRows(sql, "labor_rates")
  const assemblies = insertRows(sql, "assemblies")
  const assemblyItems = insertRows(sql, "assembly_items")
  const [region] = insertRows(sql, "regions")
  const [locationFactor] = insertRows(sql, "location_factors")

  return shapeCatalog({
    regionCode: region.id,
    region,
    materials,
    prices,
    laborRates,
    assemblies,
    assemblyItems,
    locationFactor,
  })
}

function insertRows(sql, table) {
  const pattern = new RegExp(
    `insert into ${table} \\(([^)]+)\\) values([\\s\\S]*?)on conflict`,
    "gi"
  )
  const rows = []
  for (const match of sql.matchAll(pattern)) {
    const columns = match[1].split(",").map((column) => column.trim())
    for (const tuple of splitTuples(match[2])) {
      const values = splitCsv(tuple)
      const row = {}
      columns.forEach((column, index) => {
        row[column] = parseSqlValue(values[index])
      })
      rows.push(row)
    }
  }
  return rows
}

function splitTuples(body) {
  const tuples = []
  let current = ""
  let depth = 0
  let quoted = false
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]
    if (quoted) {
      current += char
      if (char === "'" && body[index + 1] === "'") {
        current += body[index + 1]
        index += 1
      } else if (char === "'") {
        quoted = false
      }
      continue
    }
    if (char === "'") {
      quoted = true
      current += char
      continue
    }
    if (char === "(") {
      if (depth > 0) {
        current += char
      }
      depth += 1
      continue
    }
    if (char === ")") {
      depth -= 1
      if (depth === 0) {
        tuples.push(current)
        current = ""
      } else {
        current += char
      }
      continue
    }
    if (depth > 0) {
      current += char
    }
  }
  return tuples
}

function splitCsv(tuple) {
  const values = []
  let current = ""
  let quoted = false
  for (let index = 0; index < tuple.length; index += 1) {
    const char = tuple[index]
    if (quoted) {
      current += char
      if (char === "'" && tuple[index + 1] === "'") {
        current += tuple[index + 1]
        index += 1
      } else if (char === "'") {
        quoted = false
      }
      continue
    }
    if (char === "'") {
      quoted = true
      current += char
      continue
    }
    if (char === ",") {
      values.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

function parseSqlValue(token) {
  if (token === "true") {
    return true
  }
  if (token === "false") {
    return false
  }
  if (token === "null") {
    return null
  }
  if (token.startsWith("'")) {
    return token.slice(1, -1).replaceAll("''", "'")
  }
  const number = Number(token)
  return Number.isFinite(number) ? number : token
}
