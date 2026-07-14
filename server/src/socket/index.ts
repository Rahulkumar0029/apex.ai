import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { ServerToClientEvents, ClientToServerEvents } from './types';
import { onSocketDisconnect, onSocketReconnect } from './reconnectionManager';
import { registerInterviewHandlers } from './interviewHandlers';

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId: string;
  /** Tracks the currently active interview session for reconnection handling. */
  activeSessionId?: string;
}

export type { AuthenticatedSocket };

/**
 * Bootstraps the Socket.io server with JWT authentication middleware.
 *
 * The middleware extracts the access token from `socket.handshake.auth.token`,
 * verifies it against JWT_ACCESS_SECRET, and attaches `userId` to the socket.
 * Unauthenticated or invalid connections are rejected before the 'connection'
 * event fires.
 *
 * Requirement: 14.7
 */
export function setupSocket(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
): void {
  // ─── Auth Middleware ────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication required.'));
    }

    try {
      const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as { sub: string };

      if (typeof payload.sub !== 'string' || !payload.sub) {
        return next(new Error('Invalid token payload.'));
      }

      (socket as AuthenticatedSocket).userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  // ─── Connection Handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const authedSocket = socket as AuthenticatedSocket;
    console.log(`[Socket.io] Connected: ${authedSocket.id} (user: ${authedSocket.userId})`);

    // ── disconnect ─────────────────────────────────────────────────────────────
    // Start the 30-second grace timer; if the user does not reconnect in time,
    // the session will be marked "interrupted" (requirement 4.11).
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Disconnected: ${authedSocket.id} — ${reason}`);
      onSocketDisconnect(authedSocket.userId, authedSocket.activeSessionId ?? null);
    });

    // Register all interview event handlers (ready, answer, endInterview)
    registerInterviewHandlers(io, authedSocket);
  });
}
