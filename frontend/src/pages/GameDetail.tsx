import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  getGameMetadata,
  getGamePriceComparison,
  type GameMetadata,
  type GamePriceComparison,
} from '../services/gameSearchService'

function GameDetail() {
  const { gameId } = useParams()
  if (!gameId) return <Navigate to="/explorar" replace />
  return <ApiGameDetail gameId={gameId} />
}

type ApiGameDetailProps = {
  gameId: string
}

function ApiGameDetail({ gameId }: ApiGameDetailProps) {
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

        getGameMetadata(comparison.game.title, controller.signal)
          .then((metadata) => {
            setMetadataState({
              key: requestKey,
              metadata,
              error: '',
              loading: false,
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
  const isLoading = currentRequest === null
  const error = currentRequest?.error ?? ''
  const comparison = currentRequest?.comparison ?? null

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
        <Link className="text-sm text-[var(--color-text-muted)] transition hover:text-blue-500" to="/explorar">
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
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <img
                className="h-72 w-full rounded-2xl bg-[var(--color-surface)] object-cover shadow-xl shadow-black/20 sm:h-96"
                src={comparison.game.image}
                alt={`Portada de ${comparison.game.title}`}
              />
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                {comparison.game.title}
              </h1>
              <p className="mt-3 text-[var(--color-text-muted)]">
                Precios y ofertas consultados en CheapShark.
              </p>
              <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
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
              {comparison.cheapest && (
                <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
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
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default GameDetail
