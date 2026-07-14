import { Server } from 'socket.io';
import { prisma } from '../lib/prisma';
import { interviewService } from '../services/InterviewService';
import { reportService } from '../services/ReportService';
import { aiEngine } from '../services/ai';
import { onSocketReconnect } from './reconnectionManager';
import type { ServerToClientEvents, ClientToServerEvents } from './types';
import type { AuthenticatedSocket } from './index';

// ──────────────────────────────────────────────────────────────────────────────
// Interview Phase Ladder — maps question index to phase name
// ──────────────────────────────────────────────────────────────────────────────
const PHASE_LADDER: string[] = [
  'Introduction',      // 0  — recruiter greeting + "Shall we begin?"
  'Warm-up',           // 1  — "Tell me about yourself"
  'Warm-up',           // 2  — "What motivated you to apply?"
  'Technical',         // 3  — core tech question
  'Technical',         // 4  — second tech question
  'Deep Technical',    // 5  — "Why did you choose X over Y?"
  'Behavioral',        // 6  — STAR / leadership / collaboration
  'Scenario-Based',    // 7  — scaling / 100x traffic scenario
  'Candidate Questions', // 8 — "Do you have any questions for me?"
  'Closing',           // 9  — wrap-up
];

export function resolvePhase(questionIndex: number, totalQuestions: number): string {
  // Distribute phases proportionally if questionCount != 10
  const ratio = questionIndex / Math.max(totalQuestions - 1, 1);
  const idx = Math.round(ratio * (PHASE_LADDER.length - 1));
  return PHASE_LADDER[Math.min(idx, PHASE_LADDER.length - 1)] ?? 'Technical';
}

// ──────────────────────────────────────────────────────────────────────────────
// Stress level: 1-5 scale, increases as candidate performs well
// ──────────────────────────────────────────────────────────────────────────────
function calcStressLevel(avgScore: number): number {
  if (avgScore >= 85) return 5;
  if (avgScore >= 70) return 4;
  if (avgScore >= 55) return 3;
  if (avgScore >= 40) return 2;
  return 1;
}

