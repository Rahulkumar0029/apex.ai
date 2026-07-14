import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import authRouter from './routes/auth';
import interviewRouter from './routes/interview';
import reportRouter from './routes/report';
import sharedRouter from './routes/shared';
import dashboardRouter from './routes/dashboard';
import analyticsRouter from './routes/analytics';
import historyRouter from './routes/history';
import usersRouter from './routes/users';
import notificationsRouter from './routes/notifications';
import paymentsRouter from './routes/payments';

export function createApp(): Application {
  const app = express();

  // ─── Security Headers ─────────────────────────────────────────────────────
  app.use(helmet());

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ─── Request Logging ──────────────────────────────────────────────────────
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // ─── Body Parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─── Health Check ─────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── API Routes ───────────────────────────────────────────────────────────
  app.use('/auth', authRouter);
  app.use('/interview', interviewRouter);
  app.use('/report', reportRouter);
  app.use('/shared', sharedRouter);
  app.use('/dashboard', dashboardRouter);
  app.use('/analytics', analyticsRouter);
  app.use('/history', historyRouter);
  app.use('/users', usersRouter);
  app.use('/notifications', notificationsRouter);
  app.use('/payments', paymentsRouter);

  // ─── 404 Catch-all ────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist.' });
  });

  // ─── Global Error Handler ─────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
