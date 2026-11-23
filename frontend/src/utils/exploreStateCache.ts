import {
  isGameMetadata,
  isGameMetadataCatalogEntry,
  isGameSearchResult,
  type GameMetadata,
  type GameMetadataCatalogEntry,
  type GameSearchResult,
} from '../services/gameSearchService'

export type ExploreSortOption = 'popular' | 'recent' | 'relevance' | 'price'
export type ExploreCatalogStatus = 'loading' | 'success' | 'error'
export type ExploreSearchStatus = 'idle' | 'loading' | 'success' | 'error'

export type ExploreSearchEntry = {
  game: GameSearchResult
  metadata: GameMetadata | null
  metadataStatus: 'loading' | 'ready' | 'error'
}

export type ExploreStateSnapshot = {
  version: 4
  key: string
  savedAt: number
  scrollY: number
  query: string
  submittedQuery: string
  sortBy: ExploreSortOption
  maxPrice: number
  selectedRawgGenres: string[]
  selectedPlatforms: number[]
  selectedConsolePlatforms?: number[]
  catalogEntries: GameMetadataCatalogEntry[]
  catalogCount: number
  catalogPage: number
  catalogRequestPage: number
  catalogHasMore: boolean
  catalogStatus: ExploreCatalogStatus
  catalogError: string
  catalogCachedAt: number | null
  searchEntries: ExploreSearchEntry[]
  searchResultsQuery: string | null
  searchHydrationProgress: { checked: number; total: number }
  searchStatus: ExploreSearchStatus
  searchError: string
  searchCachedAt: number | null
}

const STORAGE_KEY = 'game-price-tracker:explore-state:v1'
const CACHE_VERSION = 4
const CACHE_TTL_MS = 55 * 60 * 1000
const MAX_CACHED_EXPLORE_STATES = 6
const EXPLORE_SORT_OPTIONS: ExploreSortOption[] = [
  'popular',
  'recent',
  'relevance',
  'price',
]
const CATALOG_STATUSES: ExploreCatalogStatus[] = ['loading', 'success', 'error']
const SEARCH_STATUSES: ExploreSearchStatus[] = ['idle', 'loading', 'success', 'error']
const SEARCH_ENTRY_STATUSES: ExploreSearchEntry['metadataStatus'][] = [
  'loading',
  'ready',
  'error',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSearchEntry(value: unknown): value is ExploreSearchEntry {
  return (
    isRecord(value) &&
    isGameSearchResult(value.game) &&
    (value.metadata === null || isGameMetadata(value.metadata)) &&
    SEARCH_ENTRY_STATUSES.includes(value.metadataStatus as ExploreSearchEntry['metadataStatus'])
  )
}

function isSnapshot(value: unknown): value is ExploreStateSnapshot {
  return (
    isRecord(value) &&
    value.version === CACHE_VERSION &&
    typeof value.key === 'string' &&
    typeof value.savedAt === 'number' &&
    Number.isFinite(value.savedAt) &&
    typeof value.scrollY === 'number' &&
    Number.isFinite(value.scrollY) &&
    typeof value.query === 'string' &&
    typeof value.submittedQuery === 'string' &&
    EXPLORE_SORT_OPTIONS.includes(value.sortBy as ExploreSortOption) &&
    typeof value.maxPrice === 'number' &&
    Number.isFinite(value.maxPrice) &&
    value.maxPrice >= 0 &&
    value.maxPrice <= 100 &&
    Array.isArray(value.selectedRawgGenres) &&
    value.selectedRawgGenres.every((genre) => typeof genre === 'string') &&
    Array.isArray(value.selectedPlatforms) &&
    value.selectedPlatforms.every((platform) => Number.isSafeInteger(platform)) &&
    (value.selectedConsolePlatforms === undefined ||
      (Array.isArray(value.selectedConsolePlatforms) &&
        value.selectedConsolePlatforms.every((platform) => Number.isSafeInteger(platform)))) &&
    Array.isArray(value.catalogEntries) &&
    value.catalogEntries.every(isGameMetadataCatalogEntry) &&
    typeof value.catalogCount === 'number' &&
    Number.isSafeInteger(value.catalogCount) &&
    value.catalogCount >= 0 &&
    typeof value.catalogPage === 'number' &&
    Number.isSafeInteger(value.catalogPage) &&
    value.catalogPage >= 0 &&
    typeof value.catalogRequestPage === 'number' &&
    Number.isSafeInteger(value.catalogRequestPage) &&
    value.catalogRequestPage >= 1 &&
    typeof value.catalogHasMore === 'boolean' &&
    CATALOG_STATUSES.includes(value.catalogStatus as ExploreCatalogStatus) &&
    typeof value.catalogError === 'string' &&
    (value.catalogCachedAt === null ||
      (typeof value.catalogCachedAt === 'number' && Number.isFinite(value.catalogCachedAt))) &&
    Array.isArray(value.searchEntries) &&
    value.searchEntries.every(isSearchEntry) &&
    (value.searchResultsQuery === null || typeof value.searchResultsQuery === 'string') &&
    isRecord(value.searchHydrationProgress) &&
    typeof value.searchHydrationProgress.checked === 'number' &&
    Number.isSafeInteger(value.searchHydrationProgress.checked) &&
    typeof value.searchHydrationProgress.total === 'number' &&
    Number.isSafeInteger(value.searchHydrationProgress.total) &&
    SEARCH_STATUSES.includes(value.searchStatus as ExploreSearchStatus) &&
    typeof value.searchError === 'string' &&
    (value.searchCachedAt === null ||
      (typeof value.searchCachedAt === 'number' && Number.isFinite(value.searchCachedAt)))
  )
}

function readCache(): Record<string, ExploreStateSnapshot> {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== CACHE_VERSION || !isRecord(parsed.entries)) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed.entries).filter(
        (entry): entry is [string, ExploreStateSnapshot] =>
          isSnapshot(entry[1]) && entry[0] === entry[1].key,
      ),
    )
  } catch (error) {
    console.warn('Could not read the Explore state cache', error)
    return {}
  }
}

