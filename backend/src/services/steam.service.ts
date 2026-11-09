import {
  steamGridDbApiKey,
  steamGridDbApiUrl,
  steamStoreApiUrl,
} from '../config/steamGridDb.js'
import type {
  GameMetadataFilterOptions,
  GameMetadataSearchResult,
  RawgFilterOption,
} from '../types/rawg.types.js'
import { MetadataProviderError } from './metadataProviderError.js'
import type { GameMetadataProvider } from './gameMetadataProvider.service.js'

interface SteamSearchItem {
  id: number
  name: string
}

interface SteamChartsRank {
  rank: number
  appid: number
}

interface SteamGenre {
  id: string | number
  description: string
}

interface SteamScreenshot {
  path_full: string
}

interface SteamGame {
  steam_appid: number
  name: string
  type: string
  required_age?: unknown
  ratings?: Record<string, unknown> | null
  is_free?: boolean
  about_the_game?: string | null
  detailed_description?: string | null
  short_description?: string | null
  header_image?: string | null
  screenshots?: SteamScreenshot[] | null
  genres?: SteamGenre[] | null
  platforms?: {
    windows?: boolean
    mac?: boolean
    linux?: boolean
  } | null
  developers?: string[] | null
  release_date?: {
    date?: string | null
  } | null
  metacritic?: {
    score?: number | null
  } | null
}

interface SteamGrid {
  url: string
}

interface SteamFeatureCategory {
  items: SteamSearchItem[]
}

interface SteamChartsResponse {
  response: {
    ranks: SteamChartsRank[]
  }
}

const REQUEST_TIMEOUT_MS = 8_000
const CACHE_TTL_MS = 6 * 60 * 60 * 1_000
const SEARCH_PAGE_SIZE = 20
const CATALOG_PAGE_SIZE = 24
const REQUEST_CONCURRENCY = 4
const MAX_CACHE_ENTRIES = 400
const STEAM_CHARTS_API_URL =
  'https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/'

const STEAM_GENRES: RawgFilterOption[] = [
  { id: 1, name: 'Action', slug: 'action' },
  { id: 2, name: 'Strategy', slug: 'strategy' },
  { id: 3, name: 'RPG', slug: 'rpg' },
  { id: 4, name: 'Casual', slug: 'casual' },
  { id: 5, name: 'Simulation', slug: 'simulation' },
  { id: 6, name: 'Racing', slug: 'racing' },
  { id: 7, name: 'Sports', slug: 'sports' },
  { id: 23, name: 'Indie', slug: 'indie' },
  { id: 25, name: 'Adventure', slug: 'adventure' },
  { id: 28, name: 'Massively Multiplayer', slug: 'massively-multiplayer' },
]

const STEAM_PLATFORMS: RawgFilterOption[] = [
  { id: 1, name: 'Windows', slug: 'windows' },
  { id: 2, name: 'macOS', slug: 'mac' },
  { id: 3, name: 'Linux', slug: 'linux' },
]

const ESRB_RATING_LABELS: Record<string, string> = {
  AO: 'AO (Solo adultos)',
  'ADULTS ONLY': 'AO (Solo adultos)',
  EC: 'EC (Primera infancia)',
  E: 'E (Todos)',
  EVERYONE: 'E (Todos)',
  E10: 'E10+ (Mayores de 10 años)',
  'E10+': 'E10+ (Mayores de 10 años)',
  'EVERYONE 10+': 'E10+ (Mayores de 10 años)',
  M: 'M (Maduro)',
  MATURE: 'M (Maduro)',
  RP: 'RP (Clasificación pendiente)',
  'RATING PENDING': 'RP (Clasificación pendiente)',
  T: 'T (Adolescentes)',
  TEEN: 'T (Adolescentes)',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string'
}

function getSteamRatingValue(value: unknown) {
  const rating = isRecord(value) ? value.rating : value
  if (typeof rating === 'string' && rating.trim()) return rating.trim()
  if (typeof rating === 'number' && Number.isSafeInteger(rating) && rating >= 0) {
    return String(rating)
  }
  return null
}

