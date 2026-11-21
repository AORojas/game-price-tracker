import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PriceHistoryChart from '../components/PriceHistoryChart'
import { useUsdArsRate } from '../hooks/useUsdArsRate'
import { formatAgeRating } from '../utils/formatAgeRating'
import {
  formatArsPrice,
  formatUsdPrice,
} from '../utils/priceFormatting'
import { getRawgImageUrl } from '../utils/rawgImage'
import {
  isGameMetadata,
  getGameMetadata,
  getGameDetails,
  getGameScreenshots,
  getGamePriceComparison,
  getGamePriceHistory,
  type GameMetadata,
  type GamePriceComparison,
  type GamePriceHistoryPoint,
  type GameRawgDetails,
} from '../services/gameSearchService'

type ScreenshotGalleryProps = {
  images: string[]
  gameTitle: string
  loading: boolean
  error: string
}

type PriceSortOption = 'price-asc' | 'price-desc'

const PRICE_SORT_OPTIONS: Array<{ value: PriceSortOption; label: string }> = [
  { value: 'price-asc', label: 'Precio (menor a mayor)' },
  { value: 'price-desc', label: 'Precio (mayor a menor)' },
]

type PriceSortDropdownProps = {
  value: PriceSortOption
  onChange: (value: PriceSortOption) => void
}

function PriceSortDropdown({ value, onChange }: PriceSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedOption =
    PRICE_SORT_OPTIONS.find((option) => option.value === value) ?? PRICE_SORT_OPTIONS[0]

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-controls={isOpen ? 'price-sort-options' : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition hover:border-blue-400/60 focus-visible:ring-2 focus-visible:ring-blue-400"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
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
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-xl"
          id="price-sort-options"
          role="listbox"
          aria-label="Orden de precios"
        >
          {PRICE_SORT_OPTIONS.map((option) => (
            <button
              aria-selected={value === option.value}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                value === option.value
                  ? 'bg-blue-700 text-white'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'
              }`}
              key={option.value}
              role="option"
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ScreenshotGallery({
  images,
  gameTitle,
  loading,
  error,
}: ScreenshotGalleryProps) {
  return (
    <section
      aria-labelledby="screenshots-heading"
      className="theme-dynamic mt-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/75 p-4 backdrop-blur-xl sm:p-5"
    >
      <h2 className="text-base font-bold" id="screenshots-heading">
        <span aria-hidden="true" className="mr-2 text-[var(--theme-primary)]">▧</span>
        Galería de imágenes
      </h2>

      {loading ? (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]" role="status">
          Cargando capturas...
        </p>
      ) : images.length > 0 ? (
        <div
          aria-label={`Capturas de ${gameTitle}`}
          className="game-detail-scrollbar mt-4 flex snap-x snap-mandatory gap-4 overscroll-x-contain overflow-x-auto pb-2"
          role="region"
          tabIndex={0}
        >
          {images.map((image, index) => (
            <figure
              className="w-56 flex-none snap-start overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] transition-colors hover:border-[var(--theme-primary)] sm:w-72"
              key={`${image}-${index}`}
            >
              <div className="aspect-video w-full">
                <img
                  alt={`${gameTitle}, captura ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                  src={image}
                />
              </div>
            </figure>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          {error || 'No hay capturas disponibles para este juego.'}
        </p>
      )}
    </section>
  )
}

function GameDetail() {
  const { gameId } = useParams()
  if (!gameId) return <Navigate to="/explorar" replace />
  return <ApiGameDetail gameId={gameId} />
}

type ApiGameDetailProps = {
  gameId: string
}

