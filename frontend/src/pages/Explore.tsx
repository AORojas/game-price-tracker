import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import GameSearchCard from '../components/GameSearchCard'
import RawgCatalogCard from '../components/RawgCatalogCard'
import Navbar from '../components/Navbar'
import {
  getGameMetadataCatalog,
  getGameMetadataFilterOptions,
  getExactGameOffers,
  searchGameMetadata,
  type GameMetadata,
  type GameMetadataFilterOptions,
  type GameMetadataWithOffers,
  type GameSearchResult,
} from '../services/gameSearchService'

type SortOption = 'popular' | 'recent' | 'relevance' | 'price'

function normalizeGameTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getCanonicalSearchTitle(title: string) {
  const normalizedTitle = normalizeGameTitle(title)
  if (normalizedTitle === 'gta v' || normalizedTitle === 'gta 5') {
    return 'Grand Theft Auto V'
  }
  return title
}

async function findCatalogGamesWithOffers(
  games: GameMetadata[],
  signal: AbortSignal,
): Promise<{ gamesWithOffers: GameMetadataWithOffers[]; error: string }> {
  const results: Array<GameMetadataWithOffers | null> = Array.from(
    { length: games.length },
    () => null,
  )
  let providerError = ''
  let nextIndex = 0
  const workerCount = Math.min(4, games.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < games.length) {
        if (signal.aborted || providerError) return
        const index = nextIndex
        nextIndex += 1
        const metadata = games[index]
        try {
          const offers = await getExactGameOffers(metadata.title, signal)
          if (offers) results[index] = { metadata, ...offers }
        } catch (error) {
          if (signal.aborted) return
          providerError =
            error instanceof Error ? error.message : 'No se pudo comprobar el precio del juego.'
        }
      }
    }),
  )

  return {
    gamesWithOffers: results.filter(
      (result): result is GameMetadataWithOffers => result !== null,
    ),
    error: providerError,
  }
}

