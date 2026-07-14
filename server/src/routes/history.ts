import { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../middlewares/authGuard';
import { historyService } from '../services/HistoryService';

const router = Router();

// GET /history — paginated list with search + filters
router.get('/', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page,
      search,
      difficulty,
      interviewType,
      startDate,
      endDate,
      minScore,
      maxScore,
    } = req.query as Record<string, string>;

    const data = await historyService.getHistory(req.userId, {
      page: page ? parseInt(page, 10) : 1,
      search,
      difficulty,
      interviewType,
      startDate,
      endDate,
      minScore: minScore ? parseInt(minScore, 10) : undefined,
      maxScore: maxScore ? parseInt(maxScore, 10) : undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /history/:id — delete session with cascade
router.delete('/:id', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await historyService.deleteSession(req.params['id'] as string, req.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
