function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#071323] text-white">
      <section className="relative isolate min-h-screen">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(30,112,209,0.38),transparent_34%),radial-gradient(circle_at_86%_62%,rgba(18,64,125,0.5),transparent_38%),linear-gradient(135deg,#0c2039_0%,#071323_52%,#050b16_100%)]" />
        <div className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(93,161,232,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(93,161,232,0.16)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />

        <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 px-6 py-5 lg:px-10">
          <a href="/" className="flex items-center gap-3" aria-label="GamePriceTracker inicio">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-xl text-blue-300 ring-1 ring-inset ring-blue-300/30">
              🎮
            </span>
            <span className="text-lg font-bold tracking-tight">
              GamePrice<span className="text-blue-400">Tracker</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex" aria-label="Navegación principal">
            <a className="text-white transition hover:text-blue-300" href="/">Inicio</a>
            <a className="transition hover:text-blue-300" href="#explorar">Explorar</a>
            <a className="transition hover:text-blue-300" href="#lista">Mi lista</a>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <button className="hidden rounded-lg px-3 py-2 text-slate-300 transition hover:text-white sm:block" type="button">
              Iniciar sesión
            </button>
            <button className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400" type="button">
              Registrarse
            </button>
          </div>
        </header>

        <div className="mx-auto flex min-h-[calc(100vh-81px)] max-w-5xl items-center justify-center px-6 py-20 text-center lg:px-10">
          <div className="w-full">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.35em] text-blue-300 sm:text-sm">
              Encuentra. Compara. Ahorra.
            </p>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Tu buscador de precios
              <span className="block bg-gradient-to-r from-blue-300 via-blue-500 to-cyan-300 bg-clip-text text-transparent">
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
