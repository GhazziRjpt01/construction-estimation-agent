import { inflateSync } from "node:zlib"

import ExcelJS from "exceljs"
import request from "supertest"
import { describe, expect, it } from "vitest"

import { createApp } from "../app.js"
import { DISCLAIMER, estimateHouse } from "../estimators/estimateHouse.js"
import { houseCatalog } from "../estimators/houseCatalog.js"

const ESTIMATE_ID = "11111111-1111-4111-8111-111111111111"
const PROJECT_ID = "22222222-2222-4222-8222-222222222222"

function binary(res, callback) {
  const chunks = []
  res.on("data", (chunk) => chunks.push(chunk))
  res.on("end", () => callback(null, Buffer.concat(chunks)))
}

function pdfText(buffer) {
  const raw = buffer.toString("latin1")
  const parts = []
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const data = Buffer.from(match[1], "latin1")
    try {
      parts.push(inflateSync(data).toString("latin1"))
    } catch {
      parts.push(match[1])
    }
  }
  return parts
    .join("\n")
    .replace(/<([0-9A-Fa-f]+)>/g, (token, hex) => {
      if (hex.length % 2 !== 0) {
        return token
      }
      return Buffer.from(hex, "hex").toString("latin1")
    })
}

function testApp(overrides = {}) {
  const saved = []
  const app = createApp({
    loadCatalog: async () => houseCatalog(),
    saveEstimate: async (payload) => {
      saved.push(payload)
      return {
        id: ESTIMATE_ID,
        projectId: PROJECT_ID,
        createdAt: "2026-10-14T00:00:00.000Z",
      }
    },
    getEstimate: async () => null,
    loadRates: async () => ({ materials: [], prices: [], laborRates: [] }),
    ...overrides,
  })
  return { app, saved }
}

describe("POST /api/estimate", () => {
  it("returns the house estimate and saves it", async () => {
    const { app, saved } = testApp()
    const response = await request(app)
      .post("/api/estimate")
      .send({ footprintSqft: 1500, stories: 2, zip: "97201" })
      .expect(201)

    expect(response.body.id).toBe(ESTIMATE_ID)
    expect(response.body.projectId).toBe(PROJECT_ID)
    expect(response.body.disclaimer).toBe(DISCLAIMER)
    expect(response.body.assumptions).not.toContain(DISCLAIMER)
    expect(response.body.totals.scopeLabel).toBe("Partial estimate")
    expect(response.body.divisions.map((division) => division.code)).toEqual([
      "31",
      "03",
      "06",
      "07",
      "08",
      "09",
      "22",
      "23",
      "26",
    ])
    expect(response.body.totals.low).toBeLessThan(response.body.totals.total)
    expect(response.body.totals.high).toBeGreaterThan(response.body.totals.total)
    expect(response.body.totals.perSqft).toBeCloseTo(response.body.totals.total / 3000)
    expect(saved).toHaveLength(1)
    expect(saved[0].inputs).toEqual({
      footprintSqft: 1500,
      stories: 2,
      zip: "97201",
    })
    expect(saved[0].result.totals.total).toBe(response.body.totals.total)
    expect(saved[0].name).toBe("1500 sqft, 2 stories, 97201")
  })

  it("rejects a body without footprintSqft", async () => {
    const { app, saved } = testApp()
    const response = await request(app).post("/api/estimate").send({ stories: 2 }).expect(400)

    expect(response.body.error).toBe("Invalid request")
    expect(response.body.issues.some((issue) => issue.path === "footprintSqft")).toBe(true)
    expect(saved).toHaveLength(0)
  })

  it("rejects a foundation outside the allowed set", async () => {
    const { app } = testApp()
    const response = await request(app)
      .post("/api/estimate")
      .send({ footprintSqft: 1500, foundation: "pier" })
      .expect(400)

    expect(response.body.issues.some((issue) => issue.path === "foundation")).toBe(true)
  })

  it("does not save when a price is missing", async () => {
    const catalog = houseCatalog()
    delete catalog.prices["concrete-yd3"]
    const { app, saved } = testApp({
      loadCatalog: async () => catalog,
    })

    const response = await request(app)
      .post("/api/estimate")
      .send({ footprintSqft: 1500, stories: 2 })
      .expect(422)

    expect(response.body.error).toBe('Missing price for "concrete-yd3"')
    expect(saved).toHaveLength(0)
  })

  it("rejects JSON that is not an object", async () => {
    const { app } = testApp()
    const response = await request(app)
      .post("/api/estimate")
      .set("Content-Type", "application/json")
      .send("{")
      .expect(400)

    expect(response.body.error).toBe("Invalid JSON")
  })
})

