import { rawgApiKey, rawgApiUrl } from '../config/rawg.js'
import type {
  GameMetadataSearchResult,
  RawgGameGenre,
  RawgGamePlatform,
  RawgGameSearchResponse,
  RawgGameSearchResult,
} from '../types/rawg.types.js'

export type RawgServiceErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_QUERY'
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
const SEARCH_PAGE_SIZE = 12

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

export class RawgService {
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

  async searchGames(title: string): Promise<{
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

    const normalizedApiKey = this.apiKey?.trim()
    if (!normalizedApiKey) {
      throw new RawgServiceError(
        'RAWG API key is not configured',
        'NOT_CONFIGURED',
      )
    }

    const baseUrl = this.apiBaseUrl.endsWith('/')
      ? this.apiBaseUrl
      : `${this.apiBaseUrl}/`
    const url = new URL('games', baseUrl)
    url.searchParams.set('key', normalizedApiKey)
    url.searchParams.set('search', normalizedTitle)
    url.searchParams.set('page_size', String(SEARCH_PAGE_SIZE))

    const payload = await this.fetchJson(url)

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

  private async fetchJson(url: URL): Promise<RawgGameSearchResponse> {
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

    if (!isGameSearchResponse(payload)) {
      throw new RawgServiceError(
        'RAWG returned an unexpected game search response',
        'INVALID_RESPONSE',
      )
    }

    return payload
  }
}

export const rawgService = new RawgService()