function ApiGameDetail({ gameId }: ApiGameDetailProps) {
  const usdArs = useUsdArsRate()
  const location = useLocation()
  const detailNavigationState =
    typeof location.state === 'object' && location.state !== null
      ? location.state
      : null
  const navigationMetadata =
    detailNavigationState && isGameMetadata(detailNavigationState.metadata)
      ? detailNavigationState.metadata
      : null
  const metadataSource =
    detailNavigationState?.metadataSource === 'rawg' ||
    detailNavigationState?.metadataSource === 'steam'
      ? detailNavigationState.metadataSource
      : undefined
  const [retryToken, setRetryToken] = useState(0)
  const [priceSort, setPriceSort] = useState<PriceSortOption>('price-asc')
  const [synopsisModalKey, setSynopsisModalKey] = useState<string | null>(null)
  const synopsisTriggerRef = useRef<HTMLButtonElement>(null)
  const closeSynopsisButtonRef = useRef<HTMLButtonElement>(null)
  const [requestState, setRequestState] = useState<{
    key: string
    comparison: GamePriceComparison | null
    error: string
  } | null>(null)
  const [priceHistoryState, setPriceHistoryState] = useState<{
    key: string
    points: GamePriceHistoryPoint[]
    error: string
    loading: boolean
  } | null>(null)
  const [metadataState, setMetadataState] = useState<{
    key: string
    metadata: GameMetadata | null
    error: string
    loading: boolean
  } | null>(null)
  const [gameDetailsState, setGameDetailsState] = useState<{
    key: string
    details: GameRawgDetails | null
    error: string
    loading: boolean
  } | null>(null)
  const [screenshotsState, setScreenshotsState] = useState<{
    key: string
    images: string[]
    error: string
    loading: boolean
  } | null>(null)
  const requestKey = `${gameId}:${retryToken}`
  const isSynopsisModalOpen = synopsisModalKey === requestKey

  useEffect(() => {
    if (!isSynopsisModalOpen) return

    const previousBodyOverflow = document.body.style.overflow
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSynopsisModalKey(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    closeSynopsisButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousBodyOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElement?.focus()
    }
  }, [isSynopsisModalOpen])

  useEffect(() => {
    const controller = new AbortController()

    getGamePriceComparison(gameId, controller.signal, true)
      .then((comparison) => {
        setRequestState({ key: requestKey, comparison, error: '' })
        setPriceHistoryState({
          key: requestKey,
          points: [],
          error: '',
          loading: true,
        })
        getGamePriceHistory(gameId, controller.signal)
          .then((points) => {
            if (controller.signal.aborted) return
            setPriceHistoryState({
              key: requestKey,
              points,
              error: '',
              loading: false,
            })
          })
          .catch((requestError: unknown) => {
            if (controller.signal.aborted) return
            setPriceHistoryState({
              key: requestKey,
              points: [],
              error: requestError instanceof Error
                ? requestError.message
                : 'No se pudo cargar el historial de precios.',
              loading: false,
            })
          })
        setMetadataState({
          key: requestKey,
          metadata: null,
          error: '',
          loading: true,
        })
        setGameDetailsState({
          key: requestKey,
          details: null,
          error: '',
          loading: true,
        })

        const metadataRequest = navigationMetadata
          ? Promise.resolve(navigationMetadata)
          : getGameMetadata(comparison.game.title, controller.signal)
        metadataRequest
          .then((metadata) => {
            setMetadataState({
              key: requestKey,
              metadata,
              error: '',
              loading: false,
            })
            if (!metadata) {
              setGameDetailsState({
                key: requestKey,
                details: null,
                error: '',
                loading: false,
              })
              setScreenshotsState({
                key: requestKey,
                images: [],
                error: '',
                loading: false,
              })
              return
            }

            setScreenshotsState({
              key: requestKey,
              images: metadata.previewImages,
              error: '',
              loading: true,
            })

            getGameDetails(metadata.id, controller.signal, metadataSource)
              .then((details) => {
                if (controller.signal.aborted) return
                setGameDetailsState({
                  key: requestKey,
                  details,
                  error: '',
                  loading: false,
                })
              })
              .catch((requestError: unknown) => {
                if (controller.signal.aborted) return
                setGameDetailsState({
                  key: requestKey,
                  details: null,
                  error: requestError instanceof Error
                    ? requestError.message
                    : 'No se pudieron cargar los detalles del videojuego.',
                  loading: false,
                })
              })

            getGameScreenshots(metadata.id, controller.signal, metadataSource)
              .then((images) => {
                if (controller.signal.aborted) return
                setScreenshotsState({
                  key: requestKey,
                  images,
                  error: '',
                  loading: false,
                })
              })
              .catch((requestError: unknown) => {
                if (controller.signal.aborted) return
                const fallbackImages = metadata.previewImages
                setScreenshotsState({
                  key: requestKey,
                  images: fallbackImages,
                  error: fallbackImages.length > 0
                    ? ''
                    : requestError instanceof Error
                      ? requestError.message
                      : 'No se pudieron cargar las capturas del videojuego.',
                  loading: false,
                })
              })
          })
          .catch((requestError: unknown) => {
            if (controller.signal.aborted) return
            setMetadataState({
              key: requestKey,
              metadata: null,
              error: requestError instanceof Error
                ? requestError.message
                : 'No se pudo cargar la información adicional.',
              loading: false,
            })
            setGameDetailsState({
              key: requestKey,
              details: null,
              error: 'No se pudieron cargar los detalles del videojuego.',
              loading: false,
            })
            setScreenshotsState({
              key: requestKey,
              images: [],
              error: requestError instanceof Error
                ? requestError.message
                : 'No se pudieron localizar capturas del videojuego.',
              loading: false,
            })
          })
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return
        setRequestState({
          key: requestKey,
          comparison: null,
          error: requestError instanceof Error
            ? requestError.message
            : 'Ocurrió un error inesperado al cargar la ficha.',
        })
      })

    return () => controller.abort()
  }, [gameId, requestKey])

  const currentRequest = requestState?.key === requestKey ? requestState : null
  const currentPriceHistory =
    priceHistoryState?.key === requestKey ? priceHistoryState : null
  const currentMetadata =
    metadataState?.key === requestKey ? metadataState : null
  const currentGameDetails =
    gameDetailsState?.key === requestKey ? gameDetailsState : null
  const ageRating = formatAgeRating(currentGameDetails?.details)
  const currentScreenshots =
    screenshotsState?.key === requestKey ? screenshotsState : null
  const isLoading = currentRequest === null
  const error = currentRequest?.error ?? ''
  const comparison = currentRequest?.comparison ?? null
  const synopsisBackgroundImage =
    currentMetadata?.metadata?.image ?? comparison?.game.image ?? null
  const returnTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnTo' in location.state &&
    typeof location.state.returnTo === 'string' &&
    location.state.returnTo.startsWith('/explorar')
      ? location.state.returnTo
      : '/explorar'
  const returnMaxPrice =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnMaxPrice' in location.state &&
    typeof location.state.returnMaxPrice === 'number' &&
    Number.isFinite(location.state.returnMaxPrice)
      ? location.state.returnMaxPrice
      : null
  const coverImages = new Set(
    [
      currentMetadata?.metadata?.image,
      comparison?.game.image,
    ]
      .filter((image): image is string => Boolean(image))
      .map(normalizeImageUrl),
  )
  const screenshots = [
    ...new Set(
      currentScreenshots?.images.filter(
        (image) => image.trim() && !coverImages.has(normalizeImageUrl(image)),
      ) ?? [],
    ),
  ]
  const sortedOffers =
    comparison?.prices.slice().sort((first, second) =>
      priceSort === 'price-asc'
        ? first.price - second.price
        : second.price - first.price,
    ) ?? []

  function getPriceParts(price: number, currency: string) {
    if (currency === 'USD') {
      return {
        primary: usdArs.quote
          ? formatArsPrice(price * usdArs.quote.rate)
          : formatUsdPrice(price),
        secondary: usdArs.quote ? `(${formatUsdPrice(price)})` : null,
      }
    }
    return {
      primary: new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
      }).format(price),
      secondary: null,
    }
  }

  function renderPrice(
    price: number,
    currency: string,
    primaryClassName: string,
    secondaryClassName: string,
  ) {
    const parts = getPriceParts(price, currency)
    return (
      <>
        <span className={`block whitespace-nowrap ${primaryClassName}`}>
          {parts.primary}
        </span>
        {parts.secondary && (
          <span className={`mt-0.5 block whitespace-nowrap ${secondaryClassName}`}>
            {parts.secondary}
          </span>
        )}
      </>
    )
  }

  return (
    <main className="theme-transition min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-4 pb-14 sm:px-6 lg:px-8">
        <Link
          className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--theme-primary)]"
          to={returnTo}
          state={returnMaxPrice === null ? null : { maxPrice: returnMaxPrice }}
        >
          ← Volver a explorar
        </Link>

        {isLoading ? (
          <div className="py-24 text-center" role="status">
            <p className="text-[var(--color-text-muted)]">Cargando ficha y ofertas...</p>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-2xl py-20 text-center" role="alert">
            <h1 className="text-3xl font-bold">No pudimos cargar el videojuego</h1>
            <p className="mt-3 text-[var(--color-text-muted)]">{error}</p>
            <button
              className="btn-action-blue mt-6 rounded-lg px-5 py-3 font-semibold text-white transition"
              type="button"
              onClick={() => setRetryToken((current) => current + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : comparison ? (
          <div className="mt-5">
            <section className="theme-dynamic relative isolate overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/20">
              <div
                aria-hidden="true"
                className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: `url("${currentMetadata?.metadata?.image ?? comparison.game.image}")`,
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 z-0"
                style={{ backgroundImage: 'var(--detail-card-overlay)' }}
              />

              <div className="relative z-10 grid gap-6 p-4 sm:p-6 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[minmax(190px,240px)_minmax(0,1fr)_minmax(220px,280px)] lg:gap-8 lg:p-8">
                <div className="mx-auto w-full max-w-[240px] md:row-span-2 lg:row-span-1">
                  <img
                    className="aspect-[3/4] w-full rounded-2xl border border-white/15 bg-[var(--color-surface-muted)] object-cover shadow-2xl shadow-black/40"
                    src={
                      getRawgImageUrl(
                        currentMetadata?.metadata?.image ?? comparison.game.image,
                        1280,
                      ) ?? comparison.game.image
                    }
                    alt={`Portada de ${currentMetadata?.metadata?.title ?? comparison.game.title}`}
                  />
                </div>

                <div className="min-w-0 self-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-accent)]/30 bg-[var(--theme-primary)]/15 px-3 py-1 text-xs font-semibold text-[var(--theme-primary)]">
                    <span aria-hidden="true">✦</span>
                    Información del videojuego
                  </span>
                  <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                    {currentMetadata?.metadata?.title ?? comparison.game.title}
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-[var(--color-text-muted)]">
                    <span>{currentGameDetails?.details?.developers[0] ?? 'Desarrollador no disponible'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatReleaseDate(currentMetadata?.metadata?.released ?? null)}</span>
                    {currentMetadata?.metadata?.genres.map((genre) => (
                      <span
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs text-[var(--color-text)]"
                        key={genre}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 font-semibold text-[var(--color-warning)]">
                    {currentMetadata?.metadata?.metacritic !== null &&
                    currentMetadata?.metadata?.metacritic !== undefined
                      ? `⭐ ${currentMetadata.metadata.metacritic}% · Metacritic`
                      : '⭐ Sin puntuación de Metacritic'}
                  </p>

                  <section className="mt-5">
                    <h2 className="text-sm font-semibold text-[var(--color-text)]">Sinopsis</h2>
                    <div className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {currentGameDetails?.loading ? (
                        <p role="status">Cargando descripción...</p>
                      ) : currentGameDetails?.error ? (
                        <p role="status">{currentGameDetails.error}</p>
                      ) : currentGameDetails?.details?.description ? (
                        <>
                          <p className="line-clamp-4 whitespace-pre-line">
                            {currentGameDetails.details.description}
                          </p>
                          {currentGameDetails.details.description.length > 200 && (
                            <button
                              aria-haspopup="dialog"
                              aria-expanded={isSynopsisModalOpen}
                              ref={synopsisTriggerRef}
                              className="mt-2 font-semibold text-[var(--theme-primary)] transition hover:text-[var(--theme-accent)]"
                              type="button"
                              onClick={() => setSynopsisModalKey(requestKey)}
                            >
                              Leer más →
                            </button>
                          )}
                        </>
                      ) : (
                        <p>El proveedor no tiene una descripción disponible para este juego.</p>
                      )}
                    </div>
                  </section>
                </div>

                <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 shadow-xl shadow-black/10 backdrop-blur-xl md:col-span-2 lg:col-span-1">
                  <h2 className="text-base font-bold">ⓘ En resumen</h2>
                  <dl className="mt-5 space-y-5 text-sm">
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Desarrollador</dt>
                      <dd className="mt-1 font-medium">
                        {currentGameDetails?.details?.developers[0] ?? 'No disponible'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Fecha de lanzamiento</dt>
                      <dd className="mt-1 font-medium">
                        {formatReleaseDate(currentMetadata?.metadata?.released ?? null)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Clasificación</dt>
                      <dd className={ageRating ? 'mt-1 font-medium' : 'mt-1 font-medium text-[var(--color-text-muted)]'}>
                        {ageRating ?? 'Sin clasificación'}
                      </dd>
                    </div>
                  </dl>
                </aside>
              </div>
            </section>

            <ScreenshotGallery
              gameTitle={currentMetadata?.metadata?.title ?? comparison.game.title}
              images={screenshots}
              error={currentScreenshots?.error ?? ''}
              loading={!currentMetadata || currentMetadata.loading || Boolean(currentScreenshots?.loading)}
            />

            <section className="pricing-section static-theme mt-8 grid grid-cols-1 items-start gap-6 min-[1025px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-xl shadow-black/10">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--color-text)] sm:text-xl">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-[var(--color-accent)]"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="m20.6 13.4-7.2 7.2a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a.6.6 0 0 1 0 .8Z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                      <circle cx="7.5" cy="8.5" r="1.25" fill="currentColor" />
                    </svg>
                    Comparativa de precios
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] sm:text-sm">
                    <span className="hidden sm:inline">Ordenar por:</span>
                    <PriceSortDropdown value={priceSort} onChange={setPriceSort} />
                  </div>
                </header>

                {usdArs.error && (
                  <p className="px-4 pt-3 text-xs text-[var(--color-warning)]" role="status">
                    La cotización ARS no está disponible; los precios se muestran en USD.
                  </p>
                )}

                {sortedOffers.length > 0 ? (
                  <div className="px-3 py-2 sm:px-4 sm:py-3">
                    <table className="w-full max-w-full border-collapse text-left text-xs sm:table-fixed sm:text-[13px]">
                      <colgroup>
                        <col className="sm:w-[25%]" />
                        <col className="sm:w-[25%]" />
                        <col className="sm:w-[22%]" />
                        <col className="sm:w-[12%]" />
                        <col className="sm:w-[16%]" />
                      </colgroup>
                      <thead className="hidden text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] sm:table-header-group">
                        <tr>
                          <th className="px-1 py-3">Tienda</th>
                          <th className="px-1 py-3">Precio actual</th>
                          <th className="px-1 py-3">Precio regular</th>
                          <th className="px-1 py-3">Descuento</th>
                          <th className="px-1 py-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="block sm:table-row-group">
                        {sortedOffers.map((offer) => (
                          <tr
                            className="mb-3 grid min-w-0 grid-cols-2 items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--color-border)] px-3 py-3 transition-colors hover:bg-[var(--color-surface-muted)] sm:mb-0 sm:table-row sm:border-x-0 sm:border-t-0 sm:px-0 sm:py-0"
                            key={offer.dealId}
                          >
                            <td className="col-span-2 min-w-0 px-1 py-1 sm:table-cell sm:px-1 sm:py-4">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="relative grid h-9 w-10 flex-none place-items-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-sm font-bold text-[var(--color-text-muted)]">
                                  <span aria-hidden="true">{offer.store.slice(0, 1).toUpperCase()}</span>
                                  {offer.storeLogo && (
                                    <img
                                      alt=""
                                      className="absolute inset-0 h-full w-full bg-[var(--color-surface-muted)] object-contain p-1"
                                      src={offer.storeLogo}
                                      onError={(event) => {
                                        event.currentTarget.hidden = true
                                      }}
                                    />
                                  )}
                                </span>
                                <span className="whitespace-nowrap font-semibold text-[var(--color-text)]">{offer.store}</span>
                              </div>
                            </td>
                            <td className="min-w-0 px-1 py-1 sm:px-1 sm:py-4">
                              <span className="mb-1 block text-[10px] text-[var(--color-text-muted)] sm:hidden">Precio actual</span>
                              <span className="block min-w-0 leading-tight">
                                {renderPrice(
                                  offer.price,
                                  offer.currency,
                                  'text-base font-bold text-[var(--color-price-positive)]',
                                  'text-xs text-[var(--color-text-muted)]',
                                )}
                              </span>
                            </td>
                            <td className="hidden min-w-0 px-1 py-4 text-[var(--color-text-muted)] sm:table-cell">
                              {offer.regularPrice !== null && offer.regularPrice > offer.price
                                ? (
                                  <span className="block min-w-0 leading-tight line-through">
                                    {renderPrice(
                                      offer.regularPrice,
                                      offer.currency,
                                      'text-base text-[var(--color-text-muted)]',
                                      'text-xs text-[var(--color-text-muted)]',
                                    )}
                                  </span>
                                )
                                : '—'}
                            </td>
                            <td className="min-w-0 px-1 py-1 sm:px-1 sm:py-4">
                              {offer.discount !== null && offer.discount > 0 ? (
                                <span className="inline-flex max-w-full rounded-md bg-emerald-400 px-1.5 py-1 text-[10px] font-bold text-slate-950 sm:px-2 sm:text-xs">
                                  -{offer.discount.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-[var(--color-text-muted)]">—</span>
                              )}
                            </td>
                            <td className="col-span-2 min-w-0 px-1 py-1 sm:table-cell sm:px-1 sm:py-4 sm:text-right">
                              <a
                                className="inline-flex w-full min-w-0 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:ml-auto sm:max-w-[132px]"
                                href={`https://www.cheapshark.com/redirect?dealID=${offer.dealId}`}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                Ver oferta
                                <svg
                                  aria-hidden="true"
                                  className="h-4 w-4 flex-none"
                                  fill="none"
                                  viewBox="0 0 16 16"
                                >
                                  <path
                                    d="M5 11 11 5M5.5 5H11v5.5"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                  />
                                </svg>
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
                    No hay ofertas disponibles en este momento
                  </p>
                )}
              </div>
              <PriceHistoryChart
                points={currentPriceHistory?.points ?? []}
                currentPrice={comparison.cheapest?.price ?? null}
                currency={comparison.prices[0]?.currency ?? 'USD'}
                loading={currentPriceHistory === null || currentPriceHistory.loading}
                error={currentPriceHistory?.error ?? ''}
              />
            </section>
          </div>
        ) : null}
      </div>
      {isSynopsisModalOpen &&
        comparison &&
        currentGameDetails?.details?.description && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) setSynopsisModalKey(null)
            }}
          >
            <section
              aria-describedby="game-synopsis-content"
              aria-labelledby="game-synopsis-title"
              aria-modal="true"
              className="relative max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl shadow-black/50"
              role="dialog"
            >
              {synopsisBackgroundImage && (
                <img
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-lg"
                  src={synopsisBackgroundImage}
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-slate-950/85"
              />
              <button
                aria-label="Cerrar sinopsis"
                className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-slate-950/60 text-2xl text-white transition hover:bg-white/15"
                onClick={() => setSynopsisModalKey(null)}
                ref={closeSynopsisButtonRef}
                type="button"
              >
                ×
              </button>
              <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain p-6 pt-16 sm:p-8 sm:pt-16">
                <h2 className="text-xl font-bold text-white sm:text-2xl" id="game-synopsis-title">
                  Sinopsis de {currentMetadata?.metadata?.title ?? comparison.game.title}
                </h2>
                <p
                  className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-100 sm:text-base"
                  id="game-synopsis-content"
                >
                  {currentGameDetails.details.description}
                </p>
              </div>
            </section>
          </div>
        )}
    </main>
  )
}

function normalizeImageUrl(image: string) {
  try {
    const url = new URL(image)
    url.pathname = url.pathname.replace(
      /\/media\/(?:resize\/[^/]+\/[^/]+\/)?/,
      '/media/',
    )
    url.search = ''
    return url.toString()
  } catch {
    return image
  }
}

function formatReleaseDate(releaseDate: string | null) {
  if (!releaseDate) return 'Sin fecha'

  const date = new Date(`${releaseDate.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return releaseDate

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export default GameDetail