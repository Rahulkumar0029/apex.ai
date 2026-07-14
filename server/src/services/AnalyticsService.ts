import { prisma } from '../lib/prisma';

interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
}

/**
 * AnalyticsService — computes aggregated performance metrics.
 * Requirements: 9.1–9.6
 */
export class AnalyticsService {
  async getAnalytics(userId: string, query: AnalyticsQuery = {}) {
    const where: Record<string, unknown> = {
      userId,
      status: 'completed',
    };

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter['gte'] = new Date(query.startDate);
      if (query.endDate) dateFilter['lte'] = new Date(query.endDate);
      where['completedAt'] = dateFilter;
    }

    const sessions = await prisma.session.findMany({
      where,
      include: { report: true },
      orderBy: { completedAt: 'asc' },
    });

    const totalSessions = sessions.length;
    const uniqueRoles = new Set(sessions.map((s) => s.role)).size;

    // Score trend (chronological)
    const scoreTrend = sessions
      .filter((s) => s.report && s.completedAt)
      .map((s) => ({
        date: s.completedAt!.toISOString().split('T')[0],
        overallScore: s.report!.overallScore,
        role: s.role,
      }));

    // Radar chart: average per dimension
    const withReport = sessions.filter((s) => s.report);
    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const radarData = {
      technical: avg(withReport.map((s) => s.report!.technicalScore)),
      communication: avg(withReport.map((s) => s.report!.communicationScore)),
      confidence: avg(withReport.map((s) => s.report!.confidenceScore)),
      grammar: avg(withReport.map((s) => s.report!.grammarScore)),
      problemSolving: avg(withReport.map((s) => s.report!.problemSolvingScore)),
    };

    // Pie chart: sessions by interview type
    const byType: Record<string, number> = {};
    sessions.forEach((s) => {
      byType[s.interviewType] = (byType[s.interviewType] ?? 0) + 1;
    });

    // Weekly grouping
    const weeklyMap: Record<string, { scores: number[]; count: number }> = {};
    sessions.forEach((s) => {
      if (!s.completedAt) return;
      const weekStart = this.getWeekStart(s.completedAt);
      if (!weeklyMap[weekStart]) weeklyMap[weekStart] = { scores: [], count: 0 };
      weeklyMap[weekStart]!.count++;
      if (s.report) weeklyMap[weekStart]!.scores.push(s.report.overallScore);
    });
    const weekly = Object.entries(weeklyMap).map(([week, data]) => ({
      week,
      avgScore: avg(data.scores),
      count: data.count,
    }));

    // Monthly grouping
    const monthlyMap: Record<string, { scores: number[]; count: number }> = {};
    sessions.forEach((s) => {
      if (!s.completedAt) return;
      const month = s.completedAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyMap[month]) monthlyMap[month] = { scores: [], count: 0 };
      monthlyMap[month]!.count++;
      if (s.report) monthlyMap[month]!.scores.push(s.report.overallScore);
    });
    const monthly = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      avgScore: avg(data.scores),
      count: data.count,
    }));

    // By role
    const roleMap: Record<string, { scores: number[]; count: number }> = {};
    sessions.forEach((s) => {
      if (!roleMap[s.role]) roleMap[s.role] = { scores: [], count: 0 };
      roleMap[s.role]!.count++;
      if (s.report) roleMap[s.role]!.scores.push(s.report.overallScore);
    });
    const byRole = Object.entries(roleMap).map(([role, data]) => ({
      role,
      avgScore: avg(data.scores),
      count: data.count,
    }));

    // By difficulty
    const diffMap: Record<string, { scores: number[]; count: number }> = {};
    sessions.forEach((s) => {
      if (!diffMap[s.difficulty]) diffMap[s.difficulty] = { scores: [], count: 0 };
      diffMap[s.difficulty]!.count++;
      if (s.report) diffMap[s.difficulty]!.scores.push(s.report.overallScore);
    });
    const byDifficulty = Object.entries(diffMap).map(([difficulty, data]) => ({
      difficulty,
      avgScore: avg(data.scores),
      count: data.count,
    }));

    return {
      totalSessions,
      uniqueRoles,
      scoreTrend,
      radarData,
      byType,
      weekly,
      monthly,
      byRole,
      byDifficulty,
    };
  }

  private getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().split('T')[0]!;
  }
}

export const analyticsService = new AnalyticsService();
