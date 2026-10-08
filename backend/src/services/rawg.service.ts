import { rawgApiKey, rawgApiUrl } from '../config/rawg.js'
import type {
  GameMetadataSearchResult,
  GameMetadataFilterOptions,
  RawgGameGenre,
  RawgGamePlatform,
  RawgFilterOption,
  RawgFilterOptionsResponse,
  RawgGameSearchResponse,
  RawgGameSearchResult,
} from '../types/rawg.types.js'

export type RawgServiceErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_QUERY'
  | 'INVALID_FILTER'
  | 'TIMEOUT'
  | 'CONNECTION'
  | 'HTTP_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'

export class RawgServiceError extends Error {
  constructor(
    message: string,
    public readonly code: RawgServiceErrorCode,
    public readonly statusCode?: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'RawgServiceError'
  }
}

const REQUEST_TIMEOUT_MS = 8_000
const SEARCH_PAGE_SIZE = 40
const CATALOG_PAGE_SIZE = 24
const FILTER_CACHE_TTL_MS = 24 * 60 * 60 * 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isGameGenre(value: unknown): value is RawgGameGenre {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string'
  )
}

function isGamePlatform(value: unknown): value is RawgGamePlatform {
  if (!isRecord(value) || !isRecord(value.platform)) return false

  return (
    typeof value.platform.id === 'number' &&
    typeof value.platform.name === 'string' &&
    typeof value.platform.slug === 'string'
  )
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isNullableNumber(value: unknown): value is number | null {
  return typeof value === 'number' || value === null
}

function isGameSearchResult(value: unknown): value is RawgGameSearchResult {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    isNullableString(value.background_image) &&
    isNullableString(value.released) &&
    typeof value.rating === 'number' &&
    isNullableNumber(value.metacritic) &&
    Array.isArray(value.genres) &&
    value.genres.every(isGameGenre) &&
    Array.isArray(value.platforms) &&
    value.platforms.every(isGamePlatform)
  )
}

function isGameSearchResponse(value: unknown): value is RawgGameSearchResponse {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    Array.isArray(value.results) &&
    value.results.every(isGameSearchResult)
  )
}

function isFilterOption(value: unknown): value is RawgFilterOption {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string'
  )
}

function isFilterOptionsResponse(value: unknown): value is RawgFilterOptionsResponse {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    Array.isArray(value.results) &&
    value.results.every(isFilterOption)
  )
}

export class RawgService {
  private filterOptionsCache: {
    expiresAt: number
    value: GameMetadataFilterOptions
  } | null = null
  private filterOptionsRequest: Promise<GameMetadataFilterOptions> | null = null

