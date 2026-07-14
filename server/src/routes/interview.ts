import { Router } from 'express';
import { authGuard } from '../middlewares/authGuard';
import { planGuard } from '../middlewares/planGuard';
import * as ctrl from '../controllers/interview.controller';

const router = Router();
router.post('/:id/speech-event', ctrl.recordSpeechEventController);
router.get('/:id/agent-session', ctrl.getAgentSessionController);
router.use(authGuard);  // all interview routes require auth
router.post('/create', planGuard, ctrl.createSessionController);
router.post('/:id/start', ctrl.startSessionController);
router.post('/:id/end', ctrl.endSessionController);
router.get('/:id/livekit-token', ctrl.getLiveKitTokenController);
router.get('/:id', ctrl.getSessionController);
export default router;
