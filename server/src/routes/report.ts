import { Router } from 'express';
import { authGuard } from '../middlewares/authGuard';
import * as reportCtrl from '../controllers/report.controller';

const router = Router();

router.get('/:id', authGuard, reportCtrl.getReportController);
router.get('/:id/pdf', authGuard, reportCtrl.getReportPDFController);
router.post('/:id/share', authGuard, reportCtrl.shareReportController);

export default router;
