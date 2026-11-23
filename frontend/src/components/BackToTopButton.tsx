import { useEffect, useState } from 'react'

function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    function updateVisibility() {
      setIsVisible(window.scrollY > 150)
    }

    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    return () => window.removeEventListener('scroll', updateVisibility)
  }, [])

  if (!isVisible) return null

  return (
    <button
      aria-label="Volver arriba"
      className="fixed bottom-5 right-5 z-40 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-blue-600 text-2xl leading-none text-white shadow-lg shadow-slate-950/30 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="Volver arriba"
      type="button"
    >
      ↑
    </button>
  )
}

export default BackToTopButton
