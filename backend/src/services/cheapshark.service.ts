import { cheapSharkApiUrl } from '../config/cheapshark.js'
import type { CheapSharkGameSearchResult } from '../types/cheapshark.types.js'

export type CheapSharkErrorCode =
  | 'INVALID_QUERY'
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

export class CheapSharkService {
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

    const baseUrl = this.apiBaseUrl.endsWith('/')
      ? this.apiBaseUrl
      : `${this.apiBaseUrl}/`
    const url = new URL('games', baseUrl)
    url.searchParams.set('title', normalizedTitle)

    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'GamePriceTracker/0.1',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
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

    if (!Array.isArray(payload) || !payload.every(isSearchResult)) {
      throw new CheapSharkServiceError(
        'CheapShark returned an unexpected game search response',
        'INVALID_RESPONSE',
      )
    }

    return payload
  }
}

export const cheapSharkService = new CheapSharkService()
