import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import type { Difficulty, InterviewType } from '@prisma/client';

interface HistoryQuery {
  page?: number;
  search?: string;
  difficulty?: string;
  interviewType?: string;
  startDate?: string;
  endDate?: string;
  minScore?: number;
  maxScore?: number;
}

const PAGE_SIZE = 20;

/**
 * HistoryService — paginated session history with search + combined filters.
 * Requirements: 10.1–10.6
 */
export class HistoryService {
  async getHistory(userId: string, query: HistoryQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const skip = (page - 1) * PAGE_SIZE;

    // Build Prisma where clause — all filters applied with AND logic
    const where: Record<string, unknown> = {
      userId,
      status: { in: ['completed', 'interrupted'] },
    };

    // Case-insensitive role search
    if (query.search) {
      where['role'] = { contains: query.search, mode: 'insensitive' };
    }

    if (query.difficulty) {
      where['difficulty'] = query.difficulty as Difficulty;
    }

    if (query.interviewType) {
      where['interviewType'] = query.interviewType as InterviewType;
    }

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter['gte'] = new Date(query.startDate);
      if (query.endDate) dateFilter['lte'] = new Date(query.endDate);
      where['createdAt'] = dateFilter;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: { report: { select: { id: true, overallScore: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.session.count({ where }),
    ]);

    // Score range filter (applied after fetch since score is in Report)
    let filtered = sessions;
    if (query.minScore !== undefined || query.maxScore !== undefined) {
      filtered = sessions.filter((s) => {
        const score = s.report?.overallScore;
        if (score === undefined || score === null) return false;
        if (query.minScore !== undefined && score < query.minScore) return false;
        if (query.maxScore !== undefined && score > query.maxScore) return false;
        return true;
      });
    }

    return {
      sessions: filtered,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  /**
   * Delete a session and all associated records (cascade via Prisma relations).
   * Verifies ownership before deletion.
   * Requirements: 10.5, 10.6
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Session not found.');
    if (session.userId !== userId) throw new ForbiddenError('Access denied.');

    // Cascade delete in correct order (Prisma cascade handles most, but explicit for safety)
    await prisma.$transaction(async (tx) => {
      await tx.response.deleteMany({ where: { sessionId } });
      await tx.question.deleteMany({ where: { sessionId } });
      await tx.report.deleteMany({ where: { sessionId } });
      await tx.session.delete({ where: { id: sessionId } });
    });
  }
}

export const historyService = new HistoryService();
