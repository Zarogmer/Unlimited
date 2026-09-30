/**
 * impressos.ts — Contas de lucro dos lotes IMPRESSOS (porte do impressos.py).
 *
 * Cada impresso e um lote de pecas de um modelo: em que escala (%) foi
 * impresso, quantas pecas sairam, quanto custou cada uma (o material que a
 * calculadora achou, mais o que voce quiser somar: energia, embalagem,
 * pintura...) e por quanto cada peca foi vendida.
 *
 * As contas sao sempre refeitas na leitura, nunca gravadas:
 *   custoUnitario = custoPeca + outrosPeca
 *   custoTotal    = custoUnitario x quantidade
 *   receita       = precoVenda x quantidade
 *   lucro         = receita - custoTotal
 *   margemPct     = lucro / receita (0 se nao vendeu)
 */

export interface ImpressoBase {
  quantidade: number;
  custoPeca: number;
  outrosPeca: number;
  precoVenda: number;
}

export interface ContasImpresso {
  custoUnitario: number;
  custoTotal: number;
  receita: number;
  lucro: number;
  lucroPeca: number;
  margemPct: number;
}

export function contas(i: ImpressoBase): ContasImpresso {
  const qtd = Math.max(0, Math.trunc(i.quantidade || 0));
  const custoUnitario = (i.custoPeca || 0) + (i.outrosPeca || 0);
  const custoTotal = custoUnitario * qtd;
  const receita = (i.precoVenda || 0) * qtd;
  const lucro = receita - custoTotal;
  return {
    custoUnitario,
    custoTotal,
    receita,
    lucro,
    lucroPeca: (i.precoVenda || 0) - custoUnitario,
    margemPct: receita > 0 ? (lucro / receita) * 100 : 0,
  };
}

export interface Totais {
  lotes: number;
  pecas: number;
  custoTotal: number;
  receita: number;
  lucro: number;
  margemPct: number;
}

/** Soma de tudo: pecas, custo, receita, lucro e margem geral. */
export function totais(itens: ImpressoBase[]): Totais {
  let pecas = 0;
  let custoTotal = 0;
  let receita = 0;
  for (const i of itens) {
    const c = contas(i);
    pecas += Math.max(0, Math.trunc(i.quantidade || 0));
    custoTotal += c.custoTotal;
    receita += c.receita;
  }
  const lucro = receita - custoTotal;
  return {
    lotes: itens.length,
    pecas,
    custoTotal,
    receita,
    lucro,
    margemPct: receita > 0 ? (lucro / receita) * 100 : 0,
  };
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
