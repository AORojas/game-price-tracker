import { useState, type FormEvent } from 'react'
import GameCard from './GameCard'
import type { GameMetadata, GameMetadataWithOffers } from '../services/gameSearchService'

type RawgCatalogCardProps = {
  metadata: GameMetadata
  result?: GameMetadataWithOffers
  isChecking: boolean
  returnTo: string
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
}

function RawgCatalogCard({
  metadata: game,
  result,
  isChecking,
  returnTo,
  maxPrice,
  isAuthenticated,
  isFavorite,
  onToggleFavorite,
  onCreateAlert,
}: RawgCatalogCardProps) {
  const { game: cheapSharkGame, comparison } = result ?? {}
  const [targetPrice, setTargetPrice] = useState('')
  const [activityMessage, setActivityMessage] = useState('')
  const [activityError, setActivityError] = useState('')
  const [isSavingAlert, setIsSavingAlert] = useState(false)

  function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(price)
  }

  async function handleCreateAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActivityMessage('')
    setActivityError('')
    setIsSavingAlert(true)
    try {
      await onCreateAlert(
        `rawg:${game.id}`,
        game.title,
        game.image,
        Number(targetPrice),
      )
      setActivityMessage('Alerta de precio creada.')
      setTargetPrice('')
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : 'No se pudo crear la alerta.')
    } finally {
      setIsSavingAlert(false)
    }
  }

  return (
    <GameCard
      title={game.title}
      imageUrl={game.image}
      previewImages={game.previewImages}
      detailPath={
        cheapSharkGame
          ? `/explorar/id/${encodeURIComponent(cheapSharkGame.id)}`
          : undefined
      }
      detailState={{ returnTo, returnMaxPrice: maxPrice }}
      offersContent={
        <>
          {isAuthenticated && (
            <form className="mb-4 flex gap-2" onSubmit={handleCreateAlert}>
              <label className="sr-only" htmlFor={`catalog-alert-price-${game.id}`}>
                Precio objetivo para {game.title}
              </label>
              <input
                className="price-target-input min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                id={`catalog-alert-price-${game.id}`}
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
                disabled={isSavingAlert}
                type="submit"
              >
                Crear alerta
              </button>
            </form>
          )}
          {comparison && cheapSharkGame ? (
            comparison.prices.length > 0 ? (
              <ul className="space-y-3">
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
                    <span className="shrink-0 text-right font-semibold">
                      {formatPrice(offer.price, offer.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                No hay ofertas disponibles para este juego.
              </p>
            )
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]" role="status">
              {isChecking ? 'Verificando ofertas en tiendas...' : 'No hay ofertas confirmadas'}
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
        {comparison ? (
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Precios disponibles en {comparison.prices.length} tiendas
          </p>
        ) : (
          <p className="mt-4 text-xs text-[var(--color-text-muted)]" role="status">
            {isChecking ? 'Verificando ofertas en tiendas...' : 'No hay ofertas confirmadas'}
          </p>
        )}
        <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
          Datos del proveedor de videojuegos
        </p>
      </div>
    </GameCard>
  )
}

export default RawgCatalogCard
