import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { sendMail } from '../lib/email';
import { config } from '../config';
import { ConflictError, UnauthorizedError, ValidationError } from '../utils/errors';
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
} from '../validators/auth.validators';
import type {
  IAuthService,
  TokenPair,
  RegisterDto,
  LoginDto,
  RegisterResult,
} from '../interfaces/IAuthService';

// ─── helpers ────────────────────────────────────────────────────────────────

const ACCESS_EXPIRES_IN = config.JWT_ACCESS_EXPIRES_IN;   // e.g. "15m"
const REFRESH_EXPIRES_IN = config.JWT_REFRESH_EXPIRES_IN; // e.g. "7d"

/** Parse a JWT-style duration string into milliseconds (supports s / m / h / d). */
function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Unparsable duration: ${duration}`);
  const value = parseInt(match[1]!, 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers: Record<typeof unit, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit];
}

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

async function storeRefreshToken(userId: string, rawToken: string): Promise<void> {
  const expiresAt = new Date(Date.now() + parseDurationMs(REFRESH_EXPIRES_IN));
  await prisma.refreshToken.create({ data: { userId, token: rawToken, expiresAt } });
}

async function buildTokenPair(userId: string): Promise<TokenPair> {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  await storeRefreshToken(userId, refreshToken);
  return { accessToken, refreshToken };
}

// ─── Decode a Google id_token JWT (no signature verification needed — we just
//     received it directly from Google's token endpoint over HTTPS). ─────────
interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

function decodeGoogleIdToken(idToken: string): GoogleIdTokenPayload {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new ValidationError('Malformed Google id_token.');
  const payloadJson = Buffer.from(parts[1]!, 'base64url').toString('utf-8');
  return JSON.parse(payloadJson) as GoogleIdTokenPayload;
}

// ─── AuthService ─────────────────────────────────────────────────────────────

/**
 * Concrete implementation of IAuthService.
 * Handles: register, login, logout, refresh, forgotPassword, resetPassword, handleGoogleCallback.
 * Requirements: 1.1–1.11
 */
export class AuthService implements IAuthService {
  // ── 4.1 ────────────────────────────────────────────────────────────────────

  /**
   * Register a new user with email/password.
   * Requirements: 1.1, 1.2, 1.3
   */
  async register(dto: RegisterDto): Promise<RegisterResult> {
    // Validate DTO with Zod — throw ValidationError on failure
    const result = registerSchema.safeParse(dto);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(' ');
      throw new ValidationError(messages);
    }

    const { email, password, displayName } = result.data;

    // Check for existing account
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists.', 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
    });

    const tokens = await buildTokenPair(user.id);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }

  /**
   * Authenticate an existing user with email/password.
   * Requirements: 1.4, 1.5
   */
  async login(dto: LoginDto): Promise<RegisterResult> {
    // Validate DTO with Zod — throw ValidationError on failure
    const result = loginSchema.safeParse(dto);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(' ');
      throw new ValidationError(messages);
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials.');
    }

    const tokens = await buildTokenPair(user.id);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }

  /**
   * Revoke a refresh token (logout). Silently succeeds if token is not found.
   * Requirements: 1.9
   */
  async logout(refreshToken: string): Promise<void> {
    const record = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, revokedAt: null },
    });
    if (!record) return; // already revoked or not found — idempotent

    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Rotate a refresh token — revoke old, issue new pair.
   * Requirements: 1.7, 1.8
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const record = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

    if (!record || record.revokedAt !== null) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    // If expired, revoke it and then reject
    if (record.expiresAt < new Date()) {
      await prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    // Verify JWT signature
    try {
      jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    // Atomically revoke old token
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return buildTokenPair(record.userId);
  }

  // ── 4.2 ────────────────────────────────────────────────────────────────────

  /**
   * Initiate password reset — generates a time-limited token and emails a reset link.
   * If the email is not found, returns silently to avoid user-enumeration.
   * Requirements: 1.10
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // silent — don't reveal existence

    // Generate a cryptographically random plain token
    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(plainToken, 8);
    const expiresAt = Date.now() + 3_600_000; // 1 hour

    // Store hashed token in ActivityLog (no dedicated schema field needed)
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'password_reset_token',
        metadata: { token: hashedToken, expiresAt },
      },
    });

    const resetLink = `${config.CLIENT_URL}/reset-password?token=${plainToken}`;
    const html = `
      <p>Hi ${user.displayName},</p>
      <p>You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendMail(email, 'Reset your Apex.ai password', html);
  }

  /**
   * Complete a password reset using the plain token from the email link.
   * Requirements: 1.10, 1.11
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate inputs with Zod
    const result = resetPasswordSchema.safeParse({ token, password: newPassword });
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(' ');
      throw new ValidationError(messages);
    }

    // Fetch all recent pending reset tokens (ordered newest first for efficiency)
    const logs = await prisma.activityLog.findMany({
      where: { action: 'password_reset_token' },
      orderBy: { createdAt: 'desc' },
    });

    let matchedLog: (typeof logs)[number] | null = null;
    let matchedUserId: string | null = null;

    for (const log of logs) {
      const metadata = log.metadata as { token: string; expiresAt: number };

      // Check expiry first (cheap)
      if (metadata.expiresAt < Date.now()) continue;

      // Verify the plain token against the stored hash
      const isMatch = await bcrypt.compare(token, metadata.token);
      if (isMatch) {
        matchedLog = log;
        matchedUserId = log.userId;
        break;
      }
    }

    if (!matchedLog || !matchedUserId) {
      throw new ValidationError('Invalid or expired reset token.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password, revoke all refresh tokens, and delete the used log entry
    await prisma.$transaction([
      prisma.user.update({
        where: { id: matchedUserId },
        data: { passwordHash },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: matchedUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.activityLog.delete({
        where: { id: matchedLog.id },
      }),
    ]);
  }

  /**
   * Handle the Google OAuth callback — exchange code, upsert user, return TokenPair.
   * Requirements: 1.6, 1.11
   */
  async handleGoogleCallback(code: string): Promise<TokenPair> {
    // Exchange authorisation code for Google tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: config.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new UnauthorizedError(`Google token exchange failed: ${errorText}`);
    }

    const tokenData = (await tokenResponse.json()) as { id_token: string };
    const { sub: googleId, email, name } = decodeGoogleIdToken(tokenData.id_token);

    // Upsert: find by googleId OR email, then link/create
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (user) {
      // Link googleId if not already set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }
    } else {
      // Create new user — no password (OAuth-only account)
      user = await prisma.user.create({
        data: {
          email,
          displayName: name ?? email,
          googleId,
        },
      });
    }

    return buildTokenPair(user.id);
  }
}

// Singleton export — routes import this instance directly
export const authService = new AuthService();
