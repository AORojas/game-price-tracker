import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

const popularGames = [
  'Elden Ring',
  'Red Dead Redemption 2',
  'God of War',
  'Cyberpunk 2077',
  'Minecraft',
]

function SearchBar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedQuery = query.trim()

    if (normalizedQuery) {
      navigate(`/explorar?search=${encodeURIComponent(normalizedQuery)}`)
    }
  }

  function handlePopularGameClick(game: string) {
    setQuery(game)
  }

  return (
    <>
      <form
        className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 p-2 shadow-2xl shadow-black/20 backdrop-blur-md sm:flex-row"
        onSubmit={handleSubmit}
      >
        <label className="flex min-w-0 flex-1 items-center gap-3 px-4 text-left">
          <span className="text-xl text-slate-400" aria-hidden="true">
            ⌕
          </span>
          <input
            className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-400"
            type="search"
            placeholder="Buscar un videojuego..."
            aria-label="Buscar un videojuego"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          className="rounded-xl bg-blue-500 px-8 py-3 font-semibold transition hover:bg-blue-400"
          type="submit"
        >
          Buscar
        </button>
      </form>

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
