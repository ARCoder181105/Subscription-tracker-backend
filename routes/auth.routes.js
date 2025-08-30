import express from 'express'
import { upload } from '../middlewares/multer.middleware.js';
import { loginUser, registerUser, googleAuthCallback, githubAuthCallback, getNewAcessToken, logoutUser } from '../controllers/auth.controllers.js';
import passport from 'passport'
import { ApiError } from '../utils/ApiError.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();


router.post('/register', upload.single('avatar'), registerUser);
router.post('/login', loginUser)
router.get('/refresh',getNewAcessToken)
router.get('/logout',authenticateJWT,logoutUser);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/api/v1/auth/google/failure" }), googleAuthCallback);
router.get("/google/failure", (req, res, next) => { next(new ApiError(400, "Unable to login with google")); });

router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get("/github/callback", passport.authenticate("github", { failureRedirect: "/api/v1/auth/github/failure" }), githubAuthCallback);
router.get("/google/failure", (req, res, next) => { next(new ApiError(400, "Unable to login with github")); });

export default router;