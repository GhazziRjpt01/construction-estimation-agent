import { createDbClient } from "./client.js"

const REGION_COLUMNS =
  "id, country, currency, unit_system, tax_label, default_sales_tax, default_labor_burden, default_overhead_profit, default_contingency"
const MATERIAL_COLUMNS = "id, code, name, unit, category, csi_division"
const PRICE_COLUMNS =
  "material_id, region_code, unit_cost, is_placeholder, notes, updated_at"
const LABOR_COLUMNS =
  "trade, region_code, hourly_rate, is_placeholder, notes, updated_at"
const ASSEMBLY_COLUMNS = "id, code, name, description, output_unit"
const ITEM_COLUMNS =
  "assembly_id, material_id, trade, quantity_per_unit, unit, notes"
const FACTOR_COLUMNS =
  "region_code, name, material_factor, labor_factor, is_placeholder, notes"

function assertOk(error, label) {
  if (error) {
    throw new Error(`Failed to load ${label}: ${error.message}`)
  }
}

function asNumber(value, label) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    throw new Error(`Expected a number for ${label}`)
  }
  return number
}

function asOptionalRate(value, label) {
  if (value == null || value === "") {
    return null
  }
  return asNumber(value, label)
}

export function ratesUpdatedAt(prices, laborRates) {
  let latest = Number.NEGATIVE_INFINITY
  let found = false
  for (const row of [...prices, ...laborRates]) {
    const time = Date.parse(row?.updated_at)
    if (!Number.isFinite(time)) {
      continue
    }
    found = true
    if (time > latest) {
      latest = time
    }
  }
  return found ? new Date(latest).toISOString() : null
}

export function shapeCatalog({
  regionCode,
  region,
  materials,
  prices,
  laborRates,
  assemblies,
  assemblyItems,
  locationFactor,
}) {
  if (!region) {
    throw new Error(`No region ${regionCode}`)
  }
  if (!locationFactor) {
    throw new Error(`No location factor for region ${regionCode}`)
  }

  const materialById = new Map(materials.map((row) => [row.id, row]))
  const pricesByCode = {}

  for (const price of prices) {
    const material = materialById.get(price.material_id)
    if (!material) {
      throw new Error(`Price is missing material ${price.material_id}`)
    }
    pricesByCode[material.code] = {
      code: material.code,
      name: material.name,
      unit: material.unit,
      category: material.category,
      csiDivision: material.csi_division || null,
      unitCost: asNumber(price.unit_cost, `${material.code} unit cost`),
      placeholder: price.is_placeholder,
      notes: price.notes,
    }
  }

  const laborByTrade = {}
  for (const rate of laborRates) {
    laborByTrade[rate.trade] = {
      trade: rate.trade,
      hourlyRate: asNumber(rate.hourly_rate, `${rate.trade} hourly rate`),
      placeholder: rate.is_placeholder,
      notes: rate.notes,
    }
  }

  const itemsByAssembly = new Map()
  for (const item of assemblyItems) {
    const list = itemsByAssembly.get(item.assembly_id) ?? []
    if (item.material_id) {
      const material = materialById.get(item.material_id)
      if (!material) {
        throw new Error(`Assembly item is missing material ${item.material_id}`)
      }
      list.push({
        kind: "material",
        code: material.code,
        quantityPerUnit: asNumber(
          item.quantity_per_unit,
          `${material.code} quantity`
        ),
        unit: item.unit,
        notes: item.notes,
      })
    } else {
      list.push({
        kind: "labor",
        trade: item.trade,
        quantityPerUnit: asNumber(
          item.quantity_per_unit,
          `${item.trade} quantity`
        ),
        unit: item.unit,
        notes: item.notes,
      })
    }
    itemsByAssembly.set(item.assembly_id, list)
  }

  const assembliesByCode = {}
  for (const assembly of assemblies) {
    assembliesByCode[assembly.code] = {
      code: assembly.code,
      name: assembly.name,
      description: assembly.description,
      outputUnit: assembly.output_unit,
      items: itemsByAssembly.get(assembly.id) ?? [],
    }
  }

  return validateCatalog({
    regionCode: region.id,
    region: {
      id: region.id,
      country: region.country,
      currency: region.currency,
      unitSystem: region.unit_system,
      taxLabel: region.tax_label,
      defaultSalesTax: asOptionalRate(region.default_sales_tax, "sales tax"),
      defaultLaborBurden: asOptionalRate(
        region.default_labor_burden,
        "labor burden"
      ),
      defaultOverheadProfit: asNumber(
        region.default_overhead_profit,
        "overhead and profit"
      ),
      defaultContingency: asNumber(region.default_contingency, "contingency"),
    },
    locationFactor: {
      regionCode: locationFactor.region_code,
      name: locationFactor.name,
      materialFactor: asNumber(
        locationFactor.material_factor,
        "material factor"
      ),
      laborFactor: asNumber(locationFactor.labor_factor, "labor factor"),
      placeholder: locationFactor.is_placeholder,
      notes: locationFactor.notes,
    },
    prices: pricesByCode,
    laborRates: laborByTrade,
    assemblies: assembliesByCode,
  })
}

