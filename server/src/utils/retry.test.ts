import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, sleep } from './retry';
import { ServiceUnavailableError } from './errors';

// Use fake timers so tests don't actually wait for backoff delays
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('sleep', () => {
  it('resolves after the specified delay', async () => {
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });

  it('does not resolve before the delay', async () => {
    let resolved = false;
    const promise = sleep(500).then(() => {
      resolved = true;
    });
    vi.advanceTimersByTime(499);
    // Flush micro-tasks without advancing macros further
    await Promise.resolve();
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(1);
    await promise;
    expect(resolved).toBe(true);
  });
});

describe('withRetry', () => {
  it('returns the result immediately when fn succeeds on the first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on the second attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('recovered');

    const promise = withRetry(fn);
    // Advance past the 1 s first-retry delay
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries and succeeds on the third attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('third time lucky');

    const promise = withRetry(fn);
    // 1st retry delay: 1 s (2^0 * 1000)
    await vi.advanceTimersByTimeAsync(1000);
    // 2nd retry delay: 2 s (2^1 * 1000)
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result).toBe('third time lucky');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws ServiceUnavailableError after exhausting all 3 attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    let caught: unknown;
    const promise = withRetry(fn).catch((e) => {
      caught = e;
    });
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    expect(caught).toBeInstanceOf(ServiceUnavailableError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('ServiceUnavailableError has status 503 and code AI_UNAVAILABLE', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('down'));

    let caught: unknown;
    const promise = withRetry(fn).catch((e) => {
      caught = e;
    });
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    expect(caught).toMatchObject({
      statusCode: 503,
      code: 'AI_UNAVAILABLE',
      message: 'AI service failed after retries',
    });
  });

  it('respects a custom maxAttempts value', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    let caught: unknown;
    await withRetry(fn, 1).catch((e) => {
      caught = e;
    });

    expect(caught).toBeInstanceOf(ServiceUnavailableError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses correct exponential backoff delays (1s, 2s, 4s) for maxAttempts=4', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    let caught: unknown;
    const promise = withRetry(fn, 4).catch((e) => {
      caught = e;
    });

    // 1st retry: 1 000 ms (2^0)
    await vi.advanceTimersByTimeAsync(1000);
    // 2nd retry: 2 000 ms (2^1)
    await vi.advanceTimersByTimeAsync(2000);
    // 3rd retry: 4 000 ms (2^2)
    await vi.advanceTimersByTimeAsync(4000);
    await promise;

    expect(caught).toBeInstanceOf(ServiceUnavailableError);
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('does not swallow non-error rejections', async () => {
    const fn = vi.fn().mockRejectedValue('string rejection');

    let caught: unknown;
    await withRetry(fn, 1).catch((e) => {
      caught = e;
    });
    expect(caught).toBeInstanceOf(ServiceUnavailableError);
  });
});
