import { Router } from 'express';
import { getSharedReportController } from '../controllers/report.controller';

const router = Router();

// Public endpoint — no auth required
router.get('/:token', getSharedReportController);

export default router;