export function validateCatalog(catalog) {
  const missing = []
  const seen = new Set()
  function add(message) {
    if (seen.has(message)) {
      return
    }
    seen.add(message)
    missing.push(message)
  }

  for (const assembly of Object.values(catalog?.assemblies ?? {})) {
    for (const item of assembly.items ?? []) {
      if (item.kind === "material") {
        const price = catalog.prices?.[item.code]
        if (!price) {
          add(`Missing price for "${item.code}"`)
        } else if (!price.csiDivision) {
          add(`Missing CSI division for "${item.code}"`)
        }
      } else if (item.kind === "labor") {
        if (!catalog.laborRates?.[item.trade]) {
          add(`Missing labor rate for "${item.trade}"`)
        }
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Catalog is incomplete: ${missing.join("; ")}.`)
  }
  return catalog
}

async function selectAll(client, table, columns, regionCode) {
  let query = client.from(table).select(columns)
  if (regionCode) {
    query = query.eq("region_code", regionCode)
  }
  const { data, error } = await query
  assertOk(error, table)
  return data ?? []
}

async function selectRegion(client, regionCode) {
  const { data, error } = await client
    .from("regions")
    .select(REGION_COLUMNS)
    .eq("id", regionCode)
    .maybeSingle()
  assertOk(error, "regions")
  return data
}

export async function loadCatalog(client, regionCode = "US-default") {
  const [region, materials, prices, laborRates, assemblies, assemblyItems, factors] =
    await Promise.all([
      selectRegion(client, regionCode),
      selectAll(client, "materials", MATERIAL_COLUMNS),
      selectAll(client, "material_prices", PRICE_COLUMNS, regionCode),
      selectAll(client, "labor_rates", LABOR_COLUMNS, regionCode),
      selectAll(client, "assemblies", ASSEMBLY_COLUMNS),
      selectAll(client, "assembly_items", ITEM_COLUMNS),
      selectAll(client, "location_factors", FACTOR_COLUMNS, regionCode),
    ])

  return shapeCatalog({
    regionCode,
    region,
    materials,
    prices,
    laborRates,
    assemblies,
    assemblyItems,
    locationFactor: factors[0] ?? null,
  })
}

export async function loadDefaultCatalog() {
  return loadCatalog(createDbClient())
}

export async function loadRates(client, regionCode = "US-default") {
  const [region, materials, prices, laborRates] = await Promise.all([
    selectRegion(client, regionCode),
    selectAll(client, "materials", MATERIAL_COLUMNS),
    selectAll(client, "material_prices", PRICE_COLUMNS, regionCode),
    selectAll(client, "labor_rates", LABOR_COLUMNS, regionCode),
  ])

  if (!region) {
    throw new Error(`No region ${regionCode}`)
  }

  const materialById = new Map(materials.map((row) => [row.id, row]))

  return {
    updatedAt: ratesUpdatedAt(prices, laborRates),
    region: {
      id: region.id,
      country: region.country,
      currency: region.currency,
      unitSystem: region.unit_system,
    },
    materials: materials.map((row) => ({
      code: row.code,
      name: row.name,
      unit: row.unit,
      category: row.category,
      csiDivision: row.csi_division || null,
    })),
    prices: prices.map((price) => {
      const material = materialById.get(price.material_id)
      if (!material) {
        throw new Error(`Price is missing material ${price.material_id}`)
      }
      return {
        code: material.code,
        name: material.name,
        unit: material.unit,
        unitCost: asNumber(price.unit_cost, `${material.code} unit cost`),
        placeholder: price.is_placeholder,
        notes: price.notes,
      }
    }),
    laborRates: laborRates.map((rate) => ({
      trade: rate.trade,
      hourlyRate: asNumber(rate.hourly_rate, `${rate.trade} hourly rate`),
      placeholder: rate.is_placeholder,
      notes: rate.notes,
    })),
  }
}
