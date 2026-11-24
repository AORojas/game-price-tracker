import type { GameMetadata } from '../services/gameSearchService'
import { formatArsPrice, formatUsdPrice } from '../utils/priceFormatting'

type GameCardSummaryProps = {
  metadata: GameMetadata | null
  metadataStatus: 'loading' | 'ready' | 'error'
  priceUsd: number
  usdArsRate: number | null
  isPriceStale?: boolean
}

function formatReleaseDate(value: string | null) {
  if (!value) return null
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!dateParts) return value

  const [, year, month, day] = dateParts
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    'es-AR',
    { day: '2-digit', month: 'short', year: 'numeric' },
  )
}

function GameCardSummary({
  metadata,
  metadataStatus,
  priceUsd,
  usdArsRate,
  isPriceStale = false,
}: GameCardSummaryProps) {
  const emptyLabel = metadataStatus === 'loading' ? 'Cargando…' : 'No disponible'
  const genres = metadata?.genres ?? []
  const platforms = metadata?.platforms ?? []
  const released = formatReleaseDate(metadata?.released ?? null)

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">Géneros</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {genres.length > 0 ? (
            genres.map((genre) => (
              <span
                className="rounded-full border border-white/10 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300"
                key={genre}
              >
                {genre}
              </span>
            ))
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">{emptyLabel}</span>
          )}
          {metadata?.metacritic !== null && metadata?.metacritic !== undefined && (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              Metacritic {metadata.metacritic}
            </span>
          )}
          {metadata && metadata.rating > 0 && (
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
              Puntuación {metadata.rating.toFixed(1)} / 5
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">Plataformas</p>
        <div className="flex flex-wrap gap-1.5">
          {platforms.length > 0 ? (
            platforms.map((platform) => (
              <span
                className="rounded-full border border-blue-400/20 bg-blue-500/15 px-2.5 py-1 text-[11px] text-blue-200"
                key={platform}
              >
                {platform}
              </span>
            ))
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">{emptyLabel}</span>
          )}
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
        <svg
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <rect height="18" rx="2" width="18" x="3" y="4" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>
          Fecha de lanzamiento: {released ?? emptyLabel}
        </span>
      </p>

      <div className="border-t border-[var(--color-border)] pt-3">
        {isPriceStale && (
          <p className="mb-1 text-xs text-amber-400">
            Precio verificado previamente
          </p>
        )}
        <p className="text-xs text-[var(--color-text-muted)]">
          Precio mínimo informado por CheapShark
        </p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <span className="text-xl font-bold text-[var(--color-text)]">
            {formatUsdPrice(priceUsd)}
          </span>
          {usdArsRate !== null && (
            <span className="text-xs text-[var(--color-text-muted)]">
              ({formatArsPrice(priceUsd * usdArsRate)} aprox.)
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

export default GameCardSummary
