import type { Game } from '../components/GameCard'

export const games: Game[] = [
  { title: 'Elden Ring', store: 'Steam', category: 'RPG', price: 24.99, originalPrice: 59.99, image: '/Elden%20Ring.avif' },
  { title: 'Red Dead Redemption 2', store: 'Steam', category: 'Aventura', price: 19.99, originalPrice: 59.99, image: '/red_dead_rdemption_2.webp' },
  { title: 'Hogwarts Legacy', store: 'Steam', category: 'Aventura', price: 23.99, originalPrice: 59.99, image: '/hogwarts_legacy.avif' },
  { title: 'Minecraft', store: 'Microsoft Store', category: 'Aventura', price: 14.99, originalPrice: 29.99, image: '/minecraft.webp' },
  { title: 'Cyberpunk 2077', store: 'Steam', category: 'RPG', price: 14.99, originalPrice: 59.99, image: '/Cyberpunk_2077.jpg' },
  { title: 'Fortnite', store: 'Epic Games', category: 'Acción', price: 0, originalPrice: 0, image: '/fortnite.webp' },
  { title: 'FC 27', store: 'EA App', category: 'Deportes', price: 49.99, originalPrice: 69.99, image: '/FC27.avif' },
  { title: 'NBA 2K27', store: 'Steam', category: 'Deportes', price: 44.99, originalPrice: 69.99, image: '/nba_2K_27.jpg' },
  { title: 'NHL 26', store: 'Xbox Store', category: 'Deportes', price: 39.99, originalPrice: 69.99, image: '/nhl_26.jpg' },
  { title: 'Roblox', store: 'Microsoft Store', category: 'Acción', price: 0, originalPrice: 0, image: '/roblox.jpg' },
]
