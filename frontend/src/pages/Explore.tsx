import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import GameSearchCard from '../components/GameSearchCard'
import Navbar from '../components/Navbar'
import RawgCatalogCard from '../components/RawgCatalogCard'
import SearchHistoryDropdown from '../components/SearchHistoryDropdown'
import SearchClearButton from '../components/SearchClearButton'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'
import { useUserActivity } from '../hooks/useUserActivity'
import {
  filterSearchSuggestions,
  useSearchSuggestions,
  type SearchSuggestion,
} from '../hooks/useSearchSuggestions'
import { useUsdArsRate } from '../hooks/useUsdArsRate'
import { translateGenre } from '../utils/genres'
import { formatArsPrice } from '../utils/priceFormatting'
import {
  GameCatalogRateLimitError,
  getGameMetadataCatalogWithOffers,
  getGameMetadataFilterOptions,
  getGameMetadata,
  searchGames,
  type GameMetadata,
  type GameMetadataCatalogEntry,
  type GameMetadataFilterOptions,
  type GameSearchResult,
} from '../services/gameSearchService'
import {
  createExploreCacheKey,
  readExploreState,
  writeExploreState,
  type ExploreSearchEntry,
  type ExploreSearchStatus,
  type ExploreSortOption,
  type ExploreStateSnapshot,
} from '../utils/exploreStateCache'

const CATALOG_PAGE_SIZE = 8
const SEARCH_PAGE_SIZE = 20

type SortOption = ExploreSortOption
type SortDropdownOption = {
  value: SortOption
  label: string
}
type SearchEntry = ExploreSearchEntry

type LocalizedGenreFilter = {
  label: string
  slugs: string[]
}

type LocalizedPlatformFilter = {
  label: string
  platformIds: number[]
  consolePlatformIds: number[]
}

const FILTER_PILL_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-center text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-blue-400/60 hover:bg-[var(--color-surface)] peer-checked:border-blue-500 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 sm:min-h-8'

const DEFAULT_GENRE_FILTERS: GameMetadataFilterOptions['genres'] = [
  { id: 4, name: 'Action', slug: 'action' },
  { id: 3, name: 'Adventure', slug: 'adventure' },
  { id: 40, name: 'Casual', slug: 'casual' },
  { id: 6, name: 'Fighting', slug: 'fighting' },
  { id: 51, name: 'Indie', slug: 'indie' },
  { id: 59, name: 'Massively Multiplayer', slug: 'massively-multiplayer' },
  { id: 83, name: 'Platformer', slug: 'platformer' },
  { id: 7, name: 'Puzzle', slug: 'puzzle' },
  { id: 1, name: 'Racing', slug: 'racing' },
  { id: 5, name: 'RPG', slug: 'role-playing-games-rpg' },
  { id: 2, name: 'Shooter', slug: 'shooter' },
  { id: 14, name: 'Simulation', slug: 'simulation' },
  { id: 10, name: 'Strategy', slug: 'strategy' },
]

const CATALOG_SORT_OPTIONS: SortDropdownOption[] = [
  { value: 'popular', label: 'Más populares' },
  { value: 'recent', label: 'Recientes' },
]

const SEARCH_SORT_OPTIONS: SortDropdownOption[] = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price', label: 'Precio' },
]

function getInitialSort(searchParams: URLSearchParams, hasQuery: boolean): SortOption {
  const sort = searchParams.get('sort')
  if (sort === 'recent' || sort === 'price') return sort
  return hasQuery ? 'relevance' : 'popular'
}

function normalizeCatalogTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getPlatformLabel(name: string) {
  return ['apple macintosh', 'macos'].includes(name.trim().toLowerCase())
    ? 'Mac'
    : name
}

type SortDropdownProps = {
  options: SortDropdownOption[]
  value: SortOption
  onChange: (value: SortOption) => void
}

