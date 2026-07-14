import { prisma } from '../lib/prisma';

const GRACE_PERIOD_MS = 30_000; // 30 seconds

// Map of sessionId -> disconnect timer handle
const disconnectTimers = new Map<string, NodeJS.Timeout>();

/**
 * Called when a socket disconnects. Starts a 30-second grace timer for the
 * associated session. If the user does not reconnect within the grace period,
 * the session is marked as "interrupted".
 *
 * Requirement: 4.11
 */
export function onSocketDisconnect(userId: string, sessionId: string | null): void {
  if (!sessionId) return;

  // Start 30-second grace timer
  const timer = setTimeout(async () => {
    try {
      // Only interrupt if still active
      const session = await prisma.session.findFirst({
        where: { id: sessionId, userId, status: 'active' }
      });
      if (session) {
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'interrupted' }
        });
        console.log(`[Reconnection] Session ${sessionId} interrupted after grace period.`);
      }
    } catch (err) {
      console.error('[Reconnection] Error interrupting session:', err);
    } finally {
      disconnectTimers.delete(sessionId);
    }
  }, GRACE_PERIOD_MS);

  disconnectTimers.set(sessionId, timer);
}

/**
 * Called when a user reconnects to an active session (via the `ready` event).
 * Cancels any pending interruption timer so the session can resume normally.
 *
 * Requirement: 4.11
 */
export function onSocketReconnect(sessionId: string): void {
  // Cancel the interrupt timer if user reconnected
  const timer = disconnectTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(sessionId);
    console.log(`[Reconnection] Session ${sessionId} reconnected — timer cancelled.`);
  }
}

/**
 * Clears any pending reconnection timer for a session without logging.
 * Use when a session ends cleanly so the timer does not fire spuriously.
 */
export function clearReconnectionTimer(sessionId: string): void {
  const timer = disconnectTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(sessionId);
  }
}
