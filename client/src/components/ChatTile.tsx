import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react"
import { FileText, X } from "lucide-react"

import { ChatInput } from "@/components/ChatInput"
import { Card } from "@/components/Card"
import { GhostButton } from "@/components/GhostButton"
import { PrimaryButton } from "@/components/PrimaryButton"
import { assumptionChips, type AssumptionChip } from "@/lib/assumptionChips"
import { uploadPlan } from "@/lib/chatClient"
import type { ChatMessage, HouseInputs } from "@/lib/estimate"
import { focusRing } from "@/lib/focus-ring"
import { usePrefersReducedMotion } from "@/lib/motion"
import { formatFileSize, selectPlanFiles } from "@/lib/planFiles"
import { cn } from "@/lib/utils"

type PlanAttachment = {
  localId: string
  file: File
  name: string
  size: number
  previewUrl: string | null
  status: "uploading" | "ready" | "error"
  fileId?: string
  error?: string
}

const SUGGESTIONS = [
  { label: "Add garage", message: "Add a 400 square foot garage." },
  { label: "Premium finishes", message: "Change the finish grade to premium." },
]

export function ChatTile({
  messages,
  inputs,
  streaming,
  toolLabel,
  sessionId,
  onSession,
  onSend,
}: {
  messages: ChatMessage[]
  inputs: HouseInputs | null
  streaming: boolean
  toolLabel: string | null
  sessionId?: string
  onSession: (sessionId: string) => void
  onSend: (message: string, fileIds?: string[]) => void
}) {
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState<AssumptionChip | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editError, setEditError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<PlanAttachment[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState("")
  const [dragging, setDragging] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const dragDepth = useRef(0)
  const sessionIdRef = useRef(sessionId)
  const sessionGate = useRef<Promise<string> | null>(null)
  const abortRef = useRef(new Map<string, AbortController>())
  const attachmentsRef = useRef(attachments)
  const chips = assumptionChips(inputs)
  const reducedMotion = usePrefersReducedMotion()
  const latestAssistantId = messages.findLast(
    (message) => message.role === "assistant"
  )?.id

  useEffect(() => {
    sessionIdRef.current = sessionId
    attachmentsRef.current = attachments
  }, [sessionId, attachments])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: "end",
      behavior: reducedMotion ? "auto" : "smooth",
    })
  }, [messages, toolLabel, reducedMotion])

  useEffect(() => {
    if (!editing) {
      return
    }
    document.getElementById("assumption-edit")?.focus()
  }, [editing])

  useEffect(() => {
    const controllers = abortRef.current
    return () => {
      for (const controller of controllers.values()) {
        controller.abort()
      }
      for (const item of attachmentsRef.current) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      }
    }
  }, [])

  function openChip(chip: AssumptionChip) {
    setEditing(chip)
    setEditValue(chip.value)
    setEditError(null)
  }

  function applyEdit() {
    if (!editing) {
      return
    }
    const next = editValue.trim()
    if (editing.editor === "number" && !(Number(next) > 0)) {
      setEditError("Enter a number greater than zero.")
      return
    }
    if (
      editing.key === "pitch" &&
      !/^\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/.test(next)
    ) {
      setEditError("Use a pitch such as 6/12.")
      return
    }
    onSend(editing.toMessage(next))
    setEditing(null)
  }

  function rememberSession(nextSessionId: string) {
    sessionIdRef.current = nextSessionId
    onSession(nextSessionId)
  }

  async function sessionForUpload() {
    if (sessionIdRef.current) {
      return sessionIdRef.current
    }
    if (!sessionGate.current) {
      return undefined
    }
    return sessionGate.current
  }

  function startUpload(item: PlanAttachment) {
    const controller = new AbortController()
    abortRef.current.set(item.localId, controller)
    const createsSession = !sessionIdRef.current && !sessionGate.current
    let publishSession: ((id: string) => void) | undefined
    let failSession: ((error: Error) => void) | undefined
    if (createsSession) {
      sessionGate.current = new Promise((resolve, reject) => {
        publishSession = resolve
        failSession = reject
      })
    }

    void (async () => {
      try {
        const knownSession = createsSession
          ? undefined
          : await sessionForUpload()
        const saved = await uploadPlan(
          item.file,
          knownSession,
          controller.signal
        )
        rememberSession(saved.sessionId)
        publishSession?.(saved.sessionId)
        setAttachments((current) =>
          current.map((entry) =>
            entry.localId === item.localId
              ? {
                  ...entry,
                  status: "ready",
                  fileId: saved.fileId,
                  error: undefined,
                }
              : entry
          )
        )
        setUploadStatus(`${item.name} uploaded`)
      } catch (caught) {
        if (controller.signal.aborted) {
          return
        }
        if (createsSession) {
          sessionGate.current = null
          failSession?.(
            caught instanceof Error
              ? caught
              : new Error("Could not upload that file.")
          )
        }
        const message =
          caught instanceof Error
            ? caught.message
            : "Could not upload that file."
        setAttachments((current) =>
          current.map((entry) =>
            entry.localId === item.localId
              ? { ...entry, status: "error", error: message }
              : entry
          )
        )
        setUploadStatus(`${item.name} could not be uploaded`)
      } finally {
        abortRef.current.delete(item.localId)
      }
    })()
  }

  function addFiles(files: File[]) {
    if (streaming) {
      return
    }
    const { accepted, notice: limitNotice } = selectPlanFiles(
      attachments.length,
      files
    )
    setNotice(limitNotice || null)
    if (accepted.length === 0) {
      return
    }
    const next = accepted.map((file) => ({
      localId: crypto.randomUUID(),
      file,
      name: file.name || "floor plan",
      size: file.size,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
      status: "uploading" as const,
    }))
    setAttachments((current) => [...current, ...next])
    setUploadStatus(
      next.length === 1
        ? `Uploading ${next[0].name}`
        : `Uploading ${next.length} files`
    )
    for (const item of next) {
      startUpload(item)
    }
  }

  function removeAttachment(localId: string) {
    abortRef.current.get(localId)?.abort()
    abortRef.current.delete(localId)
    const item = attachments.find((entry) => entry.localId === localId)
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
    if (item) {
      setUploadStatus(`Removed ${item.name}`)
    }
    setAttachments((current) =>
      current.filter((entry) => entry.localId !== localId)
    )
  }

  function retryAttachment(localId: string) {
    const item = attachments.find((entry) => entry.localId === localId)
    if (!item) {
      return
    }
    setAttachments((current) =>
      current.map((entry) =>
        entry.localId === localId
          ? { ...entry, status: "uploading", error: undefined }
          : entry
      )
    )
    setUploadStatus(`Uploading ${item.name}`)
    startUpload(item)
  }

  function onDragEnter(event: DragEvent) {
    if (!hasFiles(event) || streaming) {
      return
    }
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function onDragOver(event: DragEvent) {
    if (!hasFiles(event) || streaming) {
      return
    }
    event.preventDefault()
  }

  function onDragLeave(event: DragEvent) {
    if (!hasFiles(event)) {
      return
    }
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }

  function onDrop(event: DragEvent) {
    if (!hasFiles(event)) {
      return
    }
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    addFiles([...event.dataTransfer.files])
  }

  function onPaste(event: ClipboardEvent) {
    const images = [...event.clipboardData.files].filter((file) =>
      file.type.startsWith("image/")
    )
    if (images.length === 0) {
      return
    }
    event.preventDefault()
    addFiles(images)
  }

  const uploading = attachments.some((item) => item.status === "uploading")
  const hasError = attachments.some((item) => item.status === "error")
  const readyIds = attachments.flatMap((item) =>
    item.status === "ready" && item.fileId ? [item.fileId] : []
  )
  const canSend =
    !streaming &&
    !uploading &&
    !hasError &&
    (draft.trim() !== "" || readyIds.length > 0)

  return (
    <Card
      className="relative flex h-full min-h-[32rem] flex-col gap-4 min-[900px]:col-span-2 min-[900px]:row-span-2 min-[900px]:min-h-[560px]"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={onPaste}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-card border-2 border-dashed border-accent bg-bg/90">
          <p className="text-base font-medium text-text">
            Drop floor plan here
          </p>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {uploadStatus}
      </p>
      <h2 className="text-sm font-medium text-text-secondary">Chat</h2>
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <p className="text-base text-text-secondary">
            Include the ZIP, footprint, and number of stories.
          </p>
        ) : (
          messages.map((message) => {
            const announce = message.id === latestAssistantId
            const waiting = streaming && announce && message.text === ""
            return (
              <p
                key={message.id}
                className={cn(
                  "max-w-[90%] rounded-control px-3 py-2 text-sm whitespace-pre-wrap text-text",
                  message.role === "user"
                    ? "ml-auto bg-surface-raised"
                    : "mr-auto"
                )}
                aria-live={announce ? "polite" : undefined}
                aria-atomic={announce ? false : undefined}
                aria-busy={waiting ? true : undefined}
              >
                {message.text ? (
                  message.text
                ) : waiting ? (
                  <span aria-hidden="true">…</span>
                ) : null}
              </p>
            )
          })
        )}
        {toolLabel ? (
          <p className="text-sm text-text-muted" role="status">
            {toolLabel}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={cn(
                  "inline-flex min-h-11 items-center rounded-control border border-border bg-surface-raised px-3 text-sm text-text-secondary",
                  focusRing,
                  editing?.key === chip.key && "border-accent text-text"
                )}
                aria-pressed={editing?.key === chip.key}
                aria-label={`Change ${chip.label}`}
                onClick={() => openChip(chip)}
                disabled={streaming}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {editing ? (
            <form
              className="flex flex-col gap-3 rounded-control border border-border bg-bg p-3"
              onSubmit={(event) => {
                event.preventDefault()
                applyEdit()
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault()
                  setEditing(null)
                }
              }}
            >
              <label
                className="text-sm text-text-secondary"
                htmlFor="assumption-edit"
              >
                {editing.label}
              </label>
              {editing.editor === "select" ? (
                <select
                  id="assumption-edit"
                  className={cn(
                    "min-h-11 rounded-control border border-border bg-surface px-3 text-base text-text",
                    focusRing
                  )}
                  value={editValue}
                  aria-invalid={editError ? true : undefined}
                  aria-describedby={
                    editError ? "assumption-edit-error" : undefined
                  }
                  onChange={(event) => setEditValue(event.target.value)}
                >
                  {editing.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <ChatInput
                  id="assumption-edit"
                  inputMode={editing.editor === "number" ? "decimal" : "text"}
                  value={editValue}
                  aria-invalid={editError ? true : undefined}
                  aria-describedby={
                    editError ? "assumption-edit-error" : undefined
                  }
                  onChange={(event) => setEditValue(event.target.value)}
                />
              )}
              {editError ? (
                <p
                  id="assumption-edit-error"
                  className="text-sm text-text"
                  role="alert"
                >
                  {editError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <PrimaryButton type="submit">Update</PrimaryButton>
                <GhostButton type="button" onClick={() => setEditing(null)}>
                  Cancel
                </GhostButton>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <GhostButton
            key={suggestion.label}
            disabled={streaming}
            onClick={() => onSend(suggestion.message)}
          >
            {suggestion.label}
          </GhostButton>
        ))}
      </div>
      {notice ? (
        <p className="text-sm text-text" role="status">
          {notice}
        </p>
      ) : null}
      {attachments.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {attachments.map((item) => (
            <li
              key={item.localId}
              className="flex items-center gap-2 rounded-control border border-border bg-surface-raised p-1"
            >
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt=""
                  className="size-11 shrink-0 rounded-control object-cover"
                />
              ) : (
                <span className="inline-flex size-11 shrink-0 items-center justify-center text-text">
                  <FileText aria-hidden="true" className="size-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text">
                  {item.name}
                </span>
                <span className="block text-sm text-text-muted">
                  {formatFileSize(item.size)}
                  {item.status === "uploading" ? " · Uploading" : ""}
                  {item.status === "error" ? ` · ${item.error}` : ""}
                </span>
              </span>
              {item.status === "error" ? (
                <button
                  type="button"
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-control px-3 text-sm text-text",
                    focusRing
                  )}
                  onClick={() => retryAttachment(item.localId)}
                >
                  Retry
                </button>
              ) : null}
              <button
                type="button"
                className={cn(
                  "inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text",
                  focusRing
                )}
                aria-label={`Remove ${item.name}`}
                onClick={() => removeAttachment(item.localId)}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSend) {
            return
          }
          const text = draft.trim()
          const shown =
            text ||
            `Attached ${attachments.map((item) => item.name).join(", ")}`
          for (const item of attachments) {
            if (item.previewUrl) {
              URL.revokeObjectURL(item.previewUrl)
            }
          }
          setDraft("")
          setAttachments([])
          setNotice(null)
          onSend(shown, readyIds)
        }}
      >
        <ChatInput
          id="message"
          aria-label="Message"
          placeholder="Describe the house"
          value={draft}
          disabled={streaming}
          onFilesSelected={addFiles}
          onChange={(event) => setDraft(event.target.value)}
        />
        <PrimaryButton type="submit" disabled={!canSend}>
          Send
        </PrimaryButton>
      </form>
    </Card>
  )
}

function hasFiles(event: DragEvent) {
  return [...event.dataTransfer.types].includes("Files")
}
