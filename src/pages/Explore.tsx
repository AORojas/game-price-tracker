import Navbar from '../components/Navbar'

const games = [
  {
    title: 'Elden Ring',
    store: 'Steam',
    price: '$24.99',
    originalPrice: '$59.99',
    discount: '-58%',
    position: 'center 12%',
  },
  {
    title: 'Red Dead Redemption 2',
    store: 'Steam',
    price: '$19.99',
    originalPrice: '$59.99',
    discount: '-67%',
    position: 'center 48%',
  },
  {
    title: 'God of War Ragnarök',
    store: 'PlayStation Store',
    price: '$29.99',
    originalPrice: '$69.99',
    discount: '-57%',
    position: 'right 12%',
  },
  {
    title: 'Cyberpunk 2077',
    store: 'Steam',
    price: '$14.99',
    originalPrice: '$59.99',
    discount: '-75%',
    position: 'center 86%',
  },
  {
    title: 'Hogwarts Legacy',
    store: 'Steam',
    price: '$23.99',
    originalPrice: '$59.99',
    discount: '-60%',
    position: 'left 8%',
  },
  {
    title: 'Minecraft',
    store: 'Microsoft Store',
    price: '$14.99',
    originalPrice: '$29.99',
    discount: '-50%',
    position: 'right 88%',
  },
]

const stores = ['Steam', 'Epic Games', 'GOG', 'Microsoft Store', 'PlayStation Store', 'Xbox Store']
const categories = ['Acción', 'Aventura', 'RPG', 'Deportes', 'Estrategia']

function Explore() {
  return (
    <main className="min-h-screen bg-[#071323] text-white">
      <Navbar />

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 px-6 py-8 lg:block">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <div className="mt-4 border-t border-white/10 pt-4">
            <h3 className="mb-4 text-sm font-medium text-slate-300">Tiendas</h3>
            <div className="space-y-3 text-sm text-slate-300">
              {stores.map((store) => (
                <label className="flex items-center gap-3" key={store}>
                  <input className="h-4 w-4 accent-blue-500" type="checkbox" />
                  {store}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-5">
            <h3 className="mb-4 text-sm font-medium text-slate-300">Rango de precio</h3>
            <input className="w-full accent-blue-500" type="range" min="0" max="100" defaultValue="100" />
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>$ 0</span>
              <span>$ 100+</span>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-5">
            <h3 className="mb-4 text-sm font-medium text-slate-300">Categoría</h3>
            <div className="space-y-3 text-sm text-slate-300">
              {categories.map((category) => (
                <label className="flex items-center gap-3" key={category}>
                  <input className="h-4 w-4 accent-blue-500" type="checkbox" />
                  {category}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-6 py-8 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-xl text-slate-400" aria-hidden="true">⌕</span>
              <input
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                type="search"
                defaultValue="elden ring"
                placeholder="Buscar videojuegos..."
                aria-label="Buscar videojuegos"
              />
              <button className="text-xl text-slate-500 transition hover:text-white" type="button" aria-label="Limpiar búsqueda">
                ×
              </button>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400 xl:w-64">
              Ordenar por:
              <select className="min-w-0 flex-1 bg-transparent text-white outline-none" defaultValue="relevance" aria-label="Ordenar resultados">
                <option className="bg-[#071323]" value="relevance">Relevancia</option>
                <option className="bg-[#071323]" value="price">Precio</option>
                <option className="bg-[#071323]" value="discount">Descuento</option>
              </select>
            </label>
          </div>

          <div className="mt-7 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold">Resultados <span className="font-normal text-slate-400">(12)</span></h1>
              <p className="mt-1 text-sm text-slate-400">Ofertas destacadas para tu búsqueda</p>
            </div>
            <button className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 lg:hidden" type="button">
              Filtros
            </button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => (
              <article className="overflow-hidden rounded-xl border border-white/5 bg-[#12263c] shadow-lg shadow-black/10" key={game.title}>
                <div
                  className="h-36 bg-cover"
                  style={{ backgroundImage: "url('/home-fondo.jpg')", backgroundPosition: game.position }}
                />
                <div className="p-3">
                  <h2 className="truncate text-base font-semibold">{game.title}</h2>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-400">
                    <span>◉ {game.store}</span>
                    <span>{game.originalPrice}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold">{game.price}</span>
                      <span className="ml-2 text-sm text-slate-500 line-through">{game.originalPrice}</span>
                    </div>
                    <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-xs font-bold text-emerald-950">{game.discount}</span>
                  </div>
                  <button className="mt-4 w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold transition hover:bg-blue-400" type="button">
                    Ver detalle
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Explore
