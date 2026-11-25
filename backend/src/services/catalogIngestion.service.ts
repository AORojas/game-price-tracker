import { postgresPool } from '../config/postgres.js'
import { redisClient } from '../config/redis.js'
import {
  cheapSharkService,
  CheapSharkServiceError,
} from './cheapshark.service.js'
import {
  claimJobs,
  completeJob,
  enqueueJob,
  failJob,
} from './jobQueue.service.js'
import type { CheapSharkDeal } from '../types/cheapshark.types.js'
import { normalizeCatalogTitle } from '../utils/catalogTitle.js'

const CATALOG_OFFER_REFRESH_JOB = 'catalog_offer_refresh'
const CATALOG_PG_CACHE_VERSION_KEY = 'catalog:postgres:offers:version'
const JOB_MAX_ATTEMPTS = 3

export type CatalogOfferMetadata = {
  provider: 'steam' | 'rawg' | 'igdb'
  gameId: number
  title: string
  image: string | null
  released: string | null
  rating: number
  metacritic: number | null
  genres: string[]
  platforms: string[]
  previewImages: string[]
  ordering: 'popular' | 'recent'
  rank: number
}

type CatalogOfferRefreshPayload = {
  cheapsharkGameId?: string
  metadata?: CatalogOfferMetadata
}

type OfferSnapshot = {
  dealId: string
  storeId: string
  storeName: string
  storeLogoUrl: string | null
  price: number
  regularPrice: number | null
  discountPercent: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function parseCatalogOfferMetadata(value: unknown): CatalogOfferMetadata | null {
  if (!isRecord(value)) return null

  const provider = value.provider
  const gameId = value.gameId
  const ordering = value.ordering
  const rank = value.rank
  const rating = value.rating
  const metacritic = value.metacritic
  if (
    (provider !== 'steam' && provider !== 'rawg' && provider !== 'igdb') ||
    typeof gameId !== 'number' ||
    !Number.isSafeInteger(gameId) ||
    gameId <= 0 ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    (value.image !== null && typeof value.image !== 'string') ||
    (value.released !== null && typeof value.released !== 'string') ||
    typeof rating !== 'number' ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    (metacritic !== null &&
      (typeof metacritic !== 'number' ||
        !Number.isSafeInteger(metacritic) ||
        metacritic < 0 ||
        metacritic > 100)) ||
    !isStringArray(value.genres) ||
    !isStringArray(value.platforms) ||
    !isStringArray(value.previewImages) ||
    (ordering !== 'popular' && ordering !== 'recent') ||
    typeof rank !== 'number' ||
    !Number.isSafeInteger(rank) ||
    rank < 0
  ) {
    return null
  }

  return {
    provider,
    gameId,
    title: value.title.trim(),
    image: value.image,
    released: value.released,
    rating,
    metacritic,
    genres: value.genres,
    platforms: value.platforms,
    previewImages: value.previewImages,
    ordering,
    rank,
  }
}

function parseCatalogOfferRefreshPayload(
  payload: unknown,
): CatalogOfferRefreshPayload | null {
  if (!isRecord(payload)) return null

  const cheapsharkGameId = payload.cheapsharkGameId
  if (cheapsharkGameId !== undefined &&
      (typeof cheapsharkGameId !== 'string' ||
        !/^[1-9]\d*$/.test(cheapsharkGameId))) {
    return null
  }
  const metadata =
    payload.metadata === undefined
      ? undefined
      : parseCatalogOfferMetadata(payload.metadata)
  if (payload.metadata !== undefined && !metadata) return null
  if (cheapsharkGameId === undefined && !metadata) return null

  return {
    ...(typeof cheapsharkGameId === 'string' ? { cheapsharkGameId } : {}),
    ...(metadata ? { metadata } : {}),
  }
}

function parseOptionalImageUrl(value: string) {
  const normalized = value.trim()
  if (!normalized) return null

  const url = new URL(normalized, 'https://www.cheapshark.com')
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('CheapShark returned an unsupported image URL protocol')
  }
  return url.toString()
}

