import { useRef, type ComponentProps } from "react"
import { Paperclip } from "lucide-react"

import { focusRing } from "@/lib/focus-ring"
import { PLAN_ACCEPT } from "@/lib/planFiles"
import { cn } from "@/lib/utils"

const fieldClass =
  "min-h-11 w-full rounded-control border border-border bg-surface px-4 text-base text-text placeholder:text-text-muted disabled:text-text-muted"

export function ChatInput({
  className,
  onFilesSelected,
  ...props
}: ComponentProps<"input"> & {
  onFilesSelected?: (files: File[]) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  if (!onFilesSelected) {
    return <input className={cn(fieldClass, focusRing, className)} {...props} />
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <button
        type="button"
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-control bg-surface-raised text-text disabled:text-text-muted",
          focusRing
        )}
        aria-label="Attach floor plan or photo"
        disabled={props.disabled}
        onClick={() => fileRef.current?.click()}
      >
        <Paperclip aria-hidden="true" className="size-5" />
      </button>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept={PLAN_ACCEPT}
        multiple
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ""
          if (files.length > 0) {
            onFilesSelected(files)
          }
        }}
      />
      <input
        className={cn(fieldClass, "min-w-0 flex-1", focusRing, className)}
        {...props}
      />
    </div>
  )
}
