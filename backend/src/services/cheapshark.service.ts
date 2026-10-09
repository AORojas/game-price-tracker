import { cheapSharkApiUrl } from '../config/cheapshark.js'
import { redisClient } from '../config/redis.js'
import type {
  CheapSharkDeal,
  CheapSharkGameDetails,
  CheapSharkGameInfo,
  CheapSharkGameSearchResult,
  CheapSharkStore,
} from '../types/cheapshark.types.js'

export type CheapSharkErrorCode =
  | 'INVALID_QUERY'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'CONNECTION'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'

export class CheapSharkServiceError extends Error {
  constructor(
    message: string,
    public readonly code: CheapSharkErrorCode,
    public readonly statusCode?: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'CheapSharkServiceError'
  }
}

const REQUEST_TIMEOUT_MS = 8_000
const MIN_REQUEST_INTERVAL_MS = 1_000
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000
const CHEAPSHARK_CACHE_TTL_SECONDS = 60 * 60

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isSearchResult(value: unknown): value is CheapSharkGameSearchResult {
  return (
    isRecord(value) &&
    typeof value.gameID === 'string' &&
    isNullableString(value.steamAppID) &&
    typeof value.cheapest === 'string' &&
    typeof value.cheapestDealID === 'string' &&
    typeof value.external === 'string' &&
    typeof value.internalName === 'string' &&
    typeof value.thumb === 'string'
  )
}

function isGameInfo(value: unknown): value is CheapSharkGameInfo {
  return (
    isRecord(value) &&
    typeof value.title === 'string' &&
    isNullableString(value.steamAppID) &&
    typeof value.thumb === 'string'
  )
}

function isDeal(value: unknown): value is CheapSharkDeal {
  return (
    isRecord(value) &&
    typeof value.storeID === 'string' &&
    typeof value.dealID === 'string' &&
    typeof value.price === 'string' &&
    typeof value.retailPrice === 'string' &&
    typeof value.savings === 'string'
  )
}

function isGameDetails(value: unknown): value is CheapSharkGameDetails {
  return (
    isRecord(value) &&
    isGameInfo(value.info) &&
    Array.isArray(value.deals) &&
    value.deals.every(isDeal)
  )
}

function isStore(value: unknown): value is CheapSharkStore {
  if (!isRecord(value) || !isRecord(value.images)) return false

  return (
    typeof value.storeID === 'string' &&
    typeof value.storeName === 'string' &&
    typeof value.isActive === 'number' &&
    typeof value.images.banner === 'string' &&
    typeof value.images.logo === 'string' &&
    typeof value.images.icon === 'string'
  )
}

export class CheapSharkService {
  private readonly inFlightRequests = new Map<string, Promise<unknown>>()
  private requestQueue: Promise<void> = Promise.resolve()
  private nextRequestAt = 0
  private rateLimitedUntil = 0

