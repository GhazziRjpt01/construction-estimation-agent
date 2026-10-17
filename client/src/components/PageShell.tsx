import type { ReactNode } from "react"

import { SkipLink } from "@/components/SkipLink"

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-6 min-[900px]:px-8">
      <SkipLink />
      {children}
    </div>
  )
}
