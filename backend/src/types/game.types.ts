export interface GameSummary {
  id: string
  title: string
  image: string
}

export interface GameSearchCandidate extends GameSummary {
  lowestPrice: number
  lowestDealId: string
}

export interface GamePrice {
  store: string
  price: number
  regularPrice: number | null
  discount: number | null
  currency: string
  dealId: string
}

export interface CheapestGamePrice {
  store: string
  price: number
}

export interface GamePriceComparison {
  game: GameSummary
  prices: GamePrice[]
  cheapest: CheapestGamePrice | null
}
