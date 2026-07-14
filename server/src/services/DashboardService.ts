import { prisma } from '../lib/prisma';
import { aiEngine } from './ai';
import { notificationService } from './NotificationService';

/**
 * DashboardService — aggregates stats shown on the user dashboard.
 * Requirements: 8.1–8.3, 8.5, 8.6
 */
export class DashboardService {
  async getDashboard(userId: string) {
    // Fetch all completed sessions ordered by date
    const sessions = await prisma.session.findMany({
      where: { userId, status: 'completed' },
      include: { report: true },
      orderBy: { completedAt: 'desc' },
    });

    const totalInterviews = sessions.length;

    // Average overall score
    const sessionsWithReport = sessions.filter((s) => s.report !== null);
    const avgScore =
      sessionsWithReport.length > 0
        ? Math.round(
            sessionsWithReport.reduce((sum, s) => sum + (s.report?.overallScore ?? 0), 0) /
              sessionsWithReport.length,
          )
        : 0;

    // Streak: consecutive days with ≥1 completed session
    const streak = this.computeStreak(sessions.map((s) => s.completedAt).filter(Boolean) as Date[]);

    // Weekly chart: last 7 days × avg score per day
    const weeklyChart = this.buildWeeklyChart(sessions);

    // 5 most recent sessions
    const recentSessions = sessions.slice(0, 5).map((s) => ({
      id: s.id,
      role: s.role,
      difficulty: s.difficulty,
      completedAt: s.completedAt,
      overallScore: s.report?.overallScore ?? null,
    }));

    // AI suggestions based on recent roles and scores
    const recentRoles = sessions.slice(0, 5).map((s) => s.role);
    const recentScores = sessionsWithReport.slice(0, 10).map((s) => s.report!.overallScore);
    let suggestions: string[] = [];
    try {
      suggestions = await aiEngine.generateDashboardSuggestions(recentRoles, recentScores);
    } catch {
      suggestions = ['Keep practicing regularly', 'Review feedback from past interviews'];
    }

    // Check streak milestone and fire notification asynchronously
    setImmediate(() => {
      notificationService.checkStreakMilestone(userId, streak).catch(() => {});
    });

    return {
      totalInterviews,
      avgScore,
      streak,
      weeklyChart,
      recentSessions,
      suggestions,
      streakMilestone: streak >= 7,
    };
  }

  private computeStreak(dates: Date[]): number {
    if (dates.length === 0) return 0;

    // Get unique calendar days (YYYY-MM-DD) sorted descending
    const days = [
      ...new Set(dates.map((d) => d.toISOString().split('T')[0])),
    ].sort((a, b) => (a! > b! ? -1 : 1));

    const today = new Date().toISOString().split('T')[0]!;
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]!;

    // Streak must include today or yesterday to be active
    if (days[0] !== today && days[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]!);
      const curr = new Date(days[i]!);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  private buildWeeklyChart(
    sessions: Array<{ completedAt: Date | null; report: { overallScore: number } | null }>,
  ) {
    const chart: { date: string; avgScore: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86_400_000);
      const dateStr = date.toISOString().split('T')[0]!;
      const daySessions = sessions.filter(
        (s) => s.completedAt && s.completedAt.toISOString().split('T')[0] === dateStr,
      );
      const scores = daySessions
        .filter((s) => s.report !== null)
        .map((s) => s.report!.overallScore);
      const avgScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      chart.push({ date: dateStr, avgScore, count: daySessions.length });
    }
    return chart;
  }
}

export const dashboardService = new DashboardService();
