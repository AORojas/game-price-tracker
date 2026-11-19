type SearchClearButtonProps = {
  onClear: () => void
}

function SearchClearButton({ onClear }: SearchClearButtonProps) {
  return (
    <button
      className="mr-1 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-500/10 hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      type="button"
      aria-label="Limpiar búsqueda"
      onClick={onClear}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="m18 6-12 12M6 6l12 12" />
      </svg>
    </button>
  )
}

export default SearchClearButton
