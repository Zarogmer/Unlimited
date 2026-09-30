import { prisma } from "@/lib/db";

// Baixa o relatorio do calculo como .txt (mesmo formato do Bot_Marketing).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.calculo.findUnique({ where: { id }, select: { titulo: true, relatorio: true } });
  if (!c) return new Response("Calculo nao encontrado", { status: 404 });
  const slug = c.titulo.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "modelo";
  return new Response(c.relatorio, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.txt"`,
    },
  });
}
