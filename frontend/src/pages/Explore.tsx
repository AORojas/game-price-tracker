import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import GameCard, { type Game } from '../components/GameCard'
import GameSearchCard from '../components/GameSearchCard'
import { games } from '../data/games'
import Navbar from '../components/Navbar'
import {
  getGameMetadataFilterOptions,
  searchGameMetadata,
  searchGames,
  type GameMetadataFilterOptions,
  type GameSearchResult,
} from '../services/gameSearchService'

type SortOption = 'relevance' | 'price' | 'discount'

const stores = ['Steam', 'Epic Games', 'GOG', 'Microsoft Store', 'PlayStation Store', 'Xbox Store', 'EA App']
const categories = ['Acción', 'Aventura', 'RPG', 'Deportes', 'Estrategia']

function normalizeGameTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getDiscount(game: Game) {
  if (game.originalPrice === 0) return 0
  return Math.round((1 - game.price / game.originalPrice) * 100)
}

function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('search') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [maxPrice, setMaxPrice] = useState(100)
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedRawgGenres, setSelectedRawgGenres] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([])
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<GameSearchResult[]>([])
  const [filterOptions, setFilterOptions] = useState<GameMetadataFilterOptions | null>(null)
  const [filterOptionsError, setFilterOptionsError] = useState('')
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    initialQuery.trim() ? 'loading' : 'idle',
  )
  const [searchError, setSearchError] = useState('')
  const normalizedQuery = query.trim()

  useEffect(() => {
    const controller = new AbortController()

    getGameMetadataFilterOptions(controller.signal)
      .then(setFilterOptions)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setFilterOptionsError(
          error instanceof Error ? error.message : 'No se pudieron cargar los filtros de RAWG.',
        )
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!normalizedQuery) return

    const controller = new AbortController()

    const debounceTimeout = window.setTimeout(async () => {
      try {
        const [results, metadata] = await Promise.all([
          searchGames(normalizedQuery, controller.signal),
          selectedRawgGenres.length > 0 || selectedPlatforms.length > 0
            ? searchGameMetadata(
                normalizedQuery,
                { genres: selectedRawgGenres, platforms: selectedPlatforms },
                controller.signal,
              )
            : Promise.resolve(null),
        ])
        const matchingTitles = metadata
          ? new Set(metadata.map((game) => normalizeGameTitle(game.title)))
          : null
        const filteredResults = matchingTitles
          ? results.filter((game) => matchingTitles.has(normalizeGameTitle(game.title)))
          : results

        setSearchResults(filteredResults)
        setSearchStatus('success')
      } catch (error) {
        if (controller.signal.aborted) return
        setSearchError(
          error instanceof Error ? error.message : 'Ocurrió un error inesperado en la búsqueda.',
        )
        setSearchStatus('error')
      }
    }, 350)

    return () => {
      window.clearTimeout(debounceTimeout)
      controller.abort()
    }
  }, [normalizedQuery, selectedPlatforms, selectedRawgGenres])

  const filteredGames = useMemo(() => {
    const results = games.filter((game) => {
      const matchesStore =
        selectedStores.length === 0 || selectedStores.includes(game.store)
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(game.category)

      return matchesStore && matchesCategory && game.price <= maxPrice
    })

    return [...results].sort((first, second) => {
      if (sortBy === 'price') return first.price - second.price
      if (sortBy === 'discount') return getDiscount(second) - getDiscount(first)
      return games.indexOf(first) - games.indexOf(second)
    })
  }, [maxPrice, selectedCategories, selectedStores, sortBy])

  const filteredSearchResults = useMemo(() => {
    const results = searchResults.filter((game) => game.lowestPrice <= maxPrice)
    if (sortBy !== 'price') return results
    return [...results].sort((first, second) => first.lowestPrice - second.lowestPrice)
  }, [maxPrice, searchResults, sortBy])

  function toggleSelection(
    value: string,
    selectedValues: string[],
    setSelectedValues: (values: string[]) => void,
  ) {
    setSelectedValues(
      selectedValues.includes(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value],
    )
  }

  function clearSearch() {
    setQuery('')
    setSearchResults([])
    setSelectedRawgGenres([])
    setSelectedPlatforms([])
    setSearchError('')
    setSearchStatus('idle')
    setSearchParams({})
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setSearchError('')
    if (value.trim()) {
      setSearchStatus('loading')
    } else {
      setSearchResults([])
      setSearchStatus('idle')
    }
  }

  function toggleRawgFilter<T extends string | number>(
    value: T,
    selectedValues: T[],
    setSelectedValues: (values: T[]) => void,
  ) {
    setSearchStatus('loading')
    setSearchError('')
    setSelectedValues(
      selectedValues.includes(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value],
    )
  }

  return (
    <main className="theme-transition min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside
          className={`theme-transition ${isFiltersOpen ? 'block' : 'hidden lg:block'} w-full shrink-0 border-b border-[var(--color-border)] px-6 py-8 lg:w-64 lg:border-b-0 lg:border-r`}
        >
          <h2 className="text-lg font-semibold">Filtros</h2>
          {normalizedQuery ? (
            <>
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">
                  Género (RAWG)
                </h3>
                {filterOptionsError ? (
                  <p className="text-sm text-rose-500" role="alert">{filterOptionsError}</p>
                ) : filterOptions ? (
                  <div className="max-h-48 space-y-3 overflow-y-auto text-sm text-[var(--color-text-muted)]">
                    {filterOptions.genres.map((genre) => (
                      <label className="flex items-center gap-3" key={genre.id}>
                        <input
                          checked={selectedRawgGenres.includes(genre.slug)}
                          className="h-4 w-4 accent-blue-500"
                          type="checkbox"
                          onChange={() => toggleRawgFilter(
                            genre.slug,
                            selectedRawgGenres,
                            setSelectedRawgGenres,
                          )}
                        />
                        {genre.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)]" role="status">
                    Cargando géneros...
                  </p>
                )}
              </div>

              <div className="mt-8 border-t border-[var(--color-border)] pt-5">
                <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">
                  Plataforma (RAWG)
                </h3>
                {filterOptions && (
                  <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
                    {filterOptions.platforms.map((platform) => (
                      <label className="flex items-center gap-3" key={platform.id}>
                        <input
                          checked={selectedPlatforms.includes(platform.id)}
                          className="h-4 w-4 accent-blue-500"
                          type="checkbox"
                          onChange={() => toggleRawgFilter(
                            platform.id,
                            selectedPlatforms,
                            setSelectedPlatforms,
                          )}
                        />
                        {platform.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">Tiendas</h3>
              <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
                {stores.map((store) => (
                  <label className="flex items-center gap-3" key={store}>
                    <input
                      checked={selectedStores.includes(store)}
                      className="h-4 w-4 accent-blue-500"
                      type="checkbox"
                      onChange={() => toggleSelection(store, selectedStores, setSelectedStores)}
                    />
                    {store}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-[var(--color-border)] pt-5">
            <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">Precio máximo</h3>
            <input
              className="w-full accent-blue-500"
              type="range"
              min="0"
              max="100"
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
            />
            <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
              <span>$ 0</span>
              <span>${maxPrice} o menos</span>
            </div>
          </div>

          {!normalizedQuery && (
            <div className="mt-8 border-t border-[var(--color-border)] pt-5">
              <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">Categoría</h3>
              <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
                {categories.map((category) => (
                  <label className="flex items-center gap-3" key={category}>
                    <input
                      checked={selectedCategories.includes(category)}
                      className="h-4 w-4 accent-blue-500"
                      type="checkbox"
                      onChange={() => toggleSelection(category, selectedCategories, setSelectedCategories)}
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>
          )}
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
            <label className="theme-transition flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)] xl:w-64">
              Ordenar por:
              <select
                className="theme-transition min-w-0 flex-1 bg-transparent text-[var(--color-text)] outline-none"
                value={normalizedQuery && sortBy === 'discount' ? 'relevance' : sortBy}
                aria-label="Ordenar resultados"
                onChange={(event) => setSortBy(event.target.value as SortOption)}
              >
                <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="relevance">Relevancia</option>
                <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="price">Precio</option>
                {!normalizedQuery && <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="discount">Descuento</option>}
              </select>
            </label>
          </div>

          <div className="mt-7 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Resultados <span className="font-normal text-slate-400">({normalizedQuery ? filteredSearchResults.length : filteredGames.length})</span>
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {normalizedQuery ? 'Juegos de CheapShark filtrados por metadatos de RAWG' : 'Ofertas destacadas para tu búsqueda'}
              </p>
            </div>
            <button
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] lg:hidden"
              type="button"
              onClick={() => setIsFiltersOpen((isOpen) => !isOpen)}
            >
              {isFiltersOpen ? 'Ocultar filtros' : 'Filtros'}
            </button>
          </div>

          {normalizedQuery && searchStatus === 'loading' ? (
            <div className="mt-6 rounded-xl border border-[var(--color-border)] px-6 py-16 text-center" role="status">
              <p className="text-[var(--color-text-muted)]">Buscando videojuegos...</p>
            </div>
          ) : normalizedQuery && searchStatus === 'error' ? (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">No pudimos realizar la búsqueda</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{searchError}</p>
            </div>
          ) : normalizedQuery ? (
            filteredSearchResults.length > 0 ? (
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredSearchResults.map((game) => <GameSearchCard game={game} key={game.id} />)}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
                <h2 className="text-xl font-semibold">No encontramos videojuegos</h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">Probá con otro término.</p>
              </div>
            )
          ) : filteredGames.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredGames.map((game) => <GameCard game={game} key={game.title} />)}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
              <h2 className="text-xl font-semibold">No encontramos videojuegos</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Probá con otro término o ajustá los filtros.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Explore
