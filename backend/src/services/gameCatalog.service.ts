import { redisClient } from '../config/redis.js'
import type {
  GameMetadataSearchResult,
} from '../types/rawg.types.js'
import { gameMetadataProviderName } from '../config/gameMetadata.js'
import {
  catalogMetadataPageSize,
  catalogPageSize,
  catalogPriceConcurrency,
  maxCatalogMetadataPage,
} from '../config/catalog.js'
import { gameMetadataService } from './gameMetadataProvider.service.js'
import { rawgService } from './rawg.service.js'
import { steamGameMetadataService } from './steam.service.js'
import {
  getRankedPostgresCatalogEntries,
  getPostgresCatalogEntries,
  type PostgresCatalogEntry,
} from './postgresCatalog.service.js'

const CATALOG_CACHE_TTL_SECONDS = 5 * 60
const POSTGRES_CATALOG_CACHE_TTL_SECONDS = 20 * 60
const POSTGRES_CATALOG_CACHE_VERSION_KEY = 'catalog:postgres:offers:version'
const MAX_CATALOG_CANDIDATES_PER_REQUEST = 30
const MAX_CATALOG_METADATA_PAGES_PER_REQUEST = 30
const catalogRequests = new Map<string, Promise<CachedCatalogMetadata>>()
const catalogResponseRequests = new Map<string, Promise<GameMetadataCatalog>>()

export type CatalogCursor = {
  page: number
  offset: number
}

type CatalogCandidate = {
  metadata: GameMetadataSearchResult
  metadataSource?: 'steam' | 'rawg' | 'igdb' | 'local'
}

type CachedCatalogMetadata = {
  count: number
  page: number
  limit: number
  hasMore: boolean
  selectedGenres: string[]
  candidates: CatalogCandidate[]
}
type GameMetadataCatalogEntry = PostgresCatalogEntry

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
  source?: 'steam' | 'rawg' | 'igdb' | 'local'
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
    Array.isArray(value.selectedGenres) &&
    value.selectedGenres.every((genre) => typeof genre === 'string') &&
    Array.isArray(value.candidates) &&
    value.candidates.every(
      (candidate) =>
        isRecord(candidate) &&
        isRecord(candidate.metadata) &&
        typeof candidate.metadata.id === 'number' &&
        typeof candidate.metadata.title === 'string' &&
        (candidate.metadataSource === undefined ||
          candidate.metadataSource === 'steam' ||
          candidate.metadataSource === 'rawg' ||
          candidate.metadataSource === 'igdb' ||
          candidate.metadataSource === 'local'),
    )
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

async function getSelectedFilterNames(filters: CatalogFilters) {
  const filterOptions =
    gameMetadataProviderName === 'local'
      ? await gameMetadataService.getFilterOptions()
      : await rawgService.getFilterOptions()

  return {
    selectedGenres: (filters.genres ?? []).map(
      (slug) =>
        filterOptions.genres.find((genre) => genre.slug === slug)?.name ?? slug,
    ),
    selectedPlatforms: (filters.platforms ?? []).map(
      (id) =>
        filterOptions.platforms.find((platform) => platform.id === id)?.name ??
        String(id),
    ),
    selectedConsolePlatforms: (filters.consolePlatforms ?? []).map(
      (id) =>
        filterOptions.consolePlatforms?.find((platform) => platform.id === id)
          ?.name ?? String(id),
    ),
  }
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
  return `catalog:metadata:v4:${JSON.stringify({
    provider: gameMetadataProviderName,
    ordering,
    page,
    limit,
    filters: normalizedFilters,
  })}`
}

