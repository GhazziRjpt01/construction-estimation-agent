import { Card } from "@/components/Card"
import { Skeleton } from "@/components/Skeleton"
import { formatMoney, type Estimate, type HouseInputs } from "@/lib/estimate"

export function HeroTile({
  estimate,
  inputs,
  loading,
  updating,
}: {
  estimate: Estimate | null
  inputs: HouseInputs | null
  loading: boolean
  updating: boolean
}) {
  return (
    <Card className="flex h-full min-h-72 flex-col justify-between gap-6 min-[900px]:col-span-2 min-[900px]:row-span-2 min-[900px]:min-h-[560px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-text-secondary">
          {estimate
            ? estimate.totals.scopeLabel || "Partial estimate"
            : "Budget total"}
        </h2>
        {updating ? (
          <p className="text-sm text-text-muted" role="status">
            Updating estimate
          </p>
        ) : null}
      </div>
      {loading ? (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <Skeleton className="h-16 w-4/5" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      ) : estimate ? (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <p className="numeric text-5xl leading-none font-medium text-accent min-[900px]:text-6xl">
            {formatMoney(estimate.totals.total)}
          </p>
          <p className="text-base text-text-secondary">
            <span className="numeric">{formatMoney(estimate.totals.low)}</span>
            {" – "}
            <span className="numeric">{formatMoney(estimate.totals.high)}</span>
          </p>
          <p className="numeric text-base text-text-secondary">
            {formatMoney(estimate.totals.perSqft)} / sqft
          </p>
        </div>
      ) : (
        <p className="flex flex-1 items-center text-base text-text-secondary">
          The total appears here after the first estimate.
        </p>
      )}
      {inputs?.footprintSqft && inputs.stories ? (
        <p className="text-sm text-text-muted">
          {formatFootprint(inputs.footprintSqft)} footprint · {inputs.stories}{" "}
          {inputs.stories === 1 ? "story" : "stories"}
        </p>
      ) : (
        <span />
      )}
    </Card>
  )
}

function formatFootprint(value: number) {
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value)} sqft`
}
