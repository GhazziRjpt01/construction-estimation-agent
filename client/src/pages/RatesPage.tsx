import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router"

import { Card } from "@/components/Card"
import { GhostButton } from "@/components/GhostButton"
import { PageHeader } from "@/components/PageHeader"
import { PageShell } from "@/components/PageShell"
import { Skeleton } from "@/components/Skeleton"
import { loadRates, type RateBook } from "@/lib/chatClient"
import { formatMoney } from "@/lib/estimate"
import { focusRing } from "@/lib/focus-ring"
import { cn } from "@/lib/utils"

export function RatesPage() {
  const [rates, setRates] = useState<RateBook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadRates()
      .then((book) => {
        if (!cancelled) {
          setRates(book)
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setRates(null)
          setError(
            caught instanceof Error ? caught.message : "Could not load rates."
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
  }, [attempt])

  const currency = rates?.region.currency ?? "USD"
  const empty =
    rates !== null && rates.prices.length === 0 && rates.laborRates.length === 0

  return (
    <PageShell>
      <PageHeader
        title="Rates"
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
      />
      <main
        id="content"
        tabIndex={-1}
        className="flex flex-col gap-4 outline-none"
      >
        {loading ? (
          <>
            <p className="sr-only" role="status">
              Loading rates
            </p>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-4 py-3"
          >
            <p className="text-sm text-text">{error}</p>
            <GhostButton
              type="button"
              onClick={() => {
                setLoading(true)
                setError(null)
                setAttempt((current) => current + 1)
              }}
            >
              Try again
            </GhostButton>
          </div>
        ) : null}
        {rates ? (
          <>
            <p className="text-sm text-text-secondary">
              {rates.region.id} · {rates.region.currency}
            </p>
            <p className="text-base text-text">
              Rates last updated {formatUpdated(rates.updatedAt)}
            </p>
            {empty ? (
              <p className="text-base text-text-secondary">
                No rates are stored for this region.
              </p>
            ) : (
              <>
                <Card className="flex flex-col gap-4">
                  <h2 className="text-sm font-medium text-text-secondary">
                    Material prices
                  </h2>
                  {rates.prices.length === 0 ? (
                    <p className="text-base text-text-secondary">
                      No material prices are stored for this region.
                    </p>
                  ) : (
                    <RateTable>
                      <thead>
                        <tr className="border-b border-border text-text-secondary">
                          <th className="py-3 pr-4 font-medium" scope="col">
                            Material
                          </th>
                          <th className="py-3 pr-4 font-medium" scope="col">
                            Unit
                          </th>
                          <th
                            className="py-3 pr-4 text-right font-medium"
                            scope="col"
                          >
                            Unit cost
                          </th>
                          <th className="py-3 font-medium" scope="col">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rates.prices.map((price) => (
                          <tr
                            key={price.code}
                            className="border-b border-border"
                          >
                            <th
                              className="py-3 pr-4 font-medium text-text"
                              scope="row"
                            >
                              {price.name}
                            </th>
                            <td className="py-3 pr-4 text-text-secondary">
                              {price.unit}
                            </td>
                            <td className="py-3 pr-4 text-right numeric text-text">
                              {formatMoney(price.unitCost, currency)}
                            </td>
                            <td className="py-3 text-text-secondary">
                              {price.notes || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </RateTable>
                  )}
                </Card>
                <Card className="flex flex-col gap-4">
                  <h2 className="text-sm font-medium text-text-secondary">
                    Labor rates
                  </h2>
                  {rates.laborRates.length === 0 ? (
                    <p className="text-base text-text-secondary">
                      No labor rates are stored for this region.
                    </p>
                  ) : (
                    <RateTable>
                      <thead>
                        <tr className="border-b border-border text-text-secondary">
                          <th className="py-3 pr-4 font-medium" scope="col">
                            Trade
                          </th>
                          <th
                            className="py-3 pr-4 text-right font-medium"
                            scope="col"
                          >
                            Hourly rate
                          </th>
                          <th className="py-3 font-medium" scope="col">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rates.laborRates.map((rate) => (
                          <tr
                            key={rate.trade}
                            className="border-b border-border"
                          >
                            <th
                              className="py-3 pr-4 font-medium text-text"
                              scope="row"
                            >
                              {rate.trade}
                            </th>
                            <td className="py-3 pr-4 text-right numeric text-text">
                              {formatMoney(rate.hourlyRate, currency)}
                            </td>
                            <td className="py-3 text-text-secondary">
                              {rate.notes || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </RateTable>
                  )}
                </Card>
              </>
            )}
          </>
        ) : null}
      </main>
    </PageShell>
  )
}

function RateTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  )
}

function formatUpdated(value: string | null | undefined) {
  if (!value) {
    return "unavailable"
  }
  const time = Date.parse(value)
  if (!Number.isFinite(time)) {
    return "unavailable"
  }
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(time)
}
