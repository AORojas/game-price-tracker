import { Router } from 'express'
import { getUsdArsRate } from '../controllers/exchangeRate.controller.js'

const exchangeRateRouter = Router()

exchangeRateRouter.get('/usd-ars', getUsdArsRate)

export default exchangeRateRouter
