/**
 * impressos.ts — Contas de lucro dos lotes IMPRESSOS (porte do impressos.py).
 *
 * Cada impresso e um lote de pecas de um modelo: em que escala (%) foi
 * impresso, quantas pecas sairam (e quantas se perderam), quanto custou cada uma (o material que a
 * calculadora achou, mais o que voce quiser somar: energia, embalagem,
 * pintura...) e por quanto cada peca foi vendida.
 *
 * As contas sao sempre refeitas na leitura, nunca gravadas:
 *   boas          = quantidade - perdas (as que da pra vender)
 *   custoUnitario = custoPeca + outrosPeca
 *   custoTotal    = custoUnitario x quantidade (a peca perdida tambem gastou)
 *   receita       = precoVenda x boas
 *   lucro         = receita - custoTotal
 *   custoPorBoa   = custoTotal / boas (o custo real de cada peca vendavel)
 *   margemPct     = lucro / receita (0 se nao vendeu)
 */

export interface ImpressoBase {
  quantidade: number;
  perdas?: number;
  custoPeca: number;
  outrosPeca: number;
  precoVenda: number;
}

export interface ContasImpresso {
  impressas: number;
  perdas: number;
  boas: number;
  aproveitamentoPct: number;
  custoUnitario: number;
  custoPorBoa: number;
  custoTotal: number;
  receita: number;
  lucro: number;
  lucroPeca: number;
  margemPct: number;
}

export function contas(i: ImpressoBase): ContasImpresso {
  const qtd = Math.max(0, Math.trunc(i.quantidade || 0));
  const perdas = Math.min(qtd, Math.max(0, Math.trunc(i.perdas || 0)));
  const boas = qtd - perdas;
  const custoUnitario = (i.custoPeca || 0) + (i.outrosPeca || 0);
  const custoTotal = custoUnitario * qtd;
  const receita = (i.precoVenda || 0) * boas;
  const lucro = receita - custoTotal;
  return {
    impressas: qtd,
    perdas,
    boas,
    aproveitamentoPct: qtd > 0 ? (boas / qtd) * 100 : 0,
    custoUnitario,
    custoPorBoa: boas > 0 ? custoTotal / boas : 0,
    custoTotal,
    receita,
    lucro,
    lucroPeca: boas > 0 ? lucro / boas : 0,
    margemPct: receita > 0 ? (lucro / receita) * 100 : 0,
  };
}

export interface Totais {
  lotes: number;
  pecas: number;
  perdas: number;
  boas: number;
  custoTotal: number;
  receita: number;
  lucro: number;
  margemPct: number;
}

/** Soma de tudo: pecas, custo, receita, lucro e margem geral. */
export function totais(itens: ImpressoBase[]): Totais {
  let pecas = 0;
  let perdas = 0;
  let custoTotal = 0;
  let receita = 0;
  for (const i of itens) {
    const c = contas(i);
    pecas += c.impressas;
    perdas += c.perdas;
    custoTotal += c.custoTotal;
    receita += c.receita;
  }
  const lucro = receita - custoTotal;
  return {
    lotes: itens.length,
    pecas,
    perdas,
    boas: pecas - perdas,
    custoTotal,
    receita,
    lucro,
    margemPct: receita > 0 ? (lucro / receita) * 100 : 0,
  };
}

/**
 * Pecas por placa: inteiro >= 1. Com 1, os gramas e o tempo informados sao
 * de uma peca; com N, sao da placa inteira e cada peca leva 1/N.
 */
export function pecasPorPlacaValida(n: unknown): number {
  const v = Math.trunc(Number(n));
  return Number.isFinite(v) && v >= 1 ? v : 1;
}

/**
 * Custo do material por peca a partir do filamento: gramas no tamanho
 * original x fator da escala (cubo) x preco do grama. Devolve tambem as
 * gramas na escala pra mostrar na tela. 0 se faltar algum dado.
 */
export function custoMaterial(gramas100: number, escalaPct: number, precoRolo: number, pesoRoloG: number) {
  const escala = escalaPct > 0 ? escalaPct : 100;
  const fator = (escala / 100) ** 3;
  const gramas = (gramas100 || 0) * fator;
  const custo = precoRolo > 0 && pesoRoloG > 0 ? (gramas / pesoRoloG) * precoRolo : 0;
  return { fator, gramas, custo };
}
