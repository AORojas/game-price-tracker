import type { Request, Response } from 'express'
import {
  catalogMetadataPageSize,
  catalogPageSize,
  maxCatalogMetadataPage,
} from '../config/catalog.js'
import { gameMetadataProviderName } from '../config/gameMetadata.js'
import { CheapSharkServiceError } from '../services/cheapshark.service.js'
import {
  getGameCatalogWithOffers,
  type CatalogCursor,
} from '../services/gameCatalog.service.js'
import { MetadataProviderError } from '../services/metadataProviderError.js'
import {
  gameMetadataService,
  type GameMetadataProvider,
} from '../services/gameMetadataProvider.service.js'
import { rawgService } from '../services/rawg.service.js'
import { steamGameMetadataService } from '../services/steam.service.js'

function getDetailMetadataProvider(
  request: Request,
  response: Response,
): GameMetadataProvider | null {
  const source = request.query.source
  if (source === undefined) return gameMetadataService
  if (source === 'rawg') return rawgService
  if (source === 'steam') return steamGameMetadataService

  response.status(400).json({
    error: {
      code: 'INVALID_QUERY',
      message: 'Metadata source must be rawg or steam',
    },
  })
  return null
}

function getErrorResponse(error: unknown) {
  if (error instanceof CheapSharkServiceError) {
    const status =
      error.code === 'TIMEOUT'
        ? 504
        : error.code === 'RATE_LIMITED'
          ? 429
          : error.code === 'INVALID_QUERY'
            ? 400
            : 502
    return {
      status,
      body: {
        error: {
          code:
            error.code === 'RATE_LIMITED'
              ? 'RATE_LIMITED'
              : error.code === 'TIMEOUT'
                ? 'TIMEOUT'
                : 'UPSTREAM_ERROR',
          message: 'Could not verify game offers',
          ...(error.code === 'RATE_LIMITED'
            ? {
                retryAfter: Math.max(
                  1,
                  Math.ceil((error.retryAfterMs ?? 1_000) / 1_000),
                ),
              }
            : {}),
        },
      },
    }
  }

  if (!(error instanceof MetadataProviderError)) {
    console.error('Unexpected game metadata provider error', error)
    return {
      status: 500,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while retrieving game data',
        },
      },
    }
  }

  switch (error.code) {
    case 'NOT_CONFIGURED':
      return {
        status: 503,
        body: { error: { code: error.code, message: 'Game metadata provider is not configured' } },
      }
    case 'INVALID_QUERY':
      return {
        status: 400,
        body: { error: { code: error.code, message: 'A valid game metadata query is required' } },
      }
    case 'INVALID_FILTER':
      return {
        status: 400,
        body: { error: { code: error.code, message: 'One or more game filters are invalid' } },
      }
    case 'TIMEOUT':
      return {
        status: 504,
        body: { error: { code: error.code, message: 'Game data provider did not respond in time' } },
      }
    case 'RATE_LIMITED':
      return {
        status: 503,
        body: { error: { code: error.code, message: 'Game data provider request limit has been reached' } },
      }
    case 'HTTP_ERROR':
      return {
        status: 502,
        body: {
          error: {
            code: 'UPSTREAM_ERROR',
            message:
              error.statusCode === 401 || error.statusCode === 403
                ? 'Game data provider rejected its credentials'
                : 'Could not retrieve game data',
          },
        },
      }
    case 'CONNECTION':
    case 'INVALID_RESPONSE':
      return {
        status: 502,
        body: { error: { code: 'UPSTREAM_ERROR', message: 'Could not retrieve game data' } },
      }
  }
}

function parseCsvQuery(value: unknown, pattern: RegExp): string[] | null {
  if (value === undefined) return []
  if (typeof value !== 'string') return null

  const values = value.split(',').map((item) => item.trim())
  if (values.length === 0 || values.length > 10 || values.some((item) => !pattern.test(item))) {
    return null
  }

  return [...new Set(values)]
}

function parseGameFilters(request: Request) {
  const genres = parseCsvQuery(request.query.genres, /^[a-z0-9-]+$/)
  const platforms = parseCsvQuery(request.query.platforms, /^\d+$/)
  if (!genres || !platforms) return null

  return {
    genres,
    platforms: platforms.map(Number),
  }
}

function sendInvalidFilter(response: Response) {
  response.status(400).json({
    error: {
      code: 'INVALID_FILTER',
      message: 'Genre and platform filters must be valid comma-separated values',
    },
  })
}

