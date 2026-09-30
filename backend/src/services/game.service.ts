import { cheapSharkService } from './cheapshark.service.js'
import type { GameSearchCandidate } from '../types/game.types.js'

export class GameService {
  constructor(
    private readonly gameSearchService = cheapSharkService,
  ) {}

  async searchGames(title: string): Promise<GameSearchCandidate[]> {
    const results = await this.gameSearchService.searchGames(title)

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
}

export const gameService = new GameService()
