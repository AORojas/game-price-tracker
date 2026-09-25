import Navbar from '../components/Navbar'

function MyList() {
  return (
    <main className="min-h-screen bg-[#071323] text-white">
      <Navbar />
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-5xl items-center justify-center px-6 py-20 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-300">
            GamePriceTracker
          </p>
          <h1 className="mt-4 text-4xl font-bold">Mi lista</h1>
          <p className="mt-4 text-slate-400">
            Próximamente podrás guardar tus videojuegos favoritos.
          </p>
        </div>
      </section>
    </main>
  )
}

export default MyList
