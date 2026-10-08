import { Router } from 'express'
import { getGamePrices, searchGames } from '../controllers/game.controller.js'
import { searchRawgGames } from '../controllers/rawg.controller.js'

const gameRouter = Router()

gameRouter.get('/search', searchGames)
gameRouter.get('/metadata/search', searchRawgGames)
gameRouter.get('/:gameId/prices', getGamePrices)

export default gameRouter