  constructor(
    private readonly apiKey = rawgApiKey,
    private readonly apiBaseUrl = rawgApiUrl,
    private readonly timeoutMs = REQUEST_TIMEOUT_MS,
  ) {
    if (!URL.canParse(apiBaseUrl)) {
      throw new Error('RAWG API base URL must be a valid URL')
    }

    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error('RAWG request timeout must be a positive integer')
    }
  }

  async searchGames(
    title: string,
    filters: { genres?: string[]; platforms?: number[] } = {},
  ): Promise<{
    count: number
    results: GameMetadataSearchResult[]
  }> {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      throw new RawgServiceError(
        'A non-empty game title is required',
        'INVALID_QUERY',
      )
    }

    const filterOptions =
      filters.genres?.length || filters.platforms?.length
        ? await this.getFilterOptions()
        : null

    this.validateFilters(filters, filterOptions)

    const url = this.createApiUrl('games')
    url.searchParams.set('search', normalizedTitle)
    url.searchParams.set('page_size', String(SEARCH_PAGE_SIZE))
    if (filters.genres?.length) {
      url.searchParams.set('genres', filters.genres.join(','))
    }
    if (filters.platforms?.length) {
      url.searchParams.set('parent_platforms', filters.platforms.join(','))
    }

    const payload = await this.fetchJson(url, isGameSearchResponse)

    return {
      count: payload.count,
      results: payload.results.map((game) => ({
        id: game.id,
        title: game.name,
        image: game.background_image,
        released: game.released,
        rating: game.rating,
        metacritic: game.metacritic,
        genres: game.genres.map((genre) => genre.name),
        platforms: game.platforms.map(({ platform }) => platform.name),
      })),
    }
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
      throw new RawgServiceError('A valid page is required', 'INVALID_QUERY')
    }

    const filterOptions =
      filters.genres?.length || filters.platforms?.length
        ? await this.getFilterOptions()
        : null
    this.validateFilters(filters, filterOptions)

    const url = this.createApiUrl('games')
    url.searchParams.set('ordering', ordering === 'recent' ? '-released' : '-added')
    url.searchParams.set('page', String(page))
    url.searchParams.set('page_size', String(CATALOG_PAGE_SIZE))
    if (ordering === 'recent') {
      const today = new Date().toISOString().slice(0, 10)
      url.searchParams.set('dates', `1900-01-01,${today}`)
    }
    if (filters.genres?.length) {
      url.searchParams.set('genres', filters.genres.join(','))
    }
    if (filters.platforms?.length) {
      url.searchParams.set('parent_platforms', filters.platforms.join(','))
    }

    const payload = await this.fetchJson(url, isGameSearchResponse)
    return {
      count: payload.count,
      page,
      results: payload.results.map((game) => ({
        id: game.id,
        title: game.name,
        image: game.background_image,
        released: game.released,
        rating: game.rating,
        metacritic: game.metacritic,
        genres: game.genres.map((genre) => genre.name),
        platforms: game.platforms.map(({ platform }) => platform.name),
      })),
    }
  }

  async getFilterOptions(): Promise<GameMetadataFilterOptions> {
    if (this.filterOptionsCache && this.filterOptionsCache.expiresAt > Date.now()) {
      return this.filterOptionsCache.value
    }

    if (this.filterOptionsRequest) return this.filterOptionsRequest

    const request = this.fetchFilterOptions()
    this.filterOptionsRequest = request
    try {
      const options = await request
      this.filterOptionsCache = {
        expiresAt: Date.now() + FILTER_CACHE_TTL_MS,
        value: options,
      }
      return options
    } finally {
      if (this.filterOptionsRequest === request) {
        this.filterOptionsRequest = null
      }
    }
  }

  private getApiKey(): string {
    const apiKey = this.apiKey?.trim()
    if (!apiKey) {
      throw new RawgServiceError(
        'RAWG API key is not configured',
        'NOT_CONFIGURED',
      )
    }

    return apiKey
  }

  private validateFilters(
    filters: { genres?: string[]; platforms?: number[] },
    filterOptions: GameMetadataFilterOptions | null,
  ) {
    if (!filterOptions) return

    const validGenres = new Set(filterOptions.genres.map((genre) => genre.slug))
    const validPlatforms = new Set(filterOptions.platforms.map((platform) => platform.id))
    if (
      filters.genres?.some((genre) => !validGenres.has(genre)) ||
      filters.platforms?.some((platform) => !validPlatforms.has(platform))
    ) {
      throw new RawgServiceError(
        'One or more game filters are not supported',
        'INVALID_FILTER',
      )
    }
  }

  private createApiUrl(path: string): URL {
    const baseUrl = this.apiBaseUrl.endsWith('/')
      ? this.apiBaseUrl
      : `${this.apiBaseUrl}/`
    const url = new URL(path, baseUrl)
    url.searchParams.set('key', this.getApiKey())
    return url
  }

  private async fetchFilterOptions(): Promise<GameMetadataFilterOptions> {
    const genresUrl = this.createApiUrl('genres')
    genresUrl.searchParams.set('page_size', '100')
    const platformsUrl = this.createApiUrl('platforms/lists/parents')

    const [genres, platforms] = await Promise.all([
      this.fetchJson(genresUrl, isFilterOptionsResponse),
      this.fetchJson(platformsUrl, isFilterOptionsResponse),
    ])

    return {
      genres: genres.results,
      platforms: platforms.results,
    }
  }

  private async fetchJson<T>(
    url: URL,
    isExpectedPayload: (payload: unknown) => payload is T,
  ): Promise<T> {
    let response: Response
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
        throw new RawgServiceError(
          'RAWG request timed out',
          'TIMEOUT',
          undefined,
          { cause: error },
        )
      }

      throw new RawgServiceError(
        'Could not connect to RAWG',
        'CONNECTION',
        undefined,
        { cause: error },
      )
    }

    if (response.status === 429) {
      throw new RawgServiceError(
        'RAWG request limit has been reached',
        'RATE_LIMITED',
        response.status,
      )
    }

    if (!response.ok) {
      throw new RawgServiceError(
        `RAWG returned HTTP ${response.status}`,
        'HTTP_ERROR',
        response.status,
      )
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      throw new RawgServiceError(
        'RAWG returned invalid JSON',
        'INVALID_RESPONSE',
        undefined,
        { cause: error },
      )
    }

    if (!isExpectedPayload(payload)) {
      throw new RawgServiceError(
        'RAWG returned an unexpected response',
        'INVALID_RESPONSE',
      )
    }

    return payload
  }
}

export const rawgService = new RawgService()