export function createExploreCacheKey(pathname: string, searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams)
  params.delete('page')
  params.sort()
  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}`
}

export function readExploreState(key: string): ExploreStateSnapshot | null {
  const snapshot = readCache()[key]
  if (!snapshot) return null

  const now = Date.now()
  if (
    snapshot.catalogCachedAt !== null &&
    now - snapshot.catalogCachedAt > CACHE_TTL_MS
  ) {
    snapshot.catalogEntries = []
    snapshot.catalogCount = 0
    snapshot.catalogPage = 0
    snapshot.catalogRequestPage = 1
    snapshot.catalogHasMore = true
    snapshot.catalogStatus = 'loading'
    snapshot.catalogError = ''
    snapshot.catalogCachedAt = null
  }
  if (
    snapshot.searchCachedAt !== null &&
    now - snapshot.searchCachedAt > CACHE_TTL_MS
  ) {
    snapshot.searchEntries = []
    snapshot.searchResultsQuery = null
    snapshot.searchHydrationProgress = { checked: 0, total: 0 }
    snapshot.searchStatus = snapshot.submittedQuery.trim() ? 'loading' : 'idle'
    snapshot.searchError = ''
    snapshot.searchCachedAt = null
  }

  return snapshot
}

export function writeExploreState(snapshot: ExploreStateSnapshot) {
  try {
    const entries = readCache()
    entries[snapshot.key] = {
      ...snapshot,
      savedAt: Date.now(),
    }
    const retainedEntries = Object.fromEntries(
      Object.entries(entries)
        .sort((first, second) => second[1].savedAt - first[1].savedAt)
        .slice(0, MAX_CACHED_EXPLORE_STATES),
    )
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: CACHE_VERSION, entries: retainedEntries }),
    )
  } catch (error) {
    console.warn('Could not persist the Explore state cache', error)
  }
}
