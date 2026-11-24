import { redisClient } from '../config/redis.js'
import type {
  GameMetadataFilterOptions,
  GameMetadataSearchResult,
} from '../types/rawg.types.js'
import type {
  GamePriceComparison,
  GameSearchCandidate,
} from '../types/game.types.js'
import { gameMetadataProviderName } from '../config/gameMetadata.js'
import {
  catalogMetadataPageSize,
  catalogPageSize,
  catalogPriceConcurrency,
  maxCatalogMetadataPage,
} from '../config/catalog.js'
import { gameService } from './game.service.js'
import { CheapSharkServiceError } from './cheapshark.service.js'
import { gameMetadataService } from './gameMetadataProvider.service.js'
import { rawgService } from './rawg.service.js'
import { steamGameMetadataService } from './steam.service.js'

const CATALOG_CACHE_TTL_SECONDS = 5 * 60
const PRICE_CACHE_TTL_SECONDS = 30 * 60
const STALE_PRICE_CACHE_TTL_SECONDS = 24 * 60 * 60
const UNAVAILABLE_PRICE_CACHE_TTL_SECONDS = 3 * 60
const MAX_CATALOG_CANDIDATES_PER_REQUEST = 30
const MAX_CATALOG_METADATA_PAGES_PER_REQUEST = 30
const PRICE_RETRY_BACKOFF_MS = [1_000, 2_000, 4_000]
const catalogRequests = new Map<string, Promise<CachedCatalogMetadata>>()

export type CatalogCursor = {
  page: number
  offset: number
}

type CatalogCandidate = {
  metadata: GameMetadataSearchResult
  metadataSource?: 'steam' | 'rawg'
}

type CachedCatalogMetadata = {
  count: number
  page: number
  limit: number
  hasMore: boolean
  candidates: CatalogCandidate[]
}

type CachedGamePrices =
  | {
      status: 'ready'
      game: GameSearchCandidate
      comparison: GamePriceComparison
      verifiedAt: number
    }
  | {
      status: 'unavailable'
    }

type GameMetadataCatalogEntry = CatalogCandidate & {
  pricesStatus: 'ready' | 'stale'
  priceVerifiedAt: number
  game: GameSearchCandidate
  comparison: GamePriceComparison
}

type GameMetadataCatalog = {
  count: number
  cursor: string
  nextCursor: string | null
  limit: number
  hasMore: boolean
  results: GameMetadataCatalogEntry[]
}

type CatalogFilters = {
  genres?: string[]
  platforms?: number[]
  consolePlatforms?: number[]
}

type CatalogSourceResult = {
  count: number
  page: number
  limit: number
  results: GameMetadataSearchResult[]
  source?: 'steam' | 'rawg'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCachedCatalogMetadata(value: unknown): value is CachedCatalogMetadata {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.count) &&
    Number.isSafeInteger(value.page) &&
    Number.isSafeInteger(value.limit) &&
    typeof value.hasMore === 'boolean' &&
    Array.isArray(value.candidates) &&
    value.candidates.every(
      (candidate) =>
        isRecord(candidate) &&
        isRecord(candidate.metadata) &&
        typeof candidate.metadata.id === 'number' &&
        typeof candidate.metadata.title === 'string' &&
        (candidate.metadataSource === undefined ||
          candidate.metadataSource === 'steam' ||
          candidate.metadataSource === 'rawg'),
    )
  )
}

function isGameSearchCandidate(value: unknown): value is GameSearchCandidate {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.image === 'string' &&
    typeof value.lowestPrice === 'number' &&
    Number.isFinite(value.lowestPrice) &&
    typeof value.lowestDealId === 'string'
  )
}

function isCachedGamePrices(value: unknown): value is CachedGamePrices {
  if (!isRecord(value)) return false
  if (value.status === 'unavailable') return true
  return (
    value.status === 'ready' &&
    typeof value.verifiedAt === 'number' &&
    Number.isFinite(value.verifiedAt) &&
    isGameSearchCandidate(value.game) &&
    isRecord(value.comparison) &&
    isRecord(value.comparison.game) &&
    Array.isArray(value.comparison.prices) &&
    value.comparison.prices.length > 0
  )
}

function isTemporaryPriceLookupError(error: unknown): boolean {
  if (!(error instanceof CheapSharkServiceError)) return false
  return (
    error.code === 'RATE_LIMITED' ||
    error.code === 'TIMEOUT' ||
    error.code === 'CONNECTION' ||
    (error.code === 'HTTP_ERROR' &&
      error.statusCode !== undefined &&
      error.statusCode >= 500)
  )
}

function normalizeTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function matchesAnyPlatform(
  gamePlatforms: string[],
  selectedPlatforms: string[],
): boolean {
  if (selectedPlatforms.length === 0) return true

  return selectedPlatforms.some((selected) => {
    const filterName = normalizeTitle(selected)
    return gamePlatforms.some((gamePlatform) => {
      const platformName = normalizeTitle(gamePlatform)
      if (filterName === 'pc') {
        return ['pc', 'windows', 'macos', 'linux'].includes(platformName)
      }
      if (filterName === 'playstation') {
        return platformName.includes('playstation') || /^ps\d/.test(platformName)
      }
      if (filterName === 'xbox') return platformName.includes('xbox')
      if (filterName === 'nintendo') {
        return platformName.includes('nintendo') || platformName.includes('wii')
      }
      if (filterName === 'mac') return platformName === 'mac' || platformName === 'macos'
      return platformName === filterName
    })
  })
}

function matchesAnyLabel(gameLabels: string[], selectedLabels: string[]): boolean {
  if (selectedLabels.length === 0) return true
  const normalizedLabels = new Set(gameLabels.map(normalizeTitle))
  return selectedLabels.some((label) => normalizedLabels.has(normalizeTitle(label)))
}

function createCatalogCacheKey(
  ordering: 'popular' | 'recent',
  page: number,
  limit: number,
  filters: CatalogFilters,
) {
  const normalizedFilters = {
    genres: [...(filters.genres ?? [])].sort(),
    platforms: [...(filters.platforms ?? [])].sort((first, second) => first - second),
    consolePlatforms: [...(filters.consolePlatforms ?? [])].sort(
      (first, second) => first - second,
    ),
  }
  return `catalog:metadata:v2:${JSON.stringify({
    provider: gameMetadataProviderName,
    ordering,
    page,
    limit,
    filters: normalizedFilters,
  })}`
}

function createPriceCacheKey(candidate: CatalogCandidate) {
  return `catalog:prices:v2:${gameMetadataProviderName}:${encodeURIComponent(
    normalizeTitle(candidate.metadata.title),
  )}`
}

