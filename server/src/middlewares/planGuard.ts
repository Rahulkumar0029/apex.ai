import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { PlanLimitError } from '../utils/errors';

/**
 * Plan guard middleware.
 * Checks whether the authenticated user has exceeded their plan's daily
 * interview limit before allowing session creation.
 *
 * Requires authGuard to have run first (req.userId must be set).
 * Throws PlanLimitError when the daily cap is reached.
 */
export async function planGuard(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;

    // Count sessions created in the last 24 hours that are not interrupted
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [sessionCount, user] = await Promise.all([
      prisma.session.count({
        where: {
          userId,
          createdAt: { gte: since },
          status: { not: 'interrupted' },
        },
      }),
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { planId: true },
      }),
    ]);

    const plan = await prisma.plan.findUniqueOrThrow({
      where: { id: user.planId },
      select: { maxInterviewsPerDay: true },
    });

    if (sessionCount >= plan.maxInterviewsPerDay) {
      return next(
        new PlanLimitError(
          'Interview limit reached for your plan. Upgrade to Pro for unlimited interviews.',
        ),
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}
