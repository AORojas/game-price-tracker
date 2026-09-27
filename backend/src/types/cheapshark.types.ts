export interface CheapSharkGameSearchResult {
  gameID: string
  steamAppID: string | null
  cheapest: string
  cheapestDealID: string
  external: string
  internalName: string
  thumb: string
}

export interface CheapSharkGameInfo {
  title: string
  steamAppID: string | null
  thumb: string
}

export interface CheapSharkDeal {
  storeID: string
  dealID: string
  price: string
  retailPrice: string
  savings: string
}

export interface CheapSharkGameDetails {
  info: CheapSharkGameInfo
  deals: CheapSharkDeal[]
}

export interface CheapSharkStore {
  storeID: string
  storeName: string
  isActive: number
  images: {
    banner: string
    logo: string
    icon: string
  }
}
