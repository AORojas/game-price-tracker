import { Router } from 'express'
import { searchGames } from '../controllers/game.controller.js'

const gameRouter = Router()

gameRouter.get('/search', searchGames)

export default gameRouter
