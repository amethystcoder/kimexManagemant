import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { loginUser, registerUser, logoutUser, getUserProfile, updateUserProfile, deleteUserAccount, changeUserPassword, getMe } from '../controllers/auth';

const authRouter = Router();

authRouter.get('/me', requireAuth, getMe);
authRouter.post("/login", loginUser);
authRouter.post("/register", registerUser);
authRouter.post('/logout', requireAuth, logoutUser);
authRouter.get('/profile', requireAuth, getUserProfile);
authRouter.put('/profile', requireAuth, updateUserProfile);
authRouter.delete('/account', requireAuth, deleteUserAccount);
authRouter.patch('/password', requireAuth, changeUserPassword);

export default authRouter;