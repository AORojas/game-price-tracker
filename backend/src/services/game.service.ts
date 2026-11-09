import { gameMetadataProviderName } from '../config/gameMetadata.js'
import { cheapSharkService } from './cheapshark.service.js'
import { CheapSharkServiceError } from './cheapshark.service.js'
import { localGameService } from './localGame.service.js'
import { recordGamePriceObservation } from './gamePriceHistory.service.js'
import type {
  GamePrice,
  GamePriceComparison,
  GameSearchCandidate,
} from '../types/game.types.js'

export class GameService {
  constructor(
    private readonly cheapSharkApi = cheapSharkService,
  ) {}

  async searchGames(title: string): Promise<GameSearchCandidate[]> {
    if (gameMetadataProviderName === 'local') {
      return localGameService.searchGameCandidates(title)
    }

    const results = await this.cheapSharkApi.searchGames(title)

    return results.map((game) => {
      const lowestPrice = Number(game.cheapest)
      if (!Number.isFinite(lowestPrice) || lowestPrice < 0) {
        throw new Error('CheapShark returned an invalid game price')
      }

      return {
        id: game.gameID,
        title: game.external,
        image: game.thumb,
        lowestPrice,
        lowestDealId: game.cheapestDealID,
      }
    })
  }

  async getGamePrices(gameId: string, recordHistory = false): Promise<GamePriceComparison> {
    const normalizedGameId = gameId.trim()
    if (!/^\d+$/.test(normalizedGameId)) {
      throw new CheapSharkServiceError(
        'A valid numeric game ID is required',
        'INVALID_QUERY',
      )
    }

    if (gameMetadataProviderName === 'local') {
      return localGameService.getPriceComparison(normalizedGameId)
    }

    const [details, stores] = await Promise.all([
      this.cheapSharkApi.getGameDetails(normalizedGameId),
      this.cheapSharkApi.getStores(),
    ])
    const storeNames = new Map(stores.map((store) => [store.storeID, store.storeName]))

    const prices: GamePrice[] = details.deals.map((deal) => {
      const store = storeNames.get(deal.storeID)
      const price = Number(deal.price)

      if (!store || !Number.isFinite(price) || price < 0) {
        throw new CheapSharkServiceError(
          'CheapShark returned a deal with invalid store or price data',
          'INVALID_RESPONSE',
        )
      }

      const parsedRegularPrice = Number(deal.retailPrice)
      const regularPrice =
        Number.isFinite(parsedRegularPrice) && parsedRegularPrice >= 0
          ? parsedRegularPrice
          : null
      const parsedDiscount = Number(deal.savings)
      const discount =
        Number.isFinite(parsedDiscount) && parsedDiscount >= 0 && parsedDiscount <= 100
          ? parsedDiscount
          : null

      return {
        store,
        price,
        regularPrice,
        discount,
        currency: 'USD',
        dealId: deal.dealID,
      }
    })

    prices.sort((first, second) => first.price - second.price)
    const cheapestPrice = prices[0]

    const comparison: GamePriceComparison = {
      game: {
        id: normalizedGameId,
        title: details.info.title,
        image: details.info.thumb,
      },
      prices,
      cheapest: cheapestPrice
        ? { store: cheapestPrice.store, price: cheapestPrice.price }
        : null,
    }

    if (recordHistory && comparison.cheapest) {
      try {
        await recordGamePriceObservation(normalizedGameId, comparison.cheapest.price)
      } catch (error) {
        console.error('Failed to record game price history observation', {
          gameId: normalizedGameId,
          error,
        })
      }
    }

    return comparison
  }
}

export const gameService = new GameService()
