import { prisma } from "./db";

export interface Config {
  precoRolo: number;
  pesoRoloG: number;
  margemPct: number;
}

export const CONFIG_PADRAO: Config = { precoRolo: 120, pesoRoloG: 1000, margemPct: 0 };

/** A linha unica de configuracao (cria com os padroes se nao existir). */
export async function lerConfig(): Promise<Config> {
  const c = await prisma.configuracao.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...CONFIG_PADRAO },
  });
  return { precoRolo: c.precoRolo, pesoRoloG: c.pesoRoloG, margemPct: c.margemPct };
}

export async function salvarConfig(dados: Config): Promise<Config> {
  const c = await prisma.configuracao.upsert({
    where: { id: 1 },
    update: dados,
    create: { id: 1, ...dados },
  });
  return { precoRolo: c.precoRolo, pesoRoloG: c.pesoRoloG, margemPct: c.margemPct };
}
