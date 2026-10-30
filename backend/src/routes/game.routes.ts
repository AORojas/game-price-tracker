import { Router } from 'express'
import { getGamePrices, searchGames } from '../controllers/game.controller.js'
import {
  getRawgCatalog,
  getRawgFilterOptions,
  getRawgGameDescription,
  getRawgGameScreenshots,
  searchRawgGames,
} from '../controllers/rawg.controller.js'

const gameRouter = Router()

gameRouter.get('/search', searchGames)
gameRouter.get('/metadata/catalog', getRawgCatalog)
gameRouter.get('/metadata/filters', getRawgFilterOptions)
gameRouter.get('/metadata/search', searchRawgGames)
gameRouter.get('/metadata/:rawgId/description', getRawgGameDescription)
gameRouter.get('/metadata/:rawgId/screenshots', getRawgGameScreenshots)
gameRouter.get('/:gameId/prices', getGamePrices)

export default gameRouter
