import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { ValidationError } from '../utils/errors';

/**
 * PaymentService — checkout initiation, plan activation, webhook verification.
 * Requirements: 13.2, 13.3, 13.4
 */
export class PaymentService {
  /**
   * Creates a checkout session URL.
   * In production, integrate with Stripe/Razorpay/etc.
   * Returns a redirect URL to the payment provider.
   */
  async createCheckout(userId: string): Promise<{ checkoutUrl: string }> {
    // Placeholder — replace with actual payment provider SDK call
    const successUrl = `${config.CLIENT_URL}/settings?payment=success`;
    const cancelUrl = `${config.CLIENT_URL}/settings?payment=cancelled`;
    console.log(`[PaymentService] Checkout requested for user ${userId}`);
    // In a real integration, call Stripe: stripe.checkout.sessions.create(...)
    return { checkoutUrl: `${successUrl}&mock=true` };
  }

  /**
   * Activate Pro plan for a user after successful payment.
   */
  async activatePlan(userId: string, providerPaymentId: string): Promise<void> {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { planId: 'pro' },
      }),
      prisma.payment.create({
        data: {
          userId,
          amount: 999, // $9.99 in cents
          currency: 'USD',
          provider: 'stripe',
          providerPaymentId,
          status: 'active',
        },
      }),
    ]);
  }

  /**
   * Verify webhook signature (HMAC-SHA256 against PAYMENT_WEBHOOK_SECRET).
   * Returns false if invalid — caller must return 400 and NOT update the plan.
   * Requirements: 13.3, 13.4
   */
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    if (!config.PAYMENT_WEBHOOK_SECRET) return false;
    const expected = crypto
      .createHmac('sha256', config.PAYMENT_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signatureHeader.replace('sha256=', ''), 'hex'),
      );
    } catch {
      return false;
    }
  }
}

export const paymentService = new PaymentService();