async function getCatalogFromSources(
  ordering: 'popular' | 'recent',
  page: number,
  limit: number,
  filters: CatalogFilters,
): Promise<CachedCatalogMetadata> {
  const isLocalProvider = gameMetadataProviderName === 'local'
  const filterOptions: GameMetadataFilterOptions = isLocalProvider
    ? await gameMetadataService.getFilterOptions()
    : await rawgService.getFilterOptions()
  const selectedGenres = (filters.genres ?? [])
    .map((slug) => filterOptions.genres.find((genre) => genre.slug === slug)?.name)
    .filter((name): name is string => Boolean(name))
  const selectedPlatforms = (filters.platforms ?? [])
    .map((id) => filterOptions.platforms.find((platform) => platform.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  const selectedConsolePlatforms = (filters.consolePlatforms ?? [])
    .map((id) =>
      filterOptions.consolePlatforms?.find((platform) => platform.id === id)?.name,
    )
    .filter((name): name is string => Boolean(name))

  const hasSteamSource = !isLocalProvider && !filters.consolePlatforms?.length
  const hasRawgSource = !isLocalProvider
  const hasConfiguredSource =
    isLocalProvider ||
    (gameMetadataProviderName !== 'steam' && gameMetadataProviderName !== 'rawg')
  const sourceCount =
    Number(hasSteamSource) + Number(hasRawgSource) + Number(hasConfiguredSource)
  const sourcePageSize = Math.ceil(limit / sourceCount)
  const sourceRequests: Array<Promise<CatalogSourceResult>> = []

  if (isLocalProvider) {
    sourceRequests.push(
      gameMetadataService
        .getCatalog(ordering, page, filters, limit)
        .then((catalog) => ({ ...catalog, limit })),
    )
  } else {
    if (hasSteamSource) {
      sourceRequests.push(
        steamGameMetadataService
          .getCatalog(ordering, page, {}, sourcePageSize)
          .then((catalog) => ({ ...catalog, limit: sourcePageSize, source: 'steam' as const })),
      )
    }

    sourceRequests.push(
      rawgService
        .getCatalog(
          ordering,
          page,
          {
            genres: filters.genres,
            platforms: filters.platforms,
            consolePlatforms: filters.consolePlatforms,
          },
          sourcePageSize,
        )
        .then((catalog) => ({ ...catalog, limit: sourcePageSize, source: 'rawg' as const })),
    )

    if (hasConfiguredSource) {
      sourceRequests.push(
        gameMetadataService
          .getCatalog(ordering, page, {}, sourcePageSize)
          .then((catalog) => ({ ...catalog, limit: sourcePageSize })),
      )
    }
  }
  const catalogs = await Promise.all(sourceRequests)

  const candidatesByTitle = new Map<string, CatalogCandidate>()
  for (const catalog of catalogs) {
    for (const metadata of catalog.results) {
      const titleKey = normalizeTitle(metadata.title)
      const existing = candidatesByTitle.get(titleKey)
      if (existing && catalog.source === 'rawg') {
        candidatesByTitle.set(titleKey, {
          metadata: {
            ...existing.metadata,
            platforms: [...new Set([...existing.metadata.platforms, ...metadata.platforms])],
          },
          ...(existing.metadataSource
            ? { metadataSource: existing.metadataSource }
            : {}),
        })
      } else if (!existing) {
        candidatesByTitle.set(titleKey, {
          metadata,
          ...(catalog.source ? { metadataSource: catalog.source } : {}),
        })
      }
    }
  }

  const candidates = [...candidatesByTitle.values()]
    .filter(
      ({ metadata }) =>
        matchesAnyLabel(metadata.genres, selectedGenres) &&
        matchesAnyPlatform(metadata.platforms, selectedPlatforms) &&
        matchesAnyPlatform(metadata.platforms, selectedConsolePlatforms),
    )
    .slice(0, limit)

  return {
    count: catalogs.reduce((total, catalog) => total + catalog.count, 0),
    page,
    limit,
    hasMore: catalogs.some((catalog) => catalog.count > page * catalog.limit),
    candidates,
  }
}

async function getCatalogMetadata(
  ordering: 'popular' | 'recent',
  page: number,
  limit: number,
  filters: CatalogFilters,
): Promise<CachedCatalogMetadata> {
  const cacheKey = createCatalogCacheKey(ordering, page, limit, filters)
  const inFlight = catalogRequests.get(cacheKey)
  if (inFlight) return inFlight

  const request = (async () => {
    const cached = await redisClient.get(cacheKey)
    if (cached !== null) {
      try {
        const parsed: unknown = JSON.parse(cached)
        if (isCachedCatalogMetadata(parsed)) return parsed
      } catch {
        await redisClient.del(cacheKey)
      }
    }

    const catalog = await getCatalogFromSources(ordering, page, limit, filters)
    await redisClient.setEx(
      cacheKey,
      CATALOG_CACHE_TTL_SECONDS,
      JSON.stringify(catalog),
    )
    return catalog
  })()

  catalogRequests.set(cacheKey, request)
  try {
    return await request
  } finally {
    catalogRequests.delete(cacheKey)
  }
}

async function getCachedGamePrices(key: string): Promise<CachedGamePrices | null> {
  const cached = await redisClient.get(key)
  if (cached === null) return null

  try {
    const parsed: unknown = JSON.parse(cached)
    if (isCachedGamePrices(parsed)) return parsed
  } catch {
    // Remove malformed cache entries and let the normal lookup recreate them.
  }

  await redisClient.del(key)
  return null
}

async function getCatalogEntry(
  candidate: CatalogCandidate,
): Promise<GameMetadataCatalogEntry | null> {
  const key = createPriceCacheKey(candidate)
  const cached = await getCachedGamePrices(key)
  if (cached?.status === 'unavailable') return null
  if (cached?.status === 'ready') {
    return {
      ...candidate,
      pricesStatus: 'ready',
      priceVerifiedAt: cached.verifiedAt,
      game: cached.game,
      comparison: cached.comparison,
    }
  }

  const stale = await getCachedGamePrices(`${key}:stale`)
  let offers: Awaited<ReturnType<typeof gameService.getExactGameOffers>>
  try {
    offers = await gameService.getExactGameOffers(candidate.metadata.title)
  } catch (error) {
    if (!isTemporaryPriceLookupError(error)) throw error
    if (stale?.status === 'ready') {
      return {
        ...candidate,
        pricesStatus: 'stale',
        priceVerifiedAt: stale.verifiedAt,
        game: stale.game,
        comparison: stale.comparison,
      }
    }
    throw error
  }

  if (!offers || offers.comparison.prices.length === 0) {
    await redisClient.del(`${key}:stale`)
    await redisClient.setEx(
      key,
      UNAVAILABLE_PRICE_CACHE_TTL_SECONDS,
      JSON.stringify({ status: 'unavailable' }),
    )
    return null
  }

  const cachedPrices: CachedGamePrices = {
    status: 'ready',
    game: offers.game,
    comparison: offers.comparison,
    verifiedAt: Date.now(),
  }
  await redisClient.setEx(key, PRICE_CACHE_TTL_SECONDS, JSON.stringify(cachedPrices))
  await redisClient.setEx(
    `${key}:stale`,
    STALE_PRICE_CACHE_TTL_SECONDS,
    JSON.stringify(cachedPrices),
  )
  return {
    ...candidate,
    pricesStatus: 'ready',
    priceVerifiedAt: cachedPrices.verifiedAt,
    game: cachedPrices.game,
    comparison: cachedPrices.comparison,
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  callback: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R | undefined>(values.length)
  const errors: unknown[] = []
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      try {
        results[currentIndex] = await callback(values[currentIndex])
      } catch (error) {
        errors.push(error)
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => runWorker(),
    ),
  )
  if (errors.length > 0) {
    throw errors.find(isTemporaryPriceLookupError) ?? errors[0]
  }
  return results.filter((result): result is R => result !== undefined)
}

async function getCatalogEntriesWithRetry(
  candidates: CatalogCandidate[],
): Promise<Array<GameMetadataCatalogEntry | null>> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await mapWithConcurrency(
        candidates,
        catalogPriceConcurrency,
        getCatalogEntry,
      )
    } catch (error) {
      const backoff = PRICE_RETRY_BACKOFF_MS[attempt]
      if (!isTemporaryPriceLookupError(error) || backoff === undefined) throw error

      const retryAfter =
        error instanceof CheapSharkServiceError &&
        error.code === 'RATE_LIMITED'
          ? error.retryAfterMs ?? 0
          : 0
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(backoff, retryAfter)),
      )
    }
  }
}