function SortDropdown({ options, value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = Math.max(options.findIndex((option) => option.value === value), 0)
  const selectedOption = options[selectedIndex]

  useEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.focus()
  }, [activeIndex, isOpen])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [isOpen])

  function focusOption(index: number) {
    if (options.length === 0) return
    const nextIndex = (index + options.length) % options.length
    setActiveIndex(nextIndex)
    optionRefs.current[nextIndex]?.focus()
  }

  function openMenu() {
    setActiveIndex(selectedIndex)
    setIsOpen(true)
  }

  function selectOption(option: SortDropdownOption) {
    onChange(option.value)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        openMenu()
      } else {
        focusOption(activeIndex + (event.key === 'ArrowDown' ? 1 : -1))
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isOpen) setIsOpen(false)
      else openMenu()
    }
  }

  function handleOptionKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusOption(index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusOption(index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusOption(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusOption(options.length - 1)
    } else if (event.key === 'Tab') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative min-w-0 flex-1" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'sort-options' : undefined}
        aria-haspopup="listbox"
        aria-label={`Ordenar por: ${selectedOption.label}`}
        className="flex w-full items-center justify-between gap-3 rounded-lg text-left text-[var(--color-text)] outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="whitespace-nowrap">{selectedOption.label}</span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 20 20"
        >
          <path
            d="m5.5 7.5 4.5 4.5 4.5-4.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-full min-w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-xl"
          id="sort-options"
          role="listbox"
          aria-label="Opciones de ordenación"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === activeIndex
            return (
              <button
                aria-selected={isSelected}
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus:outline-none ${
                  isSelected
                    ? 'bg-blue-700 text-white hover:bg-blue-600'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'
                } ${isActive && !isSelected ? 'ring-2 ring-inset ring-blue-400/60' : ''}`}
                id={`sort-option-${option.value}`}
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element
                }}
                role="option"
                tabIndex={isActive ? 0 : -1}
                type="button"
                onClick={() => selectOption(option)}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getReturnPrice(state: unknown) {
  if (typeof state !== 'object' || state === null || !('maxPrice' in state)) return 100
  const value = state.maxPrice
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 100
}

async function hydrateSearchGames(
  games: GameSearchResult[],
  signal: AbortSignal,
  onHydrated: (gameId: string, metadata: GameMetadata | null, failed: boolean) => void,
) {
  let nextIndex = 0
  const workerCount = Math.min(4, games.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (!signal.aborted && nextIndex < games.length) {
        const game = games[nextIndex]
        nextIndex += 1
        try {
          const metadata = await getGameMetadata(game.title, signal)
          if (!signal.aborted) onHydrated(game.id, metadata, false)
        } catch {
          if (!signal.aborted) onHydrated(game.id, null, true)
        }
      }
    }),
  )
}

function Explore() {
  const { user } = useAuth()
  const activity = useUserActivity()
  const usdArs = useUsdArsRate()
  const { addSearch, removeSearch } = activity
  const { suggestions, recordSearch, removeLocalSearch } =
    useSearchSuggestions(activity.searchHistory)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlCacheKey = createExploreCacheKey(location.pathname, searchParams)
  const sortContextCacheKeyRef = useRef<string | null>(null)
  const cacheKey = sortContextCacheKeyRef.current ?? urlCacheKey
  const [restoredExploreState] = useState(() => readExploreState(urlCacheKey))
  const hasRestoredExploreState = restoredExploreState?.key === urlCacheKey
  const [restoredCatalogKey, setRestoredCatalogKey] = useState<string | null>(
    () =>
      hasRestoredExploreState &&
      restoredExploreState.catalogCachedAt !== null &&
      restoredExploreState.catalogStatus !== 'loading'
        ? urlCacheKey
        : null,
  )
  const initialQuery = searchParams.get('search') ?? ''
  const [query, setQuery] = useState(
    () => restoredExploreState?.query ?? initialQuery,
  )
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false)
  const searchRootRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [submittedQuery, setSubmittedQuery] = useState(
    () => restoredExploreState?.submittedQuery ?? initialQuery,
  )
  const [searchSubmitVersion, setSearchSubmitVersion] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>(() =>
    restoredExploreState?.sortBy ??
    getInitialSort(searchParams, Boolean(initialQuery.trim())),
  )
  const [maxPrice, setMaxPrice] = useState(
    () => restoredExploreState?.maxPrice ?? getReturnPrice(location.state),
  )
  const [selectedRawgGenres, setSelectedRawgGenres] = useState<string[]>(
    () =>
      restoredExploreState?.selectedRawgGenres ??
      searchParams.get('genres')?.split(',').filter(Boolean) ??
      [],
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>(
    () =>
      restoredExploreState?.selectedPlatforms ??
      searchParams.get('platforms')?.split(',').map(Number).filter(Number.isSafeInteger) ??
      [],
  )
  const [selectedConsolePlatforms, setSelectedConsolePlatforms] = useState<number[]>(
    () =>
      restoredExploreState?.selectedConsolePlatforms ??
      searchParams
        .get('consolePlatforms')
        ?.split(',')
        .map(Number)
        .filter(Number.isSafeInteger) ??
      [],
  )
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const [isUsdArsInfoOpen, setIsUsdArsInfoOpen] = useState(false)
  const usdArsInfoRef = useRef<HTMLDivElement>(null)
  const usdArsInfoTriggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!isSearchSuggestionsOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !searchRootRef.current?.contains(event.target)) {
        setIsSearchSuggestionsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSearchSuggestionsOpen(false)
        searchInputRef.current?.blur()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSearchSuggestionsOpen])

  useEffect(() => {
    if (!isUsdArsInfoOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !usdArsInfoRef.current?.contains(event.target)) {
        setIsUsdArsInfoOpen(false)
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUsdArsInfoOpen(false)
        usdArsInfoTriggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [isUsdArsInfoOpen])
  useEffect(() => {
    if (!isMobileFiltersOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function closeOnDesktopResize() {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setIsMobileFiltersOpen(false)
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileFiltersOpen(false)
        filterTriggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleDocumentKeyDown)
    window.addEventListener('resize', closeOnDesktopResize)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleDocumentKeyDown)
      window.removeEventListener('resize', closeOnDesktopResize)
    }
  }, [isMobileFiltersOpen])
  const [searchEntries, setSearchEntries] = useState<SearchEntry[]>(
    () => restoredExploreState?.searchEntries ?? [],
  )
  const [searchVisibleCount, setSearchVisibleCount] = useState(SEARCH_PAGE_SIZE)
  const [searchResultsQuery, setSearchResultsQuery] = useState<string | null>(
    () => restoredExploreState?.searchResultsQuery ?? null,
  )
  const [searchHydrationProgress, setSearchHydrationProgress] = useState(
    () => restoredExploreState?.searchHydrationProgress ?? { checked: 0, total: 0 },
  )
  const hasRestoredSearchState = useRef(hasRestoredExploreState)
  const searchRequestId = useRef(0)
  const searchController = useRef<AbortController | null>(null)
  const lastSavedSearchRef = useRef<string | null>(null)
  const [catalogEntries, setCatalogEntries] = useState<GameMetadataCatalogEntry[]>(
    () => restoredExploreState?.catalogEntries ?? [],
  )
  const [catalogCount, setCatalogCount] = useState(
    () => restoredExploreState?.catalogCount ?? 0,
  )
  const [catalogCursor, setCatalogCursor] = useState(
    () => restoredExploreState?.catalogCursor ?? '1:0',
  )
  const [catalogRequestCursor, setCatalogRequestCursor] = useState(
    () => restoredExploreState?.catalogRequestCursor ?? '1:0',
  )
  const [catalogHasMore, setCatalogHasMore] = useState(
    () => restoredExploreState?.catalogHasMore ?? true,
  )
  const [isCatalogLoading, setIsCatalogLoading] = useState(
    () => restoredExploreState?.catalogStatus === 'loading',
  )
  const isCatalogLoadingRef = useRef(false)
  const catalogRequestGenerationRef = useRef(0)
  const [catalogRetryToken, setCatalogRetryToken] = useState(0)
  const catalogFailureCountRef = useRef(0)
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'success' | 'error'>(
    () => restoredExploreState?.catalogStatus ?? 'loading',
  )
  const [catalogError, setCatalogError] = useState(
    () => restoredExploreState?.catalogError ?? '',
  )
  const [catalogCachedAt, setCatalogCachedAt] = useState<number | null>(
    () => restoredExploreState?.catalogCachedAt ?? null,
  )
  const [filterOptions, setFilterOptions] = useState<GameMetadataFilterOptions | null>(null)
  const [filterOptionsError, setFilterOptionsError] = useState('')
  const [searchStatus, setSearchStatus] = useState<ExploreSearchStatus>(
    () =>
      restoredExploreState?.searchStatus ??
      (initialQuery.trim() ? 'loading' : 'idle'),
  )
  const [searchError, setSearchError] = useState(
    () => restoredExploreState?.searchError ?? '',
  )
  const [searchCachedAt, setSearchCachedAt] = useState<number | null>(
    () => restoredExploreState?.searchCachedAt ?? null,
  )
  const lastEmptyResultsToastKey = useRef<string | null>(null)
  const lastCatalogErrorToast = useRef<string | null>(null)
  const lastSearchErrorToast = useRef<string | null>(null)
  const lastFilterOptionsErrorToast = useRef<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (catalogStatus !== 'error' || !catalogError) {
      lastCatalogErrorToast.current = null
      return
    }
    if (lastCatalogErrorToast.current !== catalogError) {
      lastCatalogErrorToast.current = catalogError
      showToast(`No se pudieron cargar más juegos: ${catalogError}`, 'error')
    }
  }, [catalogError, catalogStatus, showToast])

  useEffect(() => {
    if (searchStatus !== 'error' || !searchError) {
      lastSearchErrorToast.current = null
      return
    }
    if (lastSearchErrorToast.current !== searchError) {
      lastSearchErrorToast.current = searchError
      showToast(`No se pudo completar la búsqueda: ${searchError}`, 'error')
    }
  }, [searchError, searchStatus, showToast])

  useEffect(() => {
    if (!filterOptionsError) {
      lastFilterOptionsErrorToast.current = null
      return
    }
    if (lastFilterOptionsErrorToast.current !== filterOptionsError) {
      lastFilterOptionsErrorToast.current = filterOptionsError
      showToast(`No se pudieron cargar los filtros: ${filterOptionsError}`, 'error')
    }
  }, [filterOptionsError, showToast])

  const normalizedDraftQuery = query.trim()
  const normalizedQuery = submittedQuery.trim()
  const matchingSearchSuggestions = filterSearchSuggestions(suggestions, query)
  const isSearchDropdownVisible =
    isSearchSuggestionsOpen && matchingSearchSuggestions.length > 0
  const catalogSort: 'popular' | 'recent' = sortBy === 'recent' ? 'recent' : 'popular'
  const sortOptions = normalizedQuery ? SEARCH_SORT_OPTIONS : CATALOG_SORT_OPTIONS
  const selectedSort = normalizedQuery
    ? sortBy === 'price'
      ? 'price'
      : 'relevance'
    : catalogSort
  const explorePath = `${location.pathname}${location.search}`
  const localizedGenres = useMemo(
    () => {
      const genresByLabel = new Map<string, LocalizedGenreFilter>()
      for (const genre of filterOptions?.genres ?? []) {
        const label = translateGenre(genre.name)
        const key = label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        const existing = genresByLabel.get(key)
        if (existing) existing.slugs.push(genre.slug)
        else genresByLabel.set(key, { label, slugs: [genre.slug] })
      }
      return [...genresByLabel.values()].sort((first, second) =>
        first.label.localeCompare(second.label, 'es'),
      )
    },
    [filterOptions],
  )
  const platformGroups = useMemo(() => {
    const operatingSystems = new Map<string, LocalizedPlatformFilter>()
    const consolesAndManufacturers = new Map<string, LocalizedPlatformFilter>()
    function addPlatform(
      name: string,
      id: number,
      isConsolePlatform: boolean,
    ) {
      const label = getPlatformLabel(name)
      const key = label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const normalizedName = name.trim().toLowerCase()
      const isOperatingSystem = [
        'pc',
        'windows',
        'mac',
        'macos',
        'apple macintosh',
        'linux',
        'ios',
        'android',
      ].includes(normalizedName)
      const group = isOperatingSystem ? operatingSystems : consolesAndManufacturers
      const existing = group.get(key) ?? {
        label,
        platformIds: [],
        consolePlatformIds: [],
      }
      if (isConsolePlatform) existing.consolePlatformIds.push(id)
      else existing.platformIds.push(id)
      group.set(key, existing)
    }
    for (const platform of filterOptions?.platforms ?? []) {
      addPlatform(platform.name, platform.id, false)
    }
    for (const platform of filterOptions?.consolePlatforms ?? []) {
      addPlatform(platform.name, platform.id, true)
    }
    const sortFilters = (filters: Map<string, LocalizedPlatformFilter>) =>
      [...filters.values()].sort((first, second) =>
        first.label.localeCompare(second.label, 'es'),
      )
    return {
      operatingSystems: sortFilters(operatingSystems),
      consolesAndManufacturers: sortFilters(consolesAndManufacturers),
    }
  }, [filterOptions])
  const exploreSnapshot = useMemo<ExploreStateSnapshot>(
    () => ({
      version: 5,
      key: cacheKey,
      savedAt: 0,
      scrollY: restoredExploreState?.scrollY ?? 0,
      query,
      submittedQuery,
      sortBy,
      maxPrice,
      selectedRawgGenres,
      selectedPlatforms,
      selectedConsolePlatforms,
      catalogEntries,
      catalogCount,
      catalogCursor,
      catalogRequestCursor,
      catalogHasMore,
      catalogStatus,
      catalogError,
      catalogCachedAt,
      searchEntries,
      searchResultsQuery,
      searchHydrationProgress,
      searchStatus,
      searchError,
      searchCachedAt,
    }),
    [
      cacheKey,
      restoredExploreState?.scrollY,
      query,
      submittedQuery,
      sortBy,
      maxPrice,
      selectedRawgGenres,
      selectedPlatforms,
      selectedConsolePlatforms,
      catalogEntries,
      catalogCount,
      catalogCursor,
      catalogRequestCursor,
      catalogHasMore,
      catalogStatus,
      catalogError,
      catalogCachedAt,
      searchEntries,
      searchResultsQuery,
      searchHydrationProgress,
      searchStatus,
      searchError,
      searchCachedAt,
    ],
  )
  const snapshotRef = useRef(exploreSnapshot)
  const pendingScrollRestoreRef = useRef<number | null>(
    hasRestoredExploreState ? restoredExploreState.scrollY : null,
  )
  const [scrollRestoreVersion, setScrollRestoreVersion] = useState(0)

  useEffect(() => {
    const snapshot = {
      ...exploreSnapshot,
      scrollY:
        snapshotRef.current.key === exploreSnapshot.key
          ? snapshotRef.current.scrollY
          : exploreSnapshot.scrollY,
    }
    snapshotRef.current = snapshot
    writeExploreState(snapshot)
  }, [exploreSnapshot])

  useEffect(() => {
    let saveTimer = 0
    const saveScrollPosition = () => {
      window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => {
        const snapshot = {
          ...snapshotRef.current,
          scrollY: window.scrollY,
        }
        snapshotRef.current = snapshot
        writeExploreState(snapshot)
      }, 100)
    }
    const saveBeforePageExit = () => {
      window.clearTimeout(saveTimer)
      const snapshot = {
        ...snapshotRef.current,
        scrollY: window.scrollY,
      }
      snapshotRef.current = snapshot
      writeExploreState(snapshot)
    }

    window.addEventListener('scroll', saveScrollPosition, { passive: true })
    window.addEventListener('pagehide', saveBeforePageExit)
    return () => {
      window.clearTimeout(saveTimer)
      window.removeEventListener('scroll', saveScrollPosition)
      window.removeEventListener('pagehide', saveBeforePageExit)
    }
  }, [])

  useLayoutEffect(() => {
    if (sortContextCacheKeyRef.current === urlCacheKey) {
      sortContextCacheKeyRef.current = null
    }

    const scrollY = pendingScrollRestoreRef.current
    if (scrollY === null) return
    const hasLoadedContext = normalizedQuery
      ? searchStatus !== 'loading'
      : catalogStatus !== 'loading'
    if (!hasLoadedContext) return

    const animationFrame = window.requestAnimationFrame(() => {
      window.scrollTo(0, scrollY)
      pendingScrollRestoreRef.current = null
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [
    catalogStatus,
    normalizedQuery,
    scrollRestoreVersion,
    searchStatus,
    urlCacheKey,
  ])

  useEffect(() => {
    if (
      typeof location.state === 'object' &&
      location.state !== null &&
      'maxPrice' in location.state
    ) {
      navigate(explorePath, { replace: true, state: null })
    }
  }, [explorePath, location.state, navigate])

  function updateExploreParams(updates: Record<string, string | null>) {
    const nextParams = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) nextParams.set(key, value)
      else nextParams.delete(key)
    }
    setSearchParams(nextParams, { replace: true })
  }

  useEffect(() => {
    const controller = new AbortController()

    getGameMetadataFilterOptions(controller.signal)
      .then(setFilterOptions)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setFilterOptions({
          genres: DEFAULT_GENRE_FILTERS,
          platforms: [],
          consolePlatforms: [],
        })
        setFilterOptionsError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los filtros del proveedor de videojuegos.',
        )
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (normalizedQuery) return
    if (
      restoredCatalogKey === cacheKey
    ) {
      return
    }
    const controller = new AbortController()
    let ownedRequestGeneration = catalogRequestGenerationRef.current

    const debounceTimeout = window.setTimeout(async () => {
      ownedRequestGeneration = ++catalogRequestGenerationRef.current
      isCatalogLoadingRef.current = true
      setIsCatalogLoading(true)
      setCatalogStatus('loading')
      try {
        const catalog = await getGameMetadataCatalogWithOffers(
          catalogSort,
          catalogRequestCursor,
          {
            genres: selectedRawgGenres,
            platforms: selectedPlatforms,
            consolePlatforms: selectedConsolePlatforms,
          },
          controller.signal,
        )
        if (controller.signal.aborted) return
        setCatalogEntries((currentEntries) =>
          catalogRequestCursor === '1:0'
            ? catalog.results
            : [
                ...currentEntries,
                ...catalog.results.filter(
                  (entry) =>
                    !currentEntries.some(
                      (currentEntry) =>
                        normalizeCatalogTitle(currentEntry.metadata.title) ===
                        normalizeCatalogTitle(entry.metadata.title),
                    ),
                ),
              ],
        )
        setCatalogCount(catalog.count)
        setCatalogCursor(catalog.nextCursor ?? catalogRequestCursor)
        setCatalogHasMore(catalog.hasMore)
        setCatalogCachedAt((current) => current ?? Date.now())
        setCatalogError('')
        catalogFailureCountRef.current = 0
        setCatalogStatus('success')
      } catch (error) {
        if (controller.signal.aborted) return
        catalogFailureCountRef.current += 1
        const hasRepeatedFailures = catalogFailureCountRef.current >= 3
        const errorMessage = hasRepeatedFailures
          ? 'Ha ocurrido un error. Recarga la página o intenta más tarde.'
          : error instanceof GameCatalogRateLimitError
            ? 'El servicio de precios está saturado. Intenta de nuevo en unos segundos.'
            : error instanceof Error
              ? error.message
              : 'No se pudo cargar juegos con ofertas disponibles.'
        setCatalogError(errorMessage)
        setCatalogStatus('error')
      } finally {
        if (
          !controller.signal.aborted &&
          ownedRequestGeneration === catalogRequestGenerationRef.current
        ) {
          isCatalogLoadingRef.current = false
          setIsCatalogLoading(false)
        }
      }
    }, 200)

    return () => {
      window.clearTimeout(debounceTimeout)
      controller.abort()
      if (
        ownedRequestGeneration === catalogRequestGenerationRef.current &&
        isCatalogLoadingRef.current
      ) {
        isCatalogLoadingRef.current = false
        setIsCatalogLoading(false)
      }
    }
  }, [
    catalogRequestCursor,
    catalogRetryToken,
    catalogSort,
    cacheKey,
    normalizedQuery,
    restoredCatalogKey,
    selectedPlatforms,
    selectedConsolePlatforms,
    selectedRawgGenres,
  ])

  useEffect(() => {
    const term = normalizedQuery.trim()
    if (!term) return
    recordSearch(term)
    if (!user || term.length > 200) return

    const normalizedTerm = term.toLocaleLowerCase()
    const latestSavedSearch =
      activity.searchHistory[0]?.search_term.trim().toLocaleLowerCase() ?? null
    const lastSavedSearch = lastSavedSearchRef.current ?? latestSavedSearch
    if (lastSavedSearch === normalizedTerm) return

    const timeout = window.setTimeout(() => {
      if (lastSavedSearchRef.current === normalizedTerm) return
      lastSavedSearchRef.current = normalizedTerm
      void addSearch(term).catch(() => {
        if (lastSavedSearchRef.current === normalizedTerm) {
          lastSavedSearchRef.current = latestSavedSearch
        }
      })
    }, 1000)

    return () => window.clearTimeout(timeout)
  }, [activity.searchHistory, addSearch, normalizedQuery, recordSearch, user])

  useEffect(() => {
    if (!normalizedQuery) return

    const controller = new AbortController()
    const requestId = ++searchRequestId.current
    searchController.current = controller
    const queryToSearch = normalizedQuery

    if (
      hasRestoredSearchState.current &&
      restoredExploreState !== null &&
      searchSubmitVersion === 0 &&
      restoredExploreState.searchResultsQuery === queryToSearch &&
      (restoredExploreState.searchStatus === 'success' ||
        restoredExploreState.searchStatus === 'error')
    ) {
      if (restoredExploreState.searchStatus === 'error') {
        return () => controller.abort()
      }

      const entriesToHydrate = restoredExploreState.searchEntries.filter(
        (entry) => entry.metadataStatus === 'loading',
      )
      if (entriesToHydrate.length === 0) return () => controller.abort()

      void hydrateSearchGames(
        entriesToHydrate.map((entry) => entry.game),
        controller.signal,
        (gameId, metadata, failed) => {
          if (controller.signal.aborted || searchRequestId.current !== requestId) return
          setSearchEntries((currentEntries) =>
            currentEntries.map((entry) =>
              entry.game.id === gameId
                ? {
                    ...entry,
                    metadata,
                    metadataStatus: failed ? 'error' : 'ready',
                  }
                : entry,
            ),
          )
          setSearchHydrationProgress((current) => ({
            ...current,
            checked: Math.min(current.total, current.checked + 1),
          }))
        },
      )

      return () => controller.abort()
    }

    const debounceTimeout = window.setTimeout(async () => {
      try {
        const games = await searchGames(queryToSearch, controller.signal)
        if (controller.signal.aborted || searchRequestId.current !== requestId) return

        setSearchEntries(
          games.map((game) => ({
            game,
            metadata: null,
            metadataStatus: 'loading',
          })),
        )
        setSearchResultsQuery(queryToSearch)
        setSearchHydrationProgress({ checked: 0, total: games.length })
        setSearchCachedAt(Date.now())
        setSearchStatus('success')
        await hydrateSearchGames(
          games,
          controller.signal,
          (gameId, metadata, failed) => {
            if (searchRequestId.current !== requestId) return
            setSearchEntries((currentEntries) =>
              currentEntries.map((entry) =>
                entry.game.id === gameId
                  ? {
                      ...entry,
                      metadata,
                      metadataStatus: failed ? 'error' : 'ready',
                    }
                  : entry,
              ),
            )
            setSearchHydrationProgress((current) => ({
              ...current,
              checked: current.checked + 1,
            }))
          },
        )
      } catch (error) {
        if (controller.signal.aborted || searchRequestId.current !== requestId) return
        setSearchResultsQuery(queryToSearch)
        setSearchError(
          error instanceof Error ? error.message : 'Ocurrió un error inesperado en la búsqueda.',
        )
        setSearchStatus('error')
      }
    }, 350)

    return () => {
      window.clearTimeout(debounceTimeout)
      controller.abort()
      if (searchController.current === controller) searchController.current = null
    }
  }, [
    normalizedQuery,
    restoredExploreState,
    searchSubmitVersion,
  ])

  const filteredSearchResults = useMemo(() => {
    const visibleEntries =
      searchResultsQuery === normalizedQuery ? searchEntries : []
    const results = visibleEntries.filter(
      (entry) => maxPrice === 100 || entry.game.lowestPrice <= maxPrice,
    )
    if (sortBy !== 'price') return results
    return [...results].sort((first, second) => {
      return first.game.lowestPrice - second.game.lowestPrice
    })
  }, [maxPrice, normalizedQuery, searchEntries, searchResultsQuery, sortBy])
  const visibleSearchResults = filteredSearchResults.slice(0, searchVisibleCount)
  const filteredCatalogResults = useMemo(
    () =>
      catalogEntries.filter(
        (entry) =>
          maxPrice === 100 || entry.game.lowestPrice <= maxPrice,
      ),
    [catalogEntries, maxPrice],
  )
  const isEmptyResultSetReady = normalizedQuery
    ? searchStatus === 'success' &&
      searchResultsQuery === normalizedQuery &&
      filteredSearchResults.length === 0
    : catalogStatus === 'success' &&
      !catalogHasMore &&
      filteredCatalogResults.length === 0
  const emptyResultsKey = normalizedQuery
    ? `search:${normalizedQuery}:${maxPrice}`
    : `catalog:${cacheKey}:${catalogSort}:${maxPrice}:${selectedRawgGenres.join(',')}:${selectedPlatforms.join(',')}:${selectedConsolePlatforms.join(',')}`

  useEffect(() => {
    if (!isEmptyResultSetReady || lastEmptyResultsToastKey.current === emptyResultsKey) {
      return
    }
    lastEmptyResultsToastKey.current = emptyResultsKey
    showToast('No hay coincidencias con los filtros seleccionados.', 'error')
  }, [emptyResultsKey, isEmptyResultSetReady, showToast])

  const selectedConsolePlatformNames = (filterOptions?.consolePlatforms ?? [])
    .filter((platform) => selectedConsolePlatforms.includes(platform.id))
    .map((platform) => platform.name)
  const selectedGenreFilters = localizedGenres.filter((genre) =>
    genre.slugs.every((slug) => selectedRawgGenres.includes(slug)),
  )
  const selectedPlatformFilters = [
    ...platformGroups.operatingSystems,
    ...platformGroups.consolesAndManufacturers,
  ].filter(
    (platform) =>
      (platform.platformIds.length > 0 ||
    platform.consolePlatformIds.length > 0) &&
      platform.platformIds.every((id) => selectedPlatforms.includes(id)) &&
      platform.consolePlatformIds.every((id) =>
    selectedConsolePlatforms.includes(id),
      ),
  )
  const activeFilterCount =
    selectedGenreFilters.length +
    selectedPlatformFilters.length +
    (maxPrice < 100 ? 1 : 0)

  function requestCatalogPage(cursor: string) {
    catalogRequestGenerationRef.current += 1
    isCatalogLoadingRef.current = true
    setIsCatalogLoading(true)
    setRestoredCatalogKey(null)
    setCatalogStatus('loading')
    setCatalogRequestCursor(cursor)
    setCatalogRetryToken((token) => token + 1)
  }

  function resetCatalogPagination() {
    setCatalogEntries([])
    setCatalogCursor('1:0')
    catalogFailureCountRef.current = 0
    setCatalogHasMore(true)
    setCatalogError('')
    setCatalogCachedAt(null)
    setRestoredCatalogKey(null)
    requestCatalogPage('1:0')
  }

  function clearSearch() {
    searchRequestId.current += 1
    searchController.current?.abort()
    searchController.current = null
    setQuery('')
    setSubmittedQuery('')
    setSearchEntries([])
    setSearchVisibleCount(SEARCH_PAGE_SIZE)
    setSearchResultsQuery(null)
    setSearchHydrationProgress({ checked: 0, total: 0 })
    setSearchError('')
    setSearchStatus('idle')
    setSearchCachedAt(null)
    setSortBy('popular')
    resetCatalogPagination()
    setIsSearchSuggestionsOpen(true)
    updateExploreParams({
      search: null,
      sort: null,
      page: null,
    })
    searchInputRef.current?.focus()
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setIsSearchSuggestionsOpen(true)
  }

  function submitSearch(term: string) {
    const normalizedTerm = term.trim()
    if (!normalizedTerm) return

    searchRequestId.current += 1
    searchController.current?.abort()
    searchController.current = null
    setSearchEntries([])
    setSearchVisibleCount(SEARCH_PAGE_SIZE)
    setSearchResultsQuery(null)
    setSearchHydrationProgress({ checked: 0, total: 0 })
    setSearchError('')
    setSearchCachedAt(null)
    recordSearch(normalizedTerm)
    setQuery(normalizedTerm)
    setSubmittedQuery(normalizedTerm)
    setIsSearchSuggestionsOpen(false)
    setSearchSubmitVersion((currentVersion) => currentVersion + 1)
    setSearchStatus('loading')
    setSortBy('relevance')
    setRestoredCatalogKey(null)
    updateExploreParams({ search: normalizedTerm, sort: null, page: null })
  }

  function handleSearchSubmit(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitSearch(query)
  }

  function selectSearchSuggestion(term: string) {
    setQuery(term)
    setIsSearchSuggestionsOpen(false)
  }

  async function handleRemoveSearchSuggestion(suggestion: SearchSuggestion) {
    try {
      if (suggestion.remoteId) await removeSearch(suggestion.remoteId)
      removeLocalSearch(suggestion.term)
    } catch {
      return
    }
  }

  function toggleGenreFilters(slugs: string[]) {
    const shouldSelect = slugs.some((slug) => !selectedRawgGenres.includes(slug))
    const nextValues = shouldSelect
      ? [...new Set([...selectedRawgGenres, ...slugs])]
      : selectedRawgGenres.filter((slug) => !slugs.includes(slug))
    if (normalizedQuery) return

    resetCatalogPagination()
    setSelectedRawgGenres(nextValues)
    updateExploreParams({
      genres: nextValues.length > 0 ? nextValues.join(',') : null,
      page: null,
    })
  }

  function togglePlatformFilters(filter: LocalizedPlatformFilter) {
    if (normalizedQuery) return

    const isSelected =
      filter.platformIds.every((id) => selectedPlatforms.includes(id)) &&
      filter.consolePlatformIds.every((id) => selectedConsolePlatforms.includes(id))
    const nextPlatforms = isSelected
      ? selectedPlatforms.filter((id) => !filter.platformIds.includes(id))
      : [...new Set([...selectedPlatforms, ...filter.platformIds])]
    const nextConsolePlatforms = isSelected
      ? selectedConsolePlatforms.filter((id) => !filter.consolePlatformIds.includes(id))
      : [...new Set([...selectedConsolePlatforms, ...filter.consolePlatformIds])]

    resetCatalogPagination()
    setSelectedPlatforms(nextPlatforms)
    setSelectedConsolePlatforms(nextConsolePlatforms)
    updateExploreParams({
      platforms: nextPlatforms.length > 0 ? nextPlatforms.join(',') : null,
      consolePlatforms:
        nextConsolePlatforms.length > 0 ? nextConsolePlatforms.join(',') : null,
      page: null,
    })
  }

  function handleSortChange(value: SortOption) {
    if (!normalizedQuery) {
      const nextParams = new URLSearchParams(searchParams)
      if (value === 'recent') nextParams.set('sort', 'recent')
      else nextParams.delete('sort')
      nextParams.delete('page')
      const nextCacheKey = createExploreCacheKey(location.pathname, nextParams)
      const cachedContext = readExploreState(nextCacheKey)
      const cachedCatalog =
        cachedContext && cachedContext.catalogCachedAt !== null ? cachedContext : null

      preserveExploreStateBeforeNavigation()
      sortContextCacheKeyRef.current = nextCacheKey
      setSearchParams(nextParams, { replace: true })
      setSortBy(value)
      pendingScrollRestoreRef.current = cachedCatalog?.scrollY ?? 0
      snapshotRef.current = {
        ...exploreSnapshot,
        key: nextCacheKey,
        scrollY: cachedCatalog?.scrollY ?? 0,
      }
      setScrollRestoreVersion((version) => version + 1)

      if (cachedCatalog) {
        isCatalogLoadingRef.current = false
        setCatalogEntries(cachedCatalog.catalogEntries)
        setCatalogCount(cachedCatalog.catalogCount)
        setCatalogCursor(cachedCatalog.catalogCursor)
        setCatalogRequestCursor(cachedCatalog.catalogRequestCursor)
        setCatalogHasMore(cachedCatalog.catalogHasMore)
        setIsCatalogLoading(cachedCatalog.catalogStatus === 'loading')
        setCatalogStatus(cachedCatalog.catalogStatus)
        setCatalogError(cachedCatalog.catalogError)
        setCatalogCachedAt(cachedCatalog.catalogCachedAt)
        setMaxPrice(cachedCatalog.maxPrice)
        setSelectedRawgGenres(cachedCatalog.selectedRawgGenres)
        setSelectedPlatforms(cachedCatalog.selectedPlatforms)
        setSelectedConsolePlatforms(cachedCatalog.selectedConsolePlatforms ?? [])
        setRestoredCatalogKey(
          cachedCatalog.catalogStatus === 'loading' ? null : nextCacheKey,
        )
      } else {
        setCatalogCount(0)
        resetCatalogPagination()
      }
      return
    }

    setSortBy(value)
    updateExploreParams({
      sort: value === 'recent' || value === 'price' ? value : null,
      page: null,
    })
  }

  function handleMaxPriceChange(value: number) {
    setMaxPrice(value)
  }

  function clearFilters() {
    if (
      selectedRawgGenres.length > 0 ||
      selectedPlatforms.length > 0 ||
      selectedConsolePlatforms.length > 0
    ) {
      resetCatalogPagination()
    }
    setMaxPrice(100)
    setSelectedRawgGenres([])
    setSelectedPlatforms([])
    setSelectedConsolePlatforms([])
    updateExploreParams({
      genres: null,
      platforms: null,
      consolePlatforms: null,
      page: null,
    })
  }

  function preserveExploreStateBeforeNavigation() {
    const snapshot = {
      ...snapshotRef.current,
      scrollY: window.scrollY,
    }
    snapshotRef.current = snapshot
    writeExploreState(snapshot)
  }

  const filterControls = (
    <>
      <div className="border-t border-[var(--color-border)] pt-4">
        <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">
          Género
        </h3>
        {filterOptions ? (
          <div className="flex flex-wrap gap-2">
            {localizedGenres.map((genre) => {
              const isSelected = genre.slugs.every((slug) =>
                selectedRawgGenres.includes(slug),
              )
              return (
                <label className="cursor-pointer" key={genre.label}>
                  <input
                    checked={isSelected}
                    className="peer sr-only appearance-none"
                    type="checkbox"
                    onChange={() => toggleGenreFilters(genre.slugs)}
                  />
                  <span className={FILTER_PILL_CLASS}>{genre.label}</span>
                </label>
              )
            })}
          </div>
        ) : filterOptionsError ? (
          <p className="text-sm text-[var(--color-text-muted)]" role="status">
            No se pudieron cargar los géneros. Intenta actualizar la página.
          </p>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]" role="status">
            Cargando géneros...
          </p>
        )}
      </div>

      <div className="mt-8 border-t border-[var(--color-border)] pt-5">
        <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">
          Plataforma
        </h3>
        {filterOptions && (
          <>
            {platformGroups.operatingSystems.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">
                  Sistemas operativos
                </p>
                <div className="flex flex-wrap gap-2">
                  {platformGroups.operatingSystems.map((platform) => (
                    <label className="cursor-pointer" key={platform.label}>
                      <input
                        checked={
                          platform.platformIds.every((id) =>
                            selectedPlatforms.includes(id),
                          ) &&
                          platform.consolePlatformIds.every((id) =>
                            selectedConsolePlatforms.includes(id),
                          )
                        }
                        className="peer sr-only appearance-none"
                        type="checkbox"
                        onChange={() => togglePlatformFilters(platform)}
                      />
                      <span className={FILTER_PILL_CLASS}>{platform.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {(platformGroups.consolesAndManufacturers.length > 0 ||
              (filterOptions.consolePlatforms ?? []).length > 0) && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">
                  Consolas y fabricantes
                </p>
                <div className="flex flex-wrap gap-2">
                  {platformGroups.consolesAndManufacturers.map((platform) => (
                    <label className="cursor-pointer" key={platform.label}>
                      <input
                        checked={
                          platform.platformIds.every((id) =>
                            selectedPlatforms.includes(id),
                          ) &&
                          platform.consolePlatformIds.every((id) =>
                            selectedConsolePlatforms.includes(id),
                          )
                        }
                        className="peer sr-only appearance-none"
                        type="checkbox"
                        onChange={() => togglePlatformFilters(platform)}
                      />
                      <span className={FILTER_PILL_CLASS}>{platform.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8 border-t border-[var(--color-border)] pt-5">
        <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">
          Precio máximo (USD)
        </h3>
        <input
          className="w-full accent-blue-500"
          type="range"
          min="0"
          max="100"
          value={maxPrice}
          onChange={(event) => handleMaxPriceChange(Number(event.target.value))}
        />
        <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>$ 0</span>
          <span>{maxPrice === 100 ? 'Todos los precios' : `$${maxPrice} o menos`}</span>
        </div>
      </div>
    </>
  )

  return (
    <main className="theme-transition min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {isMobileFiltersOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              aria-label="Cerrar filtros"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm lg:hidden"
              type="button"
              onClick={() => {
                setIsMobileFiltersOpen(false)
                filterTriggerRef.current?.focus()
              }}
            />
            <section
              aria-labelledby="mobile-explore-filters-title"
              aria-modal="true"
              className="absolute inset-x-0 bottom-0 z-[70] flex max-h-[88dvh] flex-col rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl lg:hidden"
              role="dialog"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                <h2 className="text-lg font-semibold" id="mobile-explore-filters-title">
                  Filtros
                </h2>
                <button
                  aria-label="Cerrar filtros"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  type="button"
                  onClick={() => {
                    setIsMobileFiltersOpen(false)
                    filterTriggerRef.current?.focus()
                  }}
                >
                  <span aria-hidden="true" className="text-2xl leading-none">×</span>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4">
                {filterControls}
              </div>
              <div className="flex items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button
                  className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-[var(--color-text-muted)] underline-offset-4 hover:text-[var(--color-text)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={activeFilterCount === 0}
                  type="button"
                  onClick={clearFilters}
                >
                  Limpiar
                </button>
                <button
                  className="min-h-11 flex-1 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  type="button"
                  onClick={() => {
                    setIsMobileFiltersOpen(false)
                    filterTriggerRef.current?.focus()
                  }}
                >
                  {catalogStatus === 'loading' && !normalizedQuery
                    ? 'Ver juegos'
                    : `Ver ${normalizedQuery ? filteredSearchResults.length : filteredCatalogResults.length} juegos`}
                </button>
              </div>
            </section>
          </div>
        )}
        <aside
          aria-labelledby="desktop-explore-filters-title"
          className="hidden w-64 shrink-0 border-b border-[var(--color-border)] px-6 py-8 lg:block lg:border-b-0 lg:border-r"
          role="complementary"
        >
          <h2 className="text-lg font-semibold" id="desktop-explore-filters-title">
            Filtros
          </h2>
          {filterControls}
        </aside>

        <section className="min-w-0 flex-1 px-6 py-8 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div
              className={`relative w-full min-w-0 flex-1 ${
                isSearchDropdownVisible ? 'z-50' : ''
              }`}
              ref={searchRootRef}
            >
              <form
                className={`theme-transition flex w-full min-w-0 items-center gap-2 border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 ${
                  isSearchDropdownVisible
                    ? 'rounded-t-xl rounded-b-none'
                    : 'rounded-xl'
                }`}
                onSubmit={handleSearchSubmit}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3 text-left">
                  <span className="text-xl text-[var(--color-text-muted)]" aria-hidden="true">⌕</span>
                  <input
                    id="explore-search"
                    aria-controls={isSearchDropdownVisible ? 'explore-search-history' : undefined}
                    aria-expanded={isSearchDropdownVisible}
                    className="w-full bg-transparent py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] [&::-webkit-search-cancel-button]:hidden"
                    onChange={(event) => handleQueryChange(event.target.value)}
                    onClick={() => setIsSearchSuggestionsOpen(true)}
                    onFocus={() => setIsSearchSuggestionsOpen(true)}
                    placeholder="Buscar videojuegos..."
                    ref={searchInputRef}
                    type="search"
                    value={query}
                  />
                  {query.length > 0 && <SearchClearButton onClear={clearSearch} />}
                </div>
                <button
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-500"
                  type="submit"
                  disabled={!normalizedDraftQuery || searchStatus === 'loading'}
                  aria-busy={searchStatus === 'loading'}
                >
                  {searchStatus === 'loading' ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Buscando...
                    </>
                  ) : (
                    'Buscar'
                  )}
                </button>
              </form>
              <SearchHistoryDropdown
                id="explore-search-history"
                isRemoveDisabled={activity.loading}
                isOpen={isSearchDropdownVisible}
                items={suggestions}
                onRemove={(suggestion) => void handleRemoveSearchSuggestion(suggestion)}
                onSelect={selectSearchSuggestion}
                query={query}
              />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 xl:flex-nowrap">
              <div className="theme-transition relative flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)] xl:w-64">
                <span>Ordenar por:</span>
                <SortDropdown
                  onChange={handleSortChange}
                  options={sortOptions}
                  value={selectedSort}
                />
              </div>
              {usdArs.quote ? (
                <div className="relative z-10 inline-block w-fit max-w-full" ref={usdArsInfoRef}>
                  <button
                    aria-controls="usd-ars-info-panel"
                    aria-expanded={isUsdArsInfoOpen}
                    aria-label="Información sobre la cotización del dólar"
                    className="flex max-w-full cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-2.5 py-2.5 text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    ref={usdArsInfoTriggerRef}
                    type="button"
                    onClick={() => setIsUsdArsInfoOpen((isOpen) => !isOpen)}
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M10 9v4M10 6.5h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                    </svg>
                    <span className="truncate">
                      USD 1 = {formatArsPrice(usdArs.quote.rate)}
                    </span>
                  </button>
                  {isUsdArsInfoOpen && (
                    <div
                      className="absolute left-0 right-0 top-full z-50 mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[11px] leading-snug shadow-xl"
                      id="usd-ars-info-panel"
                    >
                      <p className="font-medium text-[var(--color-text)]">
                        Dólar oficial vendedor
                      </p>
                      <p className="mt-1 text-[var(--color-text-muted)]">
                        USD 1 = {formatArsPrice(usdArs.quote.rate)}
                      </p>
                      <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                        Actualizado{' '}
                        {new Date(usdArs.quote.updatedAt).toLocaleString('es-AR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                          timeZone: 'America/Argentina/Buenos_Aires',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ) : usdArs.error ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2 px-1 text-xs text-[var(--color-warning)]" role="status">
                  <button className="underline" onClick={usdArs.retry} type="button">
                    Reintentar
                  </button>
                </div>
              ) : usdArs.isLoading ? (
                <span className="px-1 text-xs text-[var(--color-text-muted)]" role="status">
                  Cargando cotización...
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {normalizedQuery
                  ? 'Resultados'
                  : catalogSort === 'popular'
                    ? 'Juegos populares'
                    : 'Lanzamientos recientes'}{' '}
                <span className="font-normal text-[var(--color-text-muted)]">
                  ({normalizedQuery ? filteredSearchResults.length : filteredCatalogResults.length})
                </span>
              </h1>
              {normalizedQuery && (
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Resultados de CheapShark; los metadatos e imágenes vienen del proveedor configurado
                </p>
              )}
            </div>
            <button
              aria-expanded={isMobileFiltersOpen}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-blue-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:hidden"
              ref={filterTriggerRef}
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
                <path d="M3 5h14M5.5 10h9M8 15h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtros activos">
              {selectedGenreFilters.map((genre) => (
                <button
                  aria-label={`Quitar filtro ${genre.label}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  key={`genre-${genre.label}`}
                  type="button"
                  onClick={() => toggleGenreFilters(genre.slugs)}
                >
                  {genre.label}<span aria-hidden="true">×</span>
                </button>
              ))}
              {selectedPlatformFilters.map((platform) => (
                <button
                  aria-label={`Quitar filtro ${platform.label}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  key={`platform-${platform.label}`}
                  type="button"
                  onClick={() => togglePlatformFilters(platform)}
                >
                  {platform.label}<span aria-hidden="true">×</span>
                </button>
              ))}
              {maxPrice < 100 && (
                <button
                  aria-label="Quitar filtro de precio máximo"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  type="button"
                  onClick={() => handleMaxPriceChange(100)}
                >
                  Hasta ${maxPrice} USD<span aria-hidden="true">×</span>
                </button>
              )}
            </div>
          )}

          {normalizedQuery &&
          (searchStatus === 'loading' || searchResultsQuery !== normalizedQuery) ? (
            <div
              className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
              role="status"
              aria-label="Buscando ofertas en CheapShark"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  className="animate-pulse overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                  key={index}
                >
                  <div className="h-40 bg-[var(--color-surface-muted)]" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded bg-[var(--color-surface-muted)]" />
                    <div className="h-3 w-1/2 rounded bg-[var(--color-surface-muted)]" />
                    <div className="h-8 rounded bg-[var(--color-surface-muted)]" />
                  </div>
                </div>
              ))}
              <span className="sr-only">Buscando ofertas en CheapShark...</span>
            </div>
          ) : normalizedQuery && searchStatus === 'error' ? (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
              <button
                className="mt-5 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
                type="button"
                onClick={() => submitSearch(normalizedQuery)}
              >
                Reintentar
              </button>
            </div>
          ) : normalizedQuery ? (
            filteredSearchResults.length > 0 ? (
              <>
                <div className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {visibleSearchResults.map((entry) => (
                    <GameSearchCard
                      game={entry.game}
                      metadata={entry.metadata}
                      metadataStatus={entry.metadataStatus}
                      maxPrice={maxPrice}
                      usdArsRate={usdArs.quote?.rate ?? null}
                      onBeforeNavigateToDetail={preserveExploreStateBeforeNavigation}
                      isAuthenticated={Boolean(user)}
                      isFavorite={activity.favorites.some(
                        (favorite) => favorite.game_id === `cheapshark:${entry.game.id}`,
                      )}
                      onToggleFavorite={activity.toggleFavorite}
                      onCreateAlert={activity.createAlert}
                      onSaveOffer={(offerId, price, url) =>
                        activity.saveOffer({
                          offer_id: offerId,
                          game_title: entry.game.title,
                          game_image: entry.metadata?.image ?? entry.game.image,
                          price_at_save: String(price),
                          url,
                        })
                      }
                      key={`${normalizedQuery}:${entry.game.id}`}
                    />
                  ))}
                </div>
                {visibleSearchResults.length < filteredSearchResults.length && (
                  <div className="mt-5 flex justify-center">
                    <button
                      className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--color-surface-muted)]"
                      type="button"
                      onClick={() =>
                        setSearchVisibleCount((count) =>
                          Math.min(count + SEARCH_PAGE_SIZE, filteredSearchResults.length),
                        )
                      }
                    >
                      Cargar más juegos
                    </button>
                  </div>
                )}
                {searchHydrationProgress.checked < searchHydrationProgress.total && (
                  <p className="py-6 text-center text-sm text-[var(--color-text-muted)]" role="status">
                    Agregando datos del proveedor: {searchHydrationProgress.checked} de {searchHydrationProgress.total}
                  </p>
                )}
              </>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
                <h2 className="text-xl font-semibold">
                  {searchResultsQuery !== normalizedQuery || searchEntries.length === 0
                    ? 'No hay coincidencias'
                    : 'No hay ofertas dentro del precio seleccionado'}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {searchResultsQuery !== normalizedQuery || searchEntries.length === 0
                    ? 'CheapShark no encontró juegos con ofertas para este término. Probá con otra búsqueda.'
                    : 'Probá aumentar el precio máximo para ver las ofertas disponibles.'}
                </p>
              </div>
            )
          ) : catalogStatus === 'loading' && catalogEntries.length === 0 ? (
            <div
              className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
              role="status"
              aria-label="Cargando catálogo de videojuegos"
            >
              {Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => (
                <div
                  className="animate-pulse overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                  key={index}
                >
                  <div className="aspect-video bg-[var(--color-surface-muted)]" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded bg-[var(--color-surface-muted)]" />
                    <div className="h-3 w-1/2 rounded bg-[var(--color-surface-muted)]" />
                    <div className="h-8 rounded bg-[var(--color-surface-muted)]" />
                  </div>
                </div>
              ))}
              <span className="sr-only">Cargando catálogo de videojuegos...</span>
            </div>
          ) : catalogStatus === 'error' && catalogEntries.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
              <p className="text-sm text-rose-400" role="alert">{catalogError}</p>
              <button
                className="mt-5 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
                type="button"
                onClick={() => {
                  requestCatalogPage(catalogRequestCursor)
                }}
              >
                Reintentar
              </button>
            </div>
          ) : filteredCatalogResults.length > 0 ? (
            <>
              <div className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredCatalogResults.map((entry) => {
                  const rawgFavoriteId = `rawg:${entry.metadata.id}`
                  const cheapSharkFavoriteId = entry.game
                    ? `cheapshark:${entry.game.id}`
                    : null
                  const savedFavorite = activity.favorites.find(
                    (favorite) =>
                      favorite.game_id === rawgFavoriteId ||
                      favorite.game_id === cheapSharkFavoriteId,
                  )
                  return (
                    <RawgCatalogCard
                      entry={entry}
                      returnTo={explorePath}
                      maxPrice={maxPrice}
                      usdArsRate={usdArs.quote?.rate ?? null}
                      onBeforeNavigateToDetail={preserveExploreStateBeforeNavigation}
                      isAuthenticated={Boolean(user)}
                      isFavorite={Boolean(savedFavorite)}
                      favoriteGameId={
                        savedFavorite?.game_id ??
                        cheapSharkFavoriteId ??
                        rawgFavoriteId
                      }
                      onToggleFavorite={activity.toggleFavorite}
                      onCreateAlert={activity.createAlert}
                      onSaveOffer={(offerId, price, url, title, image) =>
                        activity.saveOffer({
                          offer_id: offerId,
                          game_title: title,
                          game_image: image,
                          price_at_save: String(price),
                          url,
                        })
                      }
                      key={`${entry.metadataSource ?? 'catalog'}:${entry.metadata.id}`}
                    />
                  )
                })}
              </div>
              {catalogHasMore && (
                <div className="mt-5 flex flex-col items-center gap-3">
                  {catalogStatus === 'error' && (
                    <p className="text-center text-sm text-rose-400" role="alert">
                      {catalogError}
                    </p>
                  )}
                  {isCatalogLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--color-text-muted)]" role="status">
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-r-transparent"
                      />
                      Cargando más juegos...
                    </div>
                  ) : (
                    <button
                      className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--color-surface-muted)]"
                      type="button"
                      onClick={() =>
                        requestCatalogPage(
                          catalogStatus === 'error'
                            ? catalogRequestCursor
                            : catalogCursor,
                        )
                      }
                    >
                      {catalogStatus === 'error' ? 'Reintentar' : 'Cargar más juegos'}
                    </button>
                  )}
                </div>
              )}
              {!catalogHasMore && catalogStatus !== 'error' && (
                <p className="py-5 text-center text-sm text-[var(--color-text-muted)]">
                  Has llegado al final.
                </p>
              )}
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
              <h2 className="text-xl font-semibold">
                {!catalogHasMore
                  ? 'No hay coincidencias'
                  : catalogEntries.length > 0
                  ? 'No hay juegos dentro del precio seleccionado'
                  : selectedConsolePlatformNames.length > 0
                    ? `No hay ofertas disponibles para juegos de ${selectedConsolePlatformNames.join(' o ')} en este momento`
                    : 'No se encontraron juegos con ofertas disponibles para este filtro'}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {!catalogHasMore
                  ? 'No se encontraron juegos con ofertas que coincidan con los filtros seleccionados.'
                  : catalogEntries.length > 0
                  ? 'Probá aumentar el precio máximo para ver más juegos.'
                  : 'Probá con otros filtros para encontrar ofertas confirmadas.'}
              </p>
              {catalogHasMore && (
                <div className="mt-5 flex flex-col items-center gap-3">
                  {catalogStatus === 'error' && (
                    <p className="text-center text-sm text-rose-400" role="alert">
                      {catalogError}
                    </p>
                  )}
                  {isCatalogLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--color-text-muted)]" role="status">
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-r-transparent"
                      />
                      Cargando más juegos...
                    </div>
                  ) : (
                    <button
                      className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--color-surface-muted)]"
                      type="button"
                      onClick={() =>
                        requestCatalogPage(
                          catalogStatus === 'error'
                            ? catalogRequestCursor
                            : catalogCursor,
                        )
                      }
                    >
                      {catalogStatus === 'error' ? 'Reintentar' : 'Cargar más juegos'}
                    </button>
                  )}
                </div>
              )}
              {!catalogHasMore && catalogEntries.length > 0 && catalogStatus !== 'error' && (
                <p className="mt-5 text-center text-sm text-[var(--color-text-muted)]">
                  Has llegado al final.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Explore
