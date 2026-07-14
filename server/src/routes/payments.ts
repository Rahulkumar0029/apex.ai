import express, { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../middlewares/authGuard';
import { paymentService } from '../services/PaymentService';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /payments/plans — list available plans
router.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.plan.findMany();
    res.json(plans);
  } catch (err) { next(err); }
});

// POST /payments/checkout — initiate checkout session
router.post('/checkout', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await paymentService.createCheckout(req.userId);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /payments/webhook — receive payment provider webhook
// Uses raw body parser so we can verify signature
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sig = req.headers['x-webhook-signature'] as string ?? '';
      const rawBody = req.body as Buffer;

      if (!paymentService.verifyWebhookSignature(rawBody, sig)) {
        console.warn('[PaymentWebhook] Invalid signature — rejecting request.');
        res.status(400).json({ error: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' });
        return;
      }

      const payload = JSON.parse(rawBody.toString()) as {
        event: string;
        userId?: string;
        paymentId?: string;
      };

      if (payload.event === 'payment.success' && payload.userId && payload.paymentId) {
        await paymentService.activatePlan(payload.userId, payload.paymentId);
      }

      res.json({ received: true });
    } catch (err) { next(err); }
  }
);

export default router;
