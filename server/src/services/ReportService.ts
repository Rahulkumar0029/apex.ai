import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { config } from '../config';

/**
 * ReportService — generates and persists interview reports.
 * Requirements: 7.1, 7.6, 7.7
 */
export class ReportService {
  /**
   * Aggregates all Response scores for a completed session and persists a Report.
   * Overall score = arithmetic mean of per-response overall scores (rounded).
   * Returns the reportId.
   */
  async generateReport(sessionId: string): Promise<string> {
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        responses: {
          include: { question: true },
          orderBy: { submittedAt: 'asc' },
        },
      },
    });

    const responses = session.responses;

    // Zero-response case: all scores = 0
    if (responses.length === 0) {
      const report = await prisma.report.upsert({
        where:  { sessionId },
        update: {},
        create: {
          sessionId,
          overallScore:        0,
          technicalScore:      0,
          communicationScore:  0,
          confidenceScore:     0,
          grammarScore:        0,
          problemSolvingScore: 0,
          strengths:    [],
          weaknesses:   ['No responses recorded'],
          suggestions:  ['Complete the interview to receive a full report.'],
          hiringDecision:     'No Hire',
          decisionExplanation: 'Candidate did not provide any responses during the interview.',
        },
      });
      return report.id;
    }

    const avg = (vals: number[]): number =>
      Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

    const technicalScore      = avg(responses.map((r) => r.technicalScore));
    const communicationScore  = avg(responses.map((r) => r.communicationScore));
    const problemSolvingScore = avg(responses.map((r) => r.problemSolvingScore));
    const grammarScore        = avg(responses.map((r) => r.grammarScore));

    // Per-response overall = mean of 4 dimensions; overall = mean of those
    const perResponseOverall = responses.map((r) =>
      Math.round(
        (r.technicalScore + r.communicationScore + r.problemSolvingScore + r.grammarScore) / 4,
      ),
    );
    const overallScore = avg(perResponseOverall);

    // Confidence = proxy from communication + grammar
    const confidenceScore = Math.round((communicationScore + grammarScore) / 2);

    // Aggregate unique strengths / improvements
    const strengths   = [...new Set(responses.flatMap((r) => r.strengths))].slice(0, 10);
    const weaknesses  = [...new Set(responses.flatMap((r) => r.improvements))].slice(0, 10);
    const suggestions = weaknesses.slice(0, 5);

    // ── Recruiter Hiring Decision Engine ─────────────────────────────────────
    // Weighted formula: 40% technical + 25% problem solving + 20% communication + 15% grammar
    const weightedScore = Math.round(
      technicalScore * 0.40 +
      problemSolvingScore * 0.25 +
      communicationScore * 0.20 +
      grammarScore * 0.15
    );

    let hiringDecision: string;
    let decisionExplanation: string;
    const company = session.company ?? 'the company';
    const recruiter = session.recruiterName ?? 'the interviewer';

    if (weightedScore >= 85) {
      hiringDecision = 'Strong Hire';
      decisionExplanation = `${recruiter} is very impressed. The candidate demonstrated exceptional technical depth, strong problem-solving instincts, and excellent communication throughout the session. ${company} should move to offer stage immediately.`;
    } else if (weightedScore >= 70) {
      hiringDecision = 'Hire';
      decisionExplanation = `${recruiter} recommends moving forward. The candidate showed solid technical competence and communicated ideas clearly. Minor gaps exist but are well within an acceptable range for the role at ${company}.`;
    } else if (weightedScore >= 55) {
      hiringDecision = 'Lean Hire';
      decisionExplanation = `${recruiter} sees potential but has reservations. The candidate has the right foundation but needs to strengthen certain technical areas and structure responses more clearly before being fully ready for ${company}.`;
    } else if (weightedScore >= 40) {
      hiringDecision = 'Lean No Hire';
      decisionExplanation = `${recruiter} is not fully convinced. The candidate struggled with key technical questions and lacked the depth expected at ${company}. Additional preparation is recommended before re-interviewing.`;
    } else {
      hiringDecision = 'No Hire';
      decisionExplanation = `${recruiter} does not recommend proceeding. The candidate showed significant gaps in technical knowledge, problem-solving, and communication. Focused preparation over several months is recommended before applying to ${company} again.`;
    }

    // ── Aggregate recruiter notebook notes from all responses ────────────────
    const recruiterNotebook = responses
      .filter((r) => r.aiNotes)
      .map((r, i) => `Q${i + 1}: ${r.aiNotes}`)
      .join('\n');

    const report = await prisma.report.upsert({
      where:  { sessionId },
      update: {
        overallScore,
        technicalScore,
        communicationScore,
        confidenceScore,
        grammarScore,
        problemSolvingScore,
        strengths,
        weaknesses,
        suggestions,
        hiringDecision,
        decisionExplanation: `${decisionExplanation}\n\n📓 Recruiter Notes:\n${recruiterNotebook || 'No notes recorded.'}`,
      },
      create: {
        sessionId,
        overallScore,
        technicalScore,
        communicationScore,
        confidenceScore,
        grammarScore,
        problemSolvingScore,
        strengths,
        weaknesses,
        suggestions,
        hiringDecision,
        decisionExplanation: `${decisionExplanation}\n\n📓 Recruiter Notes:\n${recruiterNotebook || 'No notes recorded.'}`,
      },
    });

    return report.id;
  }

  /**
   * Fetches a report by ID, verifying ownership.
   * Requirements: 7.2, 7.3
   */
  async getReport(reportId: string, userId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { session: { include: { responses: { include: { question: true } } } } },
    });
    if (!report) throw new NotFoundError('Report not found.');
    if (report.session.userId !== userId) throw new ForbiddenError('Access denied.');
    return report;
  }

  /**
   * Generates a shareable token for a report (Pro plan only).
   * Requirements: 7.5, 13.1
   */
  async generateShareToken(reportId: string, userId: string): Promise<string> {
    const report = await prisma.report.findUnique({ where: { id: reportId }, include: { session: true } });
    if (!report) throw new NotFoundError('Report not found.');
    if (report.session.userId !== userId) throw new ForbiddenError('Access denied.');

    // Check plan allows shareable links
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { planId: true } });
    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: user.planId }, select: { shareableLinksEnabled: true } });
    if (!plan.shareableLinksEnabled) throw new ForbiddenError('Shareable links require a Pro plan.');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.report.update({ where: { id: reportId }, data: { shareToken: token, shareTokenExpiresAt: expiresAt } });
    return `${config.CLIENT_URL}/shared/${token}`;
  }

  /**
   * Fetches a report via its public share token, enforcing expiry.
   * Requirements: 7.5
   */
  async getReportByShareToken(token: string) {
    const report = await prisma.report.findUnique({
      where: { shareToken: token },
      include: { session: { include: { responses: { include: { question: true } } } } },
    });
    if (!report) throw new NotFoundError('Report not found or link expired.');
    if (!report.shareTokenExpiresAt || report.shareTokenExpiresAt < new Date()) {
      throw new NotFoundError('Share link has expired.');
    }
    return report;
  }
}

export const reportService = new ReportService();
