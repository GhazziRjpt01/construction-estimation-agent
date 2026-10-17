const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff]
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]

function startsWith(bytes, signature) {
  if (bytes.length < signature.length) {
    return false
  }
  return signature.every((byte, index) => bytes[index] === byte)
}

export function sniffPlanType(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes ?? [])
  if (startsWith(view, PNG)) {
    return "image/png"
  }
  if (startsWith(view, JPEG)) {
    return "image/jpeg"
  }
  if (startsWith(view, PDF)) {
    return "application/pdf"
  }
  return null
}

export function extensionForPlan(type) {
  if (type === "image/png") {
    return "png"
  }
  if (type === "image/jpeg") {
    return "jpg"
  }
  if (type === "application/pdf") {
    return "pdf"
  }
  return null
}