export function extractAgeRating(steamData: unknown): string | null {
  if (!isRecord(steamData)) return null

  const ratings = isRecord(steamData.ratings) ? steamData.ratings : null
  const esrbRating = getSteamRatingValue(ratings?.esrb)
  if (esrbRating) {
    const normalizedRating = esrbRating.toUpperCase()
    return ESRB_RATING_LABELS[normalizedRating] ?? normalizedRating
  }

  const pegiRating = getSteamRatingValue(ratings?.pegi)
  if (pegiRating) return `PEGI ${pegiRating}`

  const uskRating = getSteamRatingValue(ratings?.usk)
  if (uskRating) return `USK ${uskRating}`

  const rawRequiredAge = steamData.required_age
  const requiredAge =
    typeof rawRequiredAge === 'number'
      ? rawRequiredAge
      : typeof rawRequiredAge === 'string' && /^\d+$/.test(rawRequiredAge.trim())
        ? Number(rawRequiredAge.trim())
        : null

  if (requiredAge !== null && Number.isSafeInteger(requiredAge) && requiredAge > 0) {
    return `${requiredAge}+`
  }

  // required_age is only a restriction threshold; zero is not an ESRB rating.
  return null
}

function isSteamSearchItem(value: unknown): value is SteamSearchItem {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.name === 'string' &&
    value.name.length > 0
  )
}

function isSteamSearchResponse(
  value: unknown,
): value is { total: number; items: SteamSearchItem[] } {
  return (
    isRecord(value) &&
    typeof value.total === 'number' &&
    Array.isArray(value.items) &&
    value.items.every(isSteamSearchItem)
  )
}

function isSteamChartsResponse(value: unknown): value is SteamChartsResponse {
  return (
    isRecord(value) &&
    isRecord(value.response) &&
    Array.isArray(value.response.ranks) &&
    value.response.ranks.every(
      (rank) =>
        isRecord(rank) &&
        typeof rank.rank === 'number' &&
        Number.isSafeInteger(rank.rank) &&
        rank.rank > 0 &&
        typeof rank.appid === 'number' &&
        Number.isSafeInteger(rank.appid) &&
        rank.appid > 0,
    )
  )
}

function isSteamGenre(value: unknown): value is SteamGenre {
  return (
    isRecord(value) &&
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.description === 'string'
  )
}

function isSteamScreenshot(value: unknown): value is SteamScreenshot {
  return isRecord(value) && typeof value.path_full === 'string'
}

function isSteamGame(value: unknown): value is SteamGame {
  return (
    isRecord(value) &&
    typeof value.steam_appid === 'number' &&
    Number.isSafeInteger(value.steam_appid) &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    (value.ratings === undefined ||
      value.ratings === null ||
      isRecord(value.ratings)) &&
    (value.is_free === undefined || typeof value.is_free === 'boolean') &&
    isOptionalString(value.about_the_game) &&
    isOptionalString(value.detailed_description) &&
    isOptionalString(value.short_description) &&
    isOptionalString(value.header_image) &&
    (value.screenshots === undefined ||
      value.screenshots === null ||
      (Array.isArray(value.screenshots) && value.screenshots.every(isSteamScreenshot))) &&
    (value.genres === undefined ||
      value.genres === null ||
      (Array.isArray(value.genres) && value.genres.every(isSteamGenre))) &&
    (value.platforms === undefined ||
      value.platforms === null ||
      isRecord(value.platforms)) &&
    (value.developers === undefined ||
      value.developers === null ||
      (Array.isArray(value.developers) &&
        value.developers.every((developer) => typeof developer === 'string'))) &&
    (value.release_date === undefined ||
      value.release_date === null ||
      (isRecord(value.release_date) && isOptionalString(value.release_date.date))) &&
    (value.metacritic === undefined ||
      value.metacritic === null ||
      (isRecord(value.metacritic) &&
        (value.metacritic.score === undefined ||
          value.metacritic.score === null ||
          typeof value.metacritic.score === 'number')))
  )
}

