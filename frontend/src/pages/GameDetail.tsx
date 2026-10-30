import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getRawgImageUrl } from '../utils/rawgImage'
import {
  getGameMetadata,
  getGameDescription,
  getGameScreenshots,
  getGamePriceComparison,
  type GameMetadata,
  type GamePriceComparison,
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
      className="mt-2"
    >
      <h2 className="text-sm font-semibold" id="screenshots-heading">
        Galería de imágenes
      </h2>

      {loading ? (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]" role="status">
          Cargando capturas...
        </p>
      ) : images.length > 0 ? (
        <div
          aria-label={`Capturas de ${gameTitle}`}
          className="game-detail-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overscroll-x-contain overflow-x-auto pb-2"
          role="region"
          tabIndex={0}
        >
          {images.map((image, index) => (
            <figure
              className="w-40 flex-none snap-start overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] sm:w-48"
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
  const [descriptionState, setDescriptionState] = useState<{
    key: string
    description: string
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
        setDescriptionState({
          key: requestKey,
          description: '',
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
              setDescriptionState({
                key: requestKey,
                description: '',
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

            getGameDescription(metadata.id, controller.signal)
              .then((description) => {
                if (controller.signal.aborted) return
                setDescriptionState({
                  key: requestKey,
                  description,
                  error: '',
                  loading: false,
                })
              })
              .catch((requestError: unknown) => {
                if (controller.signal.aborted) return
                setDescriptionState({
                  key: requestKey,
                  description: '',
                  error: requestError instanceof Error
                    ? requestError.message
                    : 'No se pudo cargar la descripción desde RAWG.',
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
                      : 'No se pudieron cargar las capturas desde RAWG.',
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
            setDescriptionState({
              key: requestKey,
              description: '',
              error: 'No se pudo cargar la descripción desde RAWG.',
              loading: false,
            })
            setScreenshotsState({
              key: requestKey,
              images: [],
              error: requestError instanceof Error
                ? requestError.message
                : 'No se pudieron localizar capturas en RAWG.',
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
  const currentDescription =
    descriptionState?.key === requestKey ? descriptionState : null
  const currentScreenshots =
    screenshotsState?.key === requestKey ? screenshotsState : null
  const isLoading = currentRequest === null
  const error = currentRequest?.error ?? ''
  const comparison = currentRequest?.comparison ?? null
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
      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-12">
        <Link
          className="text-sm text-[var(--color-text-muted)] transition hover:text-blue-500"
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
              className="mt-6 rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400"
              type="button"
              onClick={() => setRetryToken((current) => current + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : comparison ? (
          <div className="mt-6 space-y-6">
            <article className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl shadow-black/10 sm:p-6">
              
              {/* ========================================================
                  INICIO DE LA DIVISIÓN (IZQUIERDA: PORTADA, DERECHA: TEXTO)
                  ======================================================== */}
              <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(240px,0.4fr)_minmax(0,0.6fr)] lg:gap-5">
                
                {/* BLOQUE IZQUIERDO: PORTADA */}
                <div className="w-full">
                  <img
                    className="aspect-[3/4] w-full rounded-xl bg-[var(--color-surface-muted)] object-cover object-center shadow-lg shadow-black/20 lg:aspect-auto lg:h-full"
                    src={
                      getRawgImageUrl(
                        currentMetadata?.metadata?.image ?? comparison.game.image,
                        1280,
                      ) ?? comparison.game.image
                    }
                    alt={`Portada de ${comparison.game.title}`}
                  />
                </div>

                {/* BLOQUE DERECHO: DESCRIPCIÓN E INFO */}
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {comparison.game.title}
                  </h1>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Precios y ofertas consultados en CheapShark.
                  </p>
                  
                  <section className="mt-5 border-t border-[var(--color-border)] pt-5">
                    <h2 className="text-lg font-semibold">Descripción</h2>
                    <div className="game-detail-scrollbar mt-3 max-h-64 overscroll-y-contain overflow-y-auto pr-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {currentDescription?.loading ? (
                        <p role="status">Cargando descripción desde RAWG...</p>
                      ) : currentDescription?.error ? (
                        <p role="status">{currentDescription.error}</p>
                      ) : currentDescription?.description ? (
                        <p className="whitespace-pre-line">
                          {currentDescription.description}
                        </p>
                      ) : (
                        <p>RAWG no tiene una descripción disponible para este juego.</p>
                      )}
                    </div>
                  </section>

                  <ScreenshotGallery
                    gameTitle={comparison.game.title}
                    images={screenshots}
                    error={currentScreenshots?.error ?? ''}
                    loading={!currentMetadata || currentMetadata.loading || Boolean(currentScreenshots?.loading)}
                  />

                  <section className="mt-5 border-t border-[var(--color-border)] pt-5">
                    <h2 className="text-lg font-semibold">Información del juego</h2>
                    {currentMetadata?.loading ? (
                      <p className="mt-3 text-sm text-[var(--color-text-muted)]" role="status">
                        Buscando datos adicionales...
                      </p>
                    ) : currentMetadata?.error ? (
                      <p className="mt-3 text-sm text-[var(--color-text-muted)]" role="status">
                        {currentMetadata.error}
                      </p>
                    ) : currentMetadata?.metadata ? (
                      <>
                        <div className="mt-4 space-y-3 text-sm">
                          {currentMetadata.metadata.released && (
                            <p>
                              <span className="text-[var(--color-text-muted)]">Lanzamiento: </span>
                              {currentMetadata.metadata.released}
                            </p>
                          )}
                          {currentMetadata.metadata.rating > 0 && (
                            <p>
                              <span className="text-[var(--color-text-muted)]">Valoración RAWG: </span>
                              {currentMetadata.metadata.rating.toFixed(1)} / 5
                            </p>
                          )}
                          {currentMetadata.metadata.metacritic !== null && (
                            <p>
                              <span className="text-[var(--color-text-muted)]">Metacritic: </span>
                              {currentMetadata.metadata.metacritic} / 100
                            </p>
                          )}
                          {currentMetadata.metadata.genres.length > 0 && (
                            <p>
                              <span className="text-[var(--color-text-muted)]">Géneros: </span>
                              {currentMetadata.metadata.genres.join(', ')}
                            </p>
                          )}
                          {currentMetadata.metadata.platforms.length > 0 && (
                            <p>
                              <span className="text-[var(--color-text-muted)]">Plataformas: </span>
                              {currentMetadata.metadata.platforms.join(', ')}
                            </p>
                          )}
                        </div>
                        <p className="mt-4 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                          Datos de juego proporcionados por{' '}
                          <a
                            className="text-blue-500 underline underline-offset-2 hover:text-blue-400"
                            href="https://rawg.io"
                            rel="noreferrer"
                            target="_blank"
                          >
                            RAWG
                          </a>
                          .
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                        No encontramos una coincidencia exacta en RAWG.
                      </p>
                    )}
                  </section>
                </div>
              </div>
              {/* ========================================================
                  FIN DE LA DIVISIÓN
                  ======================================================== */}

            </article>

            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
              <h2 className="text-xl font-semibold">Comparación de tiendas</h2>
              {comparison.prices.length > 0 ? (
                <ul className="mt-5 divide-y divide-[var(--color-border)]">
                  {comparison.prices.map((offer) => (
                    <li
                      className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                      key={offer.dealId}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{offer.store}</p>
                        {offer.discount !== null && offer.discount > 0 && (
                          <p className="mt-1 text-sm font-medium text-emerald-500">
                            {offer.discount.toFixed(0)}% de descuento
                          </p>
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
            </section>
            
            {comparison.cheapest && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                <p className="text-sm text-[var(--color-text-muted)]">Mejor oferta actual</p>
                <p className="mt-1 text-2xl font-bold text-emerald-500">
                  {formatPrice(
                    comparison.cheapest.price,
                    comparison.prices[0]?.currency ?? 'USD',
                  )}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  en {comparison.cheapest.store}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </section>
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

export default GameDetail