function parseOptionalPrice(value: string): number | null {
  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

function parseOffer(deal: CheapSharkDeal, store: {
  storeName: string
  images: { logo: string }
}): OfferSnapshot {
  const price = parseOptionalPrice(deal.price)
  if (price === null) {
    throw new Error(`CheapShark returned an invalid price for deal ${deal.dealID}`)
  }

  const parsedDiscount = Number(deal.savings)
  const discountPercent =
    Number.isFinite(parsedDiscount) && parsedDiscount >= 0 && parsedDiscount <= 100
      ? parsedDiscount
      : null
  return {
    dealId: deal.dealID,
    storeId: deal.storeID,
    storeName: store.storeName,
    storeLogoUrl: parseOptionalImageUrl(store.images.logo),
    price,
    regularPrice: parseOptionalPrice(deal.retailPrice),
    discountPercent,
  }
}

async function fetchOfferSnapshot(gameId: string) {
  const details = await cheapSharkService.getGameDetails(gameId)
  const title = details.info.title.trim()
  if (!title) {
    throw new Error(`CheapShark returned an empty title for game ${gameId}`)
  }

  const offers: OfferSnapshot[] = []
  if (details.deals.length > 0) {
    const stores = await cheapSharkService.getStores()
    const storesById = new Map(stores.map((store) => [store.storeID, store]))

    for (const deal of details.deals) {
      const store = storesById.get(deal.storeID)
      if (!store || !store.storeName.trim()) {
        throw new Error(
          `CheapShark returned an unknown store ${deal.storeID} for deal ${deal.dealID}`,
        )
      }
      offers.push(parseOffer(deal, store))
    }
  }

  const steamAppIdNumber = Number(details.info.steamAppID)
  const steamAppId =
    details.info.steamAppID !== null &&
    Number.isSafeInteger(steamAppIdNumber) &&
    steamAppIdNumber > 0
      ? String(steamAppIdNumber)
      : null

  return {
    title,
    imageUrl: parseOptionalImageUrl(details.info.thumb),
    steamAppId,
    offers,
  }
}

async function persistOfferSnapshot(
  gameId: string,
  snapshot: Awaited<ReturnType<typeof fetchOfferSnapshot>>,
  metadata?: CatalogOfferMetadata,
) {
  const client = await postgresPool.connect()
  try {
    await client.query('BEGIN')
    const steamAppId =
      snapshot.steamAppId ??
      (metadata?.provider === 'steam' ? String(metadata.gameId) : null)
    const metadataImageUrl = metadata?.image
      ? parseOptionalImageUrl(metadata.image)
      : null
    const previewImages =
      metadata?.previewImages
        .map(parseOptionalImageUrl)
        .filter((image): image is string => image !== null) ?? []
    await client.query(
      `INSERT INTO games
         (cheapshark_game_id, title, image_url, steam_app_id, rawg_id, igdb_id,
          metadata_provider, metadata_game_id, normalized_title, metadata_title,
          metadata_image_url, genres, platforms, released, rating, metacritic,
          preview_images, popular_rank, recent_rank, metadata_updated_at,
          offers_updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[],
               $13::text[], $14, $15, $16, $17::text[], $18, $19,
               CASE WHEN $7 IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,
               CURRENT_TIMESTAMP)
       ON CONFLICT (cheapshark_game_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         image_url = EXCLUDED.image_url,
         steam_app_id = COALESCE(EXCLUDED.steam_app_id, games.steam_app_id),
         rawg_id = COALESCE(EXCLUDED.rawg_id, games.rawg_id),
         igdb_id = COALESCE(EXCLUDED.igdb_id, games.igdb_id),
         metadata_provider = COALESCE(EXCLUDED.metadata_provider, games.metadata_provider),
         metadata_game_id = COALESCE(EXCLUDED.metadata_game_id, games.metadata_game_id),
         normalized_title = COALESCE(EXCLUDED.normalized_title, games.normalized_title),
         metadata_title = COALESCE(EXCLUDED.metadata_title, games.metadata_title),
         metadata_image_url = COALESCE(EXCLUDED.metadata_image_url, games.metadata_image_url),
         genres = CASE WHEN EXCLUDED.metadata_provider IS NULL
                       THEN games.genres ELSE EXCLUDED.genres END,
         platforms = CASE WHEN EXCLUDED.metadata_provider IS NULL
                          THEN games.platforms ELSE EXCLUDED.platforms END,
         released = CASE WHEN EXCLUDED.metadata_provider IS NULL
                         THEN games.released ELSE EXCLUDED.released END,
         rating = CASE WHEN EXCLUDED.metadata_provider IS NULL
                       THEN games.rating ELSE EXCLUDED.rating END,
         metacritic = CASE WHEN EXCLUDED.metadata_provider IS NULL
                           THEN games.metacritic ELSE EXCLUDED.metacritic END,
         preview_images = CASE WHEN EXCLUDED.metadata_provider IS NULL
                               THEN games.preview_images ELSE EXCLUDED.preview_images END,
         popular_rank = COALESCE(EXCLUDED.popular_rank, games.popular_rank),
         recent_rank = COALESCE(EXCLUDED.recent_rank, games.recent_rank),
         metadata_updated_at = CASE WHEN EXCLUDED.metadata_provider IS NULL
                                    THEN games.metadata_updated_at
                                    ELSE CURRENT_TIMESTAMP END,
         offers_updated_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [
        gameId,
        snapshot.title,
        snapshot.imageUrl,
        steamAppId,
        metadata?.provider === 'rawg' ? metadata.gameId : null,
        metadata?.provider === 'igdb' ? metadata.gameId : null,
        metadata?.provider ?? null,
        metadata?.gameId ?? null,
        metadata?.title ? normalizeCatalogTitle(metadata.title) : normalizeCatalogTitle(snapshot.title),
        metadata?.title ?? null,
        metadataImageUrl,
        metadata?.genres ?? [],
        metadata?.platforms ?? [],
        metadata?.released ?? null,
        metadata?.rating ?? null,
        metadata?.metacritic ?? null,
        previewImages,
        metadata?.ordering === 'popular' ? metadata.rank : null,
        metadata?.ordering === 'recent' ? metadata.rank : null,
      ],
    )

    await client.query(
      `UPDATE game_offers
       SET is_active = FALSE
       WHERE cheapshark_game_id = $1
         AND is_active = TRUE`,
      [gameId],
    )

    for (const offer of snapshot.offers) {
      const saved = await client.query(
        `INSERT INTO game_offers
           (cheapshark_deal_id, cheapshark_game_id, store_id, store_name,
            store_logo_url, price, regular_price, discount_percent, currency,
            is_active, observed_at, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'USD', TRUE,
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (cheapshark_deal_id)
         DO UPDATE SET
           store_id = EXCLUDED.store_id,
           store_name = EXCLUDED.store_name,
           store_logo_url = EXCLUDED.store_logo_url,
           price = EXCLUDED.price,
           regular_price = EXCLUDED.regular_price,
           discount_percent = EXCLUDED.discount_percent,
           currency = EXCLUDED.currency,
           is_active = TRUE,
           observed_at = CURRENT_TIMESTAMP,
           last_seen_at = CURRENT_TIMESTAMP
         WHERE game_offers.cheapshark_game_id = EXCLUDED.cheapshark_game_id
         RETURNING cheapshark_deal_id`,
        [
          offer.dealId,
          gameId,
          offer.storeId,
          offer.storeName,
          offer.storeLogoUrl,
          offer.price.toFixed(2),
          offer.regularPrice?.toFixed(2) ?? null,
          offer.discountPercent?.toFixed(2) ?? null,
        ],
      )
      if (saved.rowCount !== 1) {
        throw new Error(
          `CheapShark deal ${offer.dealId} is already associated with another game`,
        )
      }
    }

    const lowestPrice = snapshot.offers.reduce<number | null>(
      (lowest, offer) => (lowest === null ? offer.price : Math.min(lowest, offer.price)),
      null,
    )
    if (lowestPrice !== null) {
      await client.query(
        `INSERT INTO game_price_history (game_id, lowest_price, observed_on)
         VALUES ($1, $2, CURRENT_DATE)
         ON CONFLICT (game_id, observed_on)
         DO UPDATE SET lowest_price =
           LEAST(game_price_history.lowest_price, EXCLUDED.lowest_price)`,
        [gameId, lowestPrice.toFixed(2)],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  try {
    await redisClient.incr(CATALOG_PG_CACHE_VERSION_KEY)
  } catch (error) {
    console.error('Failed to invalidate the PostgreSQL catalog cache', {
      cheapsharkGameId: gameId,
      error,
    })
  }
}

function getRetryDelaySeconds(attempt: number, error: unknown) {
  const exponentialDelay = Math.min(60, 2 ** Math.max(0, attempt - 1))
  const jitteredDelay = exponentialDelay + Math.random()
  const retryAfterSeconds =
    error instanceof CheapSharkServiceError &&
    error.code === 'RATE_LIMITED' &&
    error.retryAfterMs !== undefined
      ? Math.ceil(error.retryAfterMs / 1000)
      : 0

  return Math.max(retryAfterSeconds, Math.ceil(jitteredDelay))
}

function isRetryableError(error: unknown) {
  if (!(error instanceof CheapSharkServiceError)) return true
  if (error.code === 'INVALID_QUERY') return false
  if (error.code === 'HTTP_ERROR' && error.statusCode !== undefined) {
    return error.statusCode < 400 || error.statusCode >= 500
  }
  return true
}

function getFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Job failed unexpectedly'
  return message.trim().slice(0, 1000) || 'Job failed unexpectedly'
}

export async function enqueueCatalogOfferRefreshIfStale(
  cheapsharkGameId: string,
  metadata?: CatalogOfferMetadata,
): Promise<Awaited<ReturnType<typeof enqueueJob>> | null> {
  if (!/^[1-9]\d*$/.test(cheapsharkGameId)) {
    throw new Error('CheapShark game ID must be a positive integer')
  }

  const freshness = await postgresPool.query<{ isFresh: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM games
       WHERE cheapshark_game_id = $1
         AND offers_updated_at > CURRENT_TIMESTAMP - INTERVAL '12 hours'
         AND metadata_provider IS NOT NULL
         AND metadata_game_id IS NOT NULL
         AND normalized_title IS NOT NULL
         AND (
           EXISTS (
             SELECT 1
             FROM game_offers
             WHERE cheapshark_game_id = games.cheapshark_game_id
               AND is_active = TRUE
           )
           OR offers_updated_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
         )
     ) AS "isFresh"`,
    [cheapsharkGameId],
  )
  if (freshness.rows[0]?.isFresh) return null

  return enqueueJob({
    jobType: CATALOG_OFFER_REFRESH_JOB,
    payload: { cheapsharkGameId, ...(metadata ? { metadata } : {}) },
    idempotencyKey: `${CATALOG_OFFER_REFRESH_JOB}:${cheapsharkGameId}`,
    maxAttempts: JOB_MAX_ATTEMPTS,
  })
}

export async function enqueueCatalogOfferRefreshForMetadata(
  metadata: CatalogOfferMetadata,
) {
  const parsedMetadata = parseCatalogOfferMetadata(metadata)
  if (!parsedMetadata) {
    throw new Error('Catalog metadata for an offer refresh job is invalid')
  }

  return enqueueJob({
    jobType: CATALOG_OFFER_REFRESH_JOB,
    payload: { metadata: parsedMetadata },
    idempotencyKey: `${CATALOG_OFFER_REFRESH_JOB}:metadata:${metadata.provider}:${metadata.gameId}`,
    maxAttempts: JOB_MAX_ATTEMPTS,
  })
}

async function findCheapSharkGameId(
  metadata: CatalogOfferMetadata,
): Promise<string | null> {
  const searchResults = await cheapSharkService.searchGames(metadata.title)
  if (metadata.provider === 'steam') {
    const steamMatches = [
      ...new Set(
        searchResults
          .filter((game) => game.steamAppID === String(metadata.gameId))
          .map((game) => game.gameID),
      ),
    ]
    if (steamMatches.length === 1) return steamMatches[0] ?? null
    if (steamMatches.length > 1) {
      console.warn('Steam metadata maps to multiple CheapShark games', {
        steamAppId: metadata.gameId,
        title: metadata.title,
        matches: steamMatches.length,
      })
      return null
    }
  }

  const normalizedTitle = normalizeCatalogTitle(metadata.title)
  const matches = searchResults.filter(
    (game) => normalizeCatalogTitle(game.external) === normalizedTitle,
  )
  const gameIds = [...new Set(matches.map((game) => game.gameID))]
  if (gameIds.length !== 1) {
    console.warn('Catalog metadata has no unambiguous CheapShark game match', {
      title: metadata.title,
      matchCount: gameIds.length,
    })
    return null
  }
  return gameIds[0] ?? null
}

export async function processNextCatalogOfferRefresh(workerId: string) {
  const [job] = await claimJobs({
    jobType: CATALOG_OFFER_REFRESH_JOB,
    workerId,
  })
  if (!job) return { status: 'idle' as const }

  const payload = parseCatalogOfferRefreshPayload(job.payload)
  if (!payload) {
    const status = await failJob({
      jobId: job.id,
      workerId,
      message: 'Catalog offer refresh job has an invalid payload',
      retryDelaySeconds: 0,
      retryable: false,
    })
    console.error('Catalog offer refresh job rejected', {
      jobId: job.id,
      status,
      reason: 'invalid payload',
    })
    return { status, jobId: job.id }
  }

  try {
    const cheapsharkGameId =
      payload.cheapsharkGameId ??
      (payload.metadata
        ? await findCheapSharkGameId(payload.metadata)
        : null)
    if (!cheapsharkGameId) {
      const status = await failJob({
        jobId: job.id,
        workerId,
        message: 'No unambiguous CheapShark game match was found',
        retryDelaySeconds: 0,
        retryable: false,
      })
      return { status, jobId: job.id }
    }

    const snapshot = await fetchOfferSnapshot(cheapsharkGameId)
    await persistOfferSnapshot(cheapsharkGameId, snapshot, payload.metadata)
    await completeJob(job.id, workerId)
    return { status: 'completed' as const, jobId: job.id, offers: snapshot.offers.length }
  } catch (error) {
    try {
      const status = await failJob({
        jobId: job.id,
        workerId,
        message: getFailureMessage(error),
        retryDelaySeconds: getRetryDelaySeconds(job.attempts, error),
        retryable: isRetryableError(error),
      })
      console.error('Catalog offer refresh failed', {
        jobId: job.id,
        attempt: job.attempts,
        status,
        retryable: isRetryableError(error),
        error,
      })
      return { status, jobId: job.id }
    } catch (queueError) {
      throw new AggregateError(
        [error, queueError],
        `Catalog offer refresh job ${job.id} failed and could not be rescheduled`,
      )
    }
  }
}
