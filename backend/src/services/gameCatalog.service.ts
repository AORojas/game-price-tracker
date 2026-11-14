import { gameMetadataService } from './gameMetadataProvider.service.js'
import { gameService } from './game.service.js'
import type { GameMetadataSearchResult } from '../types/rawg.types.js'
import type {
  GamePriceComparison,
  GameSearchCandidate,
} from '../types/game.types.js'

const OFFER_CHECK_CONCURRENCY = 4

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
  const catalog = await gameMetadataService.getCatalog(ordering, page, filters)
  const results: Array<GameMetadataWithOffers | null> =
    Array.from({ length: catalog.results.length }, () => null)
  let nextIndex = 0

  await Promise.all(
    Array.from(
      { length: Math.min(OFFER_CHECK_CONCURRENCY, catalog.results.length) },
      async () => {
        while (nextIndex < catalog.results.length) {
          const index = nextIndex
          nextIndex += 1
          const metadata = catalog.results[index]
          const offers = await gameService.getExactGameOffers(metadata.title)
          if (offers) results[index] = { metadata, ...offers }
        }
      },
    ),
  )

  return {
    count: catalog.count,
    page: catalog.page,
    results: results.filter(
      (result): result is GameMetadataWithOffers => result !== null,
    ),
  }
}
