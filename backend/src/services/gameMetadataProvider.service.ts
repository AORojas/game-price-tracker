import {
  gameMetadataProviderName,
  type GameMetadataProviderName,
} from '../config/gameMetadata.js'
import type {
  GameMetadataFilterOptions,
  GameMetadataSearchResult,
} from '../types/rawg.types.js'
import { igdbService } from './igdb.service.js'
import { localGameService } from './localGame.service.js'
import { rawgService } from './rawg.service.js'
import { steamGameMetadataService } from './steam.service.js'

export interface GameMetadataProvider {
  searchGames(
    title: string,
    filters?: { genres?: string[]; platforms?: number[] },
  ): Promise<{ count: number; results: GameMetadataSearchResult[] }>
  getCatalog(
    ordering: 'popular' | 'recent',
    page: number,
    filters?: { genres?: string[]; platforms?: number[] },
  ): Promise<{
    count: number
    page: number
    results: GameMetadataSearchResult[]
  }>
  getFilterOptions(): Promise<GameMetadataFilterOptions>
  getGameDescription(gameId: number): Promise<string>
  getGameDetails(gameId: number): Promise<{
    description: string
    developers: string[]
    esrbRating: string | null
  }>
  getGameScreenshots(gameId: number): Promise<string[]>
}

const providers: Record<GameMetadataProviderName, GameMetadataProvider> = {
  igdb: igdbService,
  rawg: rawgService,
  local: localGameService,
  steam: steamGameMetadataService,
}

export const gameMetadataService = providers[gameMetadataProviderName]
