import { gameMetadataService } from './gameMetadataProvider.service.js'
import { gameService } from './game.service.js'
import type { GameMetadataSearchResult } from '../types/rawg.types.js'
import type {
  GamePriceComparison,
  GameSearchCandidate,
} from '../types/game.types.js'

const OFFER_CHECK_CONCURRENCY = 2
export const CATALOG_OFFER_PAGE_SIZE = 8

type GameMetadataWithOffers = {
  metadata: GameMetadataSearchResult
  game: GameSearchCandidate
  comparison: GamePriceComparison
}

export async function getGameCatalogWithOffers(
  ordering: 'popular' | 'recent',
  page: number,
  filters: { genres?: string[]; platforms?: number[] },
) {
  const catalog = await gameMetadataService.getCatalog(
    ordering,
    page,
    filters,
    CATALOG_OFFER_PAGE_SIZE,
  )
  const offersByIndex: Array<GameMetadataWithOffers | null> =
    Array.from({ length: catalog.results.length }, () => null)
  let nextIndex = 0
  let offerLookupFailed = false
  let offerLookupError: unknown

  await Promise.all(
    Array.from(
      { length: Math.min(OFFER_CHECK_CONCURRENCY, catalog.results.length) },
      async () => {
        while (!offerLookupFailed && nextIndex < catalog.results.length) {
          const index = nextIndex
          nextIndex += 1
          const metadata = catalog.results[index]
          try {
            const offers = await gameService.getExactGameOffers(metadata.title)
            if (offers) offersByIndex[index] = { metadata, ...offers }
          } catch (error) {
            offerLookupFailed = true
            offerLookupError = error
          }
        }
      },
    ),
  )
  if (offerLookupFailed) throw offerLookupError

  return {
    count: catalog.count,
    page: catalog.page,
    results: offersByIndex.filter(
      (result): result is GameMetadataWithOffers => result !== null,
    ),
  }
}
