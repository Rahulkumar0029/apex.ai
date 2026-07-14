import { Request, Response, NextFunction } from 'express';
import { interviewService } from '../services/InterviewService';

export async function createSessionController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await interviewService.createSession(req.userId, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function startSessionController(req: Request, res: Response, next: NextFunction) {
  try {
    await interviewService.startSession(req.params['id'] as string, req.userId);
    res.status(200).json({ message: 'Session started.' });
  } catch (err) { next(err); }
}

export async function endSessionController(req: Request, res: Response, next: NextFunction) {
  try {
    await interviewService.endSession(req.params['id'] as string, req.userId);
    res.status(200).json({ message: 'Session ended.' });
  } catch (err) { next(err); }
}

export async function getSessionController(req: Request, res: Response, next: NextFunction) {
  try {
    const { prisma } = await import('../lib/prisma');
    const { ForbiddenError, NotFoundError } = await import('../utils/errors');
    const session = await prisma.session.findUnique({ where: { id: req.params['id'] as string }, include: { questions: true } });
    if (!session) throw new NotFoundError('Session not found.');
    if (session.userId !== req.userId) throw new ForbiddenError('Access denied.');
    res.status(200).json(session);
  } catch (err) { next(err); }
}

export async function getLiveKitTokenController(req: Request, res: Response, next: NextFunction) {
  try {
    const { AccessToken } = await import('livekit-server-sdk');
    const { config } = await import('../config');
    const { prisma } = await import('../lib/prisma');
    const { ForbiddenError, NotFoundError } = await import('../utils/errors');

    const sessionId = req.params['id'] as string;
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Session not found.');
    if (session.userId !== req.userId) throw new ForbiddenError('Access denied.');

    const apiKey = config.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = config.LIVEKIT_API_SECRET || 'secret';
    const livekitUrl = config.LIVEKIT_URL || 'ws://localhost:7880';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `candidate-${req.userId}`,
    });

    at.addGrant({
      roomJoin: true,
      room: `session-${sessionId}`,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    res.status(200).json({ token, serverUrl: livekitUrl });
  } catch (err) {
    next(err);
  }
}

export async function recordSpeechEventController(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const sessionId = req.params['id'] as string;
  const { questionId, candidateTranscript, durationSeconds } = req.body;

  console.log(`[${timestamp}] [SESSION] Speech webhook triggered for session: ${sessionId}`);
  console.log(`[${timestamp}] [SESSION] Payload - QuestionId: ${questionId}, Duration: ${durationSeconds}s`);

  try {
    const { prisma } = await import('../lib/prisma');
    const { aiEngine } = await import('../services/ai');
    const { reportService } = await import('../services/ReportService');
    const { resolvePhase } = await import('../socket/interviewHandlers');

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { questions: true }
    });

    if (!session) {
      console.error(`[${timestamp}] [SESSION] Session not found: ${sessionId}`);
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    // Identify the target question
    let question = session.questions.find((q) => q.id === questionId);
    if (!question) {
      console.warn(`[${timestamp}] [SESSION] QuestionId ${questionId} not found in DB. Resolving latest unanswered question.`);
      const answeredIds = (await prisma.response.findMany({
        where: { sessionId },
        select: { questionId: true }
      })).map((r) => r.questionId);

      question = session.questions
        .filter((q) => !answeredIds.includes(q.id))
        .sort((a, b) => a.orderIndex - b.orderIndex)[0];
    }

    if (!question) {
      console.error(`[${timestamp}] [SESSION] No active question found to link candidate response.`);
      res.status(400).json({ error: 'No active question found to answer.' });
      return;
    }

    console.log(`[${timestamp}] [QUESTION] Candidate is answering question ID: ${question.id}`);
    console.log(`[${timestamp}] [QUESTION] Question Text: "${question.text}"`);
    console.log(`[${timestamp}] [DEEPGRAM] Candidate Transcript: "${candidateTranscript}"`);

    const io = req.app.get('io');
    if (io) {
      console.log(`[${timestamp}] [SOCKET] Emitting thinking state: analyzing`);
      io.to(`session:${sessionId}`).emit('thinking', { state: 'analyzing' });
    }

    // Link the response to the existing question (avoid duplicate question creation)
    const dbResponse = await prisma.response.upsert({
      where: { questionId: question.id },
      update: {
        transcript: candidateTranscript || '',
        durationSeconds: durationSeconds || 30,
      },
      create: {
        sessionId,
        questionId: question.id,
        transcript: candidateTranscript || '',
        durationSeconds: durationSeconds || 30,
        technicalScore: 0,
        communicationScore: 0,
        problemSolvingScore: 0,
        grammarScore: 0,
        strengths: [],
        improvements: [],
      },
    });

    // Evaluate response using Gemini
    console.log(`[${timestamp}] [EVALUATION] Requesting Gemini evaluation...`);
    const evaluation = await aiEngine.evaluateResponse(candidateTranscript || '', {
      role: session.role,
      difficulty: session.difficulty,
      questionText: question.text,
      language: session.language,
      company: session.company || 'Google',
      personality: session.personality || 'Friendly',
      currentPhase: session.currentPhase || 'Technical',
      stressLevel: 3,
    });

    console.log(`[${timestamp}] [EVALUATION] Scores returned - Tech: ${evaluation.technicalScore}, Comm: ${evaluation.communicationScore}`);

    // Update response scores
    await prisma.response.update({
      where: { id: dbResponse.id },
      data: {
        technicalScore: evaluation.technicalScore,
        communicationScore: evaluation.communicationScore,
        problemSolvingScore: evaluation.problemSolvingScore,
        grammarScore: evaluation.grammarScore,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        aiNotes: evaluation.aiNotes,
      },
    });

    const answeredCount = await prisma.response.count({ where: { sessionId } });
    console.log(`[${timestamp}] [SESSION] Candidate answered ${answeredCount}/${session.questionCount} questions`);

    if (answeredCount >= session.questionCount) {
      console.log(`[${timestamp}] [REPORT] Interview complete. Generating final report...`);
      if (io) {
        io.to(`session:${sessionId}`).emit('thinking', { state: 'feedback' });
      }

      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'completed', completedAt: new Date() },
      });

      const reportId = await reportService.generateReport(sessionId);
      console.log(`[${timestamp}] [REPORT] Final report created successfully: ${reportId}`);

      if (io) {
        console.log(`[${timestamp}] [SOCKET] Emitting final report redirect event`);
        io.to(`session:${sessionId}`).emit('report', { reportId });
      }

      res.status(200).json({ success: true, completed: true, reportId });
      return;
    }

    // Generate next question
    if (io) {
      io.to(`session:${sessionId}`).emit('thinking', { state: 'followup' });
    }

    const nextPhase = resolvePhase(answeredCount, session.questionCount);
    await prisma.session.update({
      where: { id: sessionId },
      data: { currentPhase: nextPhase },
    });

    // Fetch history for Gemini memory context
    const allResponses = await prisma.response.findMany({
      where: { sessionId },
      include: { question: true },
      orderBy: { question: { orderIndex: 'asc' } },
    });
    const history = allResponses.map((r) => ({
      question: r.question.text,
      answer: r.transcript,
    }));

    console.log(`[${timestamp}] [GEMINI] Generating next question for phase: ${nextPhase}`);
    const nextGenerated = await aiEngine.generateQuestion({
      role: session.role,
      experienceYears: session.experienceYears,
      difficulty: session.difficulty,
      interviewType: session.interviewType,
      techStack: session.techStack,
      language: session.language,
      questionIndex: answeredCount,
      company: session.company || undefined,
      personality: session.personality || undefined,
      recruiterName: session.recruiterName || undefined,
      recruiterRole: session.recruiterRole || undefined,
      recruiterTeam: session.recruiterTeam || undefined,
      recruiterExp: session.recruiterExp || undefined,
      currentPhase: nextPhase,
      history,
      previousTranscript: candidateTranscript || '',
      stressLevel: 3,
    });

    const nextDbQuestion = await prisma.question.create({
      data: {
        sessionId,
        text: nextGenerated.text,
        orderIndex: answeredCount,
      },
    });

    console.log(`[${timestamp}] [QUESTION] Stored next question ID: ${nextDbQuestion.id}`);

    if (io) {
      console.log(`[${timestamp}] [SOCKET] Broadcasting nextQuestion event`);
      io.to(`session:${sessionId}`).emit('thinking', { state: null });
      io.to(`session:${sessionId}`).emit('nextQuestion', {
        questionId: nextDbQuestion.id,
        text: nextDbQuestion.text,
        audioUrl: '',
        orderIndex: answeredCount,
        timeLimit: 120,
        currentPhase: nextPhase,
      });
    }

    res.status(200).json({
      success: true,
      completed: false,
      nextQuestion: {
        id: nextDbQuestion.id,
        text: nextDbQuestion.text,
        phase: nextPhase,
      },
    });
  } catch (err) {
    console.error(`[${timestamp}] [ERROR] Webhook speech-event failed:`, err);
    next(err);
  }
}

export async function getAgentSessionController(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const sessionId = req.params['id'] as string;
  console.log(`[${timestamp}] [LIVEKIT] Voice agent fetching session details: ${sessionId}`);

  try {
    const { prisma } = await import('../lib/prisma');
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!session) {
      console.error(`[${timestamp}] [LIVEKIT] Agent session not found: ${sessionId}`);
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    res.status(200).json(session);
  } catch (err) {
    console.error(`[${timestamp}] [ERROR] Agent session fetch failed:`, err);
    next(err);
  }
}
