import { useEffect, useState } from 'react'

const LOADING_MESSAGES = [
  'Buscando más ofertas...',
  'Comparando precios en tiendas...',
  'Casi listo...',
]

function LoadingIndicator() {
  const [messageIndex, setMessageIndex] = useState(0)
  const [isMessageVisible, setIsMessageVisible] = useState(true)

  useEffect(() => {
    let transitionTimeout: number | undefined
    const interval = window.setInterval(() => {
      setIsMessageVisible(false)
      transitionTimeout = window.setTimeout(() => {
        setMessageIndex((currentIndex) => (currentIndex + 1) % LOADING_MESSAGES.length)
        setIsMessageVisible(true)
      }, 150)
    }, 2000)

    return () => {
      window.clearInterval(interval)
      if (transitionTimeout !== undefined) {
        window.clearTimeout(transitionTimeout)
      }
    }
  }, [])

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <span
        aria-hidden="true"
        className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-[#2563EB] border-r-transparent"
      />
      <span
        className={`text-sm text-slate-400 transition-opacity duration-150 ${
          isMessageVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {LOADING_MESSAGES[messageIndex]}
      </span>
    </div>
  )
}

export default LoadingIndicator
