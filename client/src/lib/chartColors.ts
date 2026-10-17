export const DIVISION_COLORS = [
  "#E2B263",
  "#B8832F",
  "#C5CEDA",
  "#7A8798",
  "#4C5967",
  "#A8B4C2",
  "#2F3A47",
  "#6E8B74",
  "#8C6A4A",
]

const LIGHT_DIVISION_COLORS = [
  "#7A4E0C",
  "#5E3B09",
  "#3A3126",
  "#1F4E5F",
  "#6B5E52",
  "#8A5A3A",
  "#4C5967",
  "#2F5D50",
  "#6E4B32",
]

export function divisionColor(index: number, theme: "dark" | "light" = "dark") {
  const palette = theme === "light" ? LIGHT_DIVISION_COLORS : DIVISION_COLORS
  return palette[index % palette.length]
}
