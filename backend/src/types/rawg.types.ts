export interface RawgGameGenre {
  id: number
  name: string
  slug: string
}

export interface RawgGamePlatform {
  platform: {
    id: number
    name: string
    slug: string
  }
}

export interface RawgGameSearchResult {
  id: number
  name: string
  background_image: string | null
  released: string | null
  rating: number
  metacritic: number | null
  genres: RawgGameGenre[]
  platforms: RawgGamePlatform[]
}

export interface RawgGameSearchResponse {
  count: number
  results: RawgGameSearchResult[]
}

export interface GameMetadataSearchResult {
  id: number
  title: string
  image: string | null
  released: string | null
  rating: number
  metacritic: number | null
  genres: string[]
  platforms: string[]
}
