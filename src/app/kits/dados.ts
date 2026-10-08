import { prisma } from "@/lib/db";
import { contas } from "@/lib/impressos";
import { estoque } from "@/lib/locais";
import { data, numero } from "@/lib/formato";
import type { LoteKit } from "./FormKit";

/**
 * Lotes que podem entrar num kit, com quantas pecas tem em estoque (sem local
 * + nos locais). Ao editar um kit, as pecas dele contam como disponiveis.
 */
export async function lotesParaKit(kitId?: string): Promise<LoteKit[]> {
  const [impressos, movimentos, kitItens] = await Promise.all([
    prisma.impresso.findMany({ orderBy: [{ quando: "desc" }, { criadoEm: "desc" }] }),
    prisma.movimento.findMany(),
    prisma.kitItem.findMany({ where: kitId ? { NOT: { kitId } } : undefined }),
  ]);
  const e = estoque(impressos, movimentos, kitItens);
  return impressos.flatMap((i) => {
    const pos = e.itens.find((x) => x.impressoId === i.id);
    const disponivel = pos ? pos.semLocal + Object.values(pos.porLocal).reduce((a, b) => a + b, 0) : 0;
    if (disponivel <= 0) return [];
    return [
      {
        impressoId: i.id,
        rotulo: `${i.modelo} · ${numero(i.escalaPct, 0)}% · ${data(i.quando)}`,
        disponivel,
        custoPorBoa: contas(i).custoPorBoa,
        precoVenda: i.precoVenda,
      },
    ];
  });
}
