import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function Chip({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-control border border-border bg-surface-raised px-3 py-1 text-sm text-text-secondary",
        className
      )}
      {...props}
    />
  )
}
