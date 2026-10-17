export const PLAN_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function pathsOlderThan(files, now, ttl = PLAN_TTL_MS) {
  return files
    .filter((file) => {
      const created = Date.parse(file.createdAt)
      return Number.isFinite(created) && now - created > ttl
    })
    .map((file) => file.path)
}

export async function collectExpiredPaths(storage, now = Date.now()) {
  const expired = []
  const { data: root, error } = await storage.list("")
  if (error) {
    throw error
  }
  for (const entry of root ?? []) {
    if (entry.id) {
      if (isOlder(entry, now)) {
        expired.push(entry.name)
      }
      continue
    }
    const { data: nested, error: nestedError } = await storage.list(entry.name)
    if (nestedError) {
      throw nestedError
    }
    for (const file of nested ?? []) {
      if (file.id && isOlder(file, now)) {
        expired.push(`${entry.name}/${file.name}`)
      }
    }
  }
  return expired
}

function isOlder(entry, now) {
  const created = Date.parse(entry.created_at ?? "")
  return Number.isFinite(created) && now - created > PLAN_TTL_MS
}