function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('search') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [sortBy, setSortBy] = useState<SortOption>(initialQuery.trim() ? 'relevance' : 'popular')
  const [maxPrice, setMaxPrice] = useState(100)
  const [selectedRawgGenres, setSelectedRawgGenres] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([])
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<GameSearchResult[]>([])
  const [catalogResults, setCatalogResults] = useState<GameMetadataWithOffers[]>([])
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
    if (normalizedQuery) return
    const controller = new AbortController()

    const debounceTimeout = window.setTimeout(async () => {
      try {
        const catalog = await getGameMetadataCatalog(
          catalogSort,
          catalogPage,
          { genres: selectedRawgGenres, platforms: selectedPlatforms },
          controller.signal,
        )
        const { gamesWithOffers, error } = await findCatalogGamesWithOffers(
          catalog.results,
          controller.signal,
        )
        setCatalogWarning(
          error
            ? `CheapShark no pudo verificar la disponibilidad de todos los juegos. ${error} Solo se muestran juegos con precios confirmados.`
            : '',
        )
        setCatalogResults((currentResults) =>
          catalogPage === 1
            ? gamesWithOffers
            : [
                ...currentResults,
                ...gamesWithOffers.filter(
                  (game) =>
                    !currentResults.some((current) => current.metadata.id === game.metadata.id),
                ),
              ],
        )
        setCatalogCount(catalog.count)
        setCatalogStatus('success')
      } catch (error) {
        if (controller.signal.aborted) return
        setCatalogError(
          error instanceof Error ? error.message : 'No se pudo cargar el catálogo de RAWG.',
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
    if (!normalizedQuery) return

    const controller = new AbortController()

    const debounceTimeout = window.setTimeout(async () => {
      try {
        const canonicalTitle = getCanonicalSearchTitle(normalizedQuery)
        const metadata = await searchGameMetadata(
          canonicalTitle,
          { genres: selectedRawgGenres, platforms: selectedPlatforms },
          controller.signal,
        )
        const exactRawgMatch = metadata.find(
          (game) => normalizeGameTitle(game.title) === normalizeGameTitle(canonicalTitle),
        )
        if (!exactRawgMatch) {
          setSearchResults([])
          setSearchStatus('success')
          return
        }

        const exactOffers = await getExactGameOffers(exactRawgMatch.title, controller.signal)
        setSearchResults(exactOffers ? [exactOffers.game] : [])
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

  const filteredSearchResults = useMemo(() => {
    const results = searchResults.filter((game) => game.lowestPrice <= maxPrice)
    if (sortBy !== 'price') return results
    return [...results].sort((first, second) => first.lowestPrice - second.lowestPrice)
  }, [maxPrice, searchResults, sortBy])

  function clearSearch() {
    setQuery('')
    setSearchResults([])
    setSearchError('')
    setSearchStatus('idle')
    setSortBy('popular')
    setCatalogPage(1)
    setCatalogStatus('loading')
    setCatalogError('')
    setCatalogWarning('')
    setSearchParams({})
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setSearchError('')
    if (value.trim()) {
      setSortBy('relevance')
      setSearchStatus('loading')
    } else {
      setSearchResults([])
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
  ) {
    if (normalizedQuery) {
      setSearchStatus('loading')
      setSearchError('')
    } else {
      setCatalogResults([])
      setCatalogPage(1)
      setCatalogStatus('loading')
      setCatalogError('')
      setCatalogWarning('')
    }
    setSelectedValues(
      selectedValues.includes(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value],
    )
  }

  function handleSortChange(value: SortOption) {
    setSortBy(value)
    if (!normalizedQuery) {
      setCatalogResults([])
      setCatalogPage(1)
      setCatalogStatus('loading')
    }
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
              <div className="max-h-48 space-y-3 overflow-y-auto text-sm text-[var(--color-text-muted)]">
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

          {normalizedQuery && (
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
                onChange={(event) => setMaxPrice(Number(event.target.value))}
              />
              <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>$ 0</span>
                <span>${maxPrice} o menos</span>
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
                value={normalizedQuery ? (sortBy === 'price' ? 'price' : 'relevance') : catalogSort}
                aria-label="Ordenar resultados"
                onChange={(event) => handleSortChange(event.target.value as SortOption)}
              >
                {normalizedQuery ? (
                  <>
                    <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="relevance">Relevancia</option>
                    <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="price">Precio</option>
                  </>
                ) : (
                  <>
                    <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="popular">Más populares</option>
                    <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="recent">Lanzamientos recientes</option>
                  </>
                )}
              </select>
            </label>
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
                  ({normalizedQuery ? filteredSearchResults.length : catalogResults.length})
                </span>
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {normalizedQuery
                  ? 'Juegos con ofertas exactas de CheapShark, identificados por RAWG'
                  : 'Juegos con ofertas por tienda disponibles en CheapShark'}
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
              <p className="text-[var(--color-text-muted)]">Identificando el juego y buscando su precio exacto...</p>
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
                <h2 className="text-xl font-semibold">
                  {searchResults.length > 0
                    ? 'No hay ofertas dentro del precio seleccionado'
                    : 'No encontramos ofertas para el título exacto'}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {searchResults.length > 0
                    ? 'Probá aumentar el precio máximo para ver las ofertas disponibles.'
                    : 'Solo mostramos juegos cuando CheapShark tiene precios por tienda para el título exacto; no incluimos ediciones ni juegos relacionados.'}
                </p>
              </div>
            )
          ) : catalogStatus === 'loading' && catalogResults.length === 0 ? (
            <div className="mt-6 rounded-xl border border-[var(--color-border)] px-6 py-16 text-center" role="status">
              <p className="text-[var(--color-text-muted)]">
                Buscando juegos populares con precios exactos en tiendas...
              </p>
            </div>
          ) : catalogStatus === 'error' && catalogResults.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center" role="alert">
              <h2 className="text-xl font-semibold">No pudimos cargar el catálogo</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{catalogError}</p>
              <button
                className="mt-5 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
                type="button"
                onClick={() => {
                  setCatalogResults([])
                  setCatalogPage(1)
                  setCatalogError('')
                  setCatalogStatus('loading')
                  setCatalogRetryToken((current) => current + 1)
                }}
              >
                Reintentar
              </button>
            </div>
          ) : catalogResults.length > 0 ? (
            <>
              {catalogWarning && (
                <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600" role="status">
                  {catalogWarning} Se muestran solo los juegos cuya disponibilidad de ofertas sí pudo confirmarse.
                </p>
              )}
              {catalogStatus === 'error' && (
                <p className="mt-5 text-sm text-rose-500" role="alert">{catalogError}</p>
              )}
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {catalogResults.map((game) => (
                  <RawgCatalogCard
                    result={game}
                    key={game.metadata.id}
                  />
                ))}
              </div>
              {catalogStatus === 'loading' ? (
                <p className="py-6 text-center text-sm text-[var(--color-text-muted)]" role="status">
                  Cargando más juegos...
                </p>
              ) : catalogResults.length < catalogCount && catalogPage < 1000 ? (
                <button
                  className="mx-auto mt-8 block rounded-lg border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-blue-400 hover:text-blue-500"
                  type="button"
                  onClick={() => {
                    setCatalogStatus('loading')
                    setCatalogPage((currentPage) => currentPage + 1)
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
                  : 'No encontramos juegos con ofertas exactas'}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {catalogWarning
                  ? catalogWarning
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
                    setCatalogStatus('loading')
                    setCatalogPage((currentPage) => currentPage + 1)
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
