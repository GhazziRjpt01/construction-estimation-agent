import type { SavedEstimate } from "@/lib/estimate"

export type RateBook = {
  updatedAt?: string | null
  region: {
    id: string
    country: string
    currency: string
    unitSystem: string
  }
  materials: {
    code: string
    name: string
    unit: string
    category: string
  }[]
  prices: {
    code: string
    name: string
    unit: string
    unitCost: number
    placeholder: boolean
    notes: string | null
  }[]
  laborRates: {
    trade: string
    hourlyRate: number
    placeholder: boolean
    notes: string | null
  }[]
}

function apiUrl(path: string) {
  const configured = import.meta.env.VITE_API_URL
  const base =
    typeof configured === "string" ? configured.replace(/\/$/, "") : ""
  return `${base}${path}`
}

export type ChatEvent = {
  event: string
  data: {
    sessionId?: string
    text?: string
    name?: string
    error?: string
    estimate?: import("./estimate").Estimate | null
    inputs?: import("./estimate").HouseInputs
  }
}

export async function uploadPlan(
  file: File,
  sessionId: string | undefined,
  signal?: AbortSignal
) {
  const body = new FormData()
  body.append("file", file)
  if (sessionId) {
    body.append("sessionId", sessionId)
  }
  const response = await fetch(apiUrl("/api/uploads"), {
    method: "POST",
    body,
    signal,
  })
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  const saved = (await response.json()) as {
    fileId?: string
    sessionId?: string
  }
  if (!saved.fileId || !saved.sessionId) {
    throw new Error("The file was not stored.")
  }
  return { fileId: saved.fileId, sessionId: saved.sessionId }
}

export async function streamChat(
  body: { sessionId?: string; message: string; fileIds?: string[] },
  onEvent: (event: ChatEvent) => void,
  signal: AbortSignal
) {
  const response = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(await errorMessage(response))
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
    let splitAt = buffer.indexOf("\n\n")
    while (splitAt !== -1) {
      const raw = buffer.slice(0, splitAt)
      buffer = buffer.slice(splitAt + 2)
      const event = parseEvent(raw)
      if (event) {
        onEvent(event)
        if (event.event === "error") {
          throw new Error(
            event.data.error || "The assistant could not finish the reply."
          )
        }
      }
      splitAt = buffer.indexOf("\n\n")
    }
  }
}

export async function saveEstimate(inputs: import("./estimate").HouseInputs) {
  const response = await fetch(apiUrl("/api/estimate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  })
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  const body = (await response.json()) as { id?: string }
  if (!body.id) {
    throw new Error("The estimate was not saved.")
  }
  return body.id
}

export async function loadEstimate(id: string) {
  const response = await fetch(apiUrl(`/api/estimates/${id}`))
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  return (await response.json()) as SavedEstimate
}

export async function loadRates(region = "US-default") {
  const response = await fetch(
    apiUrl(`/api/rates?region=${encodeURIComponent(region)}`)
  )
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  return (await response.json()) as RateBook
}

export async function downloadEstimate(id: string, format: "pdf" | "xlsx") {
  const response = await fetch(
    apiUrl(`/api/estimate/${id}/export?format=${format}`),
    { method: "POST" }
  )
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const header = response.headers.get("Content-Disposition") ?? ""
  const match = /filename="([^"]+)"/.exec(header)
  link.href = url
  link.download = match?.[1] ?? `estimate-${id}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}

function parseEvent(raw: string): ChatEvent | null {
  let event = "message"
  const data: string[] = []
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim()
    } else if (line.startsWith("data:")) {
      data.push(line.slice(5).trim())
    }
  }
  if (data.length === 0) {
    return null
  }
  return { event, data: JSON.parse(data.join("\n")) }
}

async function errorMessage(response: Response) {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) {
      return body.error
    }
  } catch {
    // The body was not JSON.
  }
  return "The estimator could not reply."
}
