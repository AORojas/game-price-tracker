import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import GameCard from './GameCard'
import type { GameMetadata, GameSearchResult } from '../services/gameSearchService'
import {
  getGamePriceComparison,
  type GamePriceComparison,
} from '../services/gameSearchService'

type GameSearchCardProps = {
  game: GameSearchResult
  metadata: GameMetadata | null
  metadataStatus: 'loading' | 'ready' | 'error'
  maxPrice: number
  isAuthenticated: boolean
  isFavorite: boolean
  onToggleFavorite: (
    gameId: string,
    gameTitle: string,
    gameImage: string | null,
  ) => Promise<boolean>
  onCreateAlert: (
    gameId: string,
    gameTitle: string,
    gameImage: string | null,
    targetPrice: number,
  ) => Promise<unknown>
  onSaveOffer: (
    offerId: string,
    price: number,
    url: string,
    gameTitle: string,
    gameImage: string | null,
  ) => Promise<unknown>
}

function GameSearchCard({
  game,
  metadata,
  metadataStatus,
  maxPrice,
  isAuthenticated,
  isFavorite,
  onToggleFavorite,
  onCreateAlert,
  onSaveOffer,
}: GameSearchCardProps) {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const [isOffersOpen, setIsOffersOpen] = useState(false)
  const [comparison, setComparison] = useState<GamePriceComparison | null>(null)
  const [offersStatus, setOffersStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [offersError, setOffersError] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [activityMessage, setActivityMessage] = useState('')
  const [activityError, setActivityError] = useState('')
  const [isSavingActivity, setIsSavingActivity] = useState(false)
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

  async function handleToggleFavorite() {
    setActivityError('')
    setActivityMessage('')
    setIsSavingActivity(true)
    try {
      const nextState = await onToggleFavorite(
        `cheapshark:${game.id}`,
        game.title,
        metadata?.image ?? game.image,
      )
      setActivityMessage(nextState ? 'Juego agregado a favoritos.' : 'Juego quitado de favoritos.')
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : 'No se pudo actualizar el favorito.')
    } finally {
      setIsSavingActivity(false)
    }
  }

  async function handleCreateAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const price = Number(targetPrice)
    setActivityError('')
    setActivityMessage('')
    setIsSavingActivity(true)
    try {
      await onCreateAlert(
        `cheapshark:${game.id}`,
        game.title,
        metadata?.image ?? game.image,
        price,
      )
      setActivityMessage('Alerta de precio creada.')
      setTargetPrice('')
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : 'No se pudo crear la alerta.')
    } finally {
      setIsSavingActivity(false)
    }
  }

  async function handleSaveOffer(offerId: string, price: number) {
    setActivityError('')
    setActivityMessage('')
    setIsSavingActivity(true)
    try {
      const url = `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(offerId)}`
      await onSaveOffer(
        offerId,
        price,
        url,
        game.title,
        metadata?.image ?? game.image,
      )
      setActivityMessage('Oferta guardada en tu perfil.')
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : 'No se pudo guardar la oferta.')
    } finally {
      setIsSavingActivity(false)
    }
  }

  return (
    <GameCard
      title={game.title}
      imageUrl={metadata?.image ?? game.image}
      previewImages={metadata?.previewImages}
    >
      <div className="p-4">
        <h2 className="truncate text-base font-semibold" title={game.title}>
          {game.title}
        </h2>
        {isAuthenticated && (
          <button
            className="mt-2 text-sm font-medium text-blue-500 hover:text-blue-400 disabled:opacity-50"
            disabled={isSavingActivity}
            onClick={() => void handleToggleFavorite()}
            type="button"
          >
            {isFavorite ? '♥ Quitar de favoritos' : '♡ Agregar a favoritos'}
          </button>
        )}
        {metadataStatus === 'loading' ? (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]" role="status">
            Cargando imágenes y capturas de RAWG...
          </p>
        ) : metadataStatus === 'error' ? (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]" role="status">
            Vista previa de RAWG no disponible; se conserva la imagen de CheapShark.
          </p>
        ) : null}
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
          state={{ returnTo, returnMaxPrice: maxPrice }}
        >
          Ver ficha completa
        </Link>
      </div>
      {isOffersOpen && (
        <div className="border-t border-[var(--color-border)] p-4">
          {isAuthenticated && (
            <form className="mb-4 flex gap-2" onSubmit={handleCreateAlert}>
              <label className="sr-only" htmlFor={`alert-price-${game.id}`}>
                Precio objetivo para {game.title}
              </label>
              <input
                className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text)]"
                id={`alert-price-${game.id}`}
                min="0"
                placeholder="Precio objetivo"
                required
                step="0.01"
                type="number"
                value={targetPrice}
                onChange={(event) => setTargetPrice(event.target.value)}
              />
              <button
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-blue-500 disabled:opacity-50"
                disabled={isSavingActivity}
                type="submit"
              >
                Crear alerta
              </button>
            </form>
          )}
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
                    className="flex flex-wrap items-center justify-between gap-3 text-sm"
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
                    {isAuthenticated && (
                      <button
                        className="w-full text-right text-xs font-medium text-blue-500 hover:text-blue-400 disabled:opacity-50"
                        disabled={isSavingActivity}
                        onClick={() => void handleSaveOffer(offer.dealId, offer.price)}
                        type="button"
                      >
                        Guardar oferta
                      </button>
                    )}
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
          {activityError && <p className="mt-3 text-xs text-red-500" role="alert">{activityError}</p>}
          {activityMessage && <p className="mt-3 text-xs text-emerald-500" role="status">{activityMessage}</p>}
        </div>
      )}
    </GameCard>
  )
}

export default GameSearchCard
