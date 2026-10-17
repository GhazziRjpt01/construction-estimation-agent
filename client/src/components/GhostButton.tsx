import type { ComponentProps } from "react"

import { focusRing } from "@/lib/focus-ring"
import { cn } from "@/lib/utils"

export function GhostButton({
  className,
  type = "button",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-control border border-border bg-transparent px-4 text-sm font-medium text-text transition-colors hover:bg-surface-raised disabled:pointer-events-none disabled:text-text-muted",
        focusRing,
        className
      )}
      {...props}
    />
  )
}