function parseCatalogRequest(
  request: Request,
  response: Response,
): {
  ordering: 'popular' | 'recent'
  cursor: CatalogCursor
  limit: number
  filters: {
    genres: string[]
    platforms: number[]
    consolePlatforms: number[]
  }
} | null {
  const ordering = request.query.ordering
  if (ordering !== 'popular' && ordering !== 'recent') {
    response.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'Ordering must be either popular or recent',
      },
    })
    return null
  }

  const cursorValue =
    request.query.cursor ??
    (request.query.page === undefined ? '1:0' : `${request.query.page}:0`)
  const cursorMatch =
    typeof cursorValue === 'string'
      ? /^([1-9]\d*):(0|[1-9]\d*)$/.exec(cursorValue)
      : null
  const cursor: CatalogCursor | null = cursorMatch
    ? { page: Number(cursorMatch[1]), offset: Number(cursorMatch[2]) }
    : null
  if (
    !cursor ||
    !Number.isSafeInteger(cursor.page) ||
    cursor.page > maxCatalogMetadataPage ||
    !Number.isSafeInteger(cursor.offset) ||
    cursor.offset > catalogMetadataPageSize
  ) {
    response.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'Cursor must contain a valid metadata page and candidate offset',
      },
    })
    return null
  }

  const limitValue = request.query.limit ?? String(catalogPageSize)
  const limit = typeof limitValue === 'string' ? Number(limitValue) : Number.NaN
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > catalogPageSize
  ) {
    response.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: `Limit must be an integer between 1 and ${catalogPageSize}`,
      },
    })
    return null
  }

  const filters = parseGameFilters(request)
  if (!filters) {
    sendInvalidFilter(response)
    return null
  }

  const consolePlatforms = parseCsvQuery(request.query.consolePlatforms, /^\d+$/)
  if (!consolePlatforms) {
    sendInvalidFilter(response)
    return null
  }

  return {
    ordering,
    cursor,
    limit,
    filters: {
      ...filters,
      consolePlatforms: consolePlatforms.map(Number),
    },
  }
}

export async function searchRawgGames(request: Request, response: Response) {
  const title = request.query.title
  if (typeof title !== 'string' || title.trim().length === 0) {
    response.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'The title query parameter is required and must not be empty',
      },
    })
    return
  }

  const filters = parseGameFilters(request)
  if (!filters) {
    sendInvalidFilter(response)
    return
  }

  try {
    const games = await gameMetadataService.searchGames(title, filters)
    response.json(games)
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}

export async function getRawgCatalogWithOffers(request: Request, response: Response) {
  const catalogRequest = parseCatalogRequest(request, response)
  if (!catalogRequest) return

  try {
    const catalog = await getGameCatalogWithOffers(
      catalogRequest.ordering,
      catalogRequest.cursor,
      catalogRequest.filters,
      catalogRequest.limit,
    )
    response.json(catalog)
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}

export async function getRawgFilterOptions(_request: Request, response: Response) {
  try {
    const options =
      gameMetadataProviderName === 'local'
        ? await gameMetadataService.getFilterOptions()
        : await rawgService.getFilterOptions()
    response.json(options)
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}

export async function getRawgGameDescription(request: Request, response: Response) {
  const metadataProvider = getDetailMetadataProvider(request, response)
  if (!metadataProvider) return

  const gameId = Number(request.params.rawgId)
  if (!Number.isSafeInteger(gameId) || gameId < 1) {
    response.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'A valid RAWG game ID is required',
      },
    })
    return
  }

  try {
    const description = await metadataProvider.getGameDescription(gameId)
    response.json({ description })
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}

export async function getRawgGameDetails(request: Request, response: Response) {
  const metadataProvider = getDetailMetadataProvider(request, response)
  if (!metadataProvider) return

  const gameId = Number(request.params.rawgId)
  if (!Number.isSafeInteger(gameId) || gameId < 1) {
    response.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'A valid RAWG game ID is required',
      },
    })
    return
  }

  try {
    const details = await metadataProvider.getGameDetails(gameId)
    response.json(details)
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}

export async function getRawgGameScreenshots(request: Request, response: Response) {
  const metadataProvider = getDetailMetadataProvider(request, response)
  if (!metadataProvider) return

  const gameId = Number(request.params.rawgId)
  if (!Number.isSafeInteger(gameId) || gameId < 1) {
    response.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'A valid RAWG game ID is required',
      },
    })
    return
  }

  try {
    const screenshots = await metadataProvider.getGameScreenshots(gameId)
    response.json({ screenshots })
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}
