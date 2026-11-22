import { Router } from 'express'
import {
  currentUser,
  forgotPassword,
  login,
  loginWithGoogle,
  logout,
  recoverWithGoogle,
  register,
  resetPassword,
  saveAvatar,
} from '../controllers/auth.controller.js'

const authRouter = Router()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.post('/google', loginWithGoogle)
authRouter.post('/forgot-password', forgotPassword)
authRouter.post('/recover-with-google', recoverWithGoogle)
authRouter.post('/reset-password', resetPassword)
authRouter.post('/logout', logout)
authRouter.get('/me', currentUser)
authRouter.patch('/profile/avatar', saveAvatar)

export default authRouter
