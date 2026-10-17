import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useTheme } from "@/components/theme-provider"
import { divisionColor } from "@/lib/chartColors"
import { chartTooltipItemStyle, chartTooltipStyle } from "@/lib/chartTooltip"
import { divisionCost, formatMoney, type Division } from "@/lib/estimate"
import { usePrefersReducedMotion } from "@/lib/motion"

export function DivisionSplitBar({ divisions }: { divisions: Division[] }) {
  const { resolvedTheme } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  const segments = divisions
    .map((division, index) => ({
      code: division.code,
      name: division.name,
      cost: divisionCost(division),
      color: divisionColor(index, resolvedTheme),
    }))
    .filter((segment) => segment.cost > 0)

  if (segments.length === 0) {
    return (
      <p className="text-base text-text-secondary">
        Division costs appear here when the estimate has them.
      </p>
    )
  }

  const row: Record<string, string | number> = { label: "Divisions" }
  for (const segment of segments) {
    row[segment.code] = segment.cost
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-24 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[row]}
            layout="vertical"
            margin={{ top: 8, right: 0, bottom: 8, left: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" hide />
            {segments.map((segment, index) => (
              <Bar
                key={segment.code}
                dataKey={segment.code}
                stackId="split"
                fill={segment.color}
                name={`${segment.code} ${segment.name}`}
                radius={barRadius(index, segments.length)}
                isAnimationActive={!reducedMotion}
              />
            ))}
            <Tooltip
              formatter={(value) => formatMoney(Number(value))}
              cursor={{ fill: "transparent" }}
              contentStyle={chartTooltipStyle}
              itemStyle={chartTooltipItemStyle}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {segments.map((segment) => (
          <li key={segment.code} className="flex items-center gap-2 text-sm">
            <span
              className="size-3 shrink-0 rounded-full border border-border"
              style={{ background: segment.color }}
              aria-hidden="true"
            />
            <span className="text-text-secondary">
              {segment.code} {segment.name}
            </span>
            <span className="numeric text-text">
              {formatMoney(segment.cost)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function barRadius(
  index: number,
  count: number
): [number, number, number, number] {
  if (count === 1) {
    return [8, 8, 8, 8]
  }
  if (index === 0) {
    return [8, 0, 0, 8]
  }
  if (index === count - 1) {
    return [0, 8, 8, 0]
  }
  return [0, 0, 0, 0]
}
