import { prisma } from '../lib/prisma';
import { ValidationError, ForbiddenError, NotFoundError, PlanLimitError } from '../utils/errors';
import { createSessionSchema } from '../validators/interview.validators';
import type { IInterviewService, SessionConfig } from '../interfaces/IInterviewService';

/**
 * InterviewService — manages the interview session lifecycle.
 * Requirements: 2.1–2.6, 4.10, 4.13
 */
interface RecruiterPoolProfile {
  name: string;
  role: string;
  team: string;
  experienceYears: number;
}

const RECRUITER_POOLS: Record<string, RecruiterPoolProfile[]> = {
  Google: [
    { name: 'Emily Carter', role: 'Senior Software Engineer', team: 'Google Search', experienceYears: 11 },
    { name: 'Sarah Jenkins', role: 'Engineering Manager', team: 'Google Chrome', experienceYears: 8 },
    { name: 'David Miller', role: 'Staff Engineer', team: 'Google Maps', experienceYears: 15 }
  ],
  Amazon: [
    { name: 'David Johnson', role: 'Senior Engineering Manager', team: 'AWS Lambda', experienceYears: 14 },
    { name: 'Marcus Vance', role: 'SDE II', team: 'Prime Video', experienceYears: 5 },
    { name: 'Lisa Chen', role: 'Principal Engineer', team: 'Amazon Alexa', experienceYears: 18 }
  ],
  Microsoft: [
    { name: 'Michael Brown', role: 'Principal Engineer', team: 'Microsoft Azure', experienceYears: 16 },
    { name: 'Rebecca Hall', role: 'Senior Software Engineer', team: 'VS Code', experienceYears: 10 },
    { name: 'James Kim', role: 'Partner Architect', team: 'Xbox Cloud Gaming', experienceYears: 20 }
  ],
  GoldmanSachs: [
    { name: 'Alex Wong', role: 'Vice President', team: 'Core Engineering', experienceYears: 9 },
    { name: 'Elena Rostova', role: 'Managing Director', team: 'Securities Technology', experienceYears: 17 }
  ],
  Atlassian: [
    { name: 'Liam Davies', role: 'Senior Developer', team: 'Jira Software', experienceYears: 7 },
    { name: 'Chloe Watson', role: 'Principal Architect', team: 'Confluence Cloud', experienceYears: 13 }
  ],
  Startup: [
    { name: 'Samantha Vance', role: 'Co-Founder & CTO', team: 'Core Platform', experienceYears: 6 },
    { name: 'Brody Gallagher', role: 'Lead Architect', team: 'Inception Lab', experienceYears: 8 }
  ]
};

const DEFAULT_RECRUITER_POOL: RecruiterPoolProfile[] = [
  { name: 'Karen Bennett', role: 'Senior Recruiter', team: 'Talent Acquisition', experienceYears: 9 },
  { name: 'Thomas Wright', role: 'Engineering Lead', team: 'Enterprise Solutions', experienceYears: 12 },
  { name: 'Sophia Martinez', role: 'Principal Specialist', team: 'Delivery Systems', experienceYears: 15 }
];

export class InterviewService implements IInterviewService {
  /**
   * Checks whether the user has exceeded their plan's daily interview limit.
   * Throws PlanLimitError (429) if the limit is reached.
   * Requirements: 2.6
   */
  async checkPlanLimits(userId: string): Promise<void> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { planId: true },
    });

    const plan = await prisma.plan.findUniqueOrThrow({
      where: { id: user.planId },
      select: { maxInterviewsPerDay: true },
    });

    const since = new Date(Date.now() - 86_400_000); // 24 hours ago
    const count = await prisma.session.count({
      where: {
        userId,
        createdAt: { gte: since },
        status: { not: 'interrupted' },
      },
    });

    if (count >= plan.maxInterviewsPerDay) {
      throw new PlanLimitError(
        'Interview limit reached. Upgrade to Pro for unlimited interviews.',
      );
    }
  }

  /**
   * Validates the session config, enforces plan limits, and creates a new
   * Session record with status "configured".
   * Returns the new sessionId and status.
   * Requirements: 2.1–2.6, 4.13
   */
  async createSession(
    userId: string,
    config: SessionConfig,
  ): Promise<{ sessionId: string; status: string }> {
    const result = createSessionSchema.safeParse(config);
    if (!result.success) {
      const msg = result.error.errors.map((e) => e.message).join(' ');
      throw new ValidationError(msg);
    }

    await this.checkPlanLimits(userId);

    const { role, experienceYears, difficulty, interviewType, techStack, language, questionCount, company, personality } =
      result.data;

    const cleanCompany = company || 'Google';
    let poolKey = 'Default';
    const compLower = cleanCompany.toLowerCase();
    if (compLower.includes('google')) poolKey = 'Google';
    else if (compLower.includes('amazon')) poolKey = 'Amazon';
    else if (compLower.includes('microsoft')) poolKey = 'Microsoft';
    else if (compLower.includes('goldman')) poolKey = 'GoldmanSachs';
    else if (compLower.includes('atlassian')) poolKey = 'Atlassian';
    else if (compLower.includes('startup')) poolKey = 'Startup';

    const pool = RECRUITER_POOLS[poolKey] ?? DEFAULT_RECRUITER_POOL;
    const pickedRecruiter = pool[Math.floor(Math.random() * pool.length)]!;

    const session = await prisma.session.create({
      data: {
        userId,
        role,
        experienceYears,
        difficulty,
        interviewType,
        techStack,
        language,
        questionCount: questionCount ?? 8,
        company: cleanCompany,
        personality: personality || 'Professional',
        recruiterName: pickedRecruiter.name,
        recruiterRole: pickedRecruiter.role,
        recruiterTeam: pickedRecruiter.team,
        recruiterExp: pickedRecruiter.experienceYears,
        currentPhase: 'Introduction',
      },
    });

    return { sessionId: session.id, status: session.status };
  }

  /**
   * Transitions a session from "configured" → "active".
   * Verifies ownership and correct initial state.
   * Requirements: 4.1
   */
  async startSession(sessionId: string, userId: string): Promise<void> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Session not found.');
    if (session.userId !== userId) throw new ForbiddenError('Access denied.');
    // Idempotent: if session is already active (e.g. called by both REST and socket), skip silently
    if (session.status === 'active') return;
    if (session.status !== 'configured') {
      throw new ValidationError('Session is not in configured state.');
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'active' },
    });
  }

  /**
   * Marks a session as "completed" and records the completion timestamp.
   * Kicks off async report generation (wired fully in task 10.1).
   * Requirements: 4.10
   */
  async endSession(sessionId: string, userId: string): Promise<void> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Session not found.');
    if (session.userId !== userId) throw new ForbiddenError('Access denied.');

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'completed', completedAt: new Date() },
    });
  }
}

export const interviewService = new InterviewService();
