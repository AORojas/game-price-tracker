import type { Game } from '../components/GameCard'

export const games: Game[] = [
  { title: 'Elden Ring', store: 'Steam', category: 'RPG', description: 'Explora las Tierras Intermedias en una aventura de acción y rol con combates exigentes, exploración libre y una historia de fantasía oscura.', price: 24.99, originalPrice: 59.99, image: '/Elden%20Ring.avif' },
  { title: 'Red Dead Redemption 2', store: 'Steam', category: 'Aventura', description: 'Acompaña a Arthur Morgan y a la banda de Dutch van der Linde en una épica aventura ambientada en el ocaso del Salvaje Oeste.', price: 19.99, originalPrice: 59.99, image: '/red_dead_rdemption_2.webp' },
  { title: 'Hogwarts Legacy', store: 'Steam', category: 'Aventura', description: 'Descubre la magia de Hogwarts en una aventura de mundo abierto donde aprenderás hechizos, explorarás secretos y forjarás tu propio camino.', price: 23.99, originalPrice: 59.99, image: '/hogwarts_legacy.avif' },
  { title: 'Minecraft', store: 'Microsoft Store', category: 'Aventura', description: 'Construye, explora y sobrevive en un mundo de bloques prácticamente ilimitado, solo o junto a tus amigos.', price: 14.99, originalPrice: 29.99, image: '/minecraft.webp' },
  { title: 'Cyberpunk 2077', store: 'Steam', category: 'RPG', description: 'Sumérgete en Night City como V, un mercenario personalizable que busca su lugar en una metrópolis futurista llena de decisiones y peligros.', price: 14.99, originalPrice: 59.99, image: '/Cyberpunk_2077.jpg' },
  { title: 'Fortnite', store: 'Epic Games', category: 'Acción', description: 'Compite para ser el último en pie en partidas llenas de acción, construcción, estrategia y eventos que transforman la isla.', price: 0, originalPrice: 0, image: '/fortnite.webp' },
  { title: 'FC 27', store: 'EA App', category: 'Deportes', description: 'Vive la emoción del fútbol con equipos, competiciones y modos de juego pensados para disfrutar dentro y fuera de la cancha.', price: 49.99, originalPrice: 69.99, image: '/FC27.avif' },
  { title: 'NBA 2K27', store: 'Steam', category: 'Deportes', description: 'Lleva tu carrera al siguiente nivel con una experiencia de baloncesto competitiva, modos profundos y una presentación auténtica.', price: 44.99, originalPrice: 69.99, image: '/nba_2K_27.jpg' },
  { title: 'NHL 26', store: 'Xbox Store', category: 'Deportes', description: 'Entra al hielo y compite a toda velocidad en una experiencia de hockey con duelos intensos y acción de alto impacto.', price: 39.99, originalPrice: 69.99, image: '/nhl_26.jpg' },
  { title: 'Roblox', store: 'Microsoft Store', category: 'Acción', description: 'Descubre una enorme colección de experiencias creadas por la comunidad, juega con amigos y crea tus propias aventuras.', price: 0, originalPrice: 0, image: '/roblox.jpg' },
]
