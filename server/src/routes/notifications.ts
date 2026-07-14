import { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../middlewares/authGuard';
import { notificationService } from '../services/NotificationService';

const router = Router();

// GET /notifications
router.get('/', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationService.getForUser(req.userId);
    res.json(notifications);
  } catch (err) { next(err); }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markRead(req.params['id'] as string, req.userId);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
