import { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../middlewares/authGuard';
import { uploadPhoto } from '../middlewares/upload';
import { userService } from '../services/UserService';

const router = Router();

// GET /users/me
router.get('/me', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getMe(req.userId);
    res.json(user);
  } catch (err) { next(err); }
});

// PUT /users/profile
router.put('/profile', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.updateProfile(req.userId, req.body);
    res.json(user);
  } catch (err) { next(err); }
});

// POST /users/photo
router.post('/photo', authGuard, uploadPhoto, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'NO_FILE', message: 'No photo file provided.' });
      return;
    }
    const result = await userService.uploadPhoto(req.userId, req.file);
    res.json(result);
  } catch (err) { next(err); }
});

// PUT /users/settings
router.put('/settings', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.updateSettings(req.userId, req.body);
    res.json(user);
  } catch (err) { next(err); }
});

// DELETE /users/account
router.delete('/account', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.deleteAccount(req.userId);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
