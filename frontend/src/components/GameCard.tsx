import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getRawgImageUrl } from '../utils/rawgImage'

type GameCardProps = {
  title: string
  imageUrl: string | null
  previewImages?: string[]
  children: ReactNode
}

function GameCard({ title, imageUrl, previewImages = [], children }: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false)
  const [loadedImage, setLoadedImage] = useState<string | null>(null)
  const images = useMemo(
    () => {
      const carouselImages = previewImages.length > 0 ? previewImages : [imageUrl]
      return carouselImages
        .filter((image): image is string => Boolean(image))
        .map((image) => getRawgImageUrl(image, 640) ?? image)
    },
    [imageUrl, previewImages],
  )

  useEffect(() => {
    if (!isHovered || isAutoplayPaused || images.length < 2) return

    const timer = window.setInterval(() => {
      setCurrentImageIndex((currentImage) => (currentImage + 1) % images.length)
    }, 1_200)

    return () => window.clearInterval(timer)
  }, [images.length, isAutoplayPaused, isHovered])

  useEffect(() => {
    if (!isAutoplayPaused) return

    const timer = window.setTimeout(() => setIsAutoplayPaused(false), 2_500)
    return () => window.clearTimeout(timer)
  }, [isAutoplayPaused, currentImageIndex])

  function selectImage(index: number) {
    setCurrentImageIndex(index)
    setIsAutoplayPaused(true)
  }

  return (
    <article
      className="theme-transition overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg shadow-black/10"
      onMouseEnter={() => {
        setIsHovered(true)
        if (images.length > 1) setCurrentImageIndex(0)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        setCurrentImageIndex(0)
        setIsAutoplayPaused(false)
      }}
    >
      <div className="relative">
        {images.length > 0 ? (
          <img
            className={`h-40 w-full bg-[var(--color-surface-muted)] object-cover transition-opacity duration-500 ${
              loadedImage === images[currentImageIndex] ? 'opacity-100' : 'opacity-0'
            }`}
            src={images[currentImageIndex] ?? images[0]}
            alt={`Portada de ${title}`}
            loading="lazy"
            onLoad={() => setLoadedImage(images[currentImageIndex] ?? images[0])}
            onError={() => setLoadedImage(images[currentImageIndex] ?? images[0])}
          />
        ) : (
          <div
            className="flex h-40 items-center justify-center bg-[var(--color-surface-muted)] text-sm text-[var(--color-text-muted)]"
            role="img"
            aria-label={`Portada no disponible para ${title}`}
          >
            Portada no disponible
          </div>
        )}
        {isHovered && images.length > 1 && (
          <div
            className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-6"
            aria-label={`Imágenes de ${title}`}
            role="group"
          >
            {images.map((_, index) => (
              <button
                aria-label={`Mostrar imagen ${index + 1} de ${images.length}`}
                aria-pressed={currentImageIndex === index}
                className={`h-2 rounded-full transition-all ${
                  currentImageIndex === index
                    ? 'w-5 bg-white'
                    : 'w-2 bg-white/60 hover:bg-white'
                }`}
                key={`${index}-${images[index]}`}
                onClick={() => selectImage(index)}
                onMouseEnter={() => selectImage(index)}
                type="button"
              />
            ))}
          </div>
        )}
      </div>
      {children}
    </article>
  )
}

export default GameCard
