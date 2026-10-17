import type { ComponentProps } from "react"

import { focusRing } from "@/lib/focus-ring"
import { cn } from "@/lib/utils"

export function PrimaryButton({
  className,
  type = "button",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-control bg-accent px-4 text-sm font-medium text-accent-ink transition-colors hover:bg-chart-2 disabled:pointer-events-none disabled:bg-surface-raised disabled:text-text-muted",
        focusRing,
        className
      )}
      {...props}
    />
  )
}
