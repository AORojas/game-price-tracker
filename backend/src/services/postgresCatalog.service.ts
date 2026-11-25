import { postgresPool } from '../config/postgres.js'
import { gameMetadataProviderName } from '../config/gameMetadata.js'
import type { GameMetadataSearchResult } from '../types/rawg.types.js'
import type {
  GamePrice,
  GamePriceComparison,
  GameSearchCandidate,
} from '../types/game.types.js'
import {
  enqueueCatalogOfferRefreshForMetadata,
  enqueueCatalogOfferRefreshIfStale,
  type CatalogOfferMetadata,
} from './catalogIngestion.service.js'
import { normalizeCatalogTitle } from '../utils/catalogTitle.js'

type MetadataProvider = 'steam' | 'rawg' | 'igdb' | 'local'

export type PostgresCatalogCandidate = {
  metadata: GameMetadataSearchResult
  metadataSource?: MetadataProvider
}

export type PostgresCatalogEntry = PostgresCatalogCandidate & {
  pricesStatus: 'ready' | 'stale'
  priceVerifiedAt: number
  game: GameSearchCandidate
  comparison: GamePriceComparison
}

type StoredOffer = {
  dealId: string
  storeId: string
  storeName: string
  storeLogoUrl: string | null
  price: string
  regularPrice: string | null
  discountPercent: string | null
  currency: string
}

type CatalogGameRow = {
  cheapshark_game_id: string
  title: string
  image_url: string | null
  steam_app_id: string | null
  rawg_id: string | null
  igdb_id: string | null
  metadata_provider: Exclude<MetadataProvider, 'local'> | null
  metadata_game_id: string | null
  normalized_title: string | null
  metadata_title: string | null
  metadata_image_url: string | null
  genres: string[]
  platforms: string[]
  released: string | null
  rating: number | null
  metacritic: number | null
  preview_images: string[]
  popular_rank: number | null
  recent_rank: number | null
  offers_updated_at: Date | null
  deal_id: string | null
  store_id: string | null
  store_name: string | null
  store_logo_url: string | null
  price: string | null
  regular_price: string | null
  discount_percent: string | null
  currency: string | null
}

type StoredGame = Omit<
  CatalogGameRow,
  | 'deal_id'
  | 'store_id'
  | 'store_name'
  | 'store_logo_url'
  | 'price'
  | 'regular_price'
  | 'discount_percent'
  | 'currency'
> & {
  offers: StoredOffer[]
}

function getProvider(candidate: PostgresCatalogCandidate): MetadataProvider {
  return candidate.metadataSource ?? gameMetadataProviderName
}

function makeJobMetadata(
  candidate: PostgresCatalogCandidate,
  ordering: 'popular' | 'recent',
  rank: number,
): CatalogOfferMetadata | null {
  const provider = getProvider(candidate)
  if (provider === 'local') return null

  return {
    provider,
    gameId: candidate.metadata.id,
    title: candidate.metadata.title,
    image: candidate.metadata.image,
    released: candidate.metadata.released,
    rating: candidate.metadata.rating,
    metacritic: candidate.metadata.metacritic,
    genres: candidate.metadata.genres,
    platforms: candidate.metadata.platforms,
    previewImages: candidate.metadata.previewImages,
    ordering,
    rank,
  }
}

function groupStoredGames(rows: CatalogGameRow[]): StoredGame[] {
  const gamesById = new Map<string, StoredGame>()

  for (const row of rows) {
    let game = gamesById.get(row.cheapshark_game_id)
    if (!game) {
      const {
        deal_id: _dealId,
        store_id: _storeId,
        store_name: _storeName,
        store_logo_url: _storeLogoUrl,
        price: _price,
        regular_price: _regularPrice,
        discount_percent: _discountPercent,
        currency: _currency,
        ...gameFields
      } = row
      game = { ...gameFields, offers: [] }
      gamesById.set(game.cheapshark_game_id, game)
    }

    if (
      row.deal_id === null ||
      row.store_id === null ||
      row.store_name === null ||
      row.price === null ||
      row.currency === null
    ) {
      continue
    }

    game.offers.push({
      dealId: row.deal_id,
      storeId: row.store_id,
      storeName: row.store_name,
      storeLogoUrl: row.store_logo_url,
      price: row.price,
      regularPrice: row.regular_price,
      discountPercent: row.discount_percent,
      currency: row.currency,
    })
  }

  return [...gamesById.values()]
}

