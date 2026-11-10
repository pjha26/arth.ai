import { PrismaClient } from '@prisma/client';

// One generated client and one connection pool per process, including development reloads.
const cache = /** @type {{ arthPrisma?: PrismaClient }} */ (globalThis);
export const prisma = cache.arthPrisma || new PrismaClient({ log: ['error'] });
cache.arthPrisma = prisma;
