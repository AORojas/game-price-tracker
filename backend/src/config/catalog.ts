const configuredPriceConcurrency = Number(
  process.env.CATALOG_PRICE_CONCURRENCY ?? 8,
)

if (
  !Number.isSafeInteger(configuredPriceConcurrency) ||
  configuredPriceConcurrency < 6 ||
  configuredPriceConcurrency > 10
) {
  throw new Error('CATALOG_PRICE_CONCURRENCY must be an integer between 6 and 10')
}

export const catalogPriceConcurrency = configuredPriceConcurrency
