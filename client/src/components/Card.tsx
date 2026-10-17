import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface p-5 text-text",
        className
      )}
      {...props}
    />
  )
}
