/**
 * kits.ts — Contas dos KITS (produto montado com pecas de varios lotes).
 *
 * Cada peca do kit custa o custo real de uma peca boa do lote dela
 * (custoPorBoa: o lote inteiro, perdas incluidas, dividido pelas boas).
 *   custoPecas = soma(quantidade x custoPorBoa do lote)
 *   custoTotal = custoPecas + outrosCusto (argolas, embalagem...)
 *   avulso     = soma(quantidade x preco de venda da peca no lote) — quanto daria vendendo separado
 *   lucro      = precoVenda - custoTotal
 *   margemPct  = lucro / precoVenda (0 se nao tem preco)
 */

export interface LinhaKit {
  quantidade: number;
  custoPorBoa: number;
  precoAvulso: number;
}

export interface ContasKit {
  pecas: number;
  custoPecas: number;
  custoTotal: number;
  avulso: number;
  lucro: number;
  margemPct: number;
}

export function contasKit(linhas: LinhaKit[], outrosCusto: number, precoVenda: number): ContasKit {
  let pecas = 0;
  let custoPecas = 0;
  let avulso = 0;
  for (const l of linhas) {
    const q = Math.max(0, Math.trunc(l.quantidade || 0));
    pecas += q;
    custoPecas += q * (l.custoPorBoa || 0);
    avulso += q * (l.precoAvulso || 0);
  }
  const custoTotal = custoPecas + Math.max(0, outrosCusto || 0);
  const preco = Math.max(0, precoVenda || 0);
  const lucro = preco - custoTotal;
  return { pecas, custoPecas, custoTotal, avulso, lucro, margemPct: preco > 0 ? (lucro / preco) * 100 : 0 };
}

/**
 * De onde tirar `quantidade` pecas de um lote: primeiro as que estao sem
 * local, depois dos locais com mais pecas. null se nao tiver o suficiente.
 */
export function separar(
  quantidade: number,
  semLocal: number,
  porLocal: Record<string, number>,
): Array<{ deLocalId: string | null; quantidade: number }> | null {
  const partes: Array<{ deLocalId: string | null; quantidade: number }> = [];
  let falta = quantidade;
  const fontes: Array<[string | null, number]> = [
    [null, semLocal],
    ...Object.entries(porLocal).sort((a, b) => b[1] - a[1]),
  ];
  for (const [deLocalId, tem] of fontes) {
    if (falta <= 0) break;
    const q = Math.min(falta, tem);
    if (q > 0) {
      partes.push({ deLocalId, quantidade: q });
      falta -= q;
    }
  }
  return falta > 0 ? null : partes;
}
