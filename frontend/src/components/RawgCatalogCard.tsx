import { useRef, useState, type FormEvent } from 'react'
import GameCard from './GameCard'
import Toast from './Toast'
import type { GameMetadata, GameMetadataWithOffers } from '../services/gameSearchService'
import {
  formatArsPrice,
  formatUsdPrice,
} from '../utils/priceFormatting'

const MAX_ALERT_TARGET_PRICE_ARS = 99_999_999.99

type RawgCatalogCardProps = {
  metadata: GameMetadata
  result: GameMetadataWithOffers
  returnTo: string
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
}

type ToastMessage = {
  id: number
  message: string
  type: 'success' | 'error'
}

function RawgCatalogCard({
  metadata: game,
  result,
  returnTo,
  maxPrice,
  usdArsRate,
  onBeforeNavigateToDetail,
  isAuthenticated,
  isFavorite,
  onToggleFavorite,
  onCreateAlert,
}: RawgCatalogCardProps) {
  const { game: cheapSharkGame, comparison } = result
  const lowestOffer = comparison.prices.reduce(
    (lowest, offer) => (offer.price < lowest.price ? offer : lowest),
    comparison.prices[0],
  )
  const [targetPrice, setTargetPrice] = useState('')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [isSavingAlert, setIsSavingAlert] = useState(false)
  const toastSequence = useRef(0)

  function showToast(message: string, type: ToastMessage['type']) {
    toastSequence.current += 1
    setToast({ id: toastSequence.current, message, type })
  }

  function formatPrimaryOfferPrice(price: number, currency: string) {
    if (currency === 'USD') return formatUsdPrice(price)
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(price)
  }

  const detailPath = `/explorar/id/${encodeURIComponent(cheapSharkGame.id)}`

  async function handleCreateAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const targetPriceArs = Number(targetPrice)
    if (
      !Number.isFinite(targetPriceArs) ||
      targetPriceArs < 0 ||
      targetPriceArs > MAX_ALERT_TARGET_PRICE_ARS
    ) {
      showToast('Ingresa un precio objetivo válido en ARS.', 'error')
      return
    }
    if (usdArsRate === null) {
      showToast('No se puede crear la alerta sin la cotización oficial.', 'error')
      return
    }

    setIsSavingAlert(true)
    try {
      await onCreateAlert(
        `rawg:${game.id}`,
        game.title,
        game.image,
        targetPriceArs,
      )
      showToast('Alerta de precio creada con éxito', 'success')
      setTargetPrice('')
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'No se pudo crear la alerta.',
        'error',
      )
    } finally {
      setIsSavingAlert(false)
    }
  }

  return (
    <>
    <GameCard
      title={game.title}
      imageUrl={game.image}
      previewImages={game.previewImages}
      detailPath={detailPath}
      detailState={{ returnTo, returnMaxPrice: maxPrice }}
      onBeforeNavigateToDetail={onBeforeNavigateToDetail}
      usdArsRate={usdArsRate}
      offersContent={
        <>
          {isAuthenticated && (
            <form className="mb-4 flex gap-2" onSubmit={handleCreateAlert}>
              <label className="sr-only" htmlFor={`catalog-alert-price-${game.id}`}>
                Precio objetivo en ARS para {game.title}
              </label>
              <input
                className="price-target-input min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                id={`catalog-alert-price-${game.id}`}
                min="0"
                max={MAX_ALERT_TARGET_PRICE_ARS}
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
                disabled={isSavingAlert || usdArsRate === null}
                type="submit"
              >
                Crear alerta
              </button>
            </form>
          )}
          {isAuthenticated && usdArsRate === null && (
            <p className="mb-4 text-xs text-amber-500" role="status">
              No se puede crear una alerta en ARS hasta que vuelva a estar disponible la cotización oficial.
            </p>
          )}
          <ul className="space-y-2">
            {comparison.prices.map((offer) => {
              const isBestOffer = offer.price === lowestOffer?.price
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
                </li>
              )
            })}
          </ul>
        </>
      }
    >
      <div className="p-4">
        <h2 className="truncate text-base font-semibold" title={game.title}>
          {game.title}
        </h2>
        {isAuthenticated && (
          <button
            className="mt-2 text-sm font-medium text-blue-500 hover:text-blue-400"
            onClick={() =>
              void onToggleFavorite(
                `rawg:${game.id}`,
                game.title,
                game.image,
              ).catch(() => undefined)
            }
            type="button"
          >
            {isFavorite ? '♥ Quitar de favoritos' : '♡ Agregar a favoritos'}
          </button>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {game.rating > 0 && (
            <span className="rounded-full bg-amber-400/15 px-2.5 py-1 font-medium text-amber-500">
              Puntuación {game.rating.toFixed(1)} / 5
            </span>
          )}
          {game.metacritic !== null && (
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 font-medium text-emerald-600">
              Metacritic {game.metacritic}
            </span>
          )}
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          {game.released && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-[var(--color-text-muted)]">Lanzamiento:</dt>
              <dd>{game.released}</dd>
            </div>
          )}
          {game.genres.length > 0 && (
            <div>
              <dt className="inline text-[var(--color-text-muted)]">Géneros: </dt>
              <dd className="inline">{game.genres.join(', ')}</dd>
            </div>
          )}
          {game.platforms.length > 0 && (
            <div>
              <dt className="inline text-[var(--color-text-muted)]">Plataformas: </dt>
              <dd className="inline">{game.platforms.join(', ')}</dd>
            </div>
          )}
        </dl>
        {lowestOffer && (
          <div className="mt-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              Precio mínimo informado por CheapShark
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-xl font-bold">
                {formatPrimaryOfferPrice(lowestOffer.price, lowestOffer.currency)}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                en {lowestOffer.store}
              </span>
            </p>
            {lowestOffer.currency === 'USD' && usdArsRate !== null && (
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {formatArsPrice(lowestOffer.price * usdArsRate)} aprox.
              </p>
            )}
          </div>
        )}
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Ofertas disponibles en {comparison.prices.length} tiendas
        </p>
        <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
          Datos del proveedor de videojuegos
        </p>
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

export default RawgCatalogCard
