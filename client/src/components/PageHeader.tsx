import type { ReactNode } from "react"

import { ThemeToggle } from "@/components/ThemeToggle"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  leading,
  actions,
  titleClassName,
}: {
  title: string
  leading?: ReactNode
  actions?: ReactNode
  titleClassName?: string
}) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        {leading}
        <h1
          className={cn(
            "truncate text-xl font-semibold text-text",
            titleClassName
          )}
        >
          {title}
        </h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  )
}
