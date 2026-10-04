/**
 * locais.ts — Onde estao as pecas boas de cada lote.
 *
 * Nada de saldo gravado: a posicao e sempre refeita somando os movimentos.
 *   saldo no local = o que entrou la - o que saiu de la
 *   sem local      = boas do lote - tudo que esta em algum local
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

export interface ItemEstoque {
  impressoId: string;
  modelo: string;
  escalaPct: number;
  quando: Date;
  boas: number;
  semLocal: number;
  /** localId -> pecas desse lote que estao la (so os maiores que zero). */
  porLocal: Record<string, number>;
}

export interface Estoque {
  itens: ItemEstoque[];
  /** localId -> total de pecas la. */
  totalPorLocal: Record<string, number>;
  emLocais: number;
  semLocal: number;
}

/** Pecas de um lote em cada local, a partir dos movimentos dele. */
export function saldosDoLote(movimentos: MovimentoBase[]): Record<string, number> {
  const saldo: Record<string, number> = {};
  for (const m of movimentos) {
    if (m.paraLocalId) saldo[m.paraLocalId] = (saldo[m.paraLocalId] ?? 0) + m.quantidade;
    if (m.deLocalId) saldo[m.deLocalId] = (saldo[m.deLocalId] ?? 0) - m.quantidade;
  }
  for (const id of Object.keys(saldo)) if (saldo[id] <= 0) delete saldo[id];
  return saldo;
}

function soma(saldo: Record<string, number>): number {
  return Object.values(saldo).reduce((a, b) => a + b, 0);
}

/** Posicao de todos os lotes: quanto de cada um esta em cada local e quanto esta sem local. */
export function estoque(impressos: ImpressoEstoque[], movimentos: MovimentoBase[]): Estoque {
  const porImpresso = new Map<string, MovimentoBase[]>();
  for (const m of movimentos) {
    const lista = porImpresso.get(m.impressoId);
    if (lista) lista.push(m);
    else porImpresso.set(m.impressoId, [m]);
  }

  const totalPorLocal: Record<string, number> = {};
  let emLocais = 0;
  let semLocal = 0;
  const itens = impressos.map((i) => {
    const porLocal = saldosDoLote(porImpresso.get(i.id) ?? []);
    const boas = contas(i).boas;
    const livres = Math.max(0, boas - soma(porLocal));
    for (const [localId, qtd] of Object.entries(porLocal)) {
      totalPorLocal[localId] = (totalPorLocal[localId] ?? 0) + qtd;
      emLocais += qtd;
    }
    semLocal += livres;
    return { impressoId: i.id, modelo: i.modelo, escalaPct: i.escalaPct, quando: i.quando, boas, semLocal: livres, porLocal };
  });
  return { itens, totalPorLocal, emLocais, semLocal };
}

/** Total de pecas de um lote que estao em algum local (pra nao deixar as boas ficarem abaixo disso). */
export function alocadas(movimentos: MovimentoBase[]): number {
  return soma(saldosDoLote(movimentos));
}
