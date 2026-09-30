"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { num } from "@/lib/formato";

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
  return {
    modelo: modelo || "(sem nome)",
    link: String(formData.get("link") ?? "").trim(),
    quando,
    escalaPct: num(formData.get("escalaPct"), 100) || 100,
    quantidade: Math.max(1, Math.trunc(num(formData.get("quantidade"), 1))),
    custoPeca: num(formData.get("custoPeca")),
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
