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
        body: { error: { code: error.code, message: 'A non-empty title is required' } },
      }
    case 'TIMEOUT':
      return {
        status: 504,
        body: { error: { code: error.code, message: 'The game data provider timed out' } },
      }
    case 'CONNECTION':
    case 'HTTP_ERROR':
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
