import { Router } from 'express'
import {
  getGameMetadataFromCatalog,
  getGamePriceHistory,
  getGamePrices,
  searchGames,
} from '../controllers/game.controller.js'
import {
  getRawgCatalogWithOffers,
  getRawgFilterOptions,
  getRawgGameDetails,
  getRawgGameDescription,
  getRawgGameScreenshots,
  searchRawgGames,
} from '../controllers/rawg.controller.js'

const gameRouter = Router()

gameRouter.get('/search', searchGames)
gameRouter.get('/metadata/catalog-with-offers', getRawgCatalogWithOffers)
gameRouter.get('/metadata/catalog', getRawgCatalogWithOffers)
gameRouter.get('/metadata/filters', getRawgFilterOptions)
gameRouter.get('/metadata/search', searchRawgGames)
gameRouter.get('/metadata/:rawgId/description', getRawgGameDescription)
gameRouter.get('/metadata/:rawgId/details', getRawgGameDetails)
gameRouter.get('/metadata/:rawgId/screenshots', getRawgGameScreenshots)
gameRouter.get('/:gameId/metadata', getGameMetadataFromCatalog)
gameRouter.get('/:gameId/price-history', getGamePriceHistory)
gameRouter.get('/:gameId/prices', getGamePrices)

export default gameRouter
