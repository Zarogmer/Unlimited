// Formatacao em pt-BR usada nas telas e nos relatorios.

const fmtReais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 12.5 -> "R$ 12,50" (negativo vira "-R$ 1,00"). */
export function reais(valor: number): string {
  const v = Number.isFinite(valor) ? valor : 0;
  return fmtReais.format(v).replace(/ /g, " ");
}

/** 1234.567 -> "1.234,6" (casas decimais opcionais). */
export function numero(valor: number, casas = 1): string {
  const v = Number.isFinite(valor) ? valor : 0;
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** 8.21 -> "8,2 g". */
export function gramas(valor: number, casas = 1): string {
  return `${numero(valor, casas)} g`;
}

/** 45 -> "45%", 21.6 -> "21,6%". */
export function pct(valor: number, casas = 0): string {
  return `${numero(valor, casas)}%`;
}

/** Segundos -> "3h01" ou "45 min" ("" se nao souber). */
export function horas(segundos: number): string {
  if (!segundos || segundos <= 0) return "";
  const totalMin = Math.floor(segundos / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

/** Data/hora curta em pt-BR: "30/09/2026 15:58". */
export function dataHora(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** So a data: "30/09/2026". */
export function data(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR");
}

/**
 * Numero a partir de texto digitado (aceita "1.234,56", "R$ 12,50", "60%").
 * Texto invalido volta `padrao`.
 */
export function num(valor: unknown, padrao = 0): number {
  if (valor === null || valor === undefined) return padrao;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
  let txt = String(valor).trim().replace(/R\$/g, "").replace(/%/g, "").replace(/\s/g, "");
  if (!txt) return padrao;
  const virgulas = (txt.match(/,/g) ?? []).length;
  const pontos = (txt.match(/\./g) ?? []).length;
  if (virgulas === 1 && pontos <= 1) {
    txt = txt.replace(/\./g, "").replace(",", "."); // 1.234,56 -> 1234.56
  } else if (virgulas > 1 && pontos === 0) {
    txt = txt.replace(/,/g, ""); // 1,234,567
  }
  const n = Number(txt);
  return Number.isFinite(n) ? n : padrao;
}

/** Valor para o atributo `value` de um input numerico (ponto -> virgula fica a cargo do usuario). */
export function paraInput(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "";
  const arred = Math.round(valor * 10 ** casas) / 10 ** casas;
  return String(arred);
}
