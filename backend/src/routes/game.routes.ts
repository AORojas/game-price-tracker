import { Router } from 'express'
import { getGamePrices, searchGames } from '../controllers/game.controller.js'

const gameRouter = Router()

gameRouter.get('/search', searchGames)
gameRouter.get('/:gameId/prices', getGamePrices)

export default gameRouter
