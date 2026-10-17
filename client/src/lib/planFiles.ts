export const PLAN_ACCEPT = "image/png,image/jpeg,application/pdf"
export const MAX_PLAN_FILES = 3
export const MAX_PLAN_BYTES = 10 * 1024 * 1024

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"])

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function selectPlanFiles(currentCount: number, incoming: File[]) {
  const notices: string[] = []
  const room = MAX_PLAN_FILES - currentCount
  if (room <= 0) {
    return { accepted: [] as File[], notice: "You can attach up to 3 files." }
  }
  if (incoming.length > room) {
    notices.push("You can attach up to 3 files.")
  }
  const accepted: File[] = []
  for (const file of incoming.slice(0, room)) {
    if (!looksLikePlan(file)) {
      notices.push(`${file.name} must be a PNG, JPG, or PDF.`)
      continue
    }
    if (file.size > MAX_PLAN_BYTES) {
      notices.push(`${file.name} is larger than 10 MB.`)
      continue
    }
    accepted.push(file)
  }
  return { accepted, notice: notices.join(" ") }
}

function looksLikePlan(file: File) {
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type
  if (ALLOWED_TYPES.has(type)) {
    return true
  }
  const name = file.name.toLowerCase()
  return [".png", ".jpg", ".jpeg", ".pdf"].some((extension) =>
    name.endsWith(extension)
  )
}
