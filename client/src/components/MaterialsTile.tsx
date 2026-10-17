import { Card } from "@/components/Card"
import { Skeleton } from "@/components/Skeleton"
import {
  formatMoney,
  formatQuantity,
  shownQuantity,
  shownUnit,
  type Estimate,
} from "@/lib/estimate"

export function MaterialsTile({
  estimate,
  loading,
}: {
  estimate: Estimate | null
  loading: boolean
}) {
  const materials = estimate?.materials ?? []

  return (
    <Card className="flex h-full min-h-72 flex-col gap-4">
      <h2 className="text-sm font-medium text-text-secondary">Materials</h2>
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-5/6" />
        </div>
      ) : materials.length === 0 ? (
        <p className="text-base text-text-secondary">
          Material quantities appear here after the first estimate.
        </p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto">
          {materials.map((item) => (
            <li
              key={item.code}
              className="flex items-baseline justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-text" title={item.name}>
                  {item.name}
                </p>
                <p className="numeric text-sm text-text-muted">
                  {formatQuantity(shownQuantity(item))} {shownUnit(item)}
                </p>
              </div>
              <p className="shrink-0 numeric text-sm text-text">
                {formatMoney(item.cost)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
