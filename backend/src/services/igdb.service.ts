import { createHash } from 'node:crypto'
import { igdbApiUrl, igdbClientId, igdbClientSecret, twitchOauthUrl } from '../config/igdb.js'
import { redisClient } from '../config/redis.js'
import type {
  GameMetadataFilterOptions,
  GameMetadataSearchResult,
  RawgFilterOption,
} from '../types/rawg.types.js'
import { MetadataProviderError } from './metadataProviderError.js'

interface IgdbEntity {
  id: number
  name: string
  slug: string
}

interface IgdbImage {
  image_id: string
}

interface IgdbGame {
  id: number
  name: string
  summary?: string | null
  storyline?: string | null
  first_release_date?: number | null
  rating?: number | null
  aggregated_rating?: number | null
  genres?: IgdbEntity[] | null
  platforms?: IgdbEntity[] | null
  cover?: IgdbImage | null
  screenshots?: IgdbImage[] | null
  involved_companies?: Array<{
    developer: boolean
    company: { name: string }
  }> | null
  age_ratings?: Array<{
    category: number
    rating: number
  }> | null
}

interface IgdbTokenResponse {
  access_token: string
  expires_in: number
}

const REQUEST_TIMEOUT_MS = 8_000
const CACHE_TTL_SECONDS = 24 * 60 * 60
const SEARCH_PAGE_SIZE = 40
const CATALOG_PAGE_SIZE = 24
const GAME_FIELDS = [
  'id',
  'name',
  'summary',
  'storyline',
  'first_release_date',
  'rating',
  'aggregated_rating',
  'genres.id',
  'genres.name',
  'genres.slug',
  'platforms.id',
  'platforms.name',
  'platforms.slug',
  'cover.image_id',
  'screenshots.image_id',
  'involved_companies.developer',
  'involved_companies.company.name',
  'age_ratings.category',
  'age_ratings.rating',
].join(',')

const ESRB_RATINGS: Record<number, string> = {
  6: 'RP',
  7: 'EC',
  8: 'E',
  9: 'E10+',
  10: 'T',
  11: 'M',
  12: 'AO',
}

const RATING_CATEGORY_ESRB = 1

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIgdbEntity(value: unknown): value is IgdbEntity {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string'
  )
}

function isIgdbImage(value: unknown): value is IgdbImage {
  return isRecord(value) && typeof value.image_id === 'string'
}

function isOptionalNumber(value: unknown) {
  return value === undefined || value === null || typeof value === 'number'
}

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string'
}

function isOptionalArray<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is T[] | null | undefined {
  return value === undefined || value === null || (Array.isArray(value) && value.every(isItem))
}

function isIgdbCompany(value: unknown): value is IgdbGame['involved_companies'] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.developer === 'boolean' &&
        isRecord(item.company) &&
        typeof item.company.name === 'string',
    )
  )
}

function isIgdbAgeRating(value: unknown): value is IgdbGame['age_ratings'] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.category === 'number' &&
        typeof item.rating === 'number',
    )
  )
}

function isIgdbGame(value: unknown): value is IgdbGame {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    isOptionalString(value.summary) &&
    isOptionalString(value.storyline) &&
    isOptionalNumber(value.first_release_date) &&
    isOptionalNumber(value.rating) &&
    isOptionalNumber(value.aggregated_rating) &&
    isOptionalArray(value.genres, isIgdbEntity) &&
    isOptionalArray(value.platforms, isIgdbEntity) &&
    (value.cover === undefined || value.cover === null || isIgdbImage(value.cover)) &&
    isOptionalArray(value.screenshots, isIgdbImage) &&
    (value.involved_companies === undefined ||
      value.involved_companies === null ||
      isIgdbCompany(value.involved_companies)) &&
    (value.age_ratings === undefined ||
      value.age_ratings === null ||
      isIgdbAgeRating(value.age_ratings))
  )
}

function isIgdbGameList(value: unknown): value is IgdbGame[] {
  return Array.isArray(value) && value.every(isIgdbGame)
}

