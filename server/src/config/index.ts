import dotenv from 'dotenv';
import path from 'path';

// Load .env from the server directory root
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function optionalEnvInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer, got: "${raw}"`);
  }
  return parsed;
}

export const config = {
  // Server
  NODE_ENV: optionalEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  PORT: optionalEnvInt('PORT', 4000),
  CLIENT_URL: optionalEnv('CLIENT_URL', 'http://localhost:5173'),

  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // JWT
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: optionalEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: optionalEnv('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: optionalEnv('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_CALLBACK_URL: optionalEnv('GOOGLE_CALLBACK_URL', 'http://localhost:4000/auth/google/callback'),

  // AI Provider
  AI_PROVIDER: optionalEnv('AI_PROVIDER', 'gemini') as 'gemini' | 'openai',
  GEMINI_API_KEY: optionalEnv('GEMINI_API_KEY', ''),
  OPENAI_API_KEY: optionalEnv('OPENAI_API_KEY', ''),

  // Speech Provider
  SPEECH_PROVIDER: optionalEnv('SPEECH_PROVIDER', 'assemblyai') as 'assemblyai' | 'deepgram',
  ASSEMBLYAI_API_KEY: optionalEnv('ASSEMBLYAI_API_KEY', ''),
  DEEPGRAM_API_KEY: optionalEnv('DEEPGRAM_API_KEY', ''),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: optionalEnv('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: optionalEnv('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: optionalEnv('CLOUDINARY_API_SECRET', ''),

  // Email (Nodemailer)
  SMTP_HOST: optionalEnv('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: optionalEnvInt('SMTP_PORT', 587),
  SMTP_USER: optionalEnv('SMTP_USER', ''),
  SMTP_PASS: optionalEnv('SMTP_PASS', ''),
  EMAIL_FROM: optionalEnv('EMAIL_FROM', 'noreply@apex.ai'),

  // Payment Provider
  PAYMENT_PROVIDER_SECRET: optionalEnv('PAYMENT_PROVIDER_SECRET', ''),
  PAYMENT_WEBHOOK_SECRET: optionalEnv('PAYMENT_WEBHOOK_SECRET', ''),

  // LiveKit
  LIVEKIT_URL: optionalEnv('LIVEKIT_URL', ''),
  LIVEKIT_API_KEY: optionalEnv('LIVEKIT_API_KEY', ''),
  LIVEKIT_API_SECRET: optionalEnv('LIVEKIT_API_SECRET', ''),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: optionalEnvInt('RATE_LIMIT_WINDOW_MS', 60_000),
  RATE_LIMIT_MAX_REQUESTS: optionalEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),
} as const;

export type Config = typeof config;
