import { Link } from 'react-router-dom'
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
  onToggleFavorite: (gameId: string) => Promise<boolean>
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
}: RawgCatalogCardProps) {
  const { game: cheapSharkGame, comparison } = result ?? {}
  function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(price)
  }

  return (
    <GameCard title={game.title} imageUrl={game.image} previewImages={game.previewImages}>
      <div className="p-4">
        <h2 className="truncate text-base font-semibold" title={game.title}>
          {game.title}
        </h2>
        {isAuthenticated && (
          <button
            className="mt-2 text-sm font-medium text-blue-500 hover:text-blue-400"
            onClick={() => void onToggleFavorite(`rawg:${game.id}`).catch(() => undefined)}
            type="button"
          >
            {isFavorite ? '♥ Quitar de favoritos' : '♡ Agregar a favoritos'}
          </button>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {game.rating > 0 && (
            <span className="rounded-full bg-amber-400/15 px-2.5 py-1 font-medium text-amber-500">
              RAWG {game.rating.toFixed(1)} / 5
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
          Datos de{' '}
          <a
            className="text-blue-500 underline underline-offset-2 hover:text-blue-400"
            href="https://rawg.io"
            rel="noreferrer"
            target="_blank"
          >
            RAWG
          </a>
        </p>
      </div>
      {comparison && cheapSharkGame && (
        <div className="border-t border-[var(--color-border)] p-4">
          <h3 className="text-sm font-semibold">Ofertas por tienda</h3>
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
                <span className="shrink-0 text-right font-semibold">
                  {formatPrice(offer.price, offer.currency)}
                </span>
              </li>
            ))}
          </ul>
          <Link
            className="mt-4 block text-sm font-semibold text-blue-500 hover:text-blue-400"
            to={`/explorar/id/${encodeURIComponent(cheapSharkGame.id)}`}
            state={{ returnTo, returnMaxPrice: maxPrice }}
          >
            Ver ficha de {game.title}
          </Link>
        </div>
      )}
    </GameCard>
  )
}

export default RawgCatalogCard
