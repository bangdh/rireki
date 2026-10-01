import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// The one allowed process.env read outside env.ts: web and worker load the root .env before importing this.
const g = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  g.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV !== "production") g.prisma = prisma;

export * from "../generated/prisma/client";