function getUniqueIdentityMatch(
  matches: StoredGame[],
  candidate: PostgresCatalogCandidate,
): { game: StoredGame | null; ambiguous: boolean } {
  const unique = [...new Map(matches.map((game) => [game.cheapshark_game_id, game])).values()]
  if (unique.length > 1) {
    console.warn('Catalog metadata maps to multiple PostgreSQL games', {
      provider: getProvider(candidate),
      metadataGameId: candidate.metadata.id,
      title: candidate.metadata.title,
      matches: unique.map((game) => game.cheapshark_game_id),
    })
    return { game: null, ambiguous: true }
  }
  return { game: unique[0] ?? null, ambiguous: false }
}

function findStoredGame(
  candidate: PostgresCatalogCandidate,
  games: StoredGame[],
): StoredGame | null {
  const provider = getProvider(candidate)
  const gameId = String(candidate.metadata.id)

  if (provider === 'steam') {
    const steamMatch = getUniqueIdentityMatch(
      games.filter((game) => game.steam_app_id === gameId),
      candidate,
    )
    if (steamMatch.game || steamMatch.ambiguous) return steamMatch.game
  }

  if (provider !== 'local') {
    const providerMatch = getUniqueIdentityMatch(
      games.filter(
        (game) =>
          game.metadata_provider === provider &&
          (game.metadata_game_id === gameId ||
            (provider === 'rawg' && game.rawg_id === gameId) ||
            (provider === 'igdb' && game.igdb_id === gameId)),
      ),
      candidate,
    )
    if (providerMatch.game || providerMatch.ambiguous) return providerMatch.game
  }

  const normalizedTitle = normalizeCatalogTitle(candidate.metadata.title)
  return getUniqueIdentityMatch(
    games.filter(
      (game) =>
        (game.normalized_title ??
          normalizeCatalogTitle(game.metadata_title ?? game.title)) === normalizedTitle,
    ),
    candidate,
  ).game
}

function parseStoredPrices(game: StoredGame): GamePrice[] {
  return game.offers
    .map((offer): GamePrice | null => {
      const price = Number(offer.price)
      const regularPrice =
        offer.regularPrice === null ? null : Number(offer.regularPrice)
      const discount =
        offer.discountPercent === null ? null : Number(offer.discountPercent)
      if (
        !Number.isFinite(price) ||
        price < 0 ||
        !offer.storeName.trim() ||
        !offer.dealId.trim() ||
        (regularPrice !== null && (!Number.isFinite(regularPrice) || regularPrice < 0)) ||
        (discount !== null &&
          (!Number.isFinite(discount) || discount < 0 || discount > 100))
      ) {
        return null
      }

      return {
        store: offer.storeName,
        storeLogo: offer.storeLogoUrl,
        price,
        regularPrice,
        discount,
        currency: offer.currency,
        dealId: offer.dealId,
      }
    })
    .filter((offer): offer is GamePrice => offer !== null)
    .sort((first, second) => first.price - second.price)
}

function createCatalogEntry(
  candidate: PostgresCatalogCandidate,
  storedGame: StoredGame,
): PostgresCatalogEntry | null {
  const prices = parseStoredPrices(storedGame)
  const cheapest = prices[0]
  if (!cheapest) return null

  const verifiedAt = storedGame.offers_updated_at?.getTime() ?? 0
  const stale =
    verifiedAt === 0 || Date.now() - verifiedAt > 12 * 60 * 60 * 1000
  const image =
    candidate.metadata.image ??
    storedGame.metadata_image_url ??
    storedGame.image_url ??
    ''
  const title = candidate.metadata.title
  const game: GameSearchCandidate = {
    id: storedGame.cheapshark_game_id,
    title,
    image,
    lowestPrice: cheapest.price,
    lowestDealId: cheapest.dealId,
  }
  const comparison: GamePriceComparison = {
    game: {
      id: storedGame.cheapshark_game_id,
      title: storedGame.metadata_title ?? storedGame.title,
      image: storedGame.metadata_image_url ?? storedGame.image_url ?? image,
    },
    prices,
    cheapest: { store: cheapest.store, price: cheapest.price },
  }

  return {
    ...candidate,
    pricesStatus: stale ? 'stale' : 'ready',
    priceVerifiedAt: verifiedAt,
    game,
    comparison,
  }
}