export function registerInterviewHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
): void {

  // ── ready ────────────────────────────────────────────────────────────────
  socket.on('ready', async ({ sessionId }) => {
    try {
      socket.activeSessionId = sessionId;
      onSocketReconnect(sessionId);

      await interviewService.startSession(sessionId, socket.userId);

      const [session, user] = await Promise.all([
        prisma.session.findUniqueOrThrow({
          where: { id: sessionId },
          select: {
            questionCount:  true,
            role:           true,
            difficulty:     true,
            interviewType:  true,
            techStack:      true,
            language:       true,
            experienceYears: true,
            company:        true,
            personality:    true,
            recruiterName:  true,
            recruiterRole:  true,
            recruiterTeam:  true,
            recruiterExp:   true,
            currentPhase:   true,
          },
        }),
        prisma.user.findUnique({
          where: { id: socket.userId },
          select: { displayName: true },
        }),
      ]);
      const candidateName = user?.displayName ?? undefined;

      socket.join(`session:${sessionId}`);

      // Emit recruiter identity with startInterview event
      socket.emit('startInterview', {
        sessionId,
        questionCount:  session.questionCount,
        recruiterName:  session.recruiterName  ?? 'Emily Carter',
        recruiterRole:  session.recruiterRole  ?? 'Senior Software Engineer',
        recruiterTeam:  session.recruiterTeam  ?? 'Core Systems',
        recruiterExp:   session.recruiterExp   ?? 10,
        company:        session.company        ?? 'Google',
        personality:    session.personality    ?? 'Professional',
      });

      socket.emit('thinking', { state: 'followup' });

      // Phase 0 = Introduction — recruiter greets candidate by name
      const phase = resolvePhase(0, session.questionCount);
      await prisma.session.update({ where: { id: sessionId }, data: { currentPhase: phase } });

      const generated = await aiEngine.generateQuestion({
        role:             session.role,
        experienceYears:  session.experienceYears,
        difficulty:       session.difficulty,
        interviewType:    session.interviewType,
        techStack:        session.techStack,
        language:         session.language,
        questionIndex:    0,
        company:          session.company        ?? undefined,
        personality:      session.personality    ?? undefined,
        recruiterName:    session.recruiterName  ?? undefined,
        recruiterRole:    session.recruiterRole  ?? undefined,
        recruiterTeam:    session.recruiterTeam  ?? undefined,
        recruiterExp:     session.recruiterExp   ?? undefined,
        currentPhase:     phase,
        history:          [],
        previousTranscript: '',
        stressLevel:      1,
        candidateName,
      });

      const dbQuestion = await prisma.question.create({
        data: { sessionId, text: generated.text, orderIndex: 0 },
      });

      socket.emit('question', {
        questionId:   dbQuestion.id,
        text:         dbQuestion.text,
        audioUrl:     '',
        orderIndex:   0,
        timeLimit:    phase === 'Introduction' ? 30 : 120,
        currentPhase: phase,
      });

    } catch (err) {
      socket.emit('error', { message: (err as Error).message, code: 'SESSION_ERROR' });
    }
  });

  // ── answer ───────────────────────────────────────────────────────────────
  socket.on('answer', async ({ sessionId, questionId, transcript, durationSeconds }) => {
    try {
      // Verify ownership
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session || session.userId !== socket.userId) {
        socket.emit('error', { message: 'Access denied.', code: 'FORBIDDEN' });
        return;
      }

      // Ensure question exists in DB
      const questionExists = await prisma.question.findUnique({ where: { id: questionId } });
      if (!questionExists) {
        socket.emit('error', { message: `Question not found: ${questionId}`, code: 'NOT_FOUND' });
        return;
      }

      // Persist response (placeholder scores — will be updated after eval)
      await prisma.response.upsert({
        where:  { questionId },
        update: { transcript, durationSeconds },
        create: {
          sessionId,
          questionId,
          transcript,
          durationSeconds,
          technicalScore:      0,
          communicationScore:  0,
          problemSolvingScore: 0,
          grammarScore:        0,
          strengths:           [],
          improvements:        [],
        },
      });

      socket.emit('thinking', { state: 'analyzing' });

      // ── Fetch current question for evaluation context
      const question = await prisma.question.findUnique({ where: { id: questionId } });

      // ── Build full conversation MEMORY from DB
      const allResponses = await prisma.response.findMany({
        where:   { sessionId },
        include: { question: true },
        orderBy: { question: { orderIndex: 'asc' } },
      });

      const history = allResponses.map((r) => ({
        question: r.question.text,
        answer:   r.transcript,
      }));

      // ── Compute rolling average score to calibrate stress level
      const scoresForStress = allResponses
        .filter((r) => r.technicalScore > 0)
        .map((r) => (r.technicalScore + r.communicationScore + r.problemSolvingScore + r.grammarScore) / 4);

      const avgScore = scoresForStress.length
        ? scoresForStress.reduce((a, b) => a + b, 0) / scoresForStress.length
        : 50;
      const stressLevel = calcStressLevel(avgScore);

      // ── Evaluate response via AI — includes aiNotes
      const evaluation = await aiEngine.evaluateResponse(transcript, {
        role:         session.role,
        difficulty:   session.difficulty,
        questionText: question?.text ?? '',
        language:     session.language,
        company:      session.company        ?? undefined,
        personality:  session.personality    ?? undefined,
        currentPhase: session.currentPhase   ?? 'Technical',
        stressLevel,
      });

      // Persist evaluation scores + recruiter notebook (aiNotes)
      await prisma.response.update({
        where: { questionId },
        data:  {
          technicalScore:      evaluation.technicalScore,
          communicationScore:  evaluation.communicationScore,
          problemSolvingScore: evaluation.problemSolvingScore,
          grammarScore:        evaluation.grammarScore,
          strengths:           evaluation.strengths,
          improvements:        evaluation.improvements,
          aiNotes:             evaluation.aiNotes,
        },
      });

      // ── Count answered questions
      const answeredCount = await prisma.response.count({ where: { sessionId } });
      const totalQuestions = session.questionCount;

      if (answeredCount >= totalQuestions) {
        // ── All done → generate report
        socket.emit('thinking', { state: 'feedback' });
        await interviewService.endSession(sessionId, socket.userId);
        try {
          const reportId = await reportService.generateReport(sessionId);
          socket.emit('report', { reportId });
        } catch {
          socket.emit('error', { message: 'Report generation failed.', code: 'REPORT_ERROR' });
        }
      } else {
        // ── Next question — advance phase
        socket.emit('thinking', { state: 'followup' });

        const nextPhase = resolvePhase(answeredCount, totalQuestions);
        await prisma.session.update({ where: { id: sessionId }, data: { currentPhase: nextPhase } });

        const nextGenerated = await aiEngine.generateQuestion({
          role:               session.role,
          experienceYears:    session.experienceYears,
          difficulty:         session.difficulty,
          interviewType:      session.interviewType,
          techStack:          session.techStack,
          language:           session.language,
          previousTranscript: transcript,
          questionIndex:      answeredCount,
          company:            session.company       ?? undefined,
          personality:        session.personality   ?? undefined,
          recruiterName:      session.recruiterName ?? undefined,
          recruiterRole:      session.recruiterRole ?? undefined,
          recruiterTeam:      session.recruiterTeam ?? undefined,
          recruiterExp:       session.recruiterExp  ?? undefined,
          currentPhase:       nextPhase,
          history,
          stressLevel,
        });

        const nextDbQuestion = await prisma.question.create({
          data: { sessionId, text: nextGenerated.text, orderIndex: answeredCount },
        });

        socket.emit('nextQuestion', {
          questionId:   nextDbQuestion.id,
          text:         nextDbQuestion.text,
          audioUrl:     '',
          orderIndex:   answeredCount,
          timeLimit:    nextPhase === 'Closing' || nextPhase === 'Candidate Questions' ? 60 : 120,
          currentPhase: nextPhase,
        });
      }
    } catch (err) {
      socket.emit('error', { message: (err as Error).message, code: 'ANSWER_ERROR' });
    }
  });

  // ── endInterview ─────────────────────────────────────────────────────────
  socket.on('endInterview', async ({ sessionId }) => {
    try {
      await interviewService.endSession(sessionId, socket.userId);
      try {
        const reportId = await reportService.generateReport(sessionId);
        socket.emit('report', { reportId });
      } catch {
        socket.emit('report', { reportId: '' }); // report pending generation
      }
    } catch (err) {
      socket.emit('error', { message: (err as Error).message, code: 'END_ERROR' });
    }
  });
}
