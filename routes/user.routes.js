import express from 'express'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { addUserSubscriptions, deleteUserSubscription, editUserSubscription, getUserProfile, getUserSubscriptionById, getUserSubscriptions, markSubsCriptionAsDone } from '../controllers/user.controllers.js';

const router = express.Router();

router.get('/profile',authenticateJWT,getUserProfile);
router.get('/home', authenticateJWT, getUserSubscriptions);
router.get('/subs/:id', authenticateJWT, getUserSubscriptionById);

router.patch('/subs/:id', authenticateJWT, editUserSubscription);
router.patch('/subs/:id/done', authenticateJWT, markSubsCriptionAsDone);

router.post('/subs', authenticateJWT, addUserSubscriptions);

router.delete('/subs/:id', authenticateJWT, deleteUserSubscription);

export default router;