import { cn } from "@/lib/utils"

import { Card } from "@/components/Card"

type KpiTileProps = {
  label: string
  value: string
  subtext?: string
  className?: string
  valueClassName?: string
}

export function KpiTile({
  label,
  value,
  subtext,
  className,
  valueClassName,
}: KpiTileProps) {
  return (
    <Card className={cn("flex flex-col gap-2", className)}>
      <p className="text-sm text-text-secondary">{label}</p>
      <p
        className={cn(
          "numeric text-3xl leading-none font-medium text-text",
          valueClassName
        )}
      >
        {value}
      </p>
      {subtext ? <p className="text-sm text-text-muted">{subtext}</p> : null}
    </Card>
  )
}
