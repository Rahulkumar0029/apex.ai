import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { config } from './config';
import { setupSocket } from './socket';
import { startJobs } from './jobs/planExpiry';

async function bootstrap(): Promise<void> {
  const app = createApp();

  // ─── HTTP Server ──────────────────────────────────────────────────────────
  const httpServer = http.createServer(app);

  // ─── Socket.io Server ─────────────────────────────────────────────────────
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // Make the io instance accessible on the app for use in route handlers / services
  app.set('io', io);

  // Bootstrap Socket.io auth middleware and connection handlers (task 6.1)
  setupSocket(io);

  // Start background cron jobs (plan expiry + streak broken notifications)
  if (config.NODE_ENV !== 'test') {
    startJobs();
  }

  // ─── Start Listening ──────────────────────────────────────────────────────
  httpServer.listen(config.PORT, () => {
    console.log(
      `[Server] Apex.ai backend running on port ${config.PORT} (${config.NODE_ENV})`,
    );
    console.log(`[Server] Health check: http://localhost:${config.PORT}/health`);
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = (signal: string): void => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully…`);
    io.close(() => {
      httpServer.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    });

    // Force exit after 10 seconds if graceful shutdown stalls
    setTimeout(() => {
      console.error('[Server] Forcefully shutting down after timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err);
    // Do NOT exit — let the error handler middleware return 500 to ongoing requests
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled Promise Rejection:', reason);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
