"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { num } from "@/lib/formato";
import { contas } from "@/lib/impressos";
import { posicaoDoLote } from "@/lib/locais";
import { separar } from "@/lib/kits";

export interface EstadoKit {
  erro?: string;
}

function revalidar() {
  revalidatePath("/");
  revalidatePath("/kits");
  revalidatePath("/locais");
  revalidatePath("/impressos");
}

/** Itens do formulario (JSON [{impressoId, quantidade}]), juntando lotes repetidos. */
function lerItens(formData: FormData): Map<string, number> {
  const itens = new Map<string, number>();
  let lista: unknown = [];
  try {
    lista = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    lista = [];
  }
  if (!Array.isArray(lista)) return itens;
  for (const x of lista) {
    const impressoId = String((x as { impressoId?: unknown })?.impressoId ?? "").trim();
    const quantidade = Math.trunc(num((x as { quantidade?: unknown })?.quantidade, 0));
    if (impressoId && quantidade > 0) itens.set(impressoId, (itens.get(impressoId) ?? 0) + quantidade);
  }
  return itens;
}

/**
 * Cria ou atualiza um kit. As pecas saem do estoque de cada lote: primeiro
 * as que estao sem local, depois as dos locais. Ao editar, as pecas antigas
 * do kit voltam pro estoque antes de separar de novo.
 */
export async function salvarKit(_prev: EstadoKit, formData: FormData): Promise<EstadoKit> {
  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const dados = {
    nome,
    outrosCusto: Math.max(0, num(formData.get("outrosCusto"))),
    precoVenda: Math.max(0, num(formData.get("precoVenda"))),
    obs: String(formData.get("obs") ?? "").trim(),
  };
  const itens = lerItens(formData);
  if (!nome) return { erro: "Informe o nome do kit." };
  if (itens.size === 0) return { erro: "Coloque pelo menos uma peca no kit." };

  try {
    await prisma.$transaction(async (tx) => {
      let kitId = id;
      if (id) {
        const existe = await tx.kit.findUnique({ where: { id }, select: { id: true } });
        if (!existe) throw new Error("Esse kit nao existe mais.");
        await tx.kitItem.deleteMany({ where: { kitId: id } });
        await tx.kit.update({ where: { id }, data: dados });
      } else {
        kitId = (await tx.kit.create({ data: dados })).id;
      }

      for (const [impressoId, quantidade] of itens) {
        const lote = await tx.impresso.findUnique({
          where: { id: impressoId },
          include: { movimentos: true, kitItens: true },
        });
        if (!lote) throw new Error("Um dos lotes escolhidos nao existe mais.");
        const p = posicaoDoLote(contas(lote).boas, lote.movimentos, lote.kitItens);
        const partes = separar(quantidade, p.semLocal, p.porLocal);
        if (!partes) {
          const tem = p.semLocal + Object.values(p.porLocal).reduce((a, b) => a + b, 0);
          throw new Error(`So tem ${tem} peca(s) de "${lote.modelo}" em estoque.`);
        }
        await tx.kitItem.createMany({
          data: partes.map((x) => ({ kitId, impressoId, deLocalId: x.deLocalId, quantidade: x.quantidade })),
        });
      }
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidar();
  redirect("/kits");
}

/** Desmonta o kit: as pecas voltam pro estoque, pro lugar de onde sairam. */
export async function apagarKit(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.kit.delete({ where: { id } }).catch(() => null);
  revalidar();
  redirect("/kits");
}
