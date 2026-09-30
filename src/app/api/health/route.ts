import { prisma } from "@/lib/db";

// Healthcheck (Railway / monitoramento): responde 200 se o banco responde.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, banco: "ok" });
  } catch (err) {
    return Response.json({ ok: false, banco: String((err as Error).message) }, { status: 503 });
  }
}
