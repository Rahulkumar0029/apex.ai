import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — reused across the application lifecycle.
// In development, we attach the instance to the global object to prevent
// creating multiple clients during hot-module reloads.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  global.__prisma = prisma;
}
