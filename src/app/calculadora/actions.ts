"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { lerConfig } from "@/lib/config";
import { num } from "@/lib/formato";
import { calcularManual, calcularPorLink, ErroFilamento, type CalculoCompleto } from "@/lib/filamento";

export interface EstadoCalculo {
  erro?: string;
}

export async function calcularAction(_prev: EstadoCalculo, formData: FormData): Promise<EstadoCalculo> {
  const modo = String(formData.get("modo") ?? "link");
  const link = String(formData.get("link") ?? "").trim();
  const gramasTexto = String(formData.get("gramas") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const config = await lerConfig();

  const op = {
    pecas: Math.max(1, Math.trunc(num(formData.get("pecas"), 1))),
    escalaPct: num(formData.get("escala"), 100) || 100,
    precoRolo: num(formData.get("precoRolo"), config.precoRolo) || config.precoRolo,
    roloG: num(formData.get("pesoRoloG"), config.pesoRoloG) || config.pesoRoloG,
    margemPct: Math.max(0, num(formData.get("margem"), config.margemPct)),
  };
  const perfilTxt = String(formData.get("perfil") ?? "").trim();
  const perfilId = /^\d+$/.test(perfilTxt) ? Number(perfilTxt) : null;

  let feito: CalculoCompleto;
  try {
    if (modo === "manual") {
      if (!gramasTexto) return { erro: "Informe os gramas de cada cor, ex.: preto=110, vermelho=7" };
      feito = calcularManual(gramasTexto, titulo, op);
    } else {
      if (!link) return { erro: "Cole o link do modelo no MakerWorld." };
      feito = await calcularPorLink(link, { ...op, perfilId });
    }
  } catch (err) {
    if (err instanceof ErroFilamento) return { erro: err.message };
    console.error(err);
    return { erro: `Erro inesperado: ${(err as Error).message}` };
  }

  const { res, info } = feito;
  const salvo = await prisma.calculo.create({
    data: {
      origem: feito.origem,
      titulo: info.titulo,
      link: feito.link,
      idModelo: info.idModelo,
      idPerfil: info.idPerfil,
      perfil: info.perfil,
      placas: info.placas,
      segundos: info.segundos,
      pecas: res.pecas,
      escalaPct: res.escalaPct,
      precoRolo: res.precoRolo,
      pesoRoloG: res.roloG,
      margemPct: res.margemPct,
      gramasPeca: res.gramasPeca,
      custoPeca: res.custoPeca,
      gargalo: res.gargalo,
      rolosLote: res.rolosLote,
      custoRolosLote: res.custoRolosLote,
      resultado: res as unknown as Prisma.InputJsonValue,
      outrosPerfis: info.outrosPerfis as unknown as Prisma.InputJsonValue,
      relatorio: feito.texto,
    },
    select: { id: true },
  });
  revalidatePath("/");
  revalidatePath("/calculos");
  redirect(`/calculos/${salvo.id}`);
}

export async function apagarCalculo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.calculo.delete({ where: { id } }).catch(() => null);
  revalidatePath("/");
  revalidatePath("/calculos");
  redirect("/calculos");
}
