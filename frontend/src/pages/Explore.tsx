import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import GameSearchCard from '../components/GameSearchCard'
import RawgCatalogCard from '../components/RawgCatalogCard'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import { useUserActivity } from '../hooks/useUserActivity'
import { translateGenre } from '../utils/genres'
import {
  getGameMetadataCatalogWithOffers,
  getGameMetadataFilterOptions,
  getGameMetadata,
  searchGames,
  type GameMetadata,
  type GameMetadataFilterOptions,
  type GameMetadataWithOffers,
  type GameSearchResult,
} from '../services/gameSearchService'

type SortOption = 'popular' | 'recent' | 'relevance' | 'price'
type SortDropdownOption = {
  value: SortOption
  label: string
}
type CatalogEntry = {
  metadata: GameMetadata
  result: GameMetadataWithOffers | null
  status: 'checking' | 'available' | 'unavailable'
}
type SearchEntry = {
  game: GameSearchResult
  metadata: GameMetadata | null
  metadataStatus: 'loading' | 'ready' | 'error'
}

const FILTER_PILL_CLASS =
  'inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-center text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-blue-400/60 hover:bg-[var(--color-surface)] peer-checked:border-blue-500 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400'

const UPCOMING_CONSOLES = [
  'PlayStation 5',
  'PlayStation 4',
  'Xbox Series X|S',
  'Xbox One',
  'Nintendo Switch',
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
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
  const { addSearch } = activity
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('search') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [sortBy, setSortBy] = useState<SortOption>(() =>
    getInitialSort(searchParams, Boolean(initialQuery.trim())),
  )
  const [maxPrice, setMaxPrice] = useState(() => getReturnPrice(location.state))
  const [selectedRawgGenres, setSelectedRawgGenres] = useState<string[]>(
    () => searchParams.get('genres')?.split(',').filter(Boolean) ?? [],
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>(
    () => searchParams.get('platforms')?.split(',').map(Number).filter(Number.isSafeInteger) ?? [],
  )
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [searchEntries, setSearchEntries] = useState<SearchEntry[]>([])
  const [searchResultsQuery, setSearchResultsQuery] = useState<string | null>(null)
  const [searchHydrationProgress, setSearchHydrationProgress] = useState({ checked: 0, total: 0 })
  const searchRequestId = useRef(0)
  const searchController = useRef<AbortController | null>(null)
  const lastSavedSearchRef = useRef<string | null>(null)
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([])
  const [catalogCount, setCatalogCount] = useState(0)
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogRetryToken, setCatalogRetryToken] = useState(0)
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [catalogError, setCatalogError] = useState('')
  const [catalogWarning, setCatalogWarning] = useState('')
  const [filterOptions, setFilterOptions] = useState<GameMetadataFilterOptions | null>(null)
  const [filterOptionsError, setFilterOptionsError] = useState('')
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    initialQuery.trim() ? 'loading' : 'idle',
  )
  const [searchError, setSearchError] = useState('')
  const normalizedQuery = query.trim()
  const catalogSort: 'popular' | 'recent' = sortBy === 'recent' ? 'recent' : 'popular'
  const sortOptions = normalizedQuery ? SEARCH_SORT_OPTIONS : CATALOG_SORT_OPTIONS
  const selectedSort = normalizedQuery
    ? sortBy === 'price'
      ? 'price'
      : 'relevance'
    : catalogSort
  const explorePath = `${location.pathname}${location.search}`
  const localizedGenres = useMemo(
    () =>
      (filterOptions?.genres ?? [])
        .map((genre) => ({ ...genre, label: translateGenre(genre.name) }))
        .sort((first, second) => first.label.localeCompare(second.label, 'es')),
    [filterOptions],
  )

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
    const controller = new AbortController()

    const debounceTimeout = window.setTimeout(async () => {
      try {
        const catalog = await getGameMetadataCatalogWithOffers(
          catalogSort,
          catalogPage,
          { genres: selectedRawgGenres, platforms: selectedPlatforms },
          controller.signal,
        )
        const newEntries = catalog.results.map((result) => ({
          metadata: result.metadata,
          result,
          status: 'available' as const,
        }))
        setCatalogEntries((currentEntries) =>
          catalogPage === 1
            ? newEntries
            : [
                ...currentEntries,
                ...newEntries.filter(
                  (entry) =>
                    !currentEntries.some(
                      (currentEntry) => currentEntry.metadata.id === entry.metadata.id,
                    ),
                ),
              ],
        )
        setCatalogCount(catalog.count)
        setCatalogWarning('')
        setCatalogStatus('success')
      } catch (error) {
        if (controller.signal.aborted) return
        setCatalogError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el catálogo de videojuegos.',
        )
        setCatalogStatus('error')
      }
    }, 200)

    return () => {
      window.clearTimeout(debounceTimeout)
      controller.abort()
    }
  }, [catalogPage, catalogRetryToken, catalogSort, normalizedQuery, selectedPlatforms, selectedRawgGenres])

  useEffect(() => {
    const term = normalizedQuery.trim()
    if (!user || term.length < 3) return

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
  }, [activity.searchHistory, addSearch, normalizedQuery, user])

  useEffect(() => {
    if (!normalizedQuery) return

    const controller = new AbortController()
    const requestId = ++searchRequestId.current
    searchController.current = controller

    const debounceTimeout = window.setTimeout(async () => {
      try {
        const games = await searchGames(normalizedQuery, controller.signal)
        if (controller.signal.aborted || searchRequestId.current !== requestId) return

        setSearchEntries(
          games.map((game) => ({
            game,
            metadata: null,
            metadataStatus: 'loading',
          })),
        )
        setSearchResultsQuery(normalizedQuery)
        setSearchHydrationProgress({ checked: 0, total: games.length })
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
        setSearchResultsQuery(normalizedQuery)
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
  }, [normalizedQuery])

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
  const filteredCatalogResults = useMemo(
    () =>
      catalogEntries.filter(
        (entry) =>
          entry.status === 'checking' ||
          (entry.status === 'available' &&
            entry.result !== null &&
            (maxPrice === 100 || entry.result.game.lowestPrice <= maxPrice)),
      ),
    [catalogEntries, maxPrice],
  )

  function clearSearch() {
    searchRequestId.current += 1
    searchController.current?.abort()
    searchController.current = null
    setQuery('')
    setSearchEntries([])
    setSearchResultsQuery(null)
    setSearchHydrationProgress({ checked: 0, total: 0 })
    setSearchError('')
    setSearchStatus('idle')
    setSortBy('popular')
    setCatalogPage(1)
    setCatalogStatus('loading')
    setCatalogError('')
    setCatalogWarning('')
    updateExploreParams({
      search: null,
      sort: null,
      page: null,
    })
  }

  function handleQueryChange(value: string) {
    searchRequestId.current += 1
    searchController.current?.abort()
    searchController.current = null
    setQuery(value)
    setSearchEntries([])
    setSearchResultsQuery(null)
    setSearchHydrationProgress({ checked: 0, total: 0 })
    setSearchError('')
    if (value.trim()) {
      setSortBy('relevance')
      updateExploreParams({ search: value.trim(), sort: null, page: null })
      setSearchStatus('loading')
    } else {
      updateExploreParams({ search: null, sort: null, page: null })
      setSearchStatus('idle')
      setSortBy('popular')
      setCatalogPage(1)
      setCatalogStatus('loading')
      setCatalogError('')
      setCatalogWarning('')
    }
  }

  function toggleRawgFilter<T extends string | number>(
    value: T,
    selectedValues: T[],
    setSelectedValues: (values: T[]) => void,
    param: 'genres' | 'platforms',
  ) {
    if (normalizedQuery) {
      return
    } else {
      setCatalogEntries([])
      setCatalogPage(1)
      setCatalogStatus('loading')
      setCatalogError('')
      setCatalogWarning('')
    }
    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((selectedValue) => selectedValue !== value)
      : [...selectedValues, value]
    setSelectedValues(nextValues)
    updateExploreParams({
      [param]: nextValues.length > 0 ? nextValues.join(',') : null,
      page: null,
    })
  }

  function handleSortChange(value: SortOption) {
    setSortBy(value)
    updateExploreParams({
      sort: value === 'recent' || value === 'price' ? value : null,
      page: null,
    })
    if (!normalizedQuery) {
      setCatalogEntries([])
      setCatalogPage(1)
      setCatalogStatus('loading')
      setCatalogError('')
      setCatalogWarning('')
    }
  }

  function handleMaxPriceChange(value: number) {
    setMaxPrice(value)
  }

  return (
    <main className="theme-transition min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside
          className={`theme-transition ${isFiltersOpen ? 'block' : 'hidden lg:block'} w-full shrink-0 border-b border-[var(--color-border)] px-6 py-8 lg:w-64 lg:border-b-0 lg:border-r`}
        >
          <h2 className="text-lg font-semibold">Filtros</h2>
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">
              Género
            </h3>
            {filterOptionsError ? (
              <p className="text-sm text-rose-500" role="alert">{filterOptionsError}</p>
            ) : filterOptions ? (
              <div className="flex flex-wrap gap-2">
                {localizedGenres.map((genre) => {
                  const isSelected = selectedRawgGenres.includes(genre.slug)
                  return (
                    <label className="cursor-pointer" key={genre.id}>
                      <input
                        checked={isSelected}
                        className="peer sr-only appearance-none"
                        type="checkbox"
                        onChange={() => toggleRawgFilter(
                          genre.slug,
                          selectedRawgGenres,
                          setSelectedRawgGenres,
                          'genres',
                        )}
                      />
                      <span className={FILTER_PILL_CLASS}>{genre.label}</span>
                    </label>
                  )
                })}
              </div>
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
                <div className="flex flex-wrap gap-2">
                {filterOptions.platforms.map((platform) => (
                  <label className="cursor-pointer" key={platform.id}>
                    <input
                      checked={selectedPlatforms.includes(platform.id)}
                      className="peer sr-only appearance-none"
                      type="checkbox"
                      onChange={() => toggleRawgFilter(
                        platform.id,
                        selectedPlatforms,
                        setSelectedPlatforms,
                        'platforms',
                      )}
                    />
                    <span className={FILTER_PILL_CLASS}>{platform.name}</span>
                  </label>
                ))}
                </div>
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">
                    Próximamente
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {UPCOMING_CONSOLES.map((platform) => (
                      <button
                        className={`${FILTER_PILL_CLASS} cursor-not-allowed opacity-50 hover:border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]`}
                        disabled
                        key={platform}
                        type="button"
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>
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
        </aside>

        <section className="min-w-0 flex-1 px-6 py-8 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row">
            <label className="theme-transition flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
              <span className="text-xl text-slate-400" aria-hidden="true">⌕</span>
              <input
                className="w-full bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
                type="search"
                value={query}
                placeholder="Buscar videojuegos..."
                aria-label="Buscar videojuegos"
                onChange={(event) => handleQueryChange(event.target.value)}
              />
              <button
                className="text-xl text-slate-500 transition hover:text-white"
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={clearSearch}
              >
                ×
              </button>
            </label>
            <div className="theme-transition relative z-30 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)] xl:w-64">
              <span>Ordenar por:</span>
              <SortDropdown
                onChange={handleSortChange}
                options={sortOptions}
                value={selectedSort}
              />
            </div>
          </div>

          <div className="mt-7 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {normalizedQuery
                  ? 'Resultados'
                  : catalogSort === 'popular'
                    ? 'Juegos populares'
                    : 'Lanzamientos recientes'}{' '}
                <span className="font-normal text-slate-400">
                  ({normalizedQuery ? filteredSearchResults.length : filteredCatalogResults.length})
                </span>
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {normalizedQuery
                  ? 'Resultados de CheapShark; los metadatos e imágenes vienen del proveedor configurado'
                  : 'Catálogo del proveedor configurado con ofertas verificadas por CheapShark'}
              </p>
            </div>
            {activity.error && (
              <p className="mt-3 text-sm text-red-500" role="alert">
                {activity.error}
              </p>
            )}
            <button
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] lg:hidden"
              type="button"
              onClick={() => setIsFiltersOpen((isOpen) => !isOpen)}
            >
              {isFiltersOpen ? 'Ocultar filtros' : 'Filtros'}
            </button>
          </div>

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
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">No pudimos realizar la búsqueda</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{searchError}</p>
            </div>
          ) : normalizedQuery ? (
            filteredSearchResults.length > 0 ? (
              <>
                <div className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredSearchResults.map((entry) => (
                    <GameSearchCard
                      game={entry.game}
                      metadata={entry.metadata}
                      metadataStatus={entry.metadataStatus}
                      maxPrice={maxPrice}
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
                    ? 'CheapShark no encontró ofertas para esta búsqueda'
                    : 'No hay ofertas dentro del precio seleccionado'}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {searchResultsQuery !== normalizedQuery || searchEntries.length === 0
                    ? 'Probá con otro término o revisá la escritura del título.'
                    : 'Probá aumentar el precio máximo para ver las ofertas disponibles.'}
                </p>
              </div>
            )
          ) : catalogStatus === 'loading' && catalogEntries.length === 0 ? (
            <div
              className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
              role="status"
              aria-label="Buscando juegos con ofertas disponibles"
            >
              {Array.from({ length: 6 }, (_, index) => (
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
              <span className="sr-only">Buscando ofertas en CheapShark...</span>
            </div>
          ) : catalogStatus === 'error' && catalogEntries.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">No pudimos cargar el catálogo</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{catalogError}</p>
              <button
                className="mt-5 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
                type="button"
                onClick={() => {
                  setCatalogEntries([])
                  setCatalogPage(1)
                  updateExploreParams({ page: null })
                  setCatalogError('')
                  setCatalogStatus('loading')
                  setCatalogRetryToken((current) => current + 1)
                }}
              >
                Reintentar
              </button>
            </div>
          ) : filteredCatalogResults.length > 0 ? (
            <>
              {catalogWarning && (
                <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600" role="status">
                  {catalogWarning} Se muestran solo los juegos cuya disponibilidad de ofertas sí pudo confirmarse.
                </p>
              )}
              {catalogStatus === 'error' && (
                <p className="mt-5 text-sm text-rose-500" role="alert">{catalogError}</p>
              )}
              <div className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredCatalogResults.map((entry) => (
                  <RawgCatalogCard
                    metadata={entry.metadata}
                    result={entry.result ?? undefined}
                    isChecking={entry.status === 'checking'}
                    returnTo={explorePath}
                    maxPrice={maxPrice}
                    isAuthenticated={Boolean(user)}
                    isFavorite={activity.favorites.some(
                      (favorite) => favorite.game_id === `rawg:${entry.metadata.id}`,
                    )}
                    onToggleFavorite={activity.toggleFavorite}
                    onCreateAlert={activity.createAlert}
                    key={entry.metadata.id}
                  />
                ))}
              </div>
              {catalogStatus === 'loading' ? (
                <p className="py-6 text-center text-sm text-[var(--color-text-muted)]" role="status">
                  Buscando juegos con ofertas disponibles...
                </p>
              ) : catalogPage * 24 < catalogCount && catalogPage < 1000 ? (
                <button
                  className="mx-auto mt-8 block rounded-lg border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-blue-400 hover:text-blue-500"
                  type="button"
                  onClick={() => {
                    const nextPage = catalogPage + 1
                    setCatalogStatus('loading')
                    setCatalogPage(nextPage)
                  }}
                >
                  Cargar más juegos
                </button>
              ) : null}
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
              <h2 className="text-xl font-semibold">
                {catalogWarning
                  ? 'No pudimos verificar ofertas de CheapShark'
                  : catalogEntries.length > 0
                    ? 'No hay ofertas dentro del precio seleccionado'
                    : 'No se encontraron juegos con ofertas disponibles para este filtro'}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {catalogWarning
                  ? catalogWarning
                  : catalogEntries.length > 0
                    ? 'Probá aumentar el precio máximo para ver las ofertas disponibles.'
                    : 'Probá con otros filtros o cargá más juegos para encontrar títulos con precio en tienda.'}
              </p>
              {catalogWarning ? (
                <button
                  className="mx-auto mt-5 block rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
                  type="button"
                  onClick={() => {
                    setCatalogWarning('')
                    setCatalogStatus('loading')
                    setCatalogRetryToken((current) => current + 1)
                  }}
                >
                  Reintentar
                </button>
              ) : catalogPage * 24 < catalogCount && catalogPage < 1000 ? (
                <button
                  className="mx-auto mt-5 block rounded-lg border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-blue-400 hover:text-blue-500"
                  type="button"
                  onClick={() => {
                    const nextPage = catalogPage + 1
                    setCatalogStatus('loading')
                    setCatalogPage(nextPage)
                  }}
                >
                  Cargar más juegos
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Explore
