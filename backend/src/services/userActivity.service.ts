import { postgresPool } from '../config/postgres.js'

export type Favorite = {
  id: string
  game_id: string
  created_at: Date
}

export type UserAlert = {
  id: string
  game_id: string
  target_price: string
  is_active: boolean
  created_at: Date
}

export type SavedOffer = {
  id: string
  offer_id: string
  price_at_save: string
  url: string
  created_at: Date
}

export type SearchHistoryEntry = {
  id: string
  search_term: string
  created_at: Date
}

export async function getUserFavorites(userId: string) {
  const result = await postgresPool.query<Favorite>(
    `SELECT id::text AS id, game_id, created_at
     FROM user_favorites
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  )
  return result.rows
}

export async function getUserAlerts(userId: string) {
  const result = await postgresPool.query<UserAlert>(
    `SELECT id::text AS id, game_id, target_price::text AS target_price,
            is_active, created_at
     FROM user_alerts
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  )
  return result.rows
}

export async function getUserSavedOffers(userId: string) {
  const result = await postgresPool.query<SavedOffer>(
    `SELECT id::text AS id, offer_id, price_at_save::text AS price_at_save,
            url, created_at
     FROM user_saved_offers
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  )
  return result.rows
}

export async function getUserSearchHistory(userId: string) {
  const result = await postgresPool.query<SearchHistoryEntry>(
    `SELECT id::text AS id, search_term, created_at
     FROM user_search_history
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId],
  )
  return result.rows
}

export async function getUserActivity(userId: string) {
  const [favorites, alerts, savedOffers, searchHistory] = await Promise.all([
    getUserFavorites(userId),
    getUserAlerts(userId),
    getUserSavedOffers(userId),
    getUserSearchHistory(userId),
  ])

  return {
    favorites,
    alerts,
    savedOffers,
    searchHistory,
  }
}

export async function toggleUserFavorite(userId: string, gameId: string) {
  const client = await postgresPool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [
      userId,
      gameId,
    ])
    const existing = await client.query<{ id: string }>(
      `SELECT id::text AS id
       FROM user_favorites
       WHERE user_id = $1 AND game_id = $2`,
      [userId, gameId],
    )

    if (existing.rowCount) {
      await client.query('DELETE FROM user_favorites WHERE id = $1 AND user_id = $2', [
        existing.rows[0].id,
        userId,
      ])
      await client.query('COMMIT')
      return { isFavorite: false }
    }

    const inserted = await client.query<Favorite>(
      `INSERT INTO user_favorites (user_id, game_id)
       VALUES ($1, $2)
       RETURNING id::text AS id, game_id, created_at`,
      [userId, gameId],
    )
    await client.query('COMMIT')
    return { isFavorite: true, favorite: inserted.rows[0] }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteUserFavorite(userId: string, favoriteId: string) {
  const result = await postgresPool.query(
    'DELETE FROM user_favorites WHERE id = $1 AND user_id = $2',
    [favoriteId, userId],
  )
  return result.rowCount !== 0
}

export async function createUserAlert(
  userId: string,
  gameId: string,
  targetPrice: number,
) {
  const result = await postgresPool.query<UserAlert>(
    `INSERT INTO user_alerts (user_id, game_id, target_price)
     VALUES ($1, $2, $3)
     RETURNING id::text AS id, game_id, target_price::text AS target_price,
               is_active, created_at`,
    [userId, gameId, targetPrice],
  )
  return result.rows[0]
}

export async function updateUserAlert(
  userId: string,
  alertId: string,
  isActive: boolean,
) {
  const result = await postgresPool.query<UserAlert>(
    `UPDATE user_alerts
     SET is_active = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id::text AS id, game_id, target_price::text AS target_price,
               is_active, created_at`,
    [alertId, userId, isActive],
  )
  return result.rows[0] ?? null
}

export async function deleteUserAlert(userId: string, alertId: string) {
  const result = await postgresPool.query(
    'DELETE FROM user_alerts WHERE id = $1 AND user_id = $2',
    [alertId, userId],
  )
  return result.rowCount !== 0
}

export async function createUserSavedOffer(
  userId: string,
  offerId: string,
  priceAtSave: number,
  url: string,
) {
  const result = await postgresPool.query<SavedOffer>(
    `INSERT INTO user_saved_offers (user_id, offer_id, price_at_save, url)
     VALUES ($1, $2, $3, $4)
     RETURNING id::text AS id, offer_id, price_at_save::text AS price_at_save,
               url, created_at`,
    [userId, offerId, priceAtSave, url],
  )
  return result.rows[0]
}

export async function deleteUserSavedOffer(userId: string, savedOfferId: string) {
  const result = await postgresPool.query(
    'DELETE FROM user_saved_offers WHERE id = $1 AND user_id = $2',
    [savedOfferId, userId],
  )
  return result.rowCount !== 0
}

export async function addUserSearch(userId: string, searchTerm: string) {
  const result = await postgresPool.query<SearchHistoryEntry>(
    `INSERT INTO user_search_history (user_id, search_term)
     VALUES ($1, $2)
     ON CONFLICT (user_id, (lower(search_term)))
     DO UPDATE SET created_at = CURRENT_TIMESTAMP
     RETURNING id::text AS id, search_term, created_at`,
    [userId, searchTerm],
  )
  return result.rows[0]
}
