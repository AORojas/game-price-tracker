import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getRawgImageUrl } from '../utils/rawgImage'
import {
  getGameMetadata,
  getGameDetails,
  getGameScreenshots,
  getGamePriceComparison,
  type GameMetadata,
  type GamePriceComparison,
  type GameRawgDetails,
} from '../services/gameSearchService'

type ScreenshotGalleryProps = {
  images: string[]
  gameTitle: string
  loading: boolean
  error: string
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
  const location = useLocation()
  const [retryToken, setRetryToken] = useState(0)
  const [synopsisModalKey, setSynopsisModalKey] = useState<string | null>(null)
  const synopsisTriggerRef = useRef<HTMLButtonElement>(null)
  const closeSynopsisButtonRef = useRef<HTMLButtonElement>(null)
  const [requestState, setRequestState] = useState<{
    key: string
    comparison: GamePriceComparison | null
    error: string
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

    getGamePriceComparison(gameId, controller.signal)
      .then((comparison) => {
        setRequestState({ key: requestKey, comparison, error: '' })
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

        getGameMetadata(comparison.game.title, controller.signal)
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

            getGameDetails(metadata.id, controller.signal)
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

            getGameScreenshots(metadata.id, controller.signal)
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
  const currentMetadata =
    metadataState?.key === requestKey ? metadataState : null
  const currentGameDetails =
    gameDetailsState?.key === requestKey ? gameDetailsState : null
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

  function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(price)
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
            <section className="theme-dynamic relative isolate overflow-hidden rounded-3xl border border-[var(--color-border)] bg-slate-950 shadow-2xl shadow-black/20">
              <div
                aria-hidden="true"
                className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: `url("${currentMetadata?.metadata?.image ?? comparison.game.image}")`,
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(7,19,35,0.96)_0%,rgba(7,19,35,0.82)_55%,rgba(7,19,35,0.9)_100%)]"
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

                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-300">
                    <span>{currentGameDetails?.details?.developers[0] ?? 'Desarrollador no disponible'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatReleaseDate(currentMetadata?.metadata?.released ?? null)}</span>
                    {currentMetadata?.metadata?.genres.map((genre) => (
                      <span
                        className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
                        key={genre}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 font-semibold text-amber-300">
                    {currentMetadata?.metadata?.metacritic !== null &&
                    currentMetadata?.metadata?.metacritic !== undefined
                      ? `⭐ ${currentMetadata.metadata.metacritic}% · Metacritic`
                      : '⭐ Sin puntuación de Metacritic'}
                  </p>

                  <section className="mt-5">
                    <h2 className="text-sm font-semibold text-white">Sinopsis</h2>
                    <div className="mt-2 text-sm leading-relaxed text-slate-300">
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

                <aside className="rounded-2xl border border-white/15 bg-slate-950/45 p-5 shadow-xl shadow-black/10 backdrop-blur-xl md:col-span-2 lg:col-span-1">
                  <h2 className="text-base font-bold">ⓘ En resumen</h2>
                  <dl className="mt-5 space-y-5 text-sm">
                    <div>
                      <dt className="text-slate-400">Desarrollador</dt>
                      <dd className="mt-1 font-medium">
                        {currentGameDetails?.details?.developers[0] ?? 'No disponible'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Fecha de lanzamiento</dt>
                      <dd className="mt-1 font-medium">
                        {formatReleaseDate(currentMetadata?.metadata?.released ?? null)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Clasificación</dt>
                      <dd className="mt-1 font-medium">
                        {currentGameDetails?.details?.esrbRating ?? 'Sin clasificación'}
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

            <section className="pricing-section static-theme mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(250px,0.8fr)]">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">Comparativa de precios</h2>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Ofertas consultadas en CheapShark
                  </span>
                </div>
                {comparison.prices.length > 0 ? (
                  <ul className="mt-5 divide-y divide-[var(--color-border)]">
                    {comparison.prices.map((offer) => (
                      <li
                        className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                        key={offer.dealId}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{offer.store}</p>
                          {offer.discount !== null && offer.discount > 0 && (
                            <span className="discount-badge mt-2 inline-flex rounded-md px-2 py-1 text-xs font-bold">
                              -{offer.discount.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          {offer.regularPrice !== null && offer.regularPrice > offer.price && (
                            <p className="text-sm text-[var(--color-text-muted)] line-through">
                              {formatPrice(offer.regularPrice, offer.currency)}
                            </p>
                          )}
                          <p className="text-lg font-bold">
                            {formatPrice(offer.price, offer.currency)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-[var(--color-text-muted)]">
                    No hay ofertas disponibles para este videojuego.
                  </p>
                )}
              </div>

              <aside className="flex flex-col justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 sm:p-6">
                <p className="text-sm text-[var(--color-text-muted)]">Mejor oferta actual</p>
                {comparison.cheapest ? (
                  <>
                    <p className="mt-2 text-3xl font-extrabold text-[var(--discount-green)]">
                      {formatPrice(
                        comparison.cheapest.price,
                        comparison.prices[0]?.currency ?? 'USD',
                      )}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                      en {comparison.cheapest.store}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Todavía no hay una oferta disponible.
                  </p>
                )}
              </aside>
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