async function getCatalogFromSources(
  ordering: 'popular' | 'recent',
  page: number,
  limit: number,
  filters: CatalogFilters,
): Promise<CachedCatalogMetadata> {
  const isLocalProvider = gameMetadataProviderName === 'local'
  const {
    selectedGenres,
    selectedPlatforms,
    selectedConsolePlatforms,
  } = await getSelectedFilterNames(filters)

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
        .then((catalog) => ({ ...catalog, limit, source: 'local' as const })),
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
          .then((catalog) => ({
            ...catalog,
            limit: sourcePageSize,
            source: gameMetadataProviderName,
          })),
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
    selectedGenres,
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

function isCachedGameMetadataCatalog(value: unknown): value is GameMetadataCatalog {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    typeof value.cursor === 'string' &&
    (value.nextCursor === null || typeof value.nextCursor === 'string') &&
    typeof value.limit === 'number' &&
    typeof value.hasMore === 'boolean' &&
    Array.isArray(value.results) &&
    value.results.every(
      (entry) =>
        isRecord(entry) &&
        isRecord(entry.metadata) &&
        typeof entry.metadata.id === 'number' &&
        typeof entry.metadata.title === 'string' &&
        (entry.pricesStatus === 'ready' || entry.pricesStatus === 'stale') &&
        typeof entry.priceVerifiedAt === 'number' &&
        isRecord(entry.game) &&
        typeof entry.game.id === 'string' &&
        isRecord(entry.comparison) &&
        Array.isArray(entry.comparison.prices) &&
        entry.comparison.prices.length > 0,
    )
  )
}

async function loadGameCatalogFromSources(
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
    const entries = await getPostgresCatalogEntries(
      catalog.candidates.slice(offset, offset + batchSize),
      ordering,
      (page - 1) * catalogMetadataPageSize + offset,
      catalog.selectedGenres,
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

async function loadGameCatalogFromPostgres(
  ordering: 'popular' | 'recent',
  cursor: CatalogCursor,
  limit: number,
  selectedFilterNames: {
    selectedGenres: string[]
    selectedPlatforms: string[]
    selectedConsolePlatforms: string[]
  },
): Promise<GameMetadataCatalog> {
  const offset =
    (cursor.page - 1) * catalogMetadataPageSize + cursor.offset
  const { entries, count } = await getRankedPostgresCatalogEntries(
    ordering,
    offset,
    limit,
    selectedFilterNames.selectedGenres,
    selectedFilterNames.selectedPlatforms,
    selectedFilterNames.selectedConsolePlatforms,
  )
  const nextPosition = offset + limit
  const hasMore = nextPosition < count
  const nextCursor = hasMore
    ? `${Math.floor(nextPosition / catalogMetadataPageSize) + 1}:${nextPosition % catalogMetadataPageSize}`
    : null

  return {
    count,
    cursor: `${cursor.page}:${cursor.offset}`,
    nextCursor,
    limit,
    hasMore,
    results: entries,
  }
}

export async function getGameCatalogWithOffers(
  ordering: 'popular' | 'recent',
  cursor: CatalogCursor,
  filters: CatalogFilters,
  limit = catalogPageSize,
): Promise<GameMetadataCatalog> {
  const cacheVersion =
    (await redisClient.get(POSTGRES_CATALOG_CACHE_VERSION_KEY)) ?? '0'
  const cacheKey = `catalog:postgres:offers:v2:${cacheVersion}:${createCatalogCacheKey(
    ordering,
    cursor.page,
    limit,
    filters,
  )}:${cursor.offset}`
  const inFlight = catalogResponseRequests.get(cacheKey)
  if (inFlight) return inFlight

  const request = (async () => {
    const cached = await redisClient.get(cacheKey)
    if (cached !== null) {
      try {
        const parsed: unknown = JSON.parse(cached)
        if (isCachedGameMetadataCatalog(parsed)) return parsed
      } catch {
        await redisClient.del(cacheKey)
      }
      await redisClient.del(cacheKey)
    }

    const hasFilters =
      Boolean(filters.genres?.length) ||
      Boolean(filters.platforms?.length) ||
      Boolean(filters.consolePlatforms?.length)
    const selectedFilterNames = hasFilters
      ? await getSelectedFilterNames(filters)
      : {
          selectedGenres: [],
          selectedPlatforms: [],
          selectedConsolePlatforms: [],
        }
    let catalog = await loadGameCatalogFromPostgres(
      ordering,
      cursor,
      limit,
      selectedFilterNames,
    )
    if (catalog.count === 0) {
      catalog = await loadGameCatalogFromSources(
        ordering,
        cursor,
        filters,
        limit,
      )
    }
    await redisClient.setEx(
      cacheKey,
      POSTGRES_CATALOG_CACHE_TTL_SECONDS,
      JSON.stringify(catalog),
    )
    return catalog
  })()

  catalogResponseRequests.set(cacheKey, request)
  try {
    return await request
  } finally {
    catalogResponseRequests.delete(cacheKey)
  }
}
