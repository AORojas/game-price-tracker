const RAWG_MEDIA_HOST = 'media.rawg.io'

export function getRawgImageUrl(imageUrl: string | null, width: number): string | null {
  if (!imageUrl) return null

  let url: URL
  try {
    url = new URL(imageUrl)
  } catch {
    return imageUrl
  }

  if (url.hostname !== RAWG_MEDIA_HOST || !url.pathname.includes('/media/')) {
    return imageUrl
  }

  const resizePath = `/media/resize/${width}/-/`
  url.pathname = url.pathname.replace(
    /\/media\/(?:resize\/[^/]+\/[^/]+\/)?/,
    resizePath,
  )
  return url.toString()
}