describe("GET /health", () => {
  it("reports the server is up", async () => {
    const { app } = testApp()
    const response = await request(app).get("/health").expect(200)
    expect(response.body).toEqual({ ok: true })
  })
})

describe("POST /api/estimate/:id/export", () => {
  it("downloads an xlsx workbook with divisions, quantities, and the disclaimer", async () => {
    const result = estimateHouse({ footprintSqft: 1500, stories: 2, zip: "97201" }, houseCatalog())
    const { app } = testApp({
      getEstimate: async () => ({
        id: ESTIMATE_ID,
        name: "1500 sqft, 2 stories, 97201",
        inputs: { footprintSqft: 1500, stories: 2, zip: "97201" },
        createdAt: "2026-10-14T00:00:00.000Z",
        result,
      }),
    })

    const response = await request(app)
      .post(`/api/estimate/${ESTIMATE_ID}/export?format=xlsx`)
      .buffer(true)
      .parse(binary)
      .expect(200)

    expect(response.headers["content-type"]).toMatch(/spreadsheetml/)
    expect(response.headers["content-disposition"]).toBe(
      `attachment; filename="estimate-${ESTIMATE_ID}.xlsx"`
    )
    expect(response.body.subarray(0, 2).toString()).toBe("PK")

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(response.body)
    const divisionSheet = workbook.getWorksheet("Divisions")
    const quantitySheet = workbook.getWorksheet("Quantities")
    const projectText = workbook.getWorksheet("Project").getSheetValues().flat().join(" ")
    const assumptionValues = workbook.getWorksheet("Assumptions").getSheetValues().flat()
    const assumptionText = assumptionValues.join(" ")

    expect(divisionSheet.getRow(1).getCell(6).value).toBe("Total")
    expect(divisionSheet.getRow(2).getCell(1).value).toBe("31")
    expect(divisionSheet.getRow(2).getCell(2).value).toBe("Earthwork")
    expect(divisionSheet.getRow(2).getCell(6).value).toBe(
      divisionSheet.getRow(2).getCell(3).value + divisionSheet.getRow(2).getCell(5).value
    )
    expect(divisionSheet.getColumn(3).numFmt).toBe('"$"#,##0.00')
    expect(quantitySheet.getRow(1).values.slice(1)).toEqual([
      "Division",
      "Item",
      "Qty",
      "Unit",
      "Cost",
    ])
    expect(projectText).toContain("ZIP 97201")
    expect(projectText).toContain("October 14, 2026")
    expect(projectText).toContain("Partial estimate")
    expect(assumptionText).toContain("Not included")
    expect(assumptionText).toContain("Permits and fees")
    expect(assumptionValues.filter((value) => value === DISCLAIMER)).toHaveLength(1)
  })

  it("downloads a pdf", async () => {
    const result = estimateHouse({ footprintSqft: 1500, stories: 2, zip: "97201" }, houseCatalog())
    const { app } = testApp({
      getEstimate: async () => ({
        id: ESTIMATE_ID,
        name: "1500 sqft, 2 stories, 97201",
        inputs: { footprintSqft: 1500, stories: 2, zip: "97201" },
        createdAt: "2026-10-14T00:00:00.000Z",
        result,
      }),
    })

    const response = await request(app)
      .post(`/api/estimate/${ESTIMATE_ID}/export?format=pdf`)
      .buffer(true)
      .parse(binary)
      .expect(200)

    expect(response.headers["content-type"]).toBe("application/pdf")
    expect(response.body.subarray(0, 5).toString()).toBe("%PDF-")
    const text = pdfText(response.body)
    expect(text.split(DISCLAIMER).length - 1).toBe(1)
    expect(text).toContain("Partial estimate")
    expect(text).toContain("Not included")
    expect(text).toContain("Permits and fees")
    expect(text).toContain("Division")
    expect(text).toContain("Qty")
    expect(text).toContain("ZIP 97201")
    expect(text).toContain("October 14, 2026")
    expect(text).toContain("$")
    expect(text).toContain("squares")
    expect(text).toContain("gallons")
  })

  it("rejects an export without a format", async () => {
    const { app } = testApp()
    const response = await request(app)
      .post(`/api/estimate/${ESTIMATE_ID}/export`)
      .expect(400)

    expect(response.body.issues.some((issue) => issue.path === "format")).toBe(true)
  })
})
