import { ServiceUnavailableError } from '../utils/errors';

/**
 * Pauses execution for the given number of milliseconds.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes `fn` with exponential backoff retry logic.
 *
 * Attempt schedule:
 *   - Attempt 1: run fn() immediately
 *   - On error, wait 2^(attempt-1) * 1000 ms before the next attempt:
 *       attempt 1 → 2^0 * 1000 = 1 000 ms
 *       attempt 2 → 2^1 * 1000 = 2 000 ms
 *       attempt 3 → 2^2 * 1000 = 4 000 ms  (then throw)
 *
 * @param fn          Async function to retry.
 * @param maxAttempts Maximum number of attempts (default: 3).
 * @throws {ServiceUnavailableError} After all attempts are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        throw new ServiceUnavailableError(
          'AI service failed after retries',
          'AI_UNAVAILABLE',
        );
      }
      // Exponential backoff: 1s, 2s, 4s, …
      await sleep(Math.pow(2, attempt - 1) * 1000);
    }
  }
}
