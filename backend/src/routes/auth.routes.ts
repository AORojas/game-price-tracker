import { Router } from 'express'
import {
  currentUser,
  login,
  loginWithGoogle,
  logout,
  register,
  saveAvatar,
} from '../controllers/auth.controller.js'

const authRouter = Router()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.post('/google', loginWithGoogle)
authRouter.post('/logout', logout)
authRouter.get('/me', currentUser)
authRouter.patch('/profile/avatar', saveAvatar)

export default authRouter
