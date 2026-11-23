type FavoriteToggleButtonProps = {
  isFavorite: boolean
  disabled?: boolean
  onClick: () => void
}

function FavoriteToggleButton({
  isFavorite,
  disabled = false,
  onClick,
}: FavoriteToggleButtonProps) {
  return (
    <button
      aria-pressed={isFavorite}
      className={`mt-2 inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-wait disabled:opacity-60 ${
        isFavorite
          ? 'border-blue-400 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
          : 'border-white/10 bg-slate-800 text-slate-300 hover:border-blue-400/50 hover:text-blue-200'
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5"
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
      </svg>
      {isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    </button>
  )
}

export default FavoriteToggleButton
