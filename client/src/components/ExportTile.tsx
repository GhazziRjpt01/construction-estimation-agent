import { Link } from "react-router"

import { Card } from "@/components/Card"
import { GhostButton } from "@/components/GhostButton"
import { PrimaryButton } from "@/components/PrimaryButton"
import { Skeleton } from "@/components/Skeleton"
import { focusRing } from "@/lib/focus-ring"
import { cn } from "@/lib/utils"

export function ExportTile({
  ready,
  preparing,
  loading,
  exporting,
  error,
  reportHref,
  onExport,
}: {
  ready: boolean
  preparing: boolean
  loading: boolean
  exporting: "pdf" | "xlsx" | null
  error: string | null
  reportHref: string | null
  onExport: (format: "pdf" | "xlsx") => void
}) {
  return (
    <Card className="flex h-full min-h-72 flex-col gap-4">
      <h2 className="text-sm font-medium text-text-secondary">Export</h2>
      {loading ? (
        <div className="flex flex-1 flex-col justify-end gap-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-end gap-3">
          <p className="text-sm text-text-secondary" role="status">
            {preparing
              ? "Preparing the download."
              : ready
                ? "Download this budget estimate."
                : "Export is available after an estimate is saved."}
          </p>
          {error ? (
            <p className="text-sm text-text" role="alert">
              {error}
            </p>
          ) : null}
          <PrimaryButton
            className="w-full"
            disabled={!ready || exporting !== null}
            onClick={() => onExport("pdf")}
          >
            {exporting === "pdf" ? "Exporting PDF" : "Export PDF"}
          </PrimaryButton>
          <GhostButton
            className="w-full"
            disabled={!ready || exporting !== null}
            onClick={() => onExport("xlsx")}
          >
            {exporting === "xlsx" ? "Exporting Excel" : "Export Excel"}
          </GhostButton>
          {reportHref ? (
            <Link
              to={reportHref}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-sm text-text-secondary",
                focusRing
              )}
            >
              Open full report
            </Link>
          ) : null}
        </div>
      )}
    </Card>
  )
}
