export function applyAllowances(directCost, region) {
  if (!Number.isFinite(directCost)) {
    throw new Error("Direct cost must be a finite number")
  }

  const overheadProfit = directCost * region.defaultOverheadProfit
  const contingency = (directCost + overheadProfit) * region.defaultContingency

  return {
    directCost,
    overheadProfit,
    contingency,
    total: directCost + overheadProfit + contingency,
  }
}
