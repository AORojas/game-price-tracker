import { Link } from 'react-router-dom'
import type { GameMetadataWithOffers } from '../services/gameSearchService'

type RawgCatalogCardProps = {
  result: GameMetadataWithOffers
}

function RawgCatalogCard({ result }: RawgCatalogCardProps) {
  const { metadata: game, game: cheapSharkGame, comparison } = result
  function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(price)
  }

  return (
    <article className="theme-transition overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg shadow-black/10">
      {game.image ? (
        <img
          className="h-40 w-full bg-[var(--color-surface-muted)] object-cover"
          src={game.image}
          alt={`Portada de ${game.title}`}
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-40 items-center justify-center bg-[var(--color-surface-muted)] text-sm text-[var(--color-text-muted)]"
          role="img"
          aria-label={`Portada no disponible para ${game.title}`}
        >
          Portada no disponible
        </div>
      )}
      <div className="p-4">
        <h2 className="truncate text-base font-semibold" title={game.title}>
          {game.title}
        </h2>
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
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          Precios disponibles en {comparison.prices.length} tiendas
        </p>
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
        >
          Ver ficha de {game.title}
        </Link>
      </div>
    </article>
  )
}

export default RawgCatalogCard
