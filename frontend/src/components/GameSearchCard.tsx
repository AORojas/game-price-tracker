import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import FavoriteToggleButton from './FavoriteToggleButton'
import GameCard from './GameCard'
import GameCardSummary from './GameCardSummary'
import Toast from './Toast'
import type { GameMetadata, GameSearchResult } from '../services/gameSearchService'
import {
  getGamePriceComparison,
  type GamePriceComparison,
} from '../services/gameSearchService'
import {
  formatArsPrice,
  formatUsdPrice,
} from '../utils/priceFormatting'

type GameSearchCardProps = {
  game: GameSearchResult
  metadata: GameMetadata | null
  metadataSource?: 'rawg' | 'steam'
  metadataStatus: 'loading' | 'ready' | 'error'
  maxPrice: number
  usdArsRate: number | null
  onBeforeNavigateToDetail: () => void
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
    targetPriceArs: number,
  ) => Promise<unknown>
  onSaveOffer: (
    offerId: string,
    price: number,
    url: string,
    gameTitle: string,
    gameImage: string | null,
  ) => Promise<unknown>
}

type ToastMessage = {
  id: number
  message: string
  type: 'success' | 'error'
}

function GameSearchCard({
  game,
  metadata,
  metadataSource,
  metadataStatus,
  maxPrice,
  usdArsRate,
  onBeforeNavigateToDetail,
  isAuthenticated,
  isFavorite,
  onToggleFavorite,
  onCreateAlert,
  onSaveOffer,
}: GameSearchCardProps) {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const [comparison, setComparison] = useState<GamePriceComparison | null>(null)
  const [offersStatus, setOffersStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [offersError, setOffersError] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [activityMessage, setActivityMessage] = useState('')
  const [activityError, setActivityError] = useState('')
  const [isSavingActivity, setIsSavingActivity] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastSequence = useRef(0)
  const requestController = useRef<AbortController | null>(null)

  useEffect(() => () => requestController.current?.abort(), [])

  function showToast(message: string, type: ToastMessage['type']) {
    toastSequence.current += 1
    setToast({ id: toastSequence.current, message, type })
  }

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

  function formatPrimaryOfferPrice(price: number, currency: string) {
    if (currency === 'USD') return formatUsdPrice(price)
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
      showToast('Alerta de precio creada con éxito', 'success')
      setTargetPrice('')
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'No se pudo crear la alerta.',
        'error',
      )
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
    <>
    <GameCard
      title={game.title}
      imageUrl={metadata?.image ?? game.image}
      previewImages={metadata?.previewImages}
      detailPath={`/explorar/id/${encodeURIComponent(game.id)}`}
      detailState={{
        returnTo,
        returnMaxPrice: maxPrice,
        ...(metadata ? { metadata } : {}),
        ...(metadataSource ? { metadataSource } : {}),
      }}
      onBeforeNavigateToDetail={onBeforeNavigateToDetail}
      usdArsRate={usdArsRate}
      onOffersOpen={() => {
        if (comparison && offersStatus === 'success') return
        void loadOffers()
      }}
      offersContent={
        <>
          {isAuthenticated && (
            <form className="mb-4 flex gap-2" onSubmit={handleCreateAlert}>
              <label className="sr-only" htmlFor={`alert-price-${game.id}`}>
                Precio objetivo en ARS para {game.title}
              </label>
              <input
                className="price-target-input min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                id={`alert-price-${game.id}`}
                min="0"
                placeholder="Precio objetivo (ARS)"
                required
                step="0.01"
                type="number"
                value={targetPrice}
                disabled={usdArsRate === null}
                onChange={(event) => setTargetPrice(event.target.value)}
              />
              <button
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-blue-500 disabled:opacity-50"
                disabled={isSavingActivity || usdArsRate === null}
                type="submit"
              >
                Crear alerta
              </button>
            </form>
          )}
          {isAuthenticated && usdArsRate === null && (
            <p className="mb-4 text-xs text-[var(--color-warning)]" role="status">
              No se puede crear una alerta en ARS hasta que vuelva a estar disponible la cotización oficial.
            </p>
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
            <ul className="space-y-3">
              {comparison.prices.map((offer) => {
                const isBestOffer = offer.price === comparison.cheapest?.price
                return (
                  <li
                    className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 text-sm ${
                      isBestOffer
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                    }`}
                    key={offer.dealId}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-text)]" title={offer.store}>
                        {offer.store}
                      </p>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        {offer.discount !== null && offer.discount > 0 && (
                          <span className="rounded-full border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                            -{offer.discount.toFixed(0)}%
                          </span>
                        )}
                        {isBestOffer && (
                          <span className="text-[10px] font-medium text-emerald-500">
                            Mejor precio
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 text-right">
                      {offer.regularPrice !== null && offer.regularPrice > offer.price && (
                        <p className="truncate text-[10px] text-[var(--color-text-muted)] line-through">
                          {formatPrimaryOfferPrice(offer.regularPrice, offer.currency)}
                        </p>
                      )}
                      <p className="whitespace-nowrap font-semibold text-[var(--color-text)]">
                        {formatPrimaryOfferPrice(offer.price, offer.currency)}
                      </p>
                      {offer.currency === 'USD' && usdArsRate !== null && (
                        <p className="whitespace-nowrap text-xs text-[var(--color-text-muted)]">
                          {formatArsPrice(offer.price * usdArsRate)} aprox.
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-end gap-2">
                      <a
                        aria-label={`Ir a la tienda ${offer.store} para comprar ${game.title}`}
                        className="group inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        href={`https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(offer.dealId)}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Ir a la tienda
                        <svg
                          aria-hidden="true"
                          className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          viewBox="0 0 24 24"
                        >
                          <path d="M13 5h6v6M19 5l-9 9" />
                          <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                        </svg>
                      </a>
                      {isAuthenticated && (
                        <button
                          className="rounded px-2 py-1 text-[11px] font-medium text-blue-500 transition hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-50"
                          disabled={isSavingActivity}
                          onClick={() => void handleSaveOffer(offer.dealId, offer.price)}
                          type="button"
                        >
                          Guardar oferta
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              No hay ofertas disponibles para este juego.
            </p>
          )}
          {activityError && <p className="mt-3 text-xs text-red-500" role="alert">{activityError}</p>}
          {activityMessage && <p className="mt-3 text-xs text-emerald-500" role="status">{activityMessage}</p>}
        </>
      }
    >
      <div className="p-4">
        <h2 className="truncate text-base font-semibold" title={game.title}>
          {game.title}
        </h2>
        {isAuthenticated && (
          <FavoriteToggleButton
            disabled={isSavingActivity}
            isFavorite={isFavorite}
            onClick={() => void handleToggleFavorite()}
          />
        )}
        <GameCardSummary
          metadata={metadata}
          metadataStatus={metadataStatus}
          priceUsd={game.lowestPrice}
          usdArsRate={usdArsRate}
        />
      </div>
    </GameCard>
    {toast && (
      <Toast
        key={toast.id}
        message={toast.message}
        onDismiss={() => setToast(null)}
        type={toast.type}
      />
    )}
    </>
  )
}

export default GameSearchCard
