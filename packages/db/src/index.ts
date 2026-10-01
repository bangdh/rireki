import { PrismaPg } from "@prisma/adapter-pg";
import { formatCandidateCode } from "@rireki/shared";
import { PrismaClient, type Prisma } from "../generated/prisma/client";

// The one allowed process.env read outside env.ts: web and worker load the root .env before importing this.
const g = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  g.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV !== "production") g.prisma = prisma;

export * from "../generated/prisma/client";

/**
 * Allocates the next candidate code (AZ123456) for a tenant: a single atomic UPDATE on TenantSettings.nextCode,
 * so numbers are never reused. Call it with the `tx` of the transaction that creates the Candidate.
 */
export async function nextCandidateCode(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
  const settings = await tx.tenantSettings.update({
    where: { tenantId },
    data: { nextCode: { increment: 1 } },
    select: { codePrefix: true, nextCode: true },
  });
  return formatCandidateCode(settings.codePrefix, settings.nextCode - 1);
}
