import { useMemo, useState } from 'react'
import GameCard, { type Game } from '../components/GameCard'
import Navbar from '../components/Navbar'

type SortOption = 'relevance' | 'price' | 'discount'

const games: Game[] = [
  { title: 'Elden Ring', store: 'Steam', category: 'RPG', price: 24.99, originalPrice: 59.99, image: '/Elden%20Ring.avif' },
  { title: 'Red Dead Redemption 2', store: 'Steam', category: 'Aventura', price: 19.99, originalPrice: 59.99, image: '/red_dead_rdemption_2.webp' },
  { title: 'Hogwarts Legacy', store: 'Steam', category: 'Aventura', price: 23.99, originalPrice: 59.99, image: '/hogwarts_legacy.avif' },
  { title: 'Minecraft', store: 'Microsoft Store', category: 'Aventura', price: 14.99, originalPrice: 29.99, image: '/minecraft.webp' },
  { title: 'Cyberpunk 2077', store: 'Steam', category: 'RPG', price: 14.99, originalPrice: 59.99, image: '/Cyberpunk_2077.jpg' },
  { title: 'Fortnite', store: 'Epic Games', category: 'Acción', price: 0, originalPrice: 0, image: '/fortnite.webp' },
  { title: 'FC 27', store: 'EA App', category: 'Deportes', price: 49.99, originalPrice: 69.99, image: '/FC27.avif' },
  { title: 'NBA 2K27', store: 'Steam', category: 'Deportes', price: 44.99, originalPrice: 69.99, image: '/nba_2K_27.jpg' },
  { title: 'NHL 26', store: 'Xbox Store', category: 'Deportes', price: 39.99, originalPrice: 69.99, image: '/nhl_26.jpg' },
  { title: 'Roblox', store: 'Microsoft Store', category: 'Acción', price: 0, originalPrice: 0, image: '/roblox.jpg' },
]

const stores = ['Steam', 'Epic Games', 'GOG', 'Microsoft Store', 'PlayStation Store', 'Xbox Store', 'EA App']
const categories = ['Acción', 'Aventura', 'RPG', 'Deportes', 'Estrategia']

function getDiscount(game: Game) {
  if (game.originalPrice === 0) return 0
  return Math.round((1 - game.price / game.originalPrice) * 100)
}

function Explore() {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [maxPrice, setMaxPrice] = useState(100)
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const results = games.filter((game) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        game.title.toLowerCase().includes(normalizedQuery) ||
        game.store.toLowerCase().includes(normalizedQuery)
      const matchesStore =
        selectedStores.length === 0 || selectedStores.includes(game.store)
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(game.category)

      return matchesQuery && matchesStore && matchesCategory && game.price <= maxPrice
    })

    return [...results].sort((first, second) => {
      if (sortBy === 'price') return first.price - second.price
      if (sortBy === 'discount') return getDiscount(second) - getDiscount(first)
      return games.indexOf(first) - games.indexOf(second)
    })
  }, [maxPrice, query, selectedCategories, selectedStores, sortBy])

  function toggleSelection(
    value: string,
    selectedValues: string[],
    setSelectedValues: (values: string[]) => void,
  ) {
    setSelectedValues(
      selectedValues.includes(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value],
    )
  }

  function clearSearch() {
    setQuery('')
  }

  return (
    <main className="theme-transition min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside
          className={`theme-transition ${isFiltersOpen ? 'block' : 'hidden'} w-full shrink-0 border-b border-[var(--color-border)] px-6 py-8 lg:block lg:w-64 lg:border-b-0 lg:border-r`}
        >
          <h2 className="text-lg font-semibold">Filtros</h2>
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">Tiendas</h3>
            <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
              {stores.map((store) => (
                <label className="flex items-center gap-3" key={store}>
                  <input
                    checked={selectedStores.includes(store)}
                    className="h-4 w-4 accent-blue-500"
                    type="checkbox"
                    onChange={() => toggleSelection(store, selectedStores, setSelectedStores)}
                  />
                  {store}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--color-border)] pt-5">
            <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">Precio máximo</h3>
            <input
              className="w-full accent-blue-500"
              type="range"
              min="0"
              max="100"
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
            />
            <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
              <span>$ 0</span>
              <span>${maxPrice} o menos</span>
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--color-border)] pt-5">
            <h3 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">Categoría</h3>
            <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
              {categories.map((category) => (
                <label className="flex items-center gap-3" key={category}>
                  <input
                    checked={selectedCategories.includes(category)}
                    className="h-4 w-4 accent-blue-500"
                    type="checkbox"
                    onChange={() => toggleSelection(category, selectedCategories, setSelectedCategories)}
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-6 py-8 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row">
            <label className="theme-transition flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
              <span className="text-xl text-slate-400" aria-hidden="true">⌕</span>
              <input
                className="w-full bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
                type="search"
                value={query}
                placeholder="Buscar videojuegos..."
                aria-label="Buscar videojuegos"
                onChange={(event) => setQuery(event.target.value)}
              />
              <button
                className="text-xl text-slate-500 transition hover:text-white"
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={clearSearch}
              >
                ×
              </button>
            </label>
            <label className="theme-transition flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)] xl:w-64">
              Ordenar por:
              <select
                className="theme-transition min-w-0 flex-1 bg-transparent text-[var(--color-text)] outline-none"
                value={sortBy}
                aria-label="Ordenar resultados"
                onChange={(event) => setSortBy(event.target.value as SortOption)}
              >
                <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="relevance">Relevancia</option>
                <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="price">Precio</option>
                <option className="bg-[var(--color-surface)] text-[var(--color-text)]" value="discount">Descuento</option>
              </select>
            </label>
          </div>

          <div className="mt-7 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Resultados <span className="font-normal text-slate-400">({filteredGames.length})</span>
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Ofertas destacadas para tu búsqueda</p>
            </div>
            <button
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] lg:hidden"
              type="button"
              onClick={() => setIsFiltersOpen((isOpen) => !isOpen)}
            >
              {isFiltersOpen ? 'Ocultar filtros' : 'Filtros'}
            </button>
          </div>

          {filteredGames.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredGames.map((game) => <GameCard game={game} key={game.title} />)}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
              <h2 className="text-xl font-semibold">No encontramos videojuegos</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Probá con otro término o ajustá los filtros.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Explore
