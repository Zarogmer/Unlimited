/**
 * locais.ts — Onde estao as pecas boas de cada lote.
 *
 * Nada de saldo gravado: a posicao e sempre refeita somando os movimentos.
 *   saldo no local = o que entrou la - o que saiu de la - o que saiu de la pra kits
 *   em kits        = pecas do lote montadas em algum kit
 *   sem local      = boas do lote - tudo que esta em algum local - tudo que esta em kits
 */

import { contas, type ImpressoBase } from "./impressos";

export interface ImpressoEstoque extends ImpressoBase {
  id: string;
  modelo: string;
  escalaPct: number;
  quando: Date;
}

export interface MovimentoBase {
  impressoId: string;
  deLocalId: string | null;
  paraLocalId: string | null;
  quantidade: number;
}

/** Pecas de um lote que foram pra um kit, e de onde sairam (null = sem local). */
export interface KitItemBase {
  impressoId: string;
  deLocalId: string | null;
  quantidade: number;
}

export interface ItemEstoque {
  impressoId: string;
  modelo: string;
  escalaPct: number;
  quando: Date;
  boas: number;
  semLocal: number;
  emKits: number;
  /** localId -> pecas desse lote que estao la (so os maiores que zero). */
  porLocal: Record<string, number>;
}

export interface Estoque {
  itens: ItemEstoque[];
  /** localId -> total de pecas la. */
  totalPorLocal: Record<string, number>;
  emLocais: number;
  semLocal: number;
  emKits: number;
}

/** Pecas de um lote em cada local, a partir dos movimentos dele (menos o que saiu de la pra kits). */
export function saldosDoLote(movimentos: MovimentoBase[], kitItens: KitItemBase[] = []): Record<string, number> {
  const saldo: Record<string, number> = {};
  for (const m of movimentos) {
    if (m.paraLocalId) saldo[m.paraLocalId] = (saldo[m.paraLocalId] ?? 0) + m.quantidade;
    if (m.deLocalId) saldo[m.deLocalId] = (saldo[m.deLocalId] ?? 0) - m.quantidade;
  }
  for (const k of kitItens) {
    if (k.deLocalId) saldo[k.deLocalId] = (saldo[k.deLocalId] ?? 0) - k.quantidade;
  }
  for (const id of Object.keys(saldo)) if (saldo[id] <= 0) delete saldo[id];
  return saldo;
}

function soma(saldo: Record<string, number>): number {
  return Object.values(saldo).reduce((a, b) => a + b, 0);
}

function agrupar<T extends { impressoId: string }>(lista: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const x of lista) {
    const grupo = mapa.get(x.impressoId);
    if (grupo) grupo.push(x);
    else mapa.set(x.impressoId, [x]);
  }
  return mapa;
}

/** Onde estao as pecas boas de UM lote: em cada local, em kits e sem local. */
export function posicaoDoLote(boas: number, movimentos: MovimentoBase[], kitItens: KitItemBase[] = []) {
  const porLocal = saldosDoLote(movimentos, kitItens);
  const emKits = kitItens.reduce((a, k) => a + k.quantidade, 0);
  const semLocal = Math.max(0, boas - soma(porLocal) - emKits);
  return { porLocal, emKits, semLocal };
}

/** Posicao de todos os lotes: quanto de cada um esta em cada local, em kits e sem local. */
export function estoque(
  impressos: ImpressoEstoque[],
  movimentos: MovimentoBase[],
  kitItens: KitItemBase[] = [],
): Estoque {
  const movPorLote = agrupar(movimentos);
  const kitPorLote = agrupar(kitItens);

  const totalPorLocal: Record<string, number> = {};
  let emLocais = 0;
  let semLocal = 0;
  let emKits = 0;
  const itens = impressos.map((i) => {
    const boas = contas(i).boas;
    const p = posicaoDoLote(boas, movPorLote.get(i.id) ?? [], kitPorLote.get(i.id) ?? []);
    for (const [localId, qtd] of Object.entries(p.porLocal)) {
      totalPorLocal[localId] = (totalPorLocal[localId] ?? 0) + qtd;
      emLocais += qtd;
    }
    semLocal += p.semLocal;
    emKits += p.emKits;
    return { impressoId: i.id, modelo: i.modelo, escalaPct: i.escalaPct, quando: i.quando, boas, ...p };
  });
  return { itens, totalPorLocal, emLocais, semLocal, emKits };
}

/**
 * Pecas de um lote ja comprometidas (em locais ou em kits), pra nao deixar
 * as boas ficarem abaixo disso.
 */
export function alocadas(movimentos: MovimentoBase[], kitItens: KitItemBase[] = []): number {
  return soma(saldosDoLote(movimentos, kitItens)) + kitItens.reduce((a, k) => a + k.quantidade, 0);
}
