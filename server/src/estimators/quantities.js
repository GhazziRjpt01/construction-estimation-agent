import { priceAssembly } from "./assembly.js"
import { deriveGeometry } from "./geometry.js"

export const DIVISION_ORDER = [
  ["31", "Earthwork"],
  ["03", "Concrete"],
  ["06", "Wood"],
  ["07", "Thermal and Moisture"],
  ["08", "Openings"],
  ["09", "Finishes"],
  ["22", "Plumbing"],
  ["23", "HVAC"],
  ["26", "Electrical"],
]

export const DIVISIONS = Object.fromEntries(DIVISION_ORDER)

export const CATEGORY_DIVISION = {
  earthwork: "31",
  concrete: "03",
  framing: "06",
  openings: "08",
  sheathing: "06",
  roofing: "07",
  moisture: "07",
  insulation: "07",
  cladding: "07",
  finishes: "09",
  plumbing: "22",
  hvac: "23",
  electrical: "26",
}

const TRADE_DIVISION = {
  operator: "31",
  concrete: "03",
  mason: "03",
  framer: "06",
  openings: "08",
  roofer: "07",
  sider: "07",
  drywall: "09",
  painter: "09",
  plumber: "22",
  hvac: "23",
  electrician: "26",
}

function emptyDivision(code) {
  return {
    code,
    name: DIVISIONS[code],
    materials: [],
    materialCost: 0,
    laborHours: 0,
    laborCost: 0,
  }
}

function divisionFor(line) {
  if (line.kind === "material") {
    const fromColumn = line.csiDivision || line.csi_division
    if (fromColumn) {
      if (!DIVISIONS[fromColumn]) {
        throw new Error(`No CSI division for "${line.code}"`)
      }
      return fromColumn
    }
    const fromCategory = CATEGORY_DIVISION[line.category]
    if (fromCategory) {
      return fromCategory
    }
    throw new Error(`No CSI division for "${line.code}"`)
  }

  const code = TRADE_DIVISION[line.trade]
  if (!code) {
    throw new Error(`No CSI division for "${line.trade}"`)
  }
  return code
}

function addAssembly(divisions, materials, assembly, quantity, prices, laborRates) {
  const priced = priceAssembly(assembly, quantity, prices, laborRates)
  for (const line of priced.lines) {
    const code = divisionFor(line)
    const division = divisions.get(code)
    if (line.kind === "material") {
      division.materialCost += line.cost
      const inDivision = division.materials.find((item) => item.code === line.code)
      if (inDivision) {
        inDivision.quantity += line.quantity
        inDivision.cost += line.cost
      } else {
        division.materials.push({
          code: line.code,
          name: line.name,
          quantity: line.quantity,
          unit: line.unit,
          category: line.category,
          cost: line.cost,
        })
      }
      const existing = materials.get(line.code)
      if (existing) {
        existing.quantity += line.quantity
        existing.cost += line.cost
      } else {
        materials.set(line.code, {
          code: line.code,
          name: line.name,
          quantity: line.quantity,
          unit: line.unit,
          category: line.category,
          cost: line.cost,
        })
      }
    } else {
      division.laborHours += line.quantity
      division.laborCost += line.cost
    }
  }
}

function requireAssembly(assemblies, code) {
  const assembly = assemblies?.[code]
  if (!assembly) {
    throw new Error(`Missing assembly "${code}"`)
  }
  return assembly
}

export function takeoffHouse(inputs, catalog) {
  const geometry = deriveGeometry(inputs)
  const assemblies = catalog?.assemblies
  const prices = catalog?.prices
  const laborRates = catalog?.laborRates
  const divisions = new Map(
    DIVISION_ORDER.map(([code]) => [code, emptyDivision(code)])
  )
  const materials = new Map()

  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "site-excavation"),
    geometry.footprintM2 + geometry.garageM2,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "slab-foundation"),
    geometry.foundationM2,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "exterior-studs"),
    geometry.exteriorStuds,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "wall-plates"),
    geometry.plateLengthM,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "opening-headers"),
    geometry.headerCount,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "interior-partitions"),
    geometry.partitionM,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "stairs"),
    geometry.stairRuns,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "exterior-wall"),
    geometry.exteriorWallM2,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "roof"),
    geometry.roofM2,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "interior-finishes"),
    geometry.floorM2 * geometry.finishFactor,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "window"),
    geometry.windowCount,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "exterior-door"),
    geometry.exteriorDoorCount,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "interior-door"),
    geometry.interiorDoorCount,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "plumbing-fixture"),
    geometry.fixtures,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "water-heater"),
    geometry.waterHeaters,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "hvac-heat-pump"),
    geometry.hvacSystems,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "hvac-ductwork"),
    geometry.floorM2,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "electrical-point"),
    geometry.electricalPoints,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "light-fixture"),
    geometry.lightFixtures,
    prices,
    laborRates
  )
  addAssembly(
    divisions,
    materials,
    requireAssembly(assemblies, "breaker-panel"),
    geometry.breakerPanels,
    prices,
    laborRates
  )

  return {
    assumptions: geometry.assumptions,
    geometry,
    divisions: [...divisions.values()],
    materials: [...materials.values()],
  }
}
