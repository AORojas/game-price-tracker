import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useUserActivity } from '../hooks/useUserActivity'
import {
  filterSearchSuggestions,
  useSearchSuggestions,
  type SearchSuggestion,
} from '../hooks/useSearchSuggestions'
import SearchHistoryDropdown from './SearchHistoryDropdown'
import SearchClearButton from './SearchClearButton'

const popularGames = [
  'Elden Ring',
  'Red Dead Redemption 2',
  'God of War',
  'Cyberpunk 2077',
  'Minecraft',
]

function SearchBar() {
  const [query, setQuery] = useState('')
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()
  const activity = useUserActivity()
  const { suggestions, recordSearch, removeLocalSearch } =
    useSearchSuggestions(activity.searchHistory)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const matchingSuggestions = filterSearchSuggestions(suggestions, query)
  const isDropdownVisible = isSuggestionsOpen && matchingSuggestions.length > 0

  useEffect(() => {
    if (!isSuggestionsOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsSuggestionsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSuggestionsOpen(false)
        inputRef.current?.blur()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSuggestionsOpen])

  function search(term: string) {
    const normalizedQuery = term.trim()
    if (!normalizedQuery) return
    recordSearch(normalizedQuery)
    setQuery(normalizedQuery)
    setIsSuggestionsOpen(false)
    navigate(`/explorar?search=${encodeURIComponent(normalizedQuery)}`)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    search(query)
  }

  function selectSuggestion(term: string) {
    setQuery(term)
    setIsSuggestionsOpen(false)
  }

  async function handleRemoveSuggestion(suggestion: SearchSuggestion) {
    setHistoryError('')
    try {
      if (suggestion.remoteId) await activity.removeSearch(suggestion.remoteId)
      removeLocalSearch(suggestion.term)
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : 'No se pudo eliminar la búsqueda.',
      )
    }
  }

  function handlePopularGameClick(game: string) {
    setQuery(game)
    recordSearch(game)
    setHistoryError('')
    if (user) {
      void activity.addSearch(game).catch((error: unknown) => {
        setHistoryError(
          error instanceof Error ? error.message : 'No se pudo guardar la búsqueda.',
        )
      })
    }
  }

  return (
    <>
      <div className="relative mx-auto mt-10 w-full max-w-3xl" ref={rootRef}>
        <form
          className={`flex w-full flex-col gap-3 rounded-2xl border p-2 shadow-2xl shadow-black/20 backdrop-blur-md sm:flex-row ${
            isDropdownVisible
              ? 'rounded-b-none border-[var(--color-border)] bg-[var(--color-surface)]'
              : 'border-white/15 bg-white/10'
          }`}
          onSubmit={handleSubmit}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 text-left">
            <span className="text-xl text-[var(--color-text-muted)]" aria-hidden="true">
              ⌕
            </span>
            <input
              className={`w-full bg-transparent py-3 text-sm outline-none placeholder:text-[var(--color-text-muted)] [&::-webkit-search-cancel-button]:hidden ${
                isDropdownVisible ? 'text-[var(--color-text)]' : 'text-white'
              }`}
              type="search"
              placeholder="Buscar un videojuego..."
              aria-label="Buscar un videojuego"
              aria-expanded={isDropdownVisible}
              aria-controls="home-search-history"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={() => setIsSuggestionsOpen(true)}
              onFocus={() => setIsSuggestionsOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsSuggestionsOpen(false)
                  inputRef.current?.blur()
                }
              }}
              ref={inputRef}
            />
            {query.length > 0 && (
              <SearchClearButton
                onClear={() => {
                  setQuery('')
                  setIsSuggestionsOpen(true)
                }}
              />
            )}
          </div>
          <button
            className="rounded-xl bg-blue-500 px-8 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-500"
            disabled={!query.trim()}
            type="submit"
          >
            Buscar
          </button>
        </form>
        <SearchHistoryDropdown
          error={historyError || activity.error}
          id="home-search-history"
          isRemoveDisabled={activity.loading}
          isOpen={isDropdownVisible}
          items={suggestions}
          onRemove={(suggestion) => void handleRemoveSuggestion(suggestion)}
          onSelect={selectSuggestion}
          query={query}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="mr-1 text-slate-400">Populares:</span>
        {popularGames.map((game) => (
          <button
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-slate-300 transition hover:border-blue-400/60 hover:text-white"
            key={game}
            type="button"
            onClick={() => handlePopularGameClick(game)}
          >
            {game}
          </button>
        ))}
      </div>

      <p className="mt-5 min-h-6 text-sm text-blue-200" aria-live="polite" />
    </>
  )
}

export default SearchBar
