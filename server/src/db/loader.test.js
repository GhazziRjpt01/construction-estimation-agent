import { describe, expect, it } from "vitest"

import { ratesUpdatedAt, shapeCatalog, validateCatalog } from "./loader.js"

const regionRow = {
  id: "CA-vancouver",
  country: "CA",
  currency: "CAD",
  unit_system: "metric",
  tax_label: "GST",
  default_sales_tax: "0.0500",
  default_labor_burden: "0.2500",
  default_overhead_profit: "0.1800",
  default_contingency: "0.0500",
}

describe("shapeCatalog", () => {
  it("takes currency and unit system from the region row", () => {
    const catalog = shapeCatalog({
      regionCode: "CA-vancouver",
      region: regionRow,
      materials: [
        {
          id: "m1",
          code: "house-wrap",
          name: "House wrap",
          unit: "m2",
          category: "moisture",
          csi_division: "07",
        },
      ],
      prices: [
        {
          material_id: "m1",
          unit_cost: "2.1528",
          is_placeholder: true,
          notes: "PLACEHOLDER",
        },
      ],
      laborRates: [],
      assemblies: [],
      assemblyItems: [],
      locationFactor: {
        region_code: "CA-vancouver",
        name: "Vancouver",
        material_factor: "1.1000",
        labor_factor: "1.2000",
        is_placeholder: true,
        notes: "PLACEHOLDER",
      },
    })

    expect(catalog.region).toEqual({
      id: "CA-vancouver",
      country: "CA",
      currency: "CAD",
      unitSystem: "metric",
      taxLabel: "GST",
      defaultSalesTax: 0.05,
      defaultLaborBurden: 0.25,
      defaultOverheadProfit: 0.18,
      defaultContingency: 0.05,
    })
    expect(catalog.prices["house-wrap"].unit).toBe("m2")
    expect(catalog.prices["house-wrap"].csiDivision).toBe("07")
    expect(catalog.prices["house-wrap"].category).toBe("moisture")
    expect(catalog.prices["house-wrap"].unitCost).toBeCloseTo(2.1528, 4)
    expect(catalog.locationFactor.materialFactor).toBeCloseTo(1.1, 4)
  })
})

describe("validateCatalog", () => {
  it("lists every missing price, division, and labor rate in one error", () => {
    expect(() =>
      validateCatalog({
        prices: {
          "vapor-barrier": { code: "vapor-barrier", category: "moisture" },
        },
        laborRates: {},
        assemblies: {
          slab: {
            items: [
              { kind: "material", code: "vapor-barrier" },
              { kind: "material", code: "anchor-bolts" },
              { kind: "labor", trade: "painter" },
            ],
          },
        },
      })
    ).toThrow(
      'Catalog is incomplete: Missing CSI division for "vapor-barrier"; Missing price for "anchor-bolts"; Missing labor rate for "painter".'
    )
  })
})

describe("ratesUpdatedAt", () => {
  it("uses the newest price or labor timestamp", () => {
    expect(
      ratesUpdatedAt(
        [{ updated_at: "2026-01-02T00:00:00.000Z" }],
        [{ updated_at: "2026-03-04T15:30:00.000Z" }]
      )
    ).toBe("2026-03-04T15:30:00.000Z")
  })

  it("returns null when no timestamp is stored", () => {
    expect(ratesUpdatedAt([{ notes: "PLACEHOLDER" }], [])).toBeNull()
  })
})
