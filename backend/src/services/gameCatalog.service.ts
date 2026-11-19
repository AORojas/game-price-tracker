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
import { gameService } from './game.service.js'
import { gameMetadataService } from './gameMetadataProvider.service.js'
import { rawgService } from './rawg.service.js'
import { steamGameMetadataService } from './steam.service.js'

const OFFER_CHECK_CONCURRENCY = 2
const CATALOG_CACHE_TTL_SECONDS = 5 * 60
const CATALOG_RESULT_PAGE_SIZE = 10
const catalogRequests = new Map<string, Promise<GameMetadataCatalogWithOffers>>()

export const CATALOG_OFFER_PAGE_SIZE = CATALOG_RESULT_PAGE_SIZE

type GameMetadataWithOffers = {
  metadata: GameMetadataSearchResult
  metadataSource?: 'steam' | 'rawg'
  game: GameSearchCandidate
  comparison: GamePriceComparison
}

type GameMetadataCatalogWithOffers = {
  count: number
  page: number
  results: GameMetadataWithOffers[]
}

type CatalogFilters = {
  genres?: string[]
  platforms?: number[]
  consolePlatforms?: number[]
}

type CatalogCandidate = {
  metadata: GameMetadataSearchResult
  metadataSource?: 'steam' | 'rawg'
}

type CatalogSourceResult = {
  count: number
  page: number
  results: GameMetadataSearchResult[]
  source?: 'steam' | 'rawg'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCachedCatalog(value: unknown): value is GameMetadataCatalogWithOffers {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.count) &&
    Number.isSafeInteger(value.page) &&
    Array.isArray(value.results) &&
    value.results.every(
      (result) =>
        isRecord(result) &&
        isRecord(result.metadata) &&
        typeof result.metadata.title === 'string' &&
        (result.metadataSource === undefined ||
          result.metadataSource === 'steam' ||
          result.metadataSource === 'rawg') &&
        isRecord(result.game) &&
        typeof result.game.id === 'string' &&
        isRecord(result.comparison) &&
        Array.isArray(result.comparison.prices) &&
        result.comparison.prices.length > 0,
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

function createCatalogCacheKey(
  ordering: 'popular' | 'recent',
  page: number,
  filters: CatalogFilters,
) {
  const normalizedFilters = {
    genres: [...(filters.genres ?? [])].sort(),
    platforms: [...(filters.platforms ?? [])].sort((first, second) => first - second),
    consolePlatforms: [...(filters.consolePlatforms ?? [])].sort(
      (first, second) => first - second,
    ),
  }
  return `catalog:offers:v1:${JSON.stringify({
    provider: gameMetadataProviderName,
    ordering,
    page,
    filters: normalizedFilters,
  })}`
}

async function getCatalogFromSources(
  ordering: 'popular' | 'recent',
  page: number,
  filters: CatalogFilters,
): Promise<GameMetadataCatalogWithOffers> {
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
  const sourcePageSize = Math.floor(CATALOG_RESULT_PAGE_SIZE / sourceCount)
  const sourceRequests: Array<Promise<CatalogSourceResult>> = []

  if (isLocalProvider) {
    sourceRequests.push(
      gameMetadataService
        .getCatalog(ordering, page, filters, CATALOG_RESULT_PAGE_SIZE)
        .then((catalog) => ({ ...catalog })),
    )
  } else {
    if (hasSteamSource) {
      sourceRequests.push(
        steamGameMetadataService
          .getCatalog(ordering, page, {}, sourcePageSize)
          .then((catalog) => ({ ...catalog, source: 'steam' as const })),
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
        .then((catalog) => ({ ...catalog, source: 'rawg' as const })),
    )

    if (hasConfiguredSource) {
      sourceRequests.push(
        gameMetadataService
          .getCatalog(ordering, page, {}, sourcePageSize)
          .then((catalog) => ({ ...catalog })),
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

  const candidates = [...candidatesByTitle.values()].filter(
    ({ metadata }) =>
      matchesAnyLabel(metadata.genres, selectedGenres) &&
      matchesAnyPlatform(metadata.platforms, selectedPlatforms) &&
      matchesAnyPlatform(metadata.platforms, selectedConsolePlatforms),
  )
  const offersByIndex: Array<GameMetadataWithOffers | null> =
    Array.from({ length: candidates.length }, () => null)
  let nextIndex = 0
  let offerLookupFailed = false
  let offerLookupError: unknown

  await Promise.all(
    Array.from(
      { length: Math.min(OFFER_CHECK_CONCURRENCY, candidates.length) },
      async () => {
        while (!offerLookupFailed && nextIndex < candidates.length) {
          const index = nextIndex
          nextIndex += 1
          const candidate = candidates[index]
          try {
            const offers = await gameService.getExactGameOffers(candidate.metadata.title)
            if (offers) {
              offersByIndex[index] = {
                metadata: candidate.metadata,
                ...(candidate.metadataSource
                  ? { metadataSource: candidate.metadataSource }
                  : {}),
                ...offers,
              }
            }
          } catch (error) {
            offerLookupFailed = true
            offerLookupError = error
          }
        }
      },
    ),
  )
  if (offerLookupFailed) throw offerLookupError

  return {
    count: catalogs.reduce((total, catalog) => total + catalog.count, 0),
    page,
    results: offersByIndex.filter(
      (result): result is GameMetadataWithOffers => result !== null,
    ),
  }
}

export async function getGameCatalogWithOffers(
  ordering: 'popular' | 'recent',
  page: number,
  filters: CatalogFilters,
): Promise<GameMetadataCatalogWithOffers> {
  const cacheKey = createCatalogCacheKey(ordering, page, filters)
  const inFlight = catalogRequests.get(cacheKey)
  if (inFlight) return inFlight

  const request = (async () => {
    const cached = await redisClient.get(cacheKey)
    if (cached !== null) {
      try {
        const parsed: unknown = JSON.parse(cached)
        if (isCachedCatalog(parsed)) return parsed
      } catch {
        await redisClient.del(cacheKey)
      }
    }

    const catalog = await getCatalogFromSources(ordering, page, filters)
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
