import type { GamePriceComparison, GameSearchCandidate } from '../types/game.types.js'
import type {
  GameMetadataFilterOptions,
  GameMetadataSearchResult,
} from '../types/rawg.types.js'

export interface LocalGameFixture {
  metadata: GameMetadataSearchResult
  details: {
    description: string
    developers: string[]
    esrbRating: string | null
  }
  searchCandidate: GameSearchCandidate
  priceComparison: GamePriceComparison
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function createArtwork(
  title: string,
  subtitle: string,
  background: string,
  accent: string,
  scene: number,
) {
  const safeTitle = escapeXml(title)
  const safeSubtitle = escapeXml(subtitle)
  const sceneShapes =
    scene === 1
      ? `<circle cx="640" cy="300" r="152" fill="${accent}" opacity=".72"/>
         <circle cx="640" cy="300" r="108" fill="#081426" opacity=".8"/>
         <path d="M512 440 640 164 768 440Z" fill="${accent}" opacity=".65"/>`
      : `<path d="M250 430 422 150 594 430Z" fill="${accent}" opacity=".62"/>
         <path d="M500 430 680 185 860 430Z" fill="#dbeafe" opacity=".24"/>
         <circle cx="760" cy="230" r="76" fill="${accent}" opacity=".8"/>`
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${background}"/>
          <stop offset="1" stop-color="#081426"/>
        </linearGradient>
        <radialGradient id="glow">
          <stop stop-color="${accent}" stop-opacity=".75"/>
          <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#background)"/>
      <circle cx="640" cy="310" r="360" fill="url(#glow)" opacity=".8"/>
      ${sceneShapes}
      <path d="M0 520 230 420 410 540 630 400 850 540 1070 405 1280 510V720H0Z"
        fill="#07101e" opacity=".76"/>
      <text x="640" y="584" fill="#f8fafc" font-family="Arial,sans-serif"
        font-size="54" font-weight="700" text-anchor="middle">${safeTitle}</text>
      <text x="640" y="632" fill="#cbd5e1" font-family="Arial,sans-serif"
        font-size="22" text-anchor="middle">${safeSubtitle} · DEMO LOCAL</text>
    </svg>
  `
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const eclipseCover = createArtwork(
  'Eclipse Protocol',
  'Ciencia ficción · Acción',
  '#1d4ed8',
  '#38bdf8',
  1,
)
const clockworkCover = createArtwork(
  'Clockwork Vale',
  'Aventura · Fantasía',
  '#166534',
  '#a3e635',
  2,
)

const eclipseScreenshots = [
  createArtwork('Eclipse Protocol', 'Estación orbital', '#1d4ed8', '#38bdf8', 1),
  createArtwork('Eclipse Protocol', 'El núcleo estelar', '#312e81', '#818cf8', 2),
  createArtwork('Eclipse Protocol', 'Frontera exterior', '#0f766e', '#5eead4', 1),
]
const clockworkScreenshots = [
  createArtwork('Clockwork Vale', 'El valle mecánico', '#166534', '#a3e635', 2),
  createArtwork('Clockwork Vale', 'Taller de autómatas', '#854d0e', '#facc15', 1),
  createArtwork('Clockwork Vale', 'Bosque de engranajes', '#14532d', '#4ade80', 2),
]

export const localGameFilterOptions: GameMetadataFilterOptions = {
  genres: [
    { id: 1, name: 'Action', slug: 'action' },
    { id: 2, name: 'Adventure', slug: 'adventure' },
    { id: 3, name: 'Indie', slug: 'indie' },
    { id: 4, name: 'RPG', slug: 'rpg' },
  ],
  platforms: [
    { id: 1001, name: 'PC', slug: 'pc' },
    { id: 1002, name: 'PlayStation 5', slug: 'playstation-5' },
    { id: 1003, name: 'Nintendo Switch', slug: 'nintendo-switch' },
  ],
}

function createPriceComparison(
  id: string,
  title: string,
  image: string,
  offers: Array<{
    store: string
    price: number
    regularPrice: number | null
    discount: number | null
    dealId: string
  }>,
): GamePriceComparison {
  const prices = offers
    .map((offer) => ({
      ...offer,
      currency: 'USD',
    }))
    .sort((first, second) => first.price - second.price)
  const cheapest = prices[0]

  return {
    game: { id, title, image },
    prices,
    cheapest: cheapest ? { store: cheapest.store, price: cheapest.price } : null,
  }
}

function createLocalGame(
  id: number,
  title: string,
  image: string,
  screenshots: string[],
  released: string,
  rating: number,
  metacritic: number,
  genres: string[],
  platforms: string[],
  description: string,
  developer: string,
  esrbRating: string | null,
  offers: Parameters<typeof createPriceComparison>[3],
): LocalGameFixture {
  const stringId = String(id)
  const lowestOffer = [...offers].sort((first, second) => first.price - second.price)[0]
  const priceComparison = createPriceComparison(stringId, title, image, offers)

  return {
    metadata: {
      id,
      title,
      image,
      released,
      rating,
      metacritic,
      genres,
      platforms,
      previewImages: screenshots,
    },
    details: {
      description,
      developers: [developer],
      esrbRating,
    },
    searchCandidate: {
      id: stringId,
      title,
      image,
      lowestPrice: lowestOffer.price,
      lowestDealId: lowestOffer.dealId,
    },
    priceComparison,
  }
}

export const localGames: LocalGameFixture[] = [
  createLocalGame(
    900001,
    'Eclipse Protocol',
    eclipseCover,
    eclipseScreenshots,
    '2025-04-15',
    4.6,
    88,
    ['Action', 'RPG'],
    ['PC', 'PlayStation 5'],
    'En Eclipse Protocol, una señal desconocida despierta en los límites de un sistema estelar aislado. Explora estaciones abandonadas, reúne a una tripulación y toma decisiones que cambiarán el destino de varias colonias.',
    'Northstar Interactive',
    'T',
    [
      {
        store: 'Local Demo Store',
        price: 24.99,
        regularPrice: 49.99,
        discount: 50,
        dealId: 'local-900001-1',
      },
      {
        store: 'Pixel Market',
        price: 29.99,
        regularPrice: 49.99,
        discount: 40,
        dealId: 'local-900001-2',
      },
    ],
  ),
  createLocalGame(
    900002,
    'Clockwork Vale',
    clockworkCover,
    clockworkScreenshots,
    '2024-09-27',
    4.3,
    84,
    ['Adventure', 'Indie'],
    ['PC', 'Nintendo Switch'],
    'Acompaña a una joven inventora en una travesía por Clockwork Vale, un valle donde antiguas máquinas mantienen en marcha las estaciones. Resuelve acertijos, repara autómatas y descubre por qué el gran reloj se ha detenido.',
    'Mosslight Studio',
    null,
    [
      {
        store: 'Local Demo Store',
        price: 14.99,
        regularPrice: 19.99,
        discount: 25,
        dealId: 'local-900002-1',
      },
      {
        store: 'Pixel Market',
        price: 16.49,
        regularPrice: 19.99,
        discount: 18,
        dealId: 'local-900002-2',
      },
    ],
  ),
]

export function copyGamePriceComparison(
  comparison: GamePriceComparison,
): GamePriceComparison {
  return {
    game: { ...comparison.game },
    prices: comparison.prices.map((offer) => ({ ...offer })),
    cheapest: comparison.cheapest ? { ...comparison.cheapest } : null,
  }
}

export function copyGameSearchCandidate(
  candidate: GameSearchCandidate,
): GameSearchCandidate {
  return { ...candidate }
}
