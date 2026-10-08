"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { lerConfig } from "@/lib/config";
import { num } from "@/lib/formato";
import { custoMaterial, pecasPorPlacaValida } from "@/lib/impressos";
import { alocadas } from "@/lib/locais";
import { calcularPorLink, ErroFilamento } from "@/lib/filamento";

export interface EstadoImpresso {
  erro?: string;
}

function lerFormulario(formData: FormData) {
  const modelo = String(formData.get("modelo") ?? "").trim();
  const quandoTxt = String(formData.get("quando") ?? "").trim();
  let quando = new Date();
  if (quandoTxt) {
    const d = new Date(`${quandoTxt}T12:00:00`);
    if (!Number.isNaN(d.getTime())) quando = d;
  }
  const calculoId = String(formData.get("calculoId") ?? "").trim() || null;
  const escalaPct = num(formData.get("escalaPct"), 100) || 100;
  const gramas100 = Math.max(0, num(formData.get("gramas100")));
  const precoRolo = Math.max(0, num(formData.get("precoRolo")));
  const pesoRoloG = Math.max(0, num(formData.get("pesoRoloG")));
  const pecasPorPlaca = pecasPorPlacaValida(formData.get("pecasPorPlaca"));
  // Com gramas informadas o custo do material sai da conta do filamento
  // (gramas da placa / pecas por placa = gramas da peca); sem gramas vale o
  // valor digitado direto.
  const quantidade = Math.max(1, Math.trunc(num(formData.get("quantidade"), 1)));
  const custoPeca =
    gramas100 > 0
      ? custoMaterial(gramas100 / pecasPorPlaca, escalaPct, precoRolo, pesoRoloG).custo
      : num(formData.get("custoPeca"));
  return {
    modelo: modelo || "(sem nome)",
    link: String(formData.get("link") ?? "").trim(),
    quando,
    escalaPct,
    quantidade,
    pecasPorPlaca,
    perdas: Math.min(quantidade, Math.max(0, Math.trunc(num(formData.get("perdas"), 0)))),
    gramas100,
    precoRolo,
    pesoRoloG,
    custoPeca,
    outrosPeca: num(formData.get("outrosPeca")),
    precoVenda: num(formData.get("precoVenda")),
    segundosPeca: Math.max(0, Math.trunc(num(formData.get("segundosPeca"), 0))),
    obs: String(formData.get("obs") ?? "").trim(),
    calculoId,
  };
}

function revalidar() {
  revalidatePath("/");
  revalidatePath("/impressos");
  revalidatePath("/calculos");
  revalidatePath("/locais");
  revalidatePath("/kits");
}

export async function salvarImpresso(_prev: EstadoImpresso, formData: FormData): Promise<EstadoImpresso> {
  const id = String(formData.get("id") ?? "").trim();
  const dados = lerFormulario(formData);
  if (!String(formData.get("modelo") ?? "").trim()) return { erro: "Informe o nome do modelo." };

  if (dados.calculoId) {
    const existe = await prisma.calculo.findUnique({ where: { id: dados.calculoId }, select: { id: true } });
    if (!existe) dados.calculoId = null;
  }

  if (id) {
    const existe = await prisma.impresso.findUnique({ where: { id }, select: { id: true } });
    if (!existe) return { erro: "Esse impresso nao existe mais." };
    const [movimentos, kitItens] = await Promise.all([
      prisma.movimento.findMany({ where: { impressoId: id } }),
      prisma.kitItem.findMany({ where: { impressoId: id } }),
    ]);
    const emUso = alocadas(movimentos, kitItens);
    if (dados.quantidade - dados.perdas < emUso) {
      return {
        erro: `Ja tem ${emUso} peca(s) desse lote em locais ou kits. Tire de la antes de diminuir as pecas boas.`,
      };
    }
    await prisma.impresso.update({ where: { id }, data: dados });
  } else {
    await prisma.impresso.create({ data: dados });
  }
  revalidar();
  redirect("/impressos");
}

export async function apagarImpresso(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.impresso.delete({ where: { id } }).catch(() => null);
  revalidar();
  redirect("/impressos");
}

export interface FilamentoPuxado {
  ok: boolean;
  erro?: string;
  titulo?: string;
  perfil?: string;
  placas?: number;
  gramas100?: number;
  segundos?: number;
  cores?: Array<{ nome: string; hex: string; gramas100: number }>;
}

/**
 * Busca no MakerWorld os gramas do modelo (no tamanho original, ja com a
 * margem das configuracoes) pra tela "Registrar impresso" calcular o custo.
 */
export async function puxarFilamento(link: string): Promise<FilamentoPuxado> {
  const config = await lerConfig();
  try {
    const { res, info } = await calcularPorLink(String(link ?? "").trim(), {
      pecas: 1,
      escalaPct: 100,
      precoRolo: config.precoRolo,
      roloG: config.pesoRoloG,
      margemPct: config.margemPct,
    });
    return {
      ok: true,
      titulo: info.titulo,
      perfil: info.perfil,
      placas: info.placas,
      gramas100: res.gramasPeca100,
      segundos: info.segundos,
      cores: res.cores.map((c) => ({ nome: c.nome, hex: c.hex, gramas100: c.gramas100 })),
    };
  } catch (err) {
    if (err instanceof ErroFilamento) return { ok: false, erro: err.message };
    console.error(err);
    return { ok: false, erro: `Erro inesperado: ${(err as Error).message}` };
  }
}
