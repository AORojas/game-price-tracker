export type Game = {
  title: string
  store: string
  category: string
  price: number
  originalPrice: number
  image: string
}

function formatPrice(price: number) {
  return price === 0 ? 'Gratis' : `$${price.toFixed(2)}`
}

function getDiscount(game: Game) {
  if (game.originalPrice === 0) return 0
  return Math.round((1 - game.price / game.originalPrice) * 100)
}

type GameCardProps = {
  game: Game
}

function GameCard({ game }: GameCardProps) {
  const discount = getDiscount(game)

  return (
    <article className="theme-transition overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg shadow-black/10">
      <img className="h-36 w-full object-cover" src={game.image} alt={`Portada de ${game.title}`} />
      <div className="p-3">
        <h2 className="truncate text-base font-semibold">{game.title}</h2>
        <div className="mt-2 flex items-center justify-between text-sm text-slate-400">
          <span className="text-[var(--color-text-muted)]">◉ {game.store}</span>
          <span>{game.originalPrice > 0 ? formatPrice(game.originalPrice) : 'Gratis'}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold">{formatPrice(game.price)}</span>
            {game.originalPrice > 0 && (
              <span className="ml-2 text-sm text-slate-500 line-through">{formatPrice(game.originalPrice)}</span>
            )}
          </div>
          {discount > 0 && (
            <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-xs font-bold text-emerald-950">-{discount}%</span>
          )}
        </div>
        <Link
          className="mt-4 block w-full rounded-lg bg-blue-500 py-2.5 text-center text-sm font-semibold transition hover:bg-blue-400"
          to={`/explorar/${encodeURIComponent(game.title)}`}
        >
          Ver detalle
        </Link>
      </div>
    </article>
  )
}

export default GameCard
import { Link } from 'react-router-dom'
