import { Router } from 'express'
import {
  addSearch,
  createAlert,
  getActivity,
  getAlerts,
  getFavorites,
  getSavedOffers,
  getSearchHistory,
  removeAlert,
  removeFavorite,
  removeSavedOffer,
  saveOffer,
  toggleFavorite,
  updateAlert,
} from '../controllers/userActivity.controller.js'
import { requireAuthenticatedUser } from '../middleware/requireAuthenticatedUser.js'

const userActivityRouter = Router()

userActivityRouter.use(requireAuthenticatedUser)
userActivityRouter.get('/', getActivity)
userActivityRouter.get('/favorites', getFavorites)
userActivityRouter.post('/favorites', toggleFavorite)
userActivityRouter.delete('/favorites/:favoriteId', removeFavorite)
userActivityRouter.get('/alerts', getAlerts)
userActivityRouter.post('/alerts', createAlert)
userActivityRouter.patch('/alerts/:alertId', updateAlert)
userActivityRouter.delete('/alerts/:alertId', removeAlert)
userActivityRouter.get('/saved-offers', getSavedOffers)
userActivityRouter.post('/saved-offers', saveOffer)
userActivityRouter.delete('/saved-offers/:savedOfferId', removeSavedOffer)
userActivityRouter.get('/search-history', getSearchHistory)
userActivityRouter.post('/search-history', addSearch)

export default userActivityRouter
