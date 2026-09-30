import type { GameSearchResult } from '../services/gameSearchService'

type GameSearchCardProps = {
  game: GameSearchResult
}

function GameSearchCard({ game }: GameSearchCardProps) {
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
      </div>
    </article>
  )
}

export default GameSearchCard