async function enqueueRefresh(
  candidate: PostgresCatalogCandidate,
  ordering: 'popular' | 'recent',
  rank: number,
  cheapsharkGameId?: string,
) {
  const metadata = makeJobMetadata(candidate, ordering, rank)
  if (!metadata) return

  try {
    if (cheapsharkGameId) {
      await enqueueCatalogOfferRefreshIfStale(cheapsharkGameId, metadata)
    } else {
      await enqueueCatalogOfferRefreshForMetadata(metadata)
    }
  } catch (error) {
    console.error('Failed to enqueue catalog offer refresh', {
      provider: metadata.provider,
      metadataGameId: metadata.gameId,
      cheapsharkGameId,
      error,
    })
  }
}

export async function getPostgresCatalogEntries(
  candidates: PostgresCatalogCandidate[],
  ordering: 'popular' | 'recent',
  rankStart: number,
  selectedGenres: string[],
): Promise<Array<PostgresCatalogEntry | null>> {
  if (candidates.length === 0) return []

  const candidateReferences = candidates.map((candidate) => ({
    provider: getProvider(candidate),
    gameId: candidate.metadata.id,
    normalizedTitle: normalizeCatalogTitle(candidate.metadata.title),
  }))
  const result = await postgresPool.query<CatalogGameRow>(
    `WITH candidates AS (
       SELECT *
       FROM jsonb_to_recordset($1::jsonb)
         AS candidate(provider TEXT, game_id BIGINT, normalized_title TEXT)
     )
     SELECT
       game.cheapshark_game_id,
       game.title,
       game.image_url,
       game.steam_app_id,
       game.rawg_id,
       game.igdb_id,
       game.metadata_provider,
       game.metadata_game_id,
       game.normalized_title,
       game.metadata_title,
       game.metadata_image_url,
       game.genres,
       game.platforms,
       game.released,
       game.rating,
       game.metacritic,
       game.preview_images,
       game.popular_rank,
       game.recent_rank,
       game.offers_updated_at,
       offer.cheapshark_deal_id AS deal_id,
       offer.store_id,
       offer.store_name,
       offer.store_logo_url,
       offer.price::text AS price,
       offer.regular_price::text AS regular_price,
       offer.discount_percent::text AS discount_percent,
       offer.currency
     FROM games AS game
     LEFT JOIN game_offers AS offer
       ON offer.cheapshark_game_id = game.cheapshark_game_id
      AND offer.is_active = TRUE
     WHERE EXISTS (
       SELECT 1
       FROM candidates AS candidate
       WHERE (candidate.provider = 'steam'
              AND game.steam_app_id = candidate.game_id)
          OR (game.metadata_provider = candidate.provider
              AND game.metadata_game_id = candidate.game_id)
          OR (candidate.provider = 'rawg'
              AND game.rawg_id = candidate.game_id)
          OR (candidate.provider = 'igdb'
              AND game.igdb_id = candidate.game_id)
          OR game.normalized_title = candidate.normalized_title
          OR game.normalized_title IS NULL
     )
       AND (
         cardinality($2::text[]) = 0
         OR game.metadata_provider IS NULL
         OR NOT EXISTS (
           SELECT 1
           FROM candidates AS candidate
           WHERE candidate.provider = game.metadata_provider
             AND (
               game.metadata_game_id = candidate.game_id
               OR game.normalized_title = candidate.normalized_title
               OR game.normalized_title IS NULL
             )
         )
         OR game.genres && $2::text[]
       )
     ORDER BY game.cheapshark_game_id, offer.price ASC, offer.discount_percent DESC`,
    [JSON.stringify(candidateReferences), selectedGenres],
  )
  const storedGames = groupStoredGames(result.rows)

  return Promise.all(
    candidates.map(async (candidate, index) => {
      const rank = rankStart + index
      const storedGame = findStoredGame(candidate, storedGames)
      if (!storedGame) {
        if (getProvider(candidate) !== 'local') {
          console.warn('Catalog metadata has no PostgreSQL game match', {
            provider: getProvider(candidate),
            metadataGameId: candidate.metadata.id,
            title: candidate.metadata.title,
          })
          await enqueueRefresh(candidate, ordering, rank)
        }
        return null
      }

      const entry = createCatalogEntry(candidate, storedGame)
      if (!entry || entry.pricesStatus === 'stale') {
        await enqueueRefresh(
          candidate,
          ordering,
          rank,
          storedGame.cheapshark_game_id,
        )
      }
      return entry
    }),
  )
}