function isIgdbEntityList(value: unknown): value is IgdbEntity[] {
  return Array.isArray(value) && value.every(isIgdbEntity)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isTokenResponse(value: unknown): value is IgdbTokenResponse {
  return (
    isRecord(value) &&
    typeof value.access_token === 'string' &&
    typeof value.expires_in === 'number' &&
    Number.isFinite(value.expires_in) &&
    value.expires_in > 0
  )
}

function normalizeTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getImageUrl(imageId: string, size = 't_1080p') {
  return `https://images.igdb.com/igdb/image/upload/${size}/${encodeURIComponent(imageId)}.jpg`
}

function getReleaseDate(timestamp?: number | null) {
  if (timestamp === undefined || timestamp === null) return null
  const date = new Date(timestamp * 1000)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function mapEsrbRating(ageRatings?: IgdbGame['age_ratings']) {
  const rating = ageRatings?.find(
    ({ category }) => category === RATING_CATEGORY_ESRB,
  )
  return rating ? ESRB_RATINGS[rating.rating] ?? null : null
}

function getGameDescription(game: IgdbGame) {
  return game.storyline?.trim() || game.summary?.trim() || ''
}

function mapGame(game: IgdbGame): GameMetadataSearchResult {
  const screenshots = game.screenshots?.map(({ image_id }) => getImageUrl(image_id)) ?? []
  const cover = game.cover ? getImageUrl(game.cover.image_id) : null

  return {
    id: game.id,
    title: game.name,
    image: screenshots[0] ?? cover,
    released: getReleaseDate(game.first_release_date),
    rating: game.rating === undefined || game.rating === null ? 0 : game.rating / 20,
    metacritic:
      game.aggregated_rating === undefined || game.aggregated_rating === null
        ? null
        : Math.round(game.aggregated_rating),
    genres: game.genres?.map(({ name }) => name) ?? [],
    platforms: game.platforms?.map(({ name }) => name) ?? [],
    previewImages: screenshots,
  }
}

function escapeSearchTerm(value: string) {
  return value.replace(/[\r\n]/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function getWhereClause(
  filters: { genres?: string[]; platforms?: number[] },
  options: GameMetadataFilterOptions,
) {
  const genreIds = new Map(options.genres.map(({ slug, id }) => [slug, id]))
  const platformIds = new Set(options.platforms.map(({ id }) => id))
  const clauses: string[] = []

  if (filters.genres?.length) {
    const ids = filters.genres.map((slug) => genreIds.get(slug))
    if (ids.some((id) => id === undefined)) {
      throw new MetadataProviderError(
        'One or more IGDB genres are not supported',
        'INVALID_FILTER',
      )
    }
    clauses.push(`genres = (${ids.join(',')})`)
  }

  if (filters.platforms?.length) {
    if (filters.platforms.some((id) => !platformIds.has(id))) {
      throw new MetadataProviderError(
        'One or more IGDB platforms are not supported',
        'INVALID_FILTER',
      )
    }
    clauses.push(`platforms = (${filters.platforms.join(',')})`)
  }

  return clauses.length > 0 ? `where ${clauses.join(' & ')};` : ''
}

export class IgdbService {
  private readonly inFlightRequests = new Map<string, Promise<unknown>>()
  private accessToken: string | null = null
  private accessTokenExpiresAt = 0
  private tokenRequest: Promise<string> | null = null

  constructor(
    private readonly clientId = igdbClientId,
    private readonly clientSecret = igdbClientSecret,
    private readonly timeoutMs = REQUEST_TIMEOUT_MS,
  ) {
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error('IGDB request timeout must be a positive integer')
    }
  }

  async searchGames(
    title: string,
    filters: { genres?: string[]; platforms?: number[] } = {},
  ): Promise<{ count: number; results: GameMetadataSearchResult[] }> {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      throw new MetadataProviderError('A non-empty game title is required', 'INVALID_QUERY')
    }

    const where = await this.getFilterClause(filters)
    const query = [
      `search "${escapeSearchTerm(normalizedTitle)}";`,
      where.trim(),
      `fields ${GAME_FIELDS};`,
      `limit ${SEARCH_PAGE_SIZE};`,
    ]
      .filter(Boolean)
      .join(' ')
    const games = await this.fetchCached('games', query, isIgdbGameList)
    const shortQuery = normalizeTitle(normalizedTitle)
    const results =
      shortQuery.length <= 2
        ? games
            .filter((game) => normalizeTitle(game.name).includes(shortQuery))
            .sort((first, second) => (second.rating ?? 0) - (first.rating ?? 0))
        : games

    return {
      count: results.length,
      results: results.map(mapGame),
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
      throw new MetadataProviderError('A valid page is required', 'INVALID_QUERY')
    }

    const filterClause = await this.getFilterClause(filters)
    const clauses = [
      ...(ordering === 'recent' ? ['first_release_date != null'] : []),
      ...(filterClause ? [filterClause.slice(6, -1)] : []),
    ]
    const where = clauses.length > 0 ? `where ${clauses.join(' & ')};` : ''
    const sort = ordering === 'recent' ? 'first_release_date' : 'rating'
    const countQuery = `count; ${where}`
    const gamesQuery = [
      `fields ${GAME_FIELDS};`,
      where,
      `sort ${sort} desc;`,
      `limit ${CATALOG_PAGE_SIZE};`,
      `offset ${(page - 1) * CATALOG_PAGE_SIZE};`,
    ]
      .filter(Boolean)
      .join(' ')
    const [count, games] = await Promise.all([
      this.fetchCached('games', countQuery, isCount),
      this.fetchCached('games', gamesQuery, isIgdbGameList),
    ])

    return { count, page, results: games.map(mapGame) }
  }

  async getFilterOptions(): Promise<GameMetadataFilterOptions> {
    const [genres, platforms] = await Promise.all([
      this.fetchCached(
        'genres',
        'fields id,name,slug; limit 500; sort name asc;',
        isIgdbEntityList,
      ),
      this.fetchCached(
        'platforms',
        'fields id,name,slug; limit 500; sort name asc;',
        isIgdbEntityList,
      ),
    ])

    return {
      genres: genres.map(mapFilterOption),
      platforms: platforms.map(mapFilterOption),
    }
  }

  async getGameDescription(gameId: number): Promise<string> {
    const game = await this.getGameById(gameId)
    return getGameDescription(game)
  }

  async getGameDetails(gameId: number): Promise<{
    description: string
    developers: string[]
    esrbRating: string | null
  }> {
    const game = await this.getGameById(gameId)
    return {
      description: getGameDescription(game),
      developers:
        game.involved_companies
          ?.filter(({ developer }) => developer)
          .map(({ company }) => company.name) ?? [],
      esrbRating: mapEsrbRating(game.age_ratings),
    }
  }

  async getGameScreenshots(gameId: number): Promise<string[]> {
    const game = await this.getGameById(gameId)
    return game.screenshots?.map(({ image_id }) => getImageUrl(image_id)) ?? []
  }

  private async getFilterClause(filters: {
    genres?: string[]
    platforms?: number[]
  }) {
    if (!filters.genres?.length && !filters.platforms?.length) return ''
    return getWhereClause(filters, await this.getFilterOptions())
  }

  private async getGameById(gameId: number) {
    if (!Number.isSafeInteger(gameId) || gameId < 1) {
      throw new MetadataProviderError('A valid IGDB game ID is required', 'INVALID_QUERY')
    }

    const query = `fields ${GAME_FIELDS}; where id = ${gameId}; limit 1;`
    const games = await this.fetchCached('games', query, isIgdbGameList)
    const game = games[0]
    if (!game) {
      throw new MetadataProviderError('The IGDB game was not found', 'INVALID_QUERY')
    }
    return game
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
      return this.accessToken
    }
    if (this.tokenRequest) return this.tokenRequest

    const request = this.requestAccessToken()
    this.tokenRequest = request
    try {
      return await request
    } finally {
      if (this.tokenRequest === request) this.tokenRequest = null
    }
  }

  private async requestAccessToken(): Promise<string> {
    const clientId = this.clientId?.trim()
    const clientSecret = this.clientSecret?.trim()
    if (!clientId || !clientSecret) {
      throw new MetadataProviderError(
        'IGDB client credentials are not configured',
        'NOT_CONFIGURED',
      )
    }

    let response: Response
    try {
      response = await fetch(twitchOauthUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      throw this.toNetworkError(error, 'Twitch OAuth')
    }

    if (response.status === 429) {
      throw new MetadataProviderError('Twitch OAuth rate limit reached', 'RATE_LIMITED', 429)
    }
    if (!response.ok) {
      throw new MetadataProviderError(
        `Twitch OAuth returned HTTP ${response.status}`,
        'HTTP_ERROR',
        response.status,
      )
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      throw new MetadataProviderError(
        'Twitch OAuth returned invalid JSON',
        'INVALID_RESPONSE',
        undefined,
        { cause: error },
      )
    }
    if (!isTokenResponse(payload)) {
      throw new MetadataProviderError(
        'Twitch OAuth returned an unexpected response',
        'INVALID_RESPONSE',
      )
    }

    this.accessToken = payload.access_token
    this.accessTokenExpiresAt =
      Date.now() + Math.max(1_000, payload.expires_in * 1_000 - 60_000)
    return payload.access_token
  }

  private async fetchApi<T>(
    endpoint: string,
    query: string,
    isExpectedPayload: (payload: unknown) => payload is T,
    authRetry = 0,
  ): Promise<T> {
    const token = await this.getAccessToken()
    let response: Response
    try {
      response = await fetch(`${igdbApiUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Client-ID': this.clientId?.trim() ?? '',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: query,
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      throw this.toNetworkError(error, 'IGDB')
    }

    if (response.status === 401 && authRetry === 0) {
      if (this.accessToken === token) {
        this.accessToken = null
        this.accessTokenExpiresAt = 0
      }
      return this.fetchApi(endpoint, query, isExpectedPayload, 1)
    }
    if (response.status === 429) {
      throw new MetadataProviderError('IGDB rate limit reached', 'RATE_LIMITED', 429)
    }
    if (!response.ok) {
      throw new MetadataProviderError(
        `IGDB returned HTTP ${response.status}`,
        'HTTP_ERROR',
        response.status,
      )
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      throw new MetadataProviderError(
        'IGDB returned invalid JSON',
        'INVALID_RESPONSE',
        undefined,
        { cause: error },
      )
    }
    if (!isExpectedPayload(payload)) {
      throw new MetadataProviderError(
        'IGDB returned an unexpected response',
        'INVALID_RESPONSE',
      )
    }
    return payload
  }

  private async fetchCached<T>(
    endpoint: string,
    query: string,
    isExpectedPayload: (payload: unknown) => payload is T,
  ): Promise<T> {
    const queryHash = createHash('sha256').update(query).digest('hex')
    const cacheKey = `api:igdb:${endpoint}:${queryHash}`
    const inFlight = this.inFlightRequests.get(cacheKey)
    if (inFlight) {
      const payload: unknown = await inFlight
      if (isExpectedPayload(payload)) return payload
      throw new MetadataProviderError('IGDB returned an unexpected response', 'INVALID_RESPONSE')
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

      const payload = await this.fetchApi(endpoint, query, isExpectedPayload)
      await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(payload))
      return payload
    })()
    this.inFlightRequests.set(cacheKey, request)
    try {
      return await request
    } finally {
      this.inFlightRequests.delete(cacheKey)
    }
  }

  private toNetworkError(error: unknown, service: string) {
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
      return new MetadataProviderError(
        `${service} request timed out`,
        'TIMEOUT',
        undefined,
        { cause: error },
      )
    }
    return new MetadataProviderError(
      `Could not connect to ${service}`,
      'CONNECTION',
      undefined,
      { cause: error },
    )
  }
}

function mapFilterOption(option: IgdbEntity): RawgFilterOption {
  return {
    id: option.id,
    name: option.name,
    slug: option.slug,
  }
}

export const igdbService = new IgdbService()
