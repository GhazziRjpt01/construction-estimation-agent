import type { HouseInputs } from "@/lib/estimate"

export type AssumptionChip = {
  key: string
  label: string
  value: string
  editor: "text" | "number" | "select"
  options?: { value: string; label: string }[]
  toMessage: (next: string) => string
}

const FOUNDATIONS = [
  { value: "slab", label: "Slab" },
  { value: "crawlspace", label: "Crawlspace" },
  { value: "basement", label: "Basement" },
]

const FINISHES = [
  { value: "economy", label: "Economy" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
]

export function assumptionChips(inputs: HouseInputs | null): AssumptionChip[] {
  if (!inputs?.footprintSqft || !inputs.stories) {
    return []
  }

  const garage =
    inputs.garage === true ? "400" : inputs.garage ? String(inputs.garage) : "0"

  return [
    textChip(
      "zip",
      inputs.zip ? `ZIP ${inputs.zip}` : "ZIP",
      inputs.zip ?? "",
      (next) => `Change the ZIP to ${next}.`
    ),
    textChip(
      "footprint",
      `${formatCount(inputs.footprintSqft)} sqft`,
      String(inputs.footprintSqft),
      (next) => `Change the footprint to ${next} square feet.`,
      "number"
    ),
    textChip(
      "stories",
      `${inputs.stories} ${inputs.stories === 1 ? "story" : "stories"}`,
      String(inputs.stories),
      (next) => `Change stories to ${next}.`,
      "number"
    ),
    selectChip(
      "foundation",
      labelFor(FOUNDATIONS, inputs.foundation ?? "slab"),
      inputs.foundation ?? "slab",
      FOUNDATIONS,
      (next) => `Change the foundation to ${next}.`
    ),
    textChip(
      "pitch",
      `${formatPitch(inputs.roofPitch)} pitch`,
      formatPitch(inputs.roofPitch),
      (next) => `Change the roof pitch to ${next}.`
    ),
    textChip(
      "garage",
      garage === "0"
        ? "No garage"
        : `${formatCount(Number(garage))} sqft garage`,
      garage === "0" ? "" : garage,
      (next) =>
        next.trim() === "" || Number(next) === 0
          ? "Remove the garage."
          : `Change the garage to ${next} square feet.`
    ),
    textChip(
      "bedrooms",
      `${inputs.bedrooms ?? 3} bedrooms`,
      String(inputs.bedrooms ?? 3),
      (next) => `Change bedrooms to ${next}.`,
      "number"
    ),
    textChip(
      "bathrooms",
      `${inputs.bathrooms ?? 2} baths`,
      String(inputs.bathrooms ?? 2),
      (next) => `Change bathrooms to ${next}.`,
      "number"
    ),
    selectChip(
      "finish",
      labelFor(FINISHES, inputs.finishGrade ?? "standard"),
      inputs.finishGrade ?? "standard",
      FINISHES,
      (next) => `Change the finish grade to ${next}.`
    ),
    textChip(
      "hvac",
      formatHvac(inputs.hvacType ?? "heat-pump"),
      inputs.hvacType ?? "heat-pump",
      (next) => `Change HVAC to ${next}.`
    ),
  ]
}

function textChip(
  key: string,
  label: string,
  value: string,
  toMessage: (next: string) => string,
  editor: "text" | "number" = "text"
): AssumptionChip {
  return { key, label, value, editor, toMessage }
}

function selectChip(
  key: string,
  label: string,
  value: string,
  options: { value: string; label: string }[],
  toMessage: (next: string) => string
): AssumptionChip {
  return { key, label, value, editor: "select", options, toMessage }
}

function labelFor(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value)
}

export function formatPitch(pitch: HouseInputs["roofPitch"]) {
  if (typeof pitch === "string" && pitch.trim()) {
    return pitch
  }
  if (typeof pitch !== "number" || !Number.isFinite(pitch)) {
    return "6/12"
  }
  const rise = pitch * 12
  if (Math.abs(rise - Math.round(rise)) < 0.05) {
    return `${Math.round(rise)}/12`
  }
  return String(pitch)
}

function formatHvac(value: string) {
  if (value === "heat-pump") {
    return "Heat pump"
  }
  return value
}
