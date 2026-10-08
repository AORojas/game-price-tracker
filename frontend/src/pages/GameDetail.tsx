import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { games } from '../data/games'
import {
  getGamePriceComparison,
  type GamePriceComparison,
} from '../services/gameSearchService'

function formatPrice(price: number) {
  return price === 0 ? 'Gratis' : `$${price.toFixed(2)}`
}

function getDiscount(price: number, originalPrice: number) {
  if (originalPrice === 0) return 0
  return Math.round((1 - price / originalPrice) * 100)
}

function GameDetail() {
  const { gameId, gameTitle } = useParams()

  if (gameId) return <ApiGameDetail gameId={gameId} />

  const game = games.find((item) => item.title === decodeURIComponent(gameTitle ?? ''))

  if (!game) {
    return (
      <main className="theme-transition min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Navbar />
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold">Videojuego no encontrado</h1>
          <p className="mt-3 text-[var(--color-text-muted)]">
            No pudimos encontrar la ficha solicitada.
          </p>
          <Link className="mt-8 inline-block rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400" to="/explorar">
            Volver a explorar
          </Link>
        </section>
      </main>
    )
  }

  const discount = getDiscount(game.price, game.originalPrice)

  return (
    <main className="theme-transition min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-12">
        <Link className="text-sm text-[var(--color-text-muted)] transition hover:text-blue-500" to="/explorar">
          ← Volver a explorar
        </Link>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <img
            className="h-72 w-full rounded-2xl object-cover shadow-xl shadow-black/20 sm:h-96"
            src={game.image}
            alt={`Portada de ${game.title}`}
          />
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-500">{game.category}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{game.title}</h1>
            <p className="mt-4 text-[var(--color-text-muted)]">Disponible en {game.store}</p>
            <p className="mt-6 max-w-2xl leading-7 text-[var(--color-text-muted)]">{game.description}</p>
            <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <p className="text-sm text-[var(--color-text-muted)]">Mejor precio encontrado</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <span className="text-4xl font-bold">{formatPrice(game.price)}</span>
                {game.originalPrice > 0 && (
                  <span className="pb-1 text-lg text-[var(--color-text-muted)] line-through">
                    {formatPrice(game.originalPrice)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="mb-1 rounded-full bg-emerald-400 px-3 py-1 text-sm font-bold text-emerald-950">
                    -{discount}%
                  </span>
                )}
              </div>
              <button className="mt-6 w-full rounded-lg bg-blue-500 py-3 font-semibold text-white transition hover:bg-blue-400" type="button">
                Ver oferta
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
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
  const requestKey = `${gameId}:${retryToken}`

  useEffect(() => {
    const controller = new AbortController()

    getGamePriceComparison(gameId, controller.signal)
      .then((comparison) => {
        setRequestState({ key: requestKey, comparison, error: '' })
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
