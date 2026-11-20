export function formatArsPrice(value: number) {
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
  return `$${formatted} ARS`
}

export function formatUsdPrice(value: number) {
  return `USD ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}

export function formatUsdArsPrice(valueUsd: number, usdArsRate: number | null) {
  if (usdArsRate === null) return formatUsdPrice(valueUsd)
  return `${formatArsPrice(valueUsd * usdArsRate)} (${formatUsdPrice(valueUsd)})`
}
