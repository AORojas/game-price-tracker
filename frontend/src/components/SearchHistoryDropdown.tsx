import {
  filterSearchSuggestions,
  type SearchSuggestion,
} from '../hooks/useSearchSuggestions'

type SearchHistoryDropdownProps = {
  id: string
  isOpen: boolean
  items: SearchSuggestion[]
  query: string
  isRemoveDisabled?: boolean
  onSelect: (term: string) => void
  onRemove: (suggestion: SearchSuggestion) => void
}

function SearchHistoryDropdown({
  id,
  isOpen,
  items,
  query,
  isRemoveDisabled = false,
  onSelect,
  onRemove,
}: SearchHistoryDropdownProps) {
  const matchingItems = filterSearchSuggestions(items, query)
  if (!isOpen || matchingItems.length === 0) return null

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 overflow-hidden rounded-b-2xl border border-t-0 border-[var(--color-border)] bg-[var(--color-surface)] text-left text-[var(--color-text)] shadow-xl"
      id={id}
    >
      <ul className="max-h-72 overflow-y-auto py-2">
        {matchingItems.map((suggestion) => (
          <li className="flex items-center gap-2 px-2" key={suggestion.term}>
            <button
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              onClick={() => onSelect(suggestion.term)}
              type="button"
            >
              <span aria-hidden="true" className="shrink-0">🕒</span>
              <span className="truncate">{suggestion.term}</span>
            </button>
            <button
              aria-label={`Eliminar ${suggestion.term} del historial`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRemoveDisabled}
              onClick={(event) => {
                event.stopPropagation()
                onRemove(suggestion)
              }}
              title="Eliminar del historial"
              type="button"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SearchHistoryDropdown
