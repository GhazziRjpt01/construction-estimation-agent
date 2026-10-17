import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Card } from "@/components/Card"
import { Skeleton } from "@/components/Skeleton"
import { useTheme } from "@/components/theme-provider"
import { divisionColor } from "@/lib/chartColors"
import { chartTooltipItemStyle, chartTooltipStyle } from "@/lib/chartTooltip"
import { divisionCost, formatMoney, type Estimate } from "@/lib/estimate"
import { usePrefersReducedMotion } from "@/lib/motion"

export function CostSplitTile({
  estimate,
  loading,
}: {
  estimate: Estimate | null
  loading: boolean
}) {
  const { resolvedTheme } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  const slices =
    estimate?.divisions
      .map((division, index) => ({
        name: division.name,
        code: division.code,
        cost: divisionCost(division),
        color: divisionColor(index, resolvedTheme),
      }))
      .filter((slice) => slice.cost > 0) ?? []

  return (
    <Card className="flex h-full min-h-72 flex-col gap-4 min-[900px]:col-span-2">
      <h2 className="text-sm font-medium text-text-secondary">Cost split</h2>
      {loading ? (
        <div className="flex flex-1 items-center gap-6">
          <Skeleton className="size-40 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ) : slices.length === 0 ? (
        <p className="flex flex-1 items-center text-base text-text-secondary">
          Division costs appear here after the first estimate.
        </p>
      ) : (
        <div className="flex min-h-56 flex-1 flex-col gap-4 min-[900px]:flex-row min-[900px]:items-center">
          <div className="h-56 min-w-0 flex-1" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="cost"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  isAnimationActive={!reducedMotion}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.code} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatMoney(Number(value))}
                  contentStyle={chartTooltipStyle}
                  itemStyle={chartTooltipItemStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex min-w-0 flex-1 flex-col gap-2">
            {slices.map((slice) => (
              <li key={slice.code} className="flex items-center gap-3 text-sm">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-text-secondary">
                  {slice.code} {slice.name}
                </span>
                <span className="numeric text-text">
                  {formatMoney(slice.cost)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
