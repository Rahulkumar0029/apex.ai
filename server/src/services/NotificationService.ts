import { prisma } from '../lib/prisma';
import { sendMail } from '../lib/email';
import { ForbiddenError, NotFoundError } from '../utils/errors';

/**
 * NotificationService — creates in-app notifications and dispatches emails.
 * Requirements: 12.1–12.4
 */
export class NotificationService {
  /** Create an in-app notification for a user. */
  async create(
    userId: string,
    type: string,
    message: string,
    link?: string,
  ) {
    return prisma.notification.create({
      data: { userId, type, message, link },
    });
  }

  /** Send an email notification if the user has email notifications enabled. */
  async sendEmailNotification(
    userId: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, notificationPrefs: true },
    });
    if (!user) return;

    const prefs = (user.notificationPrefs as Record<string, boolean>) ?? {};
    if (!prefs['email']) return;

    await sendMail(user.email, subject, html);
  }

  /** Mark a notification as read. Verifies ownership. */
  async markRead(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundError('Notification not found.');
    if (notification.userId !== userId) throw new ForbiddenError('Access denied.');

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /** Get all notifications for a user ordered by date descending. */
  async getForUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fire the streak milestone notification when streak reaches 7 days.
   * Requirements: 8.5
   */
  async checkStreakMilestone(userId: string, streak: number): Promise<void> {
    if (streak === 7) {
      await this.create(
        userId,
        'streak_milestone',
        '🔥 Amazing! You have a 7-day interview streak! Keep it up!',
      );
    }
  }

  /**
   * Notify user when their report is ready.
   * Requirements: 12.1
   */
  async notifyReportReady(userId: string, reportId: string, role: string): Promise<void> {
    await this.create(
      userId,
      'report_ready',
      `Your interview report for "${role}" is ready.`,
      `/report/${reportId}`,
    );
    await this.sendEmailNotification(
      userId,
      'Your Apex.ai interview report is ready',
      `<p>Your interview report for <strong>${role}</strong> is ready. <a href="${process.env['CLIENT_URL']}/report/${reportId}">View your report</a>.</p>`,
    );
  }

  /**
   * Notify user when their streak is broken.
   * Requirements: 12.2
   */
  async notifyStreakBroken(userId: string): Promise<void> {
    await this.create(
      userId,
      'streak_broken',
      "Your interview streak was broken. Get back on track today!",
    );
    await this.sendEmailNotification(
      userId,
      'Keep your momentum going on Apex.ai',
      '<p>Your interview streak was broken. Log in and complete an interview today to start a new streak!</p>',
    );
  }
}

export const notificationService = new NotificationService();
