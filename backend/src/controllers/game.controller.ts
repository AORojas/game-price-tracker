import type { Request, Response } from 'express'
import { CheapSharkServiceError } from '../services/cheapshark.service.js'
import { gameService } from '../services/game.service.js'

function getErrorResponse(error: unknown) {
  if (!(error instanceof CheapSharkServiceError)) {
    console.error('Unexpected game search error', error)
    return {
      status: 500,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while searching for games',
        },
      },
    }
  }

  switch (error.code) {
    case 'INVALID_QUERY':
      return {
        status: 400,
        body: { error: { code: error.code, message: 'A valid search query is required' } },
      }
    case 'TIMEOUT':
      return {
        status: 504,
        body: { error: { code: error.code, message: 'The game data provider timed out' } },
      }
    case 'HTTP_ERROR':
      if (error.statusCode === 404) {
        return {
          status: 404,
          body: {
            error: {
              code: 'GAME_NOT_FOUND',
              message: 'No game was found for the provided ID',
            },
          },
        }
      }

      return {
        status: 502,
        body: { error: { code: 'UPSTREAM_ERROR', message: 'Could not retrieve game data' } },
      }
    case 'CONNECTION':
    case 'INVALID_RESPONSE':
      return {
        status: 502,
        body: { error: { code: 'UPSTREAM_ERROR', message: 'Could not retrieve game data' } },
      }
  }
}

export async function searchGames(request: Request, response: Response) {
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

  try {
    const games = await gameService.searchGames(title)
    if (games.length === 0) {
      response.status(404).json({
        error: {
          code: 'GAME_NOT_FOUND',
          message: 'No games matched the provided title',
        },
      })
      return
    }

    response.json({ results: games })
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}

export async function getGamePrices(request: Request, response: Response) {
  const { gameId } = request.params
  if (typeof gameId !== 'string' || !/^\d+$/.test(gameId)) {
    response.status(400).json({
      error: {
        code: 'INVALID_GAME_ID',
        message: 'The game ID must be a non-empty numeric value',
      },
    })
    return
  }

  try {
    const comparison = await gameService.getGamePrices(gameId)
    response.json(comparison)
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    response.status(errorResponse.status).json(errorResponse.body)
  }
}
