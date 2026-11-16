import { postgresPool } from '../config/postgres.js'
import { cheapSharkApiUrl } from '../config/cheapshark.js'

type LegacyAlert = {
  id: string
  game_title: string | null
}

type CheapSharkSearchResult = {
  gameID: string
  external: string
}

function isCheapSharkSearchResult(value: unknown): value is CheapSharkSearchResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'gameID' in value &&
    typeof value.gameID === 'string' &&
    /^\d{1,20}$/.test(value.gameID) &&
    'external' in value &&
    typeof value.external === 'string'
  )
}

function normalizeTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function createSearchUrl(title: string) {
  const baseUrl = cheapSharkApiUrl.endsWith('/')
    ? cheapSharkApiUrl
    : `${cheapSharkApiUrl}/`
  const url = new URL('games', baseUrl)
  url.searchParams.set('title', title)
  return url
}

async function searchCheapSharkByTitle(title: string) {
  const response = await fetch(createSearchUrl(title), {
    headers: { 'User-Agent': 'GamePriceTracker/0.1' },
    signal: AbortSignal.timeout(8_000),
  })

  if (response.status === 404) return []
  if (!response.ok) {
    throw new Error(`CheapShark title resolution failed with HTTP ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (!Array.isArray(payload) || !payload.every(isCheapSharkSearchResult)) {
    throw new Error('CheapShark returned an invalid title search response')
  }
  return payload
}

async function resolveLegacyAlerts() {
  const pending = await postgresPool.query<LegacyAlert>(
    `SELECT id::text AS id, game_title
     FROM user_alerts
     WHERE cheapshark_id IS NULL
     ORDER BY id`,
  )
  const resolvedByTitle = new Map<string, string | null>()
  let resolved = 0
  let paused = 0

  for (const alert of pending.rows) {
    const title = alert.game_title?.trim() ?? ''
    const normalizedTitle = normalizeTitle(title)

    if (!normalizedTitle) {
      await postgresPool.query(
        'UPDATE user_alerts SET is_active = FALSE WHERE id = $1 AND cheapshark_id IS NULL',
        [alert.id],
      )
      paused += 1
      continue
    }

    let cheapSharkId = resolvedByTitle.get(normalizedTitle)
    if (cheapSharkId === undefined) {
      const results = await searchCheapSharkByTitle(title)
      const exactMatches = new Set(
        results
          .filter((result) => normalizeTitle(result.external) === normalizedTitle)
          .map((result) => result.gameID),
      )
      cheapSharkId = exactMatches.size === 1 ? [...exactMatches][0] : null
      resolvedByTitle.set(normalizedTitle, cheapSharkId)
      await new Promise((resolve) => setTimeout(resolve, 1_000))
    }

    if (cheapSharkId) {
      await postgresPool.query(
        `UPDATE user_alerts
         SET cheapshark_id = $2
         WHERE id = $1 AND cheapshark_id IS NULL`,
        [alert.id, cheapSharkId],
      )
      resolved += 1
    } else {
      await postgresPool.query(
        'UPDATE user_alerts SET is_active = FALSE WHERE id = $1 AND cheapshark_id IS NULL',
        [alert.id],
      )
      paused += 1
    }
  }

  console.log(
    `Legacy alert resolution complete: ${resolved} resolved, ${paused} paused.`,
  )
}

try {
  await resolveLegacyAlerts()
} catch (error) {
  console.error('Legacy alert resolution failed', error)
  process.exitCode = 1
} finally {
  await postgresPool.end()
}
