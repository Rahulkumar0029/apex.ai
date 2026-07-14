import { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../middlewares/authGuard';
import { dashboardService } from '../services/DashboardService';

const router = Router();

router.get('/', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dashboardService.getDashboard(req.userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
