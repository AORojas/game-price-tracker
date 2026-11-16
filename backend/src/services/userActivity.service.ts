import { postgresPool } from '../config/postgres.js'

export type Favorite = {
  id: string
  game_id: string
  game_title: string | null
  game_image: string | null
  created_at: Date
}

export type UserAlert = {
  id: string
  game_id: string
  game_title: string | null
  game_image: string | null
  cheapshark_id: string | null
  target_price: string
  is_active: boolean
  is_notified: boolean
  last_checked_at: Date | null
  notified_at: Date | null
  notification_version: number
  created_at: Date
}

export type SavedOffer = {
  id: string
  offer_id: string
  game_title: string | null
  game_image: string | null
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
    `SELECT id::text AS id, game_id, game_title, game_image, created_at
     FROM user_favorites
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  )
  return result.rows
}

export async function getUserAlerts(userId: string) {
  const result = await postgresPool.query<UserAlert>(
    `SELECT id::text AS id, game_id, game_title, game_image,
           cheapshark_id, target_price::text AS target_price, is_active,
           is_notified, last_checked_at, notified_at, notification_version, created_at
     FROM user_alerts
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  )
  return result.rows
}

export async function getUserSavedOffers(userId: string) {
  const result = await postgresPool.query<SavedOffer>(
    `SELECT id::text AS id, offer_id, game_title, game_image,
            price_at_save::text AS price_at_save, url, created_at
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

export async function toggleUserFavorite(
  userId: string,
  gameId: string,
  gameTitle: string,
  gameImage: string | null,
) {
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
      `INSERT INTO user_favorites (user_id, game_id, game_title, game_image)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text AS id, game_id, game_title, game_image, created_at`,
      [userId, gameId, gameTitle, gameImage],
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
  gameTitle: string,
  gameImage: string | null,
  targetPrice: number,
  cheapsharkId: string | null,
) {
  const result = await postgresPool.query<UserAlert>(
    `INSERT INTO user_alerts
       (user_id, game_id, game_title, game_image, target_price, cheapshark_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id::text AS id, game_id, game_title, game_image,
               cheapshark_id, target_price::text AS target_price, is_active,
               is_notified, last_checked_at, notified_at, notification_version, created_at`,
    [userId, gameId, gameTitle, gameImage, targetPrice, cheapsharkId],
  )
  return result.rows[0]
}

export async function updateUserAlert(
  userId: string,
  alertId: string,
  changes: { isActive?: boolean; targetPrice?: number },
) {
  const result = await postgresPool.query<UserAlert>(
    `UPDATE user_alerts
     SET target_price = COALESCE($3::numeric, target_price),
         is_active = CASE
           WHEN $4::boolean IS FALSE THEN FALSE
           WHEN is_notified AND ($3::numeric IS NOT NULL OR $4::boolean IS TRUE) THEN TRUE
           WHEN $4::boolean IS NOT NULL THEN $4::boolean
           ELSE is_active
         END,
         is_notified = CASE
           WHEN is_notified
             AND $4::boolean IS DISTINCT FROM FALSE
             AND ($3::numeric IS NOT NULL OR $4::boolean IS TRUE)
             THEN FALSE
           ELSE is_notified
         END,
         notified_at = CASE
           WHEN is_notified
             AND $4::boolean IS DISTINCT FROM FALSE
             AND ($3::numeric IS NOT NULL OR $4::boolean IS TRUE)
             THEN NULL
           ELSE notified_at
         END,
         notification_version = notification_version + CASE
           WHEN is_notified
             AND $4::boolean IS DISTINCT FROM FALSE
             AND ($3::numeric IS NOT NULL OR $4::boolean IS TRUE)
             THEN 1
           ELSE 0
         END
     WHERE id = $1 AND user_id = $2
     RETURNING id::text AS id, game_id, game_title, game_image,
               cheapshark_id, target_price::text AS target_price, is_active,
               is_notified, last_checked_at, notified_at, notification_version, created_at`,
    [alertId, userId, changes.targetPrice ?? null, changes.isActive ?? null],
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
  gameTitle: string,
  gameImage: string | null,
  priceAtSave: number,
  url: string,
) {
  const result = await postgresPool.query<SavedOffer>(
    `INSERT INTO user_saved_offers
       (user_id, offer_id, game_title, game_image, price_at_save, url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id::text AS id, offer_id, game_title, game_image,
               price_at_save::text AS price_at_save, url, created_at`,
    [userId, offerId, gameTitle, gameImage, priceAtSave, url],
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
