"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { num } from "@/lib/formato";
import { contas } from "@/lib/impressos";
import { posicaoDoLote } from "@/lib/locais";

export interface EstadoLocal {
  erro?: string;
  ok?: boolean;
}

/** Valor do <select> que representa "sem local". */
const SEM_LOCAL = "nenhum";

function revalidar() {
  revalidatePath("/");
  revalidatePath("/locais");
  revalidatePath("/impressos");
  revalidatePath("/kits");
}

export async function salvarLocal(_prev: EstadoLocal, formData: FormData): Promise<EstadoLocal> {
  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const obs = String(formData.get("obs") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do local." };

  const repetido = await prisma.local.findFirst({
    where: { nome: { equals: nome, mode: "insensitive" }, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (repetido) return { erro: `Ja existe um local chamado "${nome}".` };

  if (id) {
    await prisma.local.update({ where: { id }, data: { nome, obs } }).catch(() => null);
  } else {
    await prisma.local.create({ data: { nome, obs } });
  }
  revalidar();
  return { ok: true };
}

/** So apaga local que nunca teve movimentacao (senao o historico dos lotes ficaria furado). */
export async function apagarLocal(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const [movs, kits] = await Promise.all([
    prisma.movimento.count({ where: { OR: [{ deLocalId: id }, { paraLocalId: id }] } }),
    prisma.kitItem.count({ where: { deLocalId: id } }),
  ]);
  if (movs + kits === 0) await prisma.local.delete({ where: { id } }).catch(() => null);
  revalidar();
}

export async function moverPecas(_prev: EstadoLocal, formData: FormData): Promise<EstadoLocal> {
  const impressoId = String(formData.get("impressoId") ?? "").trim();
  const de = String(formData.get("de") ?? "").trim();
  const para = String(formData.get("para") ?? "").trim();
  const quantidade = Math.trunc(num(formData.get("quantidade"), 0));
  const obs = String(formData.get("obs") ?? "").trim();

  if (!impressoId) return { erro: "Escolha o lote impresso." };
  if (!de || !para) return { erro: "Escolha de onde saem e pra onde vao as pecas." };
  if (de === para) return { erro: "A origem e o destino sao o mesmo lugar." };
  if (quantidade <= 0) return { erro: "Informe quantas pecas mover." };

  const deLocalId = de === SEM_LOCAL ? null : de;
  const paraLocalId = para === SEM_LOCAL ? null : para;

  try {
    await prisma.$transaction(async (tx) => {
      const impresso = await tx.impresso.findUnique({
        where: { id: impressoId },
        include: { movimentos: true, kitItens: true },
      });
      if (!impresso) throw new Error("Esse lote nao existe mais.");
      for (const localId of [deLocalId, paraLocalId]) {
        if (localId && !(await tx.local.findUnique({ where: { id: localId }, select: { id: true } }))) {
          throw new Error("Esse local nao existe mais.");
        }
      }
      const p = posicaoDoLote(contas(impresso).boas, impresso.movimentos, impresso.kitItens);
      const disponivel = deLocalId ? (p.porLocal[deLocalId] ?? 0) : p.semLocal;
      if (quantidade > disponivel) {
        throw new Error(`So tem ${Math.max(0, disponivel)} peca(s) desse lote na origem.`);
      }
      await tx.movimento.create({ data: { impressoId, deLocalId, paraLocalId, quantidade, obs } });
    });
  } catch (err) {
    return { erro: (err as Error).message };
  }
  revalidar();
  return { ok: true };
}
