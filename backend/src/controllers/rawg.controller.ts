import type { Request, Response } from 'express'
import { RawgServiceError } from '../services/rawg.service.js'
import { rawgService } from '../services/rawg.service.js'

function getErrorResponse(error: unknown) {
  if (!(error instanceof RawgServiceError)) {
    console.error('Unexpected RAWG game search error', error)
    return {
      status: 500,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while searching RAWG games',
        },
      },
    }
  }

  switch (error.code) {
    case 'NOT_CONFIGURED':
      return {
        status: 503,
        body: { error: { code: error.code, message: 'RAWG integration is not configured' } },
      }
    case 'INVALID_QUERY':
      return {
        status: 400,
        body: { error: { code: error.code, message: 'A valid search query is required' } },
      }
    case 'INVALID_FILTER':
      return {
        status: 400,
        body: { error: { code: error.code, message: 'One or more game filters are invalid' } },
      }
    case 'TIMEOUT':
      return {
        status: 504,
        body: { error: { code: error.code, message: 'RAWG did not respond in time' } },
      }
    case 'RATE_LIMITED':
      return {
        status: 503,
        body: { error: { code: error.code, message: 'RAWG request limit has been reached' } },
      }
    case 'HTTP_ERROR':
      return {
        status: 502,
        body: {
          error: {
            code: 'UPSTREAM_ERROR',
            message:
              error.statusCode === 401 || error.statusCode === 403
                ? 'RAWG rejected the API key'
                : 'Could not retrieve RAWG game data',
          },
        },
      }
    case 'CONNECTION':
    case 'INVALID_RESPONSE':
      return {
        status: 502,
        body: { error: { code: 'UPSTREAM_ERROR', message: 'Could not retrieve RAWG game data' } },
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

  const genres = parseCsvQuery(request.query.genres, /^[a-z0-9-]+$/)
  const platforms = parseCsvQuery(request.query.platforms, /^\d+$/)
  if (!genres || !platforms) {
    response.status(400).json({
      error: {
        code: 'INVALID_FILTER',
        message: 'Genre and platform filters must be valid comma-separated values',
      },
    })
    return
  }

  try {
    const games = await rawgService.searchGames(title, {
      genres,
      platforms: platforms.map(Number),
    })
    response.json(games)
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}

export async function getRawgFilterOptions(_request: Request, response: Response) {
  try {
    const options = await rawgService.getFilterOptions()
    response.json(options)
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}
