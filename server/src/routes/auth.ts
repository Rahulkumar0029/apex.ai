import { Router } from 'express';
import { authRateLimiter } from '../middlewares/rateLimiter';
import * as authCtrl from '../controllers/auth.controller';

const router = Router();

router.post('/register', authRateLimiter, authCtrl.registerController);
router.post('/login', authRateLimiter, authCtrl.loginController);
router.post('/logout', authCtrl.logoutController);
router.post('/refresh', authCtrl.refreshController);
router.get('/google', authCtrl.googleRedirectController);
router.get('/google/callback', authCtrl.googleCallbackController);
router.post('/forgot-password', authRateLimiter, authCtrl.forgotPasswordController);
router.post('/reset-password', authRateLimiter, authCtrl.resetPasswordController);

export default router;
