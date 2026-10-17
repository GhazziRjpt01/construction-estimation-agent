import { toSiQuantity } from "./units.js"

export const STORY_HEIGHT_M = 8 * 0.3048
export const PLAN_ASPECT = 1.5
export const DEFAULT_ROOF_PITCH = 6 / 12
export const DEFAULT_GARAGE_SQFT = 400
export const CRAWLSPACE_AREA_FACTOR = 0.4
export const WINDOW_FLOOR_SQFT = 100
export const LIGHT_FLOOR_SQFT = 80
export const STUD_SPACING_M = 16 * 0.0254
export const CORNER_STUDS = 3
export const OPENING_STUDS = 3
export const PLATE_RUNS = 3
export const EXTERIOR_DOORS = 2
export const INTERIOR_DOOR_EXTRAS = 2
export const PARTITION_M = 12 * 0.3048
export const FINISH_SCOPE = {
  economy: 0.85,
  standard: 1,
  premium: 1.25,
}

export const GEOMETRY_DEFAULTS = {
  region: "US-default",
  stories: 1,
  foundation: "slab",
  roofPitch: DEFAULT_ROOF_PITCH,
  garageSqft: 0,
  bedrooms: 3,
  bathrooms: 2,
  finishGrade: "standard",
  hvacType: "heat-pump",
}

const FOUNDATIONS = new Set(["slab", "crawlspace", "basement"])

function requirePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`)
  }
}

function parsePitch(roofPitch) {
  if (typeof roofPitch === "number") {
    return roofPitch
  }
  const match = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(roofPitch)
  if (!match) {
    throw new Error(`Roof pitch "${roofPitch}" must be a rise/run number or "6/12"`)
  }
  return Number(match[1]) / Number(match[2])
}

function rectangle(areaM2) {
  const widthM = Math.sqrt(areaM2 / PLAN_ASPECT)
  const lengthM = widthM * PLAN_ASPECT
  return {
    widthM,
    lengthM,
    perimeterM: 2 * (widthM + lengthM),
  }
}

export function deriveGeometry(inputs = {}) {
  requirePositive(inputs.footprintSqft, "footprintSqft")

  const assumptions = []
  const region = inputs.region ?? GEOMETRY_DEFAULTS.region
  if (inputs.region == null) {
    assumptions.push(
      `Region ${GEOMETRY_DEFAULTS.region} was assumed because no region was provided.`
    )
  }
  if (inputs.zip) {
    assumptions.push(
      `ZIP ${inputs.zip} is recorded. Pricing uses region ${region} until a ZIP table exists.`
    )
  }

  const stories = inputs.stories ?? GEOMETRY_DEFAULTS.stories
  requirePositive(stories, "stories")
  if (inputs.stories == null) {
    assumptions.push(
      `Stories defaulted to ${GEOMETRY_DEFAULTS.stories}.`
    )
  }

  const foundation = inputs.foundation ?? GEOMETRY_DEFAULTS.foundation
  if (!FOUNDATIONS.has(foundation)) {
    throw new Error(
      `Foundation "${foundation}" must be slab, crawlspace, or basement`
    )
  }
  if (inputs.foundation == null) {
    assumptions.push("Foundation defaulted to slab.")
  }

  const roofPitch =
    inputs.roofPitch == null
      ? GEOMETRY_DEFAULTS.roofPitch
      : parsePitch(inputs.roofPitch)
  if (!(roofPitch >= 0)) {
    throw new Error("Roof pitch must be zero or greater")
  }
  if (inputs.roofPitch == null) {
    assumptions.push("Roof pitch defaulted to 6/12.")
  }

  let garageSqft = GEOMETRY_DEFAULTS.garageSqft
  if (inputs.garage == null || inputs.garage === false || inputs.garage === 0) {
    if (inputs.garage == null) {
      assumptions.push("No garage was assumed.")
    }
  } else if (inputs.garage === true) {
    garageSqft = DEFAULT_GARAGE_SQFT
    assumptions.push(
      `Garage defaulted to ${DEFAULT_GARAGE_SQFT} sqft because no size was given.`
    )
  } else {
    requirePositive(inputs.garage, "garage")
    garageSqft = inputs.garage
  }

  const bedrooms = inputs.bedrooms ?? GEOMETRY_DEFAULTS.bedrooms
  requirePositive(bedrooms, "bedrooms")
  if (inputs.bedrooms == null) {
    assumptions.push(`Bedrooms defaulted to ${GEOMETRY_DEFAULTS.bedrooms}.`)
  }

  const bathrooms = inputs.bathrooms ?? GEOMETRY_DEFAULTS.bathrooms
  requirePositive(bathrooms, "bathrooms")
  if (inputs.bathrooms == null) {
    assumptions.push(`Bathrooms defaulted to ${GEOMETRY_DEFAULTS.bathrooms}.`)
  }

  const finishGrade = inputs.finishGrade ?? GEOMETRY_DEFAULTS.finishGrade
  const finishFactor = FINISH_SCOPE[finishGrade]
  if (finishFactor == null) {
    throw new Error(
      `Finish grade "${finishGrade}" must be economy, standard, or premium`
    )
  }
  assumptions.push(
    `Finish grade ${finishGrade} uses scope factor ${finishFactor}. This is a documented scope assumption, not a database rate.`
  )

  const hvacType = inputs.hvacType ?? GEOMETRY_DEFAULTS.hvacType
  if (inputs.hvacType == null) {
    assumptions.push('HVAC type defaulted to "heat-pump".')
  }
  if (hvacType !== "heat-pump") {
    assumptions.push(
      `HVAC type "${hvacType}" uses the heat pump assembly. Ductwork is still priced from floor area.`
    )
  }

  assumptions.push(
    `Plan is a rectangle with length/width ${PLAN_ASPECT}. Wall height is 8 ft per story.`
  )

  const footprintM2 = toSiQuantity(inputs.footprintSqft, "m2", "imperial")
  const garageM2 = toSiQuantity(garageSqft, "m2", "imperial")
  const plan = rectangle(footprintM2)
  const garagePlan = garageM2 > 0 ? rectangle(garageM2) : { perimeterM: 0 }
  const floorM2 = footprintM2 * stories
  const exteriorWallM2 =
    plan.perimeterM * STORY_HEIGHT_M * stories +
    garagePlan.perimeterM * STORY_HEIGHT_M
  const roofPitchFactor = Math.sqrt(1 + roofPitch ** 2)
  const roofM2 = (footprintM2 + garageM2) * roofPitchFactor

  let foundationM2 = footprintM2 + garageM2
  if (foundation === "crawlspace") {
    foundationM2 *= CRAWLSPACE_AREA_FACTOR
    assumptions.push(
      `Crawlspace concrete area is ${CRAWLSPACE_AREA_FACTOR} of the footprint. The slab assembly is the only concrete assembly.`
    )
  } else if (foundation === "basement") {
    foundationM2 += plan.perimeterM * STORY_HEIGHT_M
    assumptions.push(
      "Basement concrete area is the footprint plus the perimeter wall. The slab assembly is the only concrete assembly."
    )
  } else {
    assumptions.push(
      "Slab area is the footprint plus any garage. The slab assembly is a placeholder, not a structural section."
    )
  }

  const fullBaths = Math.floor(bathrooms)
  const halfBaths = bathrooms - fullBaths >= 0.5 - 1e-9 ? 1 : 0
  const fixtures = fullBaths * 3 + halfBaths * 2 + 1
  const electricalPoints = bedrooms * 6 + fullBaths * 3 + halfBaths * 2 + 6
  const floorSqft = inputs.footprintSqft * stories
  const windowCount = Math.max(1, Math.ceil(floorSqft / WINDOW_FLOOR_SQFT))
  const exteriorDoorCount = EXTERIOR_DOORS
  const interiorDoorCount = bedrooms + fullBaths + halfBaths + INTERIOR_DOOR_EXTRAS
  const wallRunM = plan.perimeterM * stories
  const exteriorStuds =
    wallRunM / STUD_SPACING_M +
    4 * CORNER_STUDS * stories +
    (windowCount + exteriorDoorCount) * OPENING_STUDS
  const plateLengthM = PLATE_RUNS * wallRunM
  const headerCount = windowCount + exteriorDoorCount
  const partitionRooms = bedrooms + fullBaths + halfBaths
  const partitionM = partitionRooms * PARTITION_M
  const stairRuns = Math.max(0, stories - 1)
  const lightFixtures = Math.max(1, Math.ceil(floorSqft / LIGHT_FLOOR_SQFT))

  assumptions.push(
    `Plumbing fixtures = ${fullBaths} full baths × 3 + ${halfBaths} half baths × 2 + 1 kitchen sink (${fixtures}).`
  )
  assumptions.push(
    "Each plumbing fixture includes a placeholder set of valves and fittings."
  )
  assumptions.push("Water heater quantity is 1 per house.")
  assumptions.push(
    `Electrical points = bedrooms × 6 + full baths × 3 + half baths × 2 + 6 (${electricalPoints}).`
  )
  assumptions.push("Each electrical point includes one box.")
  assumptions.push("Breaker panel quantity is 1 per house.")
  assumptions.push(
    `Light fixtures = 1 per ${LIGHT_FLOOR_SQFT} sqft of floor (${lightFixtures}).`
  )
  assumptions.push("HVAC quantity is one heat pump.")
  assumptions.push(
    "Ductwork is priced from floor area, not a fixed length."
  )
  assumptions.push(
    `Windows = 1 per ${WINDOW_FLOOR_SQFT} sqft of floor (${windowCount}).`
  )
  assumptions.push(
    `Exterior doors = ${exteriorDoorCount}. A garage door is not included.`
  )
  assumptions.push(
    `Interior doors = bedrooms + bathrooms + ${INTERIOR_DOOR_EXTRAS} (${interiorDoorCount}).`
  )
  assumptions.push(
    `Exterior studs are 16 in on center along ${stories} stories of wall, plus ${CORNER_STUDS} studs at each corner per story, plus ${OPENING_STUDS} studs per window and exterior door (${Math.ceil(exteriorStuds)}).`
  )
  assumptions.push(
    `Exterior plates are ${PLATE_RUNS} runs (one bottom and a double top) along each story's wall.`
  )
  assumptions.push(
    `Each window and exterior door has one header (${headerCount}).`
  )
  assumptions.push(
    `Interior partitions allow 12 ft of wall per bedroom and bathroom (${partitionRooms} rooms).`
  )
  assumptions.push(
    stairRuns === 0
      ? "Stairs = 0 because the house is one story."
      : `Stairs = stories − 1 (${stairRuns}). One straight run per story above the first.`
  )
  assumptions.push(
    "Excavation and grading cover the house footprint plus any garage. Depth is a placeholder assembly factor."
  )

  return {
    region,
    zip: inputs.zip ?? null,
    footprintSqft: inputs.footprintSqft,
    stories,
    floorSqft: inputs.footprintSqft * stories,
    foundation,
    roofPitch,
    garageSqft,
    bedrooms,
    bathrooms,
    finishGrade,
    finishFactor,
    hvacType,
    footprintM2,
    garageM2,
    floorM2,
    perimeterM: plan.perimeterM,
    exteriorWallM2,
    roofM2,
    foundationM2,
    fixtures,
    electricalPoints,
    hvacSystems: 1,
    windowCount,
    exteriorDoorCount,
    interiorDoorCount,
    exteriorStuds,
    plateLengthM,
    headerCount,
    partitionM,
    stairRuns,
    lightFixtures,
    waterHeaters: 1,
    breakerPanels: 1,
    assumptions,
  }
}
