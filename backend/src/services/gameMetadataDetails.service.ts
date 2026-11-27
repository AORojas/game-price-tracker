import type { GameMetadataProviderName } from '../config/gameMetadata.js'
import { postgresPool } from '../config/postgres.js'
import type { GameMetadataProvider } from './gameMetadataProvider.service.js'

const GAME_DETAILS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

type GameDetails = Awaited<
  ReturnType<GameMetadataProvider['getGameDetails']>
>

type StoredGameDetails = {
  cheapsharkGameId: string
  details: GameDetails
  updatedAt: Date | null
}

type StoredGameDetailsRow = {
  cheapshark_game_id: string
  description: string
  developers: string[]
  esrb_rating: string | null
  details_updated_at: Date | null
}

async function findStoredGameDetails(
  provider: Exclude<GameMetadataProviderName, 'local'>,
  gameId: number,
): Promise<StoredGameDetails | null> {
  const result = await postgresPool.query<StoredGameDetailsRow>(
    `SELECT
       cheapshark_game_id,
       metadata_description AS description,
       metadata_developers AS developers,
       metadata_esrb_rating AS esrb_rating,
       details_updated_at
     FROM games
     WHERE (metadata_provider = $1 AND metadata_game_id = $2)
        OR ($1 = 'steam' AND steam_app_id = $2)
        OR ($1 = 'rawg' AND rawg_id = $2)
        OR ($1 = 'igdb' AND igdb_id = $2)
     ORDER BY details_updated_at DESC NULLS LAST, updated_at DESC
     LIMIT 2`,
    [provider, gameId],
  )

  if (result.rows.length > 1) {
    console.warn('Game metadata ID maps to multiple PostgreSQL games', {
      provider,
      gameId,
      cheapsharkGameIds: result.rows.map((row) => row.cheapshark_game_id),
    })
    return null
  }

  const row = result.rows[0]
  if (!row) return null

  return {
    cheapsharkGameId: row.cheapshark_game_id,
    details: {
      description: row.description,
      developers: row.developers,
      esrbRating: row.esrb_rating,
    },
    updatedAt: row.details_updated_at,
  }
}

async function persistGameDetails(
  cheapsharkGameId: string,
  details: GameDetails,
) {
  await postgresPool.query(
    `UPDATE games
     SET metadata_description = $2,
         metadata_developers = $3::text[],
         metadata_esrb_rating = $4,
         details_updated_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE cheapshark_game_id = $1`,
    [
      cheapsharkGameId,
      details.description,
      details.developers,
      details.esrbRating,
    ],
  )
}

export async function getGameDetailsFromPostgresOrProvider(
  providerName: GameMetadataProviderName,
  gameId: number,
  metadataProvider: Pick<GameMetadataProvider, 'getGameDetails'>,
): Promise<GameDetails> {
  if (providerName === 'local') {
    return metadataProvider.getGameDetails(gameId)
  }

  const stored = await findStoredGameDetails(providerName, gameId)
  const isFresh =
    stored?.updatedAt !== null &&
    stored?.updatedAt !== undefined &&
    Date.now() - stored.updatedAt.getTime() < GAME_DETAILS_CACHE_TTL_MS
  if (stored && isFresh) return stored.details

  try {
    const details = await metadataProvider.getGameDetails(gameId)
    if (stored) {
      try {
        await persistGameDetails(stored.cheapsharkGameId, details)
      } catch (error) {
        console.error('Failed to persist game metadata details', {
          provider: providerName,
          gameId,
          cheapsharkGameId: stored.cheapsharkGameId,
          error,
        })
      }
    }
    return details
  } catch (error) {
    if (!stored) throw error

    console.warn('Using cached PostgreSQL game details after provider failure', {
      provider: providerName,
      gameId,
      cheapsharkGameId: stored.cheapsharkGameId,
      error,
    })
    return stored.details
  }
}