function isSteamGrid(value: unknown): value is SteamGrid {
  return isRecord(value) && typeof value.url === 'string'
}

function isSteamGridResponse(
  value: unknown,
): value is { success: boolean; data: SteamGrid[] } {
  return (
    isRecord(value) &&
    typeof value.success === 'boolean' &&
    Array.isArray(value.data) &&
    value.data.every(isSteamGrid)
  )
}

function normalizeTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
}

function stripHtml(value: string | null | undefined) {
  return decodeHtmlEntities(
    (value ?? '')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .trim()
}

function getDescription(game: SteamGame) {
  return stripHtml(
    game.about_the_game || game.detailed_description || game.short_description,
  )
}

function getReleaseDate(date?: string | null) {
  if (!date) return null
  const timestamp = Date.parse(date)
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString().slice(0, 10)
}

function getSteamGenres(game: SteamGame) {
  return game.genres?.map(({ description }) => description) ?? []
}

function getSteamPlatforms(game: SteamGame) {
  return [
    game.platforms?.windows ? 'Windows' : null,
    game.platforms?.mac ? 'macOS' : null,
    game.platforms?.linux ? 'Linux' : null,
  ].filter((platform): platform is string => platform !== null)
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0
  const workerCount = Math.min(concurrency, values.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex
        nextIndex += 1
        results[index] = await mapper(values[index])
      }
    }),
  )
  return results
}

function mapMetadata(game: SteamGame, image: string | null): GameMetadataSearchResult {
  const screenshots =
    game.screenshots?.map(({ path_full }) => path_full).filter(Boolean) ?? []
  const metacritic = game.metacritic?.score

  return {
    id: game.steam_appid,
    title: game.name,
    image: image ?? game.header_image ?? screenshots[0] ?? null,
    released: getReleaseDate(game.release_date?.date),
    rating: 0,
    metacritic:
      typeof metacritic === 'number' && Number.isFinite(metacritic)
        ? metacritic
        : null,
    genres: getSteamGenres(game),
    platforms: getSteamPlatforms(game),
    previewImages: screenshots,
  }
}

function matchesFilters(
  game: SteamGame,
  filters: { genres?: string[]; platforms?: number[] },
) {
  const options = getSteamFilterOptions()
  const selectedGenres = filters.genres?.map(
    (slug) => options.genres.find((genre) => genre.slug === slug)?.id,
  ) ?? []
  const selectedPlatforms = filters.platforms ?? []
  const gameGenreIds = new Set(
    game.genres?.map(({ id }) => Number(id)).filter(Number.isSafeInteger) ?? [],
  )

  if (selectedGenres.length > 0 && !selectedGenres.some((id) => id !== undefined && gameGenreIds.has(id))) {
    return false
  }
  if (
    selectedPlatforms.length > 0 &&
    !selectedPlatforms.some((id) => {
      if (id === 1) return game.platforms?.windows === true
      if (id === 2) return game.platforms?.mac === true
      if (id === 3) return game.platforms?.linux === true
      return false
    })
  ) {
    return false
  }
  return true
}

function getSteamFilterOptions(): GameMetadataFilterOptions {
  return {
    genres: STEAM_GENRES.map((genre) => ({ ...genre })),
    platforms: STEAM_PLATFORMS.map((platform) => ({ ...platform })),
  }
}

export class SteamGameMetadataService implements GameMetadataProvider {
  private readonly inFlightRequests = new Map<string, Promise<unknown>>()
  private readonly responseCache = new Map<
    string,
    { expiresAt: number; payload: unknown }
  >()