export async function getGameCatalogWithOffers(
  ordering: 'popular' | 'recent',
  cursor: CatalogCursor,
  filters: CatalogFilters,
  limit = catalogPageSize,
): Promise<GameMetadataCatalog> {
  let page = cursor.page
  let offset = cursor.offset
  let scannedCandidates = 0
  let scannedPages = 0
  let count = 0
  let hasMore = true
  const results: GameMetadataCatalogEntry[] = []

  while (
    results.length < limit &&
    scannedCandidates < MAX_CATALOG_CANDIDATES_PER_REQUEST &&
    scannedPages < MAX_CATALOG_METADATA_PAGES_PER_REQUEST
  ) {
    const catalog = await getCatalogMetadata(
      ordering,
      page,
      catalogMetadataPageSize,
      filters,
    )
    count = catalog.count
    scannedPages += 1

    if (offset >= catalog.candidates.length) {
      if (!catalog.hasMore || page >= maxCatalogMetadataPage) {
        hasMore = false
        break
      }
      page += 1
      offset = 0
      continue
    }

    const batchStart = offset
    const batchSize = Math.min(
      catalogPriceConcurrency,
      catalog.candidates.length - offset,
      MAX_CATALOG_CANDIDATES_PER_REQUEST - scannedCandidates,
    )
    const entries = await getCatalogEntriesWithRetry(
      catalog.candidates.slice(offset, offset + batchSize),
    )
    scannedCandidates += batchSize

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]
      if (entry) results.push(entry)

      if (results.length === limit) {
        offset = batchStart + index + 1
        hasMore = offset < catalog.candidates.length || catalog.hasMore
        break
      }
    }
    if (results.length === limit) break

    offset += batchSize
    if (offset >= catalog.candidates.length) {
      if (!catalog.hasMore || page >= maxCatalogMetadataPage) {
        hasMore = false
        break
      }
      page += 1
      offset = 0
    }
  }

  const nextCursor = hasMore ? `${page}:${offset}` : null

  return {
    count,
    cursor: `${cursor.page}:${cursor.offset}`,
    nextCursor,
    limit,
    hasMore: nextCursor !== null,
    results,
  }
}
