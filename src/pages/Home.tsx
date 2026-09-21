import Navbar from '../components/Navbar'

function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#071323] text-white">
      <section className="relative isolate min-h-screen">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url('/home-fondo.jpg')" }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,13,28,0.94)_0%,rgba(4,17,34,0.78)_48%,rgba(3,13,28,0.9)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_38%,rgba(23,103,193,0.24),transparent_46%),linear-gradient(180deg,rgba(4,15,30,0.18)_0%,rgba(3,10,22,0.74)_100%)]" />

        <Navbar />

        <div className="mx-auto flex min-h-[calc(100vh-81px)] max-w-5xl items-center justify-center px-6 py-20 text-center lg:px-10">
          <div className="w-full">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.35em] text-blue-300 sm:text-sm">
              Encuentra. Compara. Ahorra.
            </p>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Tu buscador de precios
              <span className="block bg-gradient-to-r from-blue-300 via-blue-500 to-cyan-300 bg-clip-text text-transparent py-2">
                de videojuegos
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Compara precios, descubre las mejores ofertas y encuentra tu
              próximo videojuego al mejor precio.
            </p>

            <form className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 p-2 shadow-2xl shadow-black/20 backdrop-blur-md sm:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-4 text-left">
                <span className="text-xl text-slate-400" aria-hidden="true">⌕</span>
                <input
                  className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-400"
                  type="search"
                  placeholder="Buscar un videojuego..."
                  aria-label="Buscar un videojuego"
                />
              </label>
              <button className="rounded-xl bg-blue-500 px-8 py-3 font-semibold transition hover:bg-blue-400" type="submit">
                Buscar
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="mr-1 text-slate-400">Populares:</span>
              {['Elden Ring', 'Red Dead Redemption 2', 'God of War', 'Cyberpunk 2077', 'Minecraft'].map((game) => (
                <button className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-slate-300 transition hover:border-blue-400/60 hover:text-white" key={game} type="button">
                  {game}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home
