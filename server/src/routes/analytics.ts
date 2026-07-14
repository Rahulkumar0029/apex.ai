import { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../middlewares/authGuard';
import { analyticsService } from '../services/AnalyticsService';

const router = Router();

router.get('/', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const data = await analyticsService.getAnalytics(req.userId, { startDate, endDate });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
