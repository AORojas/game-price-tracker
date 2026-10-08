import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GameSearchResult } from '../services/gameSearchService'
import {
  getGamePriceComparison,
  type GamePriceComparison,
} from '../services/gameSearchService'

type GameSearchCardProps = {
  game: GameSearchResult
}

function GameSearchCard({ game }: GameSearchCardProps) {
  const [isOffersOpen, setIsOffersOpen] = useState(false)
  const [comparison, setComparison] = useState<GamePriceComparison | null>(null)
  const [offersStatus, setOffersStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [offersError, setOffersError] = useState('')
  const requestController = useRef<AbortController | null>(null)

  useEffect(() => () => requestController.current?.abort(), [])

  async function loadOffers() {
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    setOffersStatus('loading')
    setOffersError('')

    try {
      const result = await getGamePriceComparison(game.id, controller.signal)
      setComparison(result)
      setOffersStatus('success')
    } catch (error) {
      if (controller.signal.aborted) return
      setOffersError(
        error instanceof Error ? error.message : 'Ocurrió un error inesperado al cargar las ofertas.',
      )
      setOffersStatus('error')
    }
  }

  function toggleOffers() {
    if (isOffersOpen) {
      setIsOffersOpen(false)
      return
    }

    setIsOffersOpen(true)
    if (comparison && offersStatus === 'success') return
    void loadOffers()
  }

  function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(price)
  }

  return (
    <article className="theme-transition overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg shadow-black/10">
      <img
        className="h-36 w-full bg-[var(--color-surface-muted)] object-cover"
        src={game.image}
        alt={`Portada de ${game.title}`}
        loading="lazy"
      />
      <div className="p-4">
        <h2 className="truncate text-base font-semibold" title={game.title}>
          {game.title}
        </h2>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Precio mínimo informado por CheapShark
        </p>
        <p className="mt-1 text-2xl font-bold">
          ${game.lowestPrice.toFixed(2)} <span className="text-sm font-medium text-[var(--color-text-muted)]">USD</span>
        </p>
        <button
          className="mt-4 w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
          type="button"
          aria-expanded={isOffersOpen}
          onClick={toggleOffers}
        >
          {isOffersOpen ? 'Ocultar ofertas' : 'Ver ofertas por tienda'}
        </button>
        <Link
          className="mt-2 block w-full rounded-lg border border-[var(--color-border)] py-2.5 text-center text-sm font-semibold text-[var(--color-text)] transition hover:border-blue-400 hover:text-blue-500"
          to={`/explorar/id/${encodeURIComponent(game.id)}`}
        >
          Ver ficha completa
        </Link>
      </div>
      {isOffersOpen && (
        <div className="border-t border-[var(--color-border)] p-4">
          {offersStatus === 'loading' ? (
            <p className="text-sm text-[var(--color-text-muted)]" role="status">
              Cargando ofertas...
            </p>
          ) : offersStatus === 'error' ? (
            <div role="alert">
              <p className="text-sm text-[var(--color-text-muted)]">{offersError}</p>
              <button
                className="mt-2 text-sm font-semibold text-blue-500 hover:text-blue-400"
                type="button"
                onClick={() => void loadOffers()}
              >
                Reintentar
              </button>
            </div>
          ) : comparison && comparison.prices.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold">Ofertas disponibles</h3>
              <ul className="mt-3 space-y-3">
                {comparison.prices.map((offer) => (
                  <li
                    className="flex items-center justify-between gap-3 text-sm"
                    key={offer.dealId}
                  >
                    <span className="min-w-0 truncate text-[var(--color-text-muted)]">
                      {offer.store}
                      {offer.discount !== null && offer.discount > 0 && (
                        <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                          -{offer.discount.toFixed(0)}%
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      {offer.regularPrice !== null && offer.regularPrice > offer.price && (
                        <span className="mr-2 text-xs text-[var(--color-text-muted)] line-through">
                          {formatPrice(offer.regularPrice, offer.currency)}
                        </span>
                      )}
                      <span className="font-semibold">
                        {formatPrice(offer.price, offer.currency)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {comparison.cheapest && (
                <p className="mt-4 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-500">
                  Mejor oferta: {comparison.cheapest.store} —{' '}
                  {formatPrice(
                    comparison.cheapest.price,
                    comparison.prices[0]?.currency ?? 'USD',
                  )}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              No hay ofertas disponibles para este juego.
            </p>
          )}
        </div>
      )}
    </article>
  )
}

export default GameSearchCard
