import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { notificationService } from '../services/NotificationService';

/**
 * Nightly cron job: checks for expired Pro subscriptions and downgrades them.
 * Also fires streak-broken notifications for users who missed a day.
 * Requirements: 13.5, 12.2
 */
export function startJobs(): void {
  // Run every day at 00:05 UTC
  cron.schedule('5 0 * * *', async () => {
    console.log('[CronJob] Running nightly plan expiry + streak check...');

    try {
      // ── Plan expiry ──────────────────────────────────────────────────────
      // Find payments that are 'active' but subscription period has ended
      // (simplified: check payments older than 30 days — replace with real billing period)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const expiredPayments = await prisma.payment.findMany({
        where: { status: 'active', createdAt: { lte: thirtyDaysAgo } },
        include: { user: true },
      });

      for (const payment of expiredPayments) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: payment.userId }, data: { planId: 'free' } }),
          prisma.payment.update({ where: { id: payment.id }, data: { status: 'expired' } }),
        ]);
        await notificationService.create(
          payment.userId,
          'plan_expired',
          'Your Pro subscription has ended. Upgrade again to regain access to all features.',
        );
        console.log(`[CronJob] Downgraded user ${payment.userId} to free plan.`);
      }

      // ── Streak broken check ───────────────────────────────────────────────
      // Find users who had a session yesterday but NOT today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today.getTime() - 86_400_000);

      // Users who completed a session yesterday but not today
      const usersWithYesterdaySession = await prisma.session.findMany({
        where: { status: 'completed', completedAt: { gte: yesterday, lt: today } },
        select: { userId: true },
        distinct: ['userId'],
      });

      for (const { userId } of usersWithYesterdaySession) {
        const todaySession = await prisma.session.findFirst({
          where: { userId, status: 'completed', completedAt: { gte: today } },
        });
        if (!todaySession) {
          await notificationService.notifyStreakBroken(userId);
        }
      }

      console.log('[CronJob] Nightly jobs complete.');
    } catch (err) {
      console.error('[CronJob] Error in nightly job:', err);
    }
  });

  console.log('[CronJob] Nightly jobs scheduled.');
}
