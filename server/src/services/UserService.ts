import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { uploadToCloudinary } from '../lib/cloudinary';
import { ValidationError, NotFoundError } from '../utils/errors';
import { interviewService } from './InterviewService';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  college: z.string().max(200).optional(),
  yearsOfExperience: z.number().int().min(0).max(30).optional(),
  skills: z.array(z.string()).optional(),
  resumeUrl: z.string().url().optional().or(z.literal('')),
});

const updateSettingsSchema = z.object({
  themePreference: z.enum(['light', 'dark', 'system']).optional(),
  notificationPrefs: z.record(z.boolean()).optional(),
  aiVoicePreference: z.string().optional(),
  language: z.string().optional(),
});

/**
 * UserService — profile updates, settings, photo upload, account deletion.
 * Requirements: 11.1–11.9
 */
export class UserService {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, displayName: true, photoUrl: true,
        college: true, yearsOfExperience: true, skills: true,
        resumeUrl: true, planId: true, googleId: true,
        themePreference: true, notificationPrefs: true,
        aiVoicePreference: true, language: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }

  async updateProfile(userId: string, body: unknown) {
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.errors.map((e) => e.message).join(' '));
    }
    const data = result.data;
    const user = await prisma.user.update({ where: { id: userId }, data });
    return user;
  }

  async uploadPhoto(userId: string, file: Express.Multer.File) {
    const url = await uploadToCloudinary(file.buffer, 'apex-ai/avatars', `user-${userId}`);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { photoUrl: url },
    });
    return { photoUrl: user.photoUrl };
  }

  async updateSettings(userId: string, body: unknown) {
    const result = updateSettingsSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.errors.map((e) => e.message).join(' '));
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: result.data,
    });
    return user;
  }

  async deleteAccount(userId: string): Promise<void> {
    // Terminate any active session first
    const activeSession = await prisma.session.findFirst({
      where: { userId, status: 'active' },
    });
    if (activeSession) {
      await interviewService.endSession(activeSession.id, userId).catch(() => {});
    }

    // Cascade delete all user data in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.activityLog.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.payment.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });

      // Get all session IDs for this user
      const sessions = await tx.session.findMany({
        where: { userId },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      await tx.response.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.question.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.report.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }
}

export const userService = new UserService();
