import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getRawgImageUrl } from '../utils/rawgImage'

type GameCardProps = {
  title: string
  imageUrl: string | null
  previewImages?: string[]
  detailPath?: string
  detailState?: {
    returnTo: string
    returnMaxPrice: number
  }
  onOffersOpen?: () => void
  offersContent: ReactNode
  children: ReactNode
}

function GameCard({
  title,
  imageUrl,
  previewImages,
  detailPath,
  detailState,
  onOffersOpen,
  offersContent,
  children,
}: GameCardProps) {
  const offersPanelId = useId()
  const [isHovered, setIsHovered] = useState(false)
  const [isOffersExpanded, setIsOffersExpanded] = useState(false)
  const [loadedScreenshots, setLoadedScreenshots] = useState<Set<string>>(() => new Set())
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null)
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false)
  const coverImage = useMemo(
    () => (imageUrl ? getRawgImageUrl(imageUrl, 640) ?? imageUrl : null),
    [imageUrl],
  )
  const screenshots = useMemo(
    () => [
      ...new Set(
        (previewImages ?? [])
          .filter(Boolean)
          .map((image) => getRawgImageUrl(image, 640) ?? image),
      ),
    ],
    [previewImages],
  )
  const carouselScreenshots = useMemo(
    () => screenshots.filter((image) => loadedScreenshots.has(image)),
    [loadedScreenshots, screenshots],
  )
  const displayedScreenshot =
    activeScreenshot && carouselScreenshots.includes(activeScreenshot)
      ? activeScreenshot
      : carouselScreenshots[0] ?? null
  const showCarousel = isHovered && displayedScreenshot !== null

  useEffect(() => {
    if (!isHovered || screenshots.length === 0) return

    let cancelled = false
    for (const screenshot of screenshots) {
      const preloader = new Image()
      preloader.onload = () => {
        if (cancelled) return
        setLoadedScreenshots((current) => {
          if (current.has(screenshot)) return current
          const next = new Set(current)
          next.add(screenshot)
          return next
        })
        setActiveScreenshot((current) => current ?? screenshot)
      }
      preloader.src = screenshot
    }

    return () => {
      cancelled = true
    }
  }, [isHovered, screenshots])

  useEffect(() => {
    if (!showCarousel || isAutoplayPaused || carouselScreenshots.length < 2) return

    const timer = window.setInterval(() => {
      setActiveScreenshot((current) => {
        const currentIndex = carouselScreenshots.indexOf(current ?? '')
        return carouselScreenshots[(currentIndex + 1) % carouselScreenshots.length]
      })
    }, 1_800)

    return () => window.clearInterval(timer)
  }, [carouselScreenshots, isAutoplayPaused, showCarousel])

  useEffect(() => {
    if (!isAutoplayPaused) return

    const timer = window.setTimeout(() => setIsAutoplayPaused(false), 2_500)
    return () => window.clearTimeout(timer)
  }, [activeScreenshot, isAutoplayPaused])

  function selectScreenshot(direction: -1 | 1) {
    if (carouselScreenshots.length < 2) return
    const currentIndex = carouselScreenshots.indexOf(displayedScreenshot ?? '')
    const nextIndex =
      (currentIndex + direction + carouselScreenshots.length) % carouselScreenshots.length
    setActiveScreenshot(carouselScreenshots[nextIndex])
    setIsAutoplayPaused(true)
  }

  function toggleOffers() {
    if (!isOffersExpanded) onOffersOpen?.()
    setIsOffersExpanded((expanded) => !expanded)
  }

  return (
    <article className="theme-transition overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg shadow-black/10">
      <div
        className="relative aspect-video w-full overflow-hidden bg-[var(--color-surface-muted)]"
        onMouseEnter={() => {
          setIsHovered(true)
          if (carouselScreenshots.length > 0) {
            setActiveScreenshot(carouselScreenshots[0])
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false)
          setActiveScreenshot(null)
          setIsAutoplayPaused(false)
        }}
      >
        {coverImage ? (
          <img
            className={`absolute inset-0 z-[2] h-full w-full object-cover transition-opacity duration-300 ease ${
              showCarousel ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
            src={coverImage}
            alt={`Portada de ${title}`}
            loading="lazy"
            aria-hidden={showCarousel}
          />
        ) : (
          <div
            className={`absolute inset-0 z-[2] flex items-center justify-center text-sm text-[var(--color-text-muted)] transition-opacity duration-300 ease ${
              showCarousel ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
            role="img"
            aria-label={`Portada no disponible para ${title}`}
            aria-hidden={showCarousel}
          >
            Portada no disponible
          </div>
        )}
        {screenshots.length > 0 && (
          <div
            className={`absolute inset-0 z-[1] transition-opacity duration-300 ease ${
              showCarousel ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-label={`Capturas de ${title}`}
            aria-hidden={!showCarousel}
            role="group"
          >
            {carouselScreenshots.map((image, index) => (
              <img
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease ${
                  image === displayedScreenshot ? 'opacity-100' : 'opacity-0'
                }`}
                key={image}
                src={image}
                alt={`Captura ${index + 1} de ${title}`}
                loading="eager"
                aria-hidden={image !== displayedScreenshot}
                onError={() => {
                  setLoadedScreenshots((current) => {
                    if (!current.has(image)) return current
                    const next = new Set(current)
                    next.delete(image)
                    return next
                  })
                  setActiveScreenshot((current) => (current === image ? null : current))
                }}
              />
            ))}
            {carouselScreenshots.length > 1 && (
              <>
                <button
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-3 py-1 text-2xl leading-none text-white transition hover:bg-black/80"
                  type="button"
                  aria-label={`Captura anterior de ${title}`}
                  onClick={() => selectScreenshot(-1)}
                >
                  &lsaquo;
                </button>
                <button
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-3 py-1 text-2xl leading-none text-white transition hover:bg-black/80"
                  type="button"
                  aria-label={`Captura siguiente de ${title}`}
                  onClick={() => selectScreenshot(1)}
                >
                  &rsaquo;
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {children}
      <div className="space-y-2 border-t border-[var(--color-border)] p-4">
        <button
          className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
          type="button"
          aria-expanded={isOffersExpanded}
          aria-controls={offersPanelId}
          onClick={toggleOffers}
        >
          {isOffersExpanded ? 'Ocultar ofertas por tienda' : 'Ver ofertas por tienda'}
        </button>
        {detailPath ? (
          <Link
            className="block w-full rounded-lg border border-[var(--color-border)] py-2.5 text-center text-sm font-semibold text-[var(--color-text)] transition hover:border-blue-400 hover:text-blue-500"
            to={detailPath}
            state={detailState}
          >
            Ver ficha completa
          </Link>
        ) : (
          <button
            className="w-full cursor-not-allowed rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-semibold text-[var(--color-text-muted)] opacity-60"
            type="button"
            disabled
            title="La ficha estará disponible cuando termine la verificación de ofertas."
          >
            Ver ficha completa
          </button>
        )}
      </div>
      {isOffersExpanded && (
        <section
          className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
          id={offersPanelId}
          aria-label={`Ofertas disponibles para ${title}`}
        >
          <h3 className="text-sm font-semibold">Ofertas disponibles</h3>
          <div className="mt-3">{offersContent}</div>
        </section>
      )}
    </article>
  )
}

export default GameCard
