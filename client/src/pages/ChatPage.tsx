import { useRef, useState } from "react"
import { Link } from "react-router"

import { ChatTile } from "@/components/ChatTile"
import { CostSplitTile } from "@/components/CostSplitTile"
import { ExportTile } from "@/components/ExportTile"
import { GhostButton } from "@/components/GhostButton"
import { HeroTile } from "@/components/HeroTile"
import { MaterialsTile } from "@/components/MaterialsTile"
import { PageHeader } from "@/components/PageHeader"
import { PageShell } from "@/components/PageShell"
import { downloadEstimate, saveEstimate, streamChat } from "@/lib/chatClient"
import {
  DISCLAIMER,
  type ChatMessage,
  type Estimate,
  type HouseInputs,
} from "@/lib/estimate"
import { focusRing } from "@/lib/focus-ring"
import { cn } from "@/lib/utils"

const TOOL_LABELS: Record<string, string> = {
  extract_house_inputs: "Recording the house",
  run_estimate: "Running the estimate",
  compare_scenarios: "Comparing scenarios",
  get_rates: "Reading rates",
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string>()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [inputs, setInputs] = useState<HouseInputs | null>(null)
  const [estimateId, setEstimateId] = useState<string | null>(null)
  const [preparingExport, setPreparingExport] = useState(false)
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "streaming" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [toolLabel, setToolLabel] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const saveRef = useRef(0)
  const sessionRef = useRef<string | undefined>(undefined)

  const loading = status === "streaming" && !estimate
  const updating = status === "streaming" && estimate !== null

  function rememberSession(id: string) {
    sessionRef.current = id
    setSessionId(id)
  }

  async function send(text: string, fileIds: string[] = []) {
    const message = text.trim()
    if ((!message && fileIds.length === 0) || status === "streaming") {
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const assistantId = crypto.randomUUID()
    setError(null)
    setStatus("streaming")
    setToolLabel(null)
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: message },
      { id: assistantId, role: "assistant", text: "" },
    ])

    try {
      await streamChat(
        {
          sessionId: sessionRef.current,
          message,
          ...(fileIds.length > 0 ? { fileIds } : {}),
        },
        (event) => {
          if (event.event === "session" && event.data.sessionId) {
            sessionRef.current = event.data.sessionId
            setSessionId(event.data.sessionId)
          }
          if (event.event === "delta" && event.data.text) {
            const chunk = event.data.text
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId
                  ? { ...item, text: item.text + chunk }
                  : item
              )
            )
          }
          if (event.event === "tool" && event.data.name) {
            setToolLabel(TOOL_LABELS[event.data.name] ?? "Working")
          }
          if (event.event === "done") {
            if (event.data.sessionId) {
              sessionRef.current = event.data.sessionId
              setSessionId(event.data.sessionId)
            }
            if (event.data.text) {
              const finalText = event.data.text
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId ? { ...item, text: finalText } : item
                )
              )
            }
            if (event.data.estimate) {
              setEstimate(event.data.estimate)
              setInputs(event.data.inputs ?? null)
              setEstimateId(null)
              setExportError(null)
              void persist(event.data.inputs)
            }
            setToolLabel(null)
          }
        },
        controller.signal
      )
      setStatus("idle")
    } catch (caught) {
      if (controller.signal.aborted) {
        return
      }
      setToolLabel(null)
      setStatus("error")
      setError(
        caught instanceof Error
          ? caught.message
          : "The estimator could not reply."
      )
      setMessages((current) =>
        current.filter((item) => item.id !== assistantId || item.text !== "")
      )
    }
  }

  function retry() {
    const lastUser = [...messages]
      .reverse()
      .find((item) => item.role === "user")
    if (!lastUser) {
      return
    }
    setMessages((current) => {
      const next = [...current]
      const last = next.at(-1)
      if (last?.role === "assistant" && last.text === "") {
        next.pop()
      }
      if (next.at(-1)?.id === lastUser.id) {
        next.pop()
      }
      return next
    })
    setStatus("idle")
    void send(lastUser.text)
  }

  async function persist(next: HouseInputs | undefined) {
    if (!next?.footprintSqft) {
      return
    }
    const token = saveRef.current + 1
    saveRef.current = token
    setPreparingExport(true)
    try {
      const id = await saveEstimate(next)
      if (saveRef.current === token) {
        setEstimateId(id)
        setExportError(null)
      }
    } catch (caught) {
      if (saveRef.current === token) {
        setExportError(
          caught instanceof Error
            ? caught.message
            : "Could not prepare the export."
        )
      }
    } finally {
      if (saveRef.current === token) {
        setPreparingExport(false)
      }
    }
  }

  async function onExport(format: "pdf" | "xlsx") {
    if (!estimateId) {
      return
    }
    setExporting(format)
    setExportError(null)
    try {
      await downloadEstimate(estimateId, format)
    } catch (caught) {
      setExportError(
        caught instanceof Error ? caught.message : "The download failed."
      )
    } finally {
      setExporting(null)
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="House estimate"
        actions={
          <nav aria-label="Pages" className="flex flex-wrap items-center gap-2">
            {estimateId ? (
              <Link
                to={`/report/${estimateId}`}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-control px-4 text-sm text-text",
                  focusRing
                )}
              >
                Open full report
              </Link>
            ) : null}
            <Link
              to="/rates"
              className={cn(
                "inline-flex min-h-11 items-center rounded-control px-4 text-sm text-text-secondary",
                focusRing
              )}
            >
              Rates
            </Link>
          </nav>
        }
      />
      <main id="content" tabIndex={-1} className="flex flex-col outline-none">
        {loading ? (
          <p className="sr-only" role="status">
            Loading the estimate
          </p>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-4 py-3"
          >
            <p className="text-sm text-text">{error}</p>
            <GhostButton type="button" onClick={retry}>
              Try again
            </GhostButton>
          </div>
        ) : null}
        <div className="grid grid-cols-1 items-stretch gap-4 min-[900px]:grid-cols-4">
          <HeroTile
            estimate={estimate}
            inputs={inputs}
            loading={loading}
            updating={updating}
          />
          <ChatTile
            messages={messages}
            inputs={inputs}
            streaming={status === "streaming"}
            toolLabel={toolLabel}
            sessionId={sessionId}
            onSession={rememberSession}
            onSend={(message, fileIds) => void send(message, fileIds)}
          />
          <CostSplitTile estimate={estimate} loading={loading} />
          <MaterialsTile estimate={estimate} loading={loading} />
          <ExportTile
            ready={estimateId !== null}
            preparing={preparingExport}
            loading={loading}
            exporting={exporting}
            error={exportError}
            reportHref={estimateId ? `/report/${estimateId}` : null}
            onExport={(format) => void onExport(format)}
          />
        </div>
        <p className="mt-6 text-sm text-text-secondary">{DISCLAIMER}</p>
        <span className="sr-only">
          {sessionId ? `Session ${sessionId}` : ""}
        </span>
      </main>
    </PageShell>
  )
}
