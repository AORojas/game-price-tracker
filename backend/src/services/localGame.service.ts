import { localGameFilterOptions, localGames, copyGamePriceComparison, copyGameSearchCandidate } from '../fixtures/localGames.js'
import type {
  GameMetadataFilterOptions,
  GameMetadataSearchResult,
} from '../types/rawg.types.js'
import { MetadataProviderError } from './metadataProviderError.js'
import type { GameMetadataProvider } from './gameMetadataProvider.service.js'

const LOCAL_PROVIDER_DELAY_MS = 250
const CATALOG_PAGE_SIZE = 24

function normalizeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function delay() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, LOCAL_PROVIDER_DELAY_MS)
  })
}

function isGameWithinFilters(
  game: GameMetadataSearchResult,
  filters: { genres?: string[]; platforms?: number[] },
  options: GameMetadataFilterOptions,
) {
  const selectedGenres = filters.genres?.map((slug) =>
    options.genres.find((genre) => genre.slug === slug)?.name,
  ) ?? []
  const selectedPlatforms = filters.platforms?.map((id) =>
    options.platforms.find((platform) => platform.id === id)?.name,
  ) ?? []

  if (selectedGenres.length > 0 && !game.genres.some((genre) => selectedGenres.includes(genre))) {
    return false
  }
  if (
    selectedPlatforms.length > 0 &&
    !game.platforms.some((platform) => selectedPlatforms.includes(platform))
  ) {
    return false
  }
  return true
}

function validateFilters(filters: { genres?: string[]; platforms?: number[] }) {
  if (
    filters.genres?.some(
      (slug) => !localGameFilterOptions.genres.some((genre) => genre.slug === slug),
    ) ||
    filters.platforms?.some(
      (id) => !localGameFilterOptions.platforms.some((platform) => platform.id === id),
    )
  ) {
    throw new MetadataProviderError(
      'One or more local game filters are not supported',
      'INVALID_FILTER',
    )
  }
}

export class LocalGameService implements GameMetadataProvider {
  async searchGames(
    title: string,
    filters: { genres?: string[]; platforms?: number[] } = {},
  ): Promise<{ count: number; results: GameMetadataSearchResult[] }> {
    const query = normalizeText(title.trim())
    if (!query) {
      throw new MetadataProviderError('A non-empty game title is required', 'INVALID_QUERY')
    }

    validateFilters(filters)
    await delay()
    const results = localGames
      .map(({ metadata }) => metadata)
      .filter(
        (game) =>
          normalizeText(game.title).includes(query) &&
          isGameWithinFilters(game, filters, localGameFilterOptions),
      )
      .sort((first, second) => second.rating - first.rating)

    return { count: results.length, results: results.map((game) => ({ ...game })) }
  }

  async getCatalog(
    ordering: 'popular' | 'recent',
    page: number,
    filters: { genres?: string[]; platforms?: number[] } = {},
  ): Promise<{
    count: number
    page: number
    results: GameMetadataSearchResult[]
  }> {
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new MetadataProviderError('A valid page is required', 'INVALID_QUERY')
    }
    validateFilters(filters)
    await delay()

    const games = localGames
      .map(({ metadata }) => metadata)
      .filter((game) => isGameWithinFilters(game, filters, localGameFilterOptions))
      .sort((first, second) =>
        ordering === 'recent'
          ? (second.released ?? '').localeCompare(first.released ?? '')
          : second.rating - first.rating,
      )
    const start = (page - 1) * CATALOG_PAGE_SIZE

    return {
      count: games.length,
      page,
      results: games.slice(start, start + CATALOG_PAGE_SIZE).map((game) => ({ ...game })),
    }
  }

  async getFilterOptions(): Promise<GameMetadataFilterOptions> {
    await delay()
    return {
      genres: localGameFilterOptions.genres.map((option) => ({ ...option })),
      platforms: localGameFilterOptions.platforms.map((option) => ({ ...option })),
    }
  }

  async getGameDescription(gameId: number): Promise<string> {
    return (await this.getGameDetails(gameId)).description
  }

  async getGameDetails(gameId: number) {
    await delay()
    const game = this.getGameById(gameId)
    return {
      description: game.details.description,
      developers: [...game.details.developers],
      esrbRating: game.details.esrbRating,
    }
  }

  async getGameScreenshots(gameId: number): Promise<string[]> {
    await delay()
    const game = this.getGameById(gameId)
    return [...game.metadata.previewImages]
  }

  async searchGameCandidates(title: string) {
    const query = normalizeText(title.trim())
    if (!query) {
      throw new MetadataProviderError('A non-empty game title is required', 'INVALID_QUERY')
    }
    await delay()
    return localGames
      .filter((game) => normalizeText(game.metadata.title).includes(query))
      .map(({ searchCandidate }) => copyGameSearchCandidate(searchCandidate))
  }

  async getPriceComparison(gameId: string) {
    if (!/^\d+$/.test(gameId)) {
      throw new MetadataProviderError('A valid local game ID is required', 'INVALID_QUERY')
    }
    await delay()
    const game = this.getGameById(Number(gameId))
    return copyGamePriceComparison(game.priceComparison)
  }

  private getGameById(gameId: number) {
    if (!Number.isSafeInteger(gameId) || gameId < 1) {
      throw new MetadataProviderError('A valid local game ID is required', 'INVALID_QUERY')
    }
    const game = localGames.find((entry) => entry.metadata.id === gameId)
    if (!game) {
      throw new MetadataProviderError('The local game was not found', 'INVALID_QUERY')
    }
    return game
  }
}

export const localGameService = new LocalGameService()
