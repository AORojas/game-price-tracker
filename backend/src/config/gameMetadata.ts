import 'dotenv/config'

export type GameMetadataProviderName = 'igdb' | 'rawg' | 'local' | 'steam'

const configuredProvider =
  process.env.GAME_METADATA_PROVIDER?.trim().toLowerCase() || 'igdb'

if (
  configuredProvider !== 'igdb' &&
  configuredProvider !== 'rawg' &&
  configuredProvider !== 'local' &&
  configuredProvider !== 'steam'
) {
  throw new Error('GAME_METADATA_PROVIDER must be igdb, rawg, local, or steam')
}

export const gameMetadataProviderName: GameMetadataProviderName = configuredProvider