  constructor(
    private readonly steamGridDbKey = steamGridDbApiKey,
    private readonly steamStoreBaseUrl = steamStoreApiUrl,
    private readonly steamGridDbBaseUrl = steamGridDbApiUrl,
    private readonly timeoutMs = REQUEST_TIMEOUT_MS,
  ) {
    if (!URL.canParse(steamStoreBaseUrl) || !URL.canParse(steamGridDbBaseUrl)) {
      throw new Error('Steam API base URLs must be valid URLs')
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error('Steam API request timeout must be a positive integer')
    }
  }

  async searchGames(
    title: string,
    filters: { genres?: string[]; platforms?: number[] } = {},
  ): Promise<{ count: number; results: GameMetadataSearchResult[] }> {
    const query = title.trim()
    if (!query) {
      throw new MetadataProviderError('A non-empty game title is required', 'INVALID_QUERY')
    }
    this.validateFilters(filters)

    const url = this.createStoreUrl('storesearch/')
    url.searchParams.set('term', query)
    url.searchParams.set('cc', 'US')
    url.searchParams.set('l', 'spanish')
    const payload = await this.fetchCached(url, isSteamSearchResponse, 'Steam Store')
    const items = this.uniqueGames(payload.items).slice(0, SEARCH_PAGE_SIZE)
    const games = await mapWithConcurrency(items, REQUEST_CONCURRENCY, async (item) => {
      const game = await this.getSteamGame(item.id)
      return game?.type === 'game' || game?.type === 'dlc' ? game : null
    })
    const matchingGames = games
      .filter((game): game is SteamGame => game !== null)
      .filter((game) => matchesFilters(game, filters))
    const results = await this.mapGames(matchingGames)

    return { count: results.length, results }
  }

  async getCatalog(
    ordering: 'popular' | 'recent',
    page: number,
    filters: { genres?: string[]; platforms?: number[] } = {},
  ): Promise<{
    count: number
    page: number
    results: GameMetadataSearchResult[]
  }> {
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new MetadataProviderError('A valid page is required', 'INVALID_QUERY')
    }
    this.validateFilters(filters)

    const pageStart = (page - 1) * CATALOG_PAGE_SIZE
    let popularGameIds: number[] | null = null
    if (ordering === 'popular') {
      try {
        const charts = await this.fetchCached(
          new URL(STEAM_CHARTS_API_URL),
          isSteamChartsResponse,
          'Steam Charts',
        )
        popularGameIds = [
          ...new Set(
            [...charts.response.ranks]
              .sort((first, second) => first.rank - second.rank)
              .map(({ appid }) => appid),
          ),
        ]
        if (popularGameIds.length === 0) {
          throw new MetadataProviderError(
            'Steam Charts returned no popular games',
            'INVALID_RESPONSE',
          )
        }
      } catch (error) {
        if (!(error instanceof MetadataProviderError)) throw error
        console.warn(
          'Steam Charts is unavailable; falling back to Steam Store top sellers.',
          error,
        )
      }
    }

    if (popularGameIds) {
      const pageIds = popularGameIds.slice(pageStart, pageStart + CATALOG_PAGE_SIZE)
      const games = await mapWithConcurrency(pageIds, REQUEST_CONCURRENCY, async (gameId) => {
        const game = await this.getSteamGame(gameId)
        return game?.type === 'game' && game.is_free !== true ? game : null
      })
      const matchingGames = games
        .filter((game): game is SteamGame => game !== null)
        .filter((game) => matchesFilters(game, filters))

      return {
        count: popularGameIds.length,
        page,
        results: await this.mapGames(matchingGames),
      }
    }

    const url = this.createStoreUrl('featuredcategories/')
    url.searchParams.set('cc', 'US')
    url.searchParams.set('l', 'spanish')
    const payload = await this.fetchCached(url, isRecord, 'Steam Store')
    const categoryKey = ordering === 'recent' ? 'new_releases' : 'top_sellers'
    const category = payload[categoryKey]
    if (!isSteamFeatureCategory(category)) {
      throw new MetadataProviderError(
        'Steam Store returned an unexpected catalog response',
        'INVALID_RESPONSE',
      )
    }

