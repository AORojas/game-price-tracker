const configuredPriceConcurrency = Number(
  process.env.CATALOG_PRICE_CONCURRENCY ?? 8,
)
const configuredCatalogPageSize = Number(
  process.env.CATALOG_PAGE_SIZE ?? 8,
)

if (
  !Number.isSafeInteger(configuredPriceConcurrency) ||
  configuredPriceConcurrency < 6 ||
  configuredPriceConcurrency > 10
) {
  throw new Error('CATALOG_PRICE_CONCURRENCY must be an integer between 6 and 10')
}

export const catalogPriceConcurrency = configuredPriceConcurrency

if (
  !Number.isSafeInteger(configuredCatalogPageSize) ||
  configuredCatalogPageSize < 1 ||
  configuredCatalogPageSize > 10
) {
  throw new Error('CATALOG_PAGE_SIZE must be an integer between 1 and 10')
}

export const catalogPageSize = configuredCatalogPageSize
export const catalogMetadataPageSize = 20
export const maxCatalogMetadataPage = 1000
