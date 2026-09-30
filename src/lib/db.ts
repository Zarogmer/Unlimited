import { PrismaClient } from "@prisma/client";

// Um unico PrismaClient por processo (o hot reload do `next dev` recria o
// modulo; guardar no globalThis evita abrir dezenas de conexoes).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
