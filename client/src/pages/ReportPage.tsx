import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"

import { Card } from "@/components/Card"
import { DivisionSplitBar } from "@/components/DivisionSplitBar"
import { GhostButton } from "@/components/GhostButton"
import { KpiTile } from "@/components/KpiTile"
import { PageHeader } from "@/components/PageHeader"
import { PageShell } from "@/components/PageShell"
import { PrimaryButton } from "@/components/PrimaryButton"
import { Skeleton } from "@/components/Skeleton"
import { downloadEstimate, loadEstimate } from "@/lib/chatClient"
import {
  DISCLAIMER,
  NOT_INCLUDED,
  assumptionLines,
  divisionCost,
  formatMoney,
  formatQuantity,
  shownQuantity,
  shownUnit,
  type SavedEstimate,
} from "@/lib/estimate"
import { focusRing } from "@/lib/focus-ring"
import { cn } from "@/lib/utils"

export function ReportPage() {
  const { id } = useParams()
  const [saved, setSaved] = useState<SavedEstimate | null>(null)
  const [loadedId, setLoadedId] = useState(id)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  if (id !== loadedId) {
    setLoadedId(id)
    setSaved(null)
    setLoading(Boolean(id))
    setError(null)
    setExportError(null)
  }

  useEffect(() => {
    if (!id) {
      return
    }
    let cancelled = false
    loadEstimate(id)
      .then((report) => {
        if (!cancelled) {
          setSaved(report)
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load the report."
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function onExport(format: "pdf" | "xlsx") {
    if (!id) {
      return
    }
    setExporting(format)
    setExportError(null)
    try {
      await downloadEstimate(id, format)
    } catch (caught) {
      setExportError(
        caught instanceof Error ? caught.message : "The download failed."
      )
    } finally {
      setExporting(null)
    }
  }

  const estimate = saved?.result
  const totals = estimate?.totals
  const currency = estimate?.currency || "USD"
  const money = (value: number) => formatMoney(value, currency)
  const assumptions = estimate ? assumptionLines(estimate) : []
  const reportDate = saved?.createdAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(saved.createdAt))
    : null
  const allowance =
    totals?.overheadAndContingency !== undefined
      ? money(totals.overheadAndContingency)
      : "—"
  const allowanceDetail =
    totals?.overheadProfit !== undefined && totals.contingency !== undefined
      ? `Overhead ${money(totals.overheadProfit)} · Contingency ${money(totals.contingency)}`
      : undefined

  return (
    <PageShell>
      <PageHeader
        title={saved?.name || "House estimate"}
        titleClassName="text-2xl"
        leading={
          <Link
            to="/"
            className={cn(
              "inline-flex min-h-11 items-center text-sm text-text-secondary",
              focusRing
            )}
          >
            Estimate
          </Link>
        }
        actions={
          <>
            <PrimaryButton
              disabled={!saved || exporting !== null}
              onClick={() => void onExport("pdf")}
            >
              {exporting === "pdf" ? "Exporting PDF" : "Export PDF"}
            </PrimaryButton>
            <GhostButton
              disabled={!saved || exporting !== null}
              onClick={() => void onExport("xlsx")}
            >
              {exporting === "xlsx" ? "Exporting Excel" : "Export Excel"}
            </GhostButton>
          </>
        }
      />
      <main
        id="content"
        tabIndex={-1}
        className="flex flex-col gap-4 outline-none"
      >
        {exportError ? (
          <p className="text-sm text-text" role="alert">
            {exportError}
          </p>
        ) : null}
        {!id ? (
          <div
            role="alert"
            className="rounded-card border border-border bg-surface-raised px-4 py-3"
          >
            <p className="text-sm text-text">
              This report link is missing an id.
            </p>
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-4 py-3"
          >
            <p className="text-sm text-text">{error}</p>
            <Link
              to="/"
              className={cn(
                "inline-flex min-h-11 items-center rounded-control px-4 text-sm text-text",
                focusRing
              )}
            >
              Back to estimate
            </Link>
          </div>
        ) : null}
        {id && loading ? <ReportSkeleton /> : null}
        {estimate && totals ? (
          <>
            <section className="flex flex-col gap-1 text-sm text-text-secondary">
              {reportDate ? <p>{reportDate}</p> : null}
              <ProjectInputs inputs={saved?.inputs} />
            </section>
            <section className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-4 sm:grid-cols-2">
              <KpiTile
                label={totals.scopeLabel || "Partial estimate"}
                value={money(totals.total)}
                valueClassName="text-accent"
              />
              <KpiTile
                label="Range"
                value={`${money(totals.low)} – ${money(totals.high)}`}
                valueClassName="text-xl"
              />
              <KpiTile label="Cost per sqft" value={money(totals.perSqft)} />
              <KpiTile
                label="Overhead profit and contingency"
                value={allowance}
                subtext={allowanceDetail}
                valueClassName="text-2xl"
              />
            </section>
            <Card className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-text-secondary">
                Division split
              </h2>
              <DivisionSplitBar divisions={estimate.divisions} />
            </Card>
            <Card className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-text-secondary">
                Cost by division
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-secondary">
                      <th className="py-3 pr-4 font-medium" scope="col">
                        Division
                      </th>
                      <th
                        className="py-3 pr-4 text-right font-medium"
                        scope="col"
                      >
                        Material
                      </th>
                      <th
                        className="py-3 pr-4 text-right font-medium"
                        scope="col"
                      >
                        Labor
                      </th>
                      <th className="py-3 text-right font-medium" scope="col">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.divisions.length === 0 ? (
                      <tr>
                        <td className="py-3 text-text-secondary" colSpan={4}>
                          No division costs in this estimate.
                        </td>
                      </tr>
                    ) : null}
                    {estimate.divisions.map((division) => (
                      <tr
                        key={division.code}
                        className="border-b border-border"
                      >
                        <th
                          className="py-3 pr-4 font-medium text-text"
                          scope="row"
                        >
                          {division.code} {division.name}
                        </th>
                        <td className="py-3 pr-4 text-right numeric text-text">
                          {money(division.materialCost)}
                        </td>
                        <td className="py-3 pr-4 text-right numeric text-text">
                          {money(division.laborCost)}
                        </td>
                        <td className="py-3 text-right numeric text-text">
                          {money(divisionCost(division))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-text-secondary">
                Material quantities
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-secondary">
                      <th className="py-3 pr-4 font-medium" scope="col">
                        Division
                      </th>
                      <th className="py-3 pr-4 font-medium" scope="col">
                        Item
                      </th>
                      <th
                        className="py-3 pr-4 text-right font-medium"
                        scope="col"
                      >
                        Qty
                      </th>
                      <th className="py-3 pr-4 font-medium" scope="col">
                        Unit
                      </th>
                      <th className="py-3 text-right font-medium" scope="col">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.divisions.every(
                      (division) => division.materials.length === 0
                    ) ? (
                      <tr>
                        <td className="py-3 text-text-secondary" colSpan={5}>
                          No material quantities in this estimate.
                        </td>
                      </tr>
                    ) : null}
                    {estimate.divisions.flatMap((division) =>
                      division.materials.map((item) => (
                        <tr
                          key={`${division.code}-${item.code}`}
                          className="border-b border-border"
                        >
                          <td className="py-3 pr-4 text-text">
                            {division.code} {division.name}
                          </td>
                          <th
                            className="py-3 pr-4 font-medium text-text"
                            scope="row"
                          >
                            {item.name}
                          </th>
                          <td className="py-3 pr-4 text-right numeric text-text">
                            {formatQuantity(shownQuantity(item))}
                          </td>
                          <td className="py-3 pr-4 text-text-secondary">
                            {shownUnit(item)}
                          </td>
                          <td className="py-3 text-right numeric text-text">
                            {money(item.cost)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-text-secondary">
                Assumptions
              </h2>
              {assumptions.length === 0 ? (
                <p className="text-base text-text-secondary">
                  This estimate has no listed assumptions.
                </p>
              ) : (
                <ol className="flex list-decimal flex-col gap-2 pl-5">
                  {assumptions.map((line) => (
                    <li key={line} className="text-sm text-text">
                      {line}
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <Card className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-text-secondary">
                Not included
              </h2>
              <ul className="flex list-disc flex-col gap-2 pl-5">
                {(estimate.notIncluded ?? NOT_INCLUDED).map((item) => (
                  <li key={item} className="text-sm text-text">
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        ) : null}
        <p className="mt-2 text-sm text-text-secondary">{DISCLAIMER}</p>
      </main>
    </PageShell>
  )
}

function ProjectInputs({
  inputs,
}: {
  inputs: SavedEstimate["inputs"]
}) {
  if (!inputs) {
    return null
  }
  const parts = [
    inputs.footprintSqft != null ? `${inputs.footprintSqft} sqft footprint` : null,
    inputs.stories != null ? `${inputs.stories} stories` : null,
    inputs.zip ? `ZIP ${inputs.zip}` : null,
    inputs.foundation ? `${inputs.foundation} foundation` : null,
    inputs.bedrooms != null ? `${inputs.bedrooms} bedrooms` : null,
    inputs.bathrooms != null ? `${inputs.bathrooms} bathrooms` : null,
    inputs.finishGrade ? `${inputs.finishGrade} finish` : null,
  ].filter(Boolean)

  if (parts.length === 0) {
    return null
  }

  return <p>{parts.join(" · ")}</p>
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-4 sm:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  )
}
