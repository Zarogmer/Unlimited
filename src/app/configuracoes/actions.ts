"use server";

import { revalidatePath } from "next/cache";
import { salvarConfig } from "@/lib/config";
import { num } from "@/lib/formato";

export interface EstadoConfig {
  erro?: string;
  ok?: boolean;
}

export async function salvarConfigAction(_prev: EstadoConfig, formData: FormData): Promise<EstadoConfig> {
  const precoRolo = num(formData.get("precoRolo"), -1);
  const pesoRoloG = num(formData.get("pesoRoloG"), -1);
  const margemPct = num(formData.get("margemPct"), 0);
  if (precoRolo <= 0) return { erro: "O preco do rolo precisa ser maior que zero." };
  if (pesoRoloG <= 0) return { erro: "O peso do rolo precisa ser maior que zero." };
  if (margemPct < 0) return { erro: "A margem nao pode ser negativa." };
  await salvarConfig({ precoRolo, pesoRoloG, margemPct });
  revalidatePath("/");
  revalidatePath("/calculadora");
  revalidatePath("/configuracoes");
  return { ok: true };
}
