import { postgresPool } from '../config/postgres.js'

export type GamePriceHistoryPoint = {
  date: string
  price: number
}

export async function recordGamePriceObservation(gameId: string, price: number) {
  await postgresPool.query(
    `INSERT INTO game_price_history (game_id, lowest_price, observed_on)
     VALUES ($1, $2, CURRENT_DATE)
     ON CONFLICT (game_id, observed_on)
     DO UPDATE SET lowest_price = LEAST(game_price_history.lowest_price, EXCLUDED.lowest_price)`,
    [gameId, price.toFixed(2)],
  )
}

export async function getGamePriceHistory(gameId: string): Promise<GamePriceHistoryPoint[]> {
  const result = await postgresPool.query<{
    observed_on: string
    lowest_price: string
  }>(
    `SELECT observed_on::text, lowest_price::text
     FROM game_price_history
     WHERE game_id = $1
     ORDER BY observed_on ASC`,
    [gameId],
  )

  return result.rows.map((row) => ({
    date: row.observed_on,
    price: Number(row.lowest_price),
  }))
}
