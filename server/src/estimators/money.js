export function formatCurrency(amount, currency) {
  if (!Number.isFinite(amount)) {
    throw new Error("Amount must be a finite number")
  }
  if (!currency) {
    throw new Error("Currency is required")
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatRegionCurrency(amount, region) {
  return formatCurrency(amount, region.currency)
}