    const items = this.uniqueGames(category.items)
    const games = await mapWithConcurrency(items, REQUEST_CONCURRENCY, async (item) => {
      const game = await this.getSteamGame(item.id)
      return game?.type === 'game' ? game : null
    })
    const matchingGames = games
      .filter((game): game is SteamGame => game !== null)
      .filter((game) => matchesFilters(game, filters))
    const count = matchingGames.length
    const pageGames = matchingGames.slice(pageStart, pageStart + CATALOG_PAGE_SIZE)

    return { count, page, results: await this.mapGames(pageGames) }
  }

  async getFilterOptions(): Promise<GameMetadataFilterOptions> {
    return getSteamFilterOptions()
  }

  async getGameDescription(gameId: number): Promise<string> {
    return getDescription(await this.getGameById(gameId))
  }

  async getGameDetails(gameId: number) {
    const game = await this.getGameById(gameId)
    return {
      description: getDescription(game),
      developers: game.developers ?? [],
      esrbRating: extractAgeRating(game),
    }
  }

  async getGameScreenshots(gameId: number): Promise<string[]> {
    const game = await this.getGameById(gameId)
    return game.screenshots?.map(({ path_full }) => path_full).filter(Boolean) ?? []
  }

  private validateFilters(filters: { genres?: string[]; platforms?: number[] }) {
    const options = getSteamFilterOptions()
    if (
      filters.genres?.some((slug) => !options.genres.some((genre) => genre.slug === slug)) ||
      filters.platforms?.some((id) => !options.platforms.some((platform) => platform.id === id))
    ) {
      throw new MetadataProviderError(
        'One or more Steam filters are not supported',
        'INVALID_FILTER',
      )
    }
  }

  private createStoreUrl(path: string) {
    const baseUrl = this.steamStoreBaseUrl.endsWith('/')
      ? this.steamStoreBaseUrl
      : `${this.steamStoreBaseUrl}/`
    return new URL(path, baseUrl)
  }

  private createSteamGridDbUrl(path: string) {
    const baseUrl = this.steamGridDbBaseUrl.endsWith('/')
      ? this.steamGridDbBaseUrl
      : `${this.steamGridDbBaseUrl}/`
    return new URL(path, baseUrl)
  }

  private uniqueGames(items: SteamSearchItem[]) {
    const seen = new Set<number>()
    return items.filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }

  private async getSteamGame(gameId: number): Promise<SteamGame | null> {
    const url = this.createStoreUrl('appdetails/')
    url.searchParams.set('appids', String(gameId))
    url.searchParams.set('cc', 'US')
    url.searchParams.set('l', 'spanish')
    const payload = await this.fetchCached(url, isRecord, 'Steam Store')
    const app = payload[String(gameId)]
    if (!isRecord(app) || typeof app.success !== 'boolean') {
      throw new MetadataProviderError(
        'Steam Store returned an unexpected game response',
        'INVALID_RESPONSE',
      )
    }
    if (!app.success) return null
    if (!isSteamGame(app.data) || app.data.steam_appid !== gameId) {
      throw new MetadataProviderError(
        'Steam Store returned invalid game metadata',
        'INVALID_RESPONSE',
      )
    }
    return app.data
  }

  private async getGameById(gameId: number) {
    if (!Number.isSafeInteger(gameId) || gameId < 1) {
      throw new MetadataProviderError('A valid Steam app ID is required', 'INVALID_QUERY')
    }
    const game = await this.getSteamGame(gameId)
    if (!game) {
      throw new MetadataProviderError('The Steam game was not found', 'INVALID_QUERY')
    }
    return game
  }

  private getApiKey() {
    const apiKey = this.steamGridDbKey?.trim()
    if (!apiKey) {
      throw new MetadataProviderError(
        'SteamGridDB API key is not configured',
        'NOT_CONFIGURED',
      )
    }
    return apiKey
  }

  private async getSteamGridCover(gameId: number): Promise<string | null> {
    const apiKey = this.getApiKey()
    const url = this.createSteamGridDbUrl(`grids/steam/${gameId}`)
    url.searchParams.set('dimensions', '600x900')
    url.searchParams.set('limit', '1')
    try {
      const response = await this.fetchCached(
        url,
        isSteamGridResponse,
        'SteamGridDB',
        { Authorization: `Bearer ${apiKey}` },
      )
      return response.success ? response.data[0]?.url ?? null : null
    } catch (error) {
      if (error instanceof MetadataProviderError && error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  private async mapGames(games: SteamGame[]) {
    return mapWithConcurrency(games, REQUEST_CONCURRENCY, async (game) =>
      mapMetadata(game, await this.getSteamGridCover(game.steam_appid)),
    )
  }

  private async fetchJson<T>(
    url: URL,
    isExpectedPayload: (payload: unknown) => payload is T,
    source: 'Steam Store' | 'SteamGridDB' | 'Steam Charts',
    headers: HeadersInit = {},
  ): Promise<T> {
    let response: Response
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
        throw new MetadataProviderError(`${source} request timed out`, 'TIMEOUT', undefined, {
          cause: error,
        })
      }
      throw new MetadataProviderError(`Could not connect to ${source}`, 'CONNECTION', undefined, {
        cause: error,
      })
    }

    if (response.status === 429) {
      throw new MetadataProviderError(
        `${source} request limit has been reached`,
        'RATE_LIMITED',
        response.status,
      )
    }
    if (response.status === 401 || response.status === 403) {
      const code = source === 'SteamGridDB' ? 'NOT_CONFIGURED' : 'HTTP_ERROR'
      throw new MetadataProviderError(
        `${source} rejected the request credentials`,
        code,
        response.status,
      )
    }
    if (!response.ok) {
      throw new MetadataProviderError(
        `${source} returned HTTP ${response.status}`,
        'HTTP_ERROR',
        response.status,
      )
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      throw new MetadataProviderError(
        `${source} returned invalid JSON`,
        'INVALID_RESPONSE',
        undefined,
        { cause: error },
      )
    }
    if (!isExpectedPayload(payload)) {
      throw new MetadataProviderError(
        `${source} returned an unexpected response`,
        'INVALID_RESPONSE',
      )
    }
    return payload
  }

  private async fetchCached<T>(
    url: URL,
    isExpectedPayload: (payload: unknown) => payload is T,
    source: 'Steam Store' | 'SteamGridDB' | 'Steam Charts',
    headers: HeadersInit = {},
  ): Promise<T> {
    const cacheUrl = new URL(url)
    cacheUrl.searchParams.sort()
    const cacheKey = `${source}:${cacheUrl.pathname}${cacheUrl.search}`
    const cached = this.responseCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      if (isExpectedPayload(cached.payload)) return cached.payload
      this.responseCache.delete(cacheKey)
    } else if (cached) {
      this.responseCache.delete(cacheKey)
    }

    const inFlight = this.inFlightRequests.get(cacheKey)
    if (inFlight) {
      const payload: unknown = await inFlight
      if (isExpectedPayload(payload)) return payload
      throw new MetadataProviderError(
        `${source} returned an unexpected response`,
        'INVALID_RESPONSE',
      )
    }

    const request = this.fetchJson(url, isExpectedPayload, source, headers)
    this.inFlightRequests.set(cacheKey, request)
    try {
      const payload = await request
      if (this.responseCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = this.responseCache.keys().next().value
        if (oldestKey !== undefined) this.responseCache.delete(oldestKey)
      }
      this.responseCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        payload,
      })
      return payload
    } finally {
      this.inFlightRequests.delete(cacheKey)
    }
  }
}

function isSteamFeatureCategory(value: unknown): value is SteamFeatureCategory {
  return isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isSteamSearchItem)
}

export const steamGameMetadataService = new SteamGameMetadataService()
