function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16">
        <div className="text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-blue-400">
            GamePriceTracker
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Tu buscador de precios de videojuegos
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Encuentra mejores ofertas y compara precios de tus videojuegos
            favoritos.
          </p>
        </div>
      </section>
    </main>
  )
}

export default Home