  constructor(
    private readonly apiBaseUrl = cheapSharkApiUrl,
    private readonly timeoutMs = REQUEST_TIMEOUT_MS,
  ) {
    if (!URL.canParse(apiBaseUrl)) {
      throw new Error('CheapShark API base URL must be a valid URL')
    }

    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error('CheapShark request timeout must be a positive integer')
    }
  }

  async searchGames(title: string): Promise<CheapSharkGameSearchResult[]> {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      throw new CheapSharkServiceError(
        'A non-empty game title is required',
        'INVALID_QUERY',
      )
    }

    const url = this.createApiUrl('games')
    url.searchParams.set('title', normalizedTitle)

    return this.fetchCached(
      `api:cheapshark:search:${encodeURIComponent(normalizedTitle.toLowerCase())}`,
      CHEAPSHARK_CACHE_TTL_SECONDS,
      url,
      (payload): payload is CheapSharkGameSearchResult[] =>
        Array.isArray(payload) && payload.every(isSearchResult),
      'game search',
    )
  }

  async getGameDetails(gameId: string): Promise<CheapSharkGameDetails> {
    const normalizedGameId = gameId.trim()
    if (!normalizedGameId) {
      throw new CheapSharkServiceError(
        'A non-empty game ID is required',
        'INVALID_QUERY',
      )
    }

    const url = this.createApiUrl('games')
    url.searchParams.set('id', normalizedGameId)

    return this.fetchCached(
      `api:cheapshark:details:${normalizedGameId}`,
      CHEAPSHARK_CACHE_TTL_SECONDS,
      url,
      isGameDetails,
      'game details',
    )
  }

  async getStores(): Promise<CheapSharkStore[]> {
    const url = this.createApiUrl('stores')

    return this.fetchCached(
      'api:cheapshark:stores',
      CHEAPSHARK_CACHE_TTL_SECONDS,
      url,
      (payload): payload is CheapSharkStore[] =>
        Array.isArray(payload) && payload.every(isStore),
      'store list',
    )
  }

  private createApiUrl(path: string): URL {
    const baseUrl = this.apiBaseUrl.endsWith('/')
      ? this.apiBaseUrl
      : `${this.apiBaseUrl}/`
    return new URL(path, baseUrl)
  }

  private async fetchCached<T>(
    cacheKey: string,
    cacheTtlSeconds: number,
    url: URL,
    isExpectedPayload: (payload: unknown) => payload is T,
    responseDescription: string,
  ): Promise<T> {
    const inFlight = this.inFlightRequests.get(cacheKey)
    if (inFlight) {
      const payload: unknown = await inFlight
      if (isExpectedPayload(payload)) return payload
      throw new CheapSharkServiceError(
        `CheapShark returned an unexpected ${responseDescription} response`,
        'INVALID_RESPONSE',
      )
    }

    const request = (async () => {
      const cached = await redisClient.get(cacheKey)
      if (cached !== null) {
        let cachedPayload: unknown
        try {
          cachedPayload = JSON.parse(cached)
        } catch {
          cachedPayload = undefined
        }

        if (isExpectedPayload(cachedPayload)) return cachedPayload
        await redisClient.del(cacheKey)
      }

      const payload = await this.fetchJson(url, isExpectedPayload, responseDescription)
      await redisClient.setEx(cacheKey, cacheTtlSeconds, JSON.stringify(payload))
      return payload
    })()
    this.inFlightRequests.set(cacheKey, request)
    try {
      return await request
    } finally {
      this.inFlightRequests.delete(cacheKey)
    }
  }

  private scheduleRequest<T>(request: () => Promise<T>): Promise<T> {
    const scheduledRequest = this.requestQueue.then(async () => {
      const cooldownRemaining = this.rateLimitedUntil - Date.now()
      if (cooldownRemaining > 0) {
        throw new CheapSharkServiceError(
          'CheapShark is temporarily rate limiting requests',
          'RATE_LIMITED',
        )
      }

      const waitMs = this.nextRequestAt - Date.now()
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }
      if (this.rateLimitedUntil > Date.now()) {
        throw new CheapSharkServiceError(
          'CheapShark is temporarily rate limiting requests',
          'RATE_LIMITED',
        )
      }
      this.nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS
      return request()
    })

    this.requestQueue = scheduledRequest.then(
      () => undefined,
      () => undefined,
    )
    return scheduledRequest
  }

  private async fetchJson<T>(
    url: URL,
    isExpectedPayload: (payload: unknown) => payload is T,
    responseDescription: string,
  ): Promise<T> {
    let response: Response
    try {
      response = await this.scheduleRequest(() =>
        fetch(url, {
          headers: {
            'User-Agent': 'GamePriceTracker/0.1',
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        }),
      )
    } catch (error) {
      if (error instanceof CheapSharkServiceError) throw error
      if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
        throw new CheapSharkServiceError(
          'CheapShark request timed out',
          'TIMEOUT',
          undefined,
          { cause: error },
        )
      }

      throw new CheapSharkServiceError(
        'Could not connect to CheapShark',
        'CONNECTION',
        undefined,
        { cause: error },
      )
    }

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const retryAfterSeconds = retryAfter === null ? Number.NaN : Number(retryAfter)
        const cooldownMs = Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : DEFAULT_RATE_LIMIT_COOLDOWN_MS
        this.rateLimitedUntil = Math.max(
          this.rateLimitedUntil,
          Date.now() + Math.max(cooldownMs, DEFAULT_RATE_LIMIT_COOLDOWN_MS),
        )
        throw new CheapSharkServiceError(
          'CheapShark is temporarily rate limiting requests',
          'RATE_LIMITED',
          response.status,
        )
      }

      throw new CheapSharkServiceError(
        `CheapShark returned HTTP ${response.status}`,
        'HTTP_ERROR',
        response.status,
      )
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      throw new CheapSharkServiceError(
        'CheapShark returned invalid JSON',
        'INVALID_RESPONSE',
        undefined,
        { cause: error },
      )
    }

    if (!isExpectedPayload(payload)) {
      throw new CheapSharkServiceError(
        `CheapShark returned an unexpected ${responseDescription} response`,
        'INVALID_RESPONSE',
      )
    }

    return payload
  }
}

export const cheapSharkService = new CheapSharkService()
