/**
 * filamento.ts — Calculo de filamento de um modelo do MakerWorld.
 *
 * Porte do filamento_3d.py do Bot_Marketing. Cole o link do modelo
 * (ex.: makerworld.com/pt/models/3119259-...#profileId-3518558) e o modulo
 * busca na API publica do MakerWorld os gramas de CADA COR em CADA PLACA do
 * perfil de impressao, soma tudo e responde:
 *
 *   - quanto de cada cor uma peca gasta e quanto isso custa em reais;
 *   - quantas pecas saem com 1 rolo de cada cor e qual cor e o GARGALO;
 *   - pra N pecas, quantos rolos de cada cor comprar, o investimento total
 *     e quanto sobra em cada rolo;
 *   - tempo de impressao estimado por peca e pro lote.
 *
 * Escala: diminuiu a peca no slicer (escala uniforme)? O peso cai com o
 * CUBO do tamanho, entao 60% do tamanho = 21,6% dos gramas.
 */

import { request as httpsRequest } from "node:https";
import { horas, numero, reais } from "./formato";

// ── Tipos ────────────────────────────────────────────────────────────────────

/** Uma cor de filamento como vem do perfil (ou digitada na mao). */
export interface CorEntrada {
  nome: string;
  tipo: string;
  gramas: number;
  metros: number;
}

/** Mapa chave (hex "#RRGGBB" ou nome, no manual) -> cor. */
export type Cores = Record<string, CorEntrada>;

export interface LinhaCor {
  hex: string;
  nome: string;
  tipo: string;
  gramas100: number;
  gramasPeca: number;
  custoPeca: number;
  pecasPorRolo: number;
  sobra1Rolo: number;
  gramasLote: number;
  rolosLote: number;
  custoRolosLote: number;
  sobraLote: number;
}

export interface Resultado {
  pecas: number;
  precoRolo: number;
  roloG: number;
  margemPct: number;
  escalaPct: number;
  fatorEscala: number;
  cores: LinhaCor[];
  gramasPeca100: number;
  gramasPeca: number;
  custoPeca: number;
  rolosParaComecar: number;
  custoParaComecar: number;
  maxPecas1RoloCada: number;
  gargalo: string;
  gargaloHex: string;
  gramasLote: number;
  custoMaterialLote: number;
  rolosLote: number;
  custoRolosLote: number;
  sobraLote: number;
}

export interface PerfilResumo {
  id: number;
  titulo: string;
  placas: number;
  gramas: number;
  segundos: number;
  padrao: boolean;
}

/** Uma placa do perfil: o MakerWorld informa gramas e tempo de cada uma. */
export interface PlacaResumo {
  indice: number;
  nome: string;
  gramas: number;
  segundos: number;
  cores: Array<{ hex: string; nome: string; gramas: number }>;
}

export interface InfoModelo {
  titulo: string;
  perfil: string;
  placas: number;
  segundos: number;
  /** Detalhe de cada placa (vazio no calculo manual). */
  listaPlacas: PlacaResumo[];
  idModelo: number | null;
  idPerfil: number | null;
  outrosPerfis: PerfilResumo[];
}

export interface OpcoesCalculo {
  pecas?: number;
  precoRolo: number;
  roloG: number;
  margemPct?: number;
  escalaPct?: number;
}

/** Erro "de negocio" (link errado, MakerWorld bloqueou...) — mensagem pro usuario. */
export class ErroFilamento extends Error {}

// ── MakerWorld ───────────────────────────────────────────────────────────────

const API_DESIGN = "https://makerworld.com/api/v1/design-service/design/";

// O MakerWorld fica atras do Cloudflare: sem um User-Agent de navegador a
// API responde a pagina "Just a moment..." em vez do JSON.
const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

// Tipos enxutos do JSON do MakerWorld (so o que usamos).
interface MwFilamento {
  color?: string;
  type?: string;
  usedG?: number | string;
  usedM?: number | string;
}
interface MwPlaca {
  index?: number | string;
  name?: string;
  weight?: number | string;
  prediction?: number | string;
  filaments?: MwFilamento[];
}
interface MwInstancia {
  id?: number | string;
  title?: string;
  titleTranslated?: string;
  extention?: { modelInfo?: { plates?: MwPlaca[] } };
}
export interface MwModelo {
  title?: string;
  titleTranslated?: string;
  defaultInstanceId?: number | string;
  instances?: MwInstancia[];
}

/** Devolve {idModelo, idPerfil} a partir do link do MakerWorld. Aceita so o numero. */
export function extrairIds(link: string): { idModelo: number | null; idPerfil: number | null } {
  const texto = String(link ?? "").trim();
  if (/^\d+$/.test(texto)) return { idModelo: Number(texto), idPerfil: null };
  const m = texto.match(/\/models\/(\d+)/);
  const p = texto.match(/profileId-(\d+)/);
  return {
    idModelo: m ? Number(m[1]) : null,
    idPerfil: p ? Number(p[1]) : null,
  };
}

interface RespostaHttp {
  status: number;
  tipo: string;
  corpo: string;
}

// O fetch do Node (undici) cai no desafio do Cloudflare; o modulo https
// classico passa. Por isso a consulta e feita com https.request.
function baixar(url: string, timeoutMs = 25_000): Promise<RespostaHttp> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: "GET", headers: { ...HEADERS, "Accept-Encoding": "identity" } }, (res) => {
      const partes: Buffer[] = [];
      res.on("data", (d: Buffer) => partes.push(d));
      res.on("end", () =>
        resolve({
          status: res.statusCode ?? 0,
          tipo: String(res.headers["content-type"] ?? ""),
          corpo: Buffer.concat(partes).toString("utf8"),
        }),
      );
      res.on("error", reject);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error("tempo esgotado")));
    req.on("error", reject);
    req.end();
  });
}

/** JSON do modelo na API publica do MakerWorld (sem login). */
export async function buscarModelo(idModelo: number): Promise<MwModelo> {
  let resp: RespostaHttp;
  try {
    resp = await baixar(API_DESIGN + idModelo);
  } catch (err) {
    throw new ErroFilamento(`Nao consegui falar com o MakerWorld: ${(err as Error).message}`);
  }
  if (resp.status !== 200 || !resp.tipo.includes("application/json")) {
    if (resp.corpo.includes("Just a moment") || resp.status === 403 || resp.status === 503) {
      throw new ErroFilamento(
        "O MakerWorld bloqueou a consulta (Cloudflare). Tente de novo em alguns " +
          "segundos ou informe os gramas na mao.",
      );
    }
    throw new ErroFilamento(`MakerWorld respondeu ${resp.status} para o modelo ${idModelo}.`);
  }
  try {
    return JSON.parse(resp.corpo) as MwModelo;
  } catch {
    throw new ErroFilamento("O MakerWorld respondeu algo que nao e JSON.");
  }
}

function limparHtml(texto: unknown): string {
  return String(texto ?? "").replace(/<[^>]+>/g, "").trim();
}

function placasDe(inst: MwInstancia): MwPlaca[] {
  return inst.extention?.modelInfo?.plates ?? [];
}

/** Lista enxuta dos perfis de impressao: id, titulo, placas, gramas, segundos. */
export function perfisDoModelo(modelo: MwModelo): PerfilResumo[] {
  const padrao = Number(modelo.defaultInstanceId ?? -1);
  return (modelo.instances ?? []).map((inst) => {
    const placas = placasDe(inst);
    return {
      id: Number(inst.id ?? 0),
      titulo: limparHtml(inst.title || inst.titleTranslated || ""),
      placas: placas.length,
      gramas: placas.reduce((s, p) => s + Math.trunc(Number(p.weight ?? 0)), 0),
      segundos: placas.reduce((s, p) => s + Math.trunc(Number(p.prediction ?? 0)), 0),
      padrao: Number(inst.id ?? 0) === padrao,
    };
  });
}

/** Perfil pedido (#profileId-...) ou o padrao do modelo. */
export function escolherPerfil(modelo: MwModelo, idPerfil: number | null): MwInstancia {
  const instancias = modelo.instances ?? [];
  if (!instancias.length) {
    throw new ErroFilamento(
      "Esse modelo nao tem perfil de impressao publicado (sem dados de filamento).",
    );
  }
  if (idPerfil !== null) {
    const achado = instancias.find((i) => Number(i.id ?? 0) === idPerfil);
    if (achado) return achado;
  }
  const padrao = Number(modelo.defaultInstanceId ?? 0);
  return instancias.find((i) => Number(i.id ?? 0) === padrao) ?? instancias[0];
}

/** Cada placa do perfil com seus gramas (soma das cores), tempo e cores. */
export function placasDoPerfil(perfil: MwInstancia): PlacaResumo[] {
  return placasDe(perfil).map((p, n) => {
    const cores = (p.filaments ?? [])
      .map((f) => {
        const hex = String(f.color || "#000000").toUpperCase();
        return { hex, nome: nomeDaCor(hex), gramas: Number(f.usedG ?? 0) || 0 };
      })
      .filter((c) => c.gramas > 0);
    const somaCores = cores.reduce((s, c) => s + c.gramas, 0);
    return {
      indice: Number(p.index ?? n + 1) || n + 1,
      nome: limparHtml(p.name ?? ""),
      gramas: somaCores > 0 ? somaCores : Number(p.weight ?? 0) || 0,
      segundos: Math.trunc(Number(p.prediction ?? 0)) || 0,
      cores,
    };
  });
}

/** Soma os filamentos de todas as placas do perfil. */
export function gramasDoPerfil(perfil: MwInstancia): { cores: Cores; placas: number; segundos: number } {
  const placas = placasDe(perfil);
  const cores: Cores = {};
  let segundos = 0;
  for (const placa of placas) {
    segundos += Math.trunc(Number(placa.prediction ?? 0));
    for (const fil of placa.filaments ?? []) {
      const hex = String(fil.color || "#000000").toUpperCase();
      const item = (cores[hex] ??= {
        nome: nomeDaCor(hex),
        tipo: String(fil.type || "PLA"),
        gramas: 0,
        metros: 0,
      });
      item.gramas += Number(fil.usedG ?? 0) || 0;
      item.metros += Number(fil.usedM ?? 0) || 0;
    }
  }
  for (const k of Object.keys(cores)) if (cores[k].gramas <= 0) delete cores[k];
  if (!Object.keys(cores).length) {
    throw new ErroFilamento("O perfil nao informa o peso dos filamentos.");
  }
  return { cores, placas: placas.length, segundos };
}

/** "preto=110, vermelho=7.5" -> mesmo formato de gramasDoPerfil. */
export function gramasManuais(texto: string): Cores {
  const cores: Cores = {};
  for (let parte of String(texto ?? "").split(/[,;\n]/)) {
    parte = parte.trim();
    if (!parte) continue;
    const sep = parte.search(/[=:]/);
    if (sep < 0) {
      throw new ErroFilamento(`Formato invalido em "${parte}". Use cor=gramas, ex.: preto=110`);
    }
    const nome = parte.slice(0, sep).trim();
    const valor = parte.slice(sep + 1).replace(",", ".").replace(/g/gi, "").trim();
    const g = Number(valor);
    if (!Number.isFinite(g)) throw new ErroFilamento(`Gramas invalidas em "${parte}".`);
    if (g <= 0) continue;
    const chave = nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
    const item = (cores[chave] ??= { nome: chave, tipo: "PLA", gramas: 0, metros: 0 });
    item.gramas += g;
  }
  if (!Object.keys(cores).length) throw new ErroFilamento("Nenhuma cor informada.");
  return cores;
}

// ── Nome da cor pelo matiz (HSV) ─────────────────────────────────────────────
// O MakerWorld so manda o hex do filamento carregado no slicer. Distancia RGB
// confundia azul-marinho (#042F56) com verde escuro; por matiz nao confunde.

const FAIXAS_MATIZ: Array<[number, string]> = [
  [15, "Vermelho"], [40, "Laranja"], [70, "Amarelo"], [165, "Verde"],
  [200, "Azul claro"], [260, "Azul"], [290, "Roxo"], [345, "Rosa"], [360, "Vermelho"],
];

function hexParaRgb(hex: string): [number, number, number] | null {
  const h = String(hex ?? "").trim().replace(/^#/, "");
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** "#C43527" -> "Vermelho", "#042F56" -> "Azul escuro". Hex invalido volta como veio. */
export function nomeDaCor(hex: string): string {
  const rgb = hexParaRgb(hex);
  if (!rgb) return hex || "?";
  const [r, g, b] = rgb.map((x) => x / 255);
  const maior = Math.max(r, g, b);
  const menor = Math.min(r, g, b);
  const v = maior;
  const sat = maior ? (maior - menor) / maior : 0;

  if (v < 0.12) return "Preto";
  if (sat < 0.12) {
    if (v > 0.9) return "Branco";
    if (v > 0.6) return "Cinza claro";
    if (v > 0.3) return "Cinza";
    return "Cinza escuro";
  }
  const delta = maior - menor;
  let h: number;
  if (maior === r) h = 60 * ((((g - b) / delta) % 6 + 6) % 6);
  else if (maior === g) h = 60 * ((b - r) / delta + 2);
  else h = 60 * ((r - g) / delta + 4);

  let base = FAIXAS_MATIZ.find(([limite]) => h < limite)?.[1] ?? "Vermelho";
  if (base === "Laranja" || base === "Amarelo") {
    if (v < 0.55) return "Marrom";
    if (sat < 0.4 && v > 0.7) return "Bege";
  }
  if (base === "Rosa" && v < 0.5) base = "Roxo";
  if (v < 0.45 && !base.includes("claro")) return `${base} escuro`;
  if (sat < 0.45 && v > 0.8 && !base.includes("claro")) return `${base} claro`;
  return base;
}

// ── A conta ──────────────────────────────────────────────────────────────────

/**
 * Faz todas as contas de filamento pra `pecas` unidades.
 *
 * margemPct: folga em % somada aos gramas de cada cor (purga, falha, rolo
 * com menos de 1 kg util). 0 = usa o numero cru do slicer.
 * escalaPct: tamanho da peca no slicer em % (escala uniforme). O peso cai
 * com o CUBO: 60% do tamanho = 0.6^3 = 21.6% dos gramas do perfil.
 */
export function calcular(cores: Cores, op: OpcoesCalculo): Resultado {
  const pecas = Math.max(1, Math.trunc(op.pecas ?? 1));
  const precoRolo = op.precoRolo;
  const roloG = op.roloG;
  const margemPct = Math.max(0, op.margemPct ?? 0);
  const escalaPct = op.escalaPct && op.escalaPct > 0 ? op.escalaPct : 100;
  const fatorEscala = (escalaPct / 100) ** 3;
  const fatorMargem = 1 + margemPct / 100;

  const linhas: LinhaCor[] = Object.entries(cores).map(([hex, c]) => {
    const g100 = c.gramas * fatorMargem;
    const g = g100 * fatorEscala;
    const pecasPorRolo = g > 0 ? Math.floor(roloG / g) : 0;
    const rolos = Math.ceil((pecas * g) / roloG);
    return {
      hex,
      nome: c.nome,
      tipo: c.tipo || "PLA",
      gramas100: g100,
      gramasPeca: g,
      custoPeca: (g / roloG) * precoRolo,
      pecasPorRolo,
      sobra1Rolo: roloG - pecasPorRolo * g,
      gramasLote: pecas * g,
      rolosLote: rolos,
      custoRolosLote: rolos * precoRolo,
      sobraLote: rolos * roloG - pecas * g,
    };
  });
  linhas.sort((a, b) => b.gramasPeca - a.gramasPeca);

  const gargalo = linhas.reduce((min, l) => (l.pecasPorRolo < min.pecasPorRolo ? l : min), linhas[0]);
  const gramasPeca = linhas.reduce((s, l) => s + l.gramasPeca, 0);
  const custoPeca = linhas.reduce((s, l) => s + l.custoPeca, 0);
  const rolosLote = linhas.reduce((s, l) => s + l.rolosLote, 0);

  return {
    pecas,
    precoRolo,
    roloG,
    margemPct,
    escalaPct,
    fatorEscala,
    cores: linhas,
    gramasPeca100: linhas.reduce((s, l) => s + l.gramas100, 0),
    gramasPeca,
    custoPeca,
    rolosParaComecar: linhas.length,
    custoParaComecar: linhas.length * precoRolo,
    maxPecas1RoloCada: gargalo.pecasPorRolo,
    gargalo: gargalo.nome,
    gargaloHex: gargalo.hex,
    gramasLote: gramasPeca * pecas,
    custoMaterialLote: custoPeca * pecas,
    rolosLote,
    custoRolosLote: rolosLote * precoRolo,
    sobraLote: linhas.reduce((s, l) => s + l.sobraLote, 0),
  };
}

/** Linhas mostrando a conta dos gramas na escala, pra conferir na mao. */
export function explicarEscala(res: Resultado): string[] {
  const e = res.escalaPct;
  const f = res.fatorEscala;
  const k = e / 100;
  const linhas = [`fator = (${numero(e, 0)} / 100)^3 = ${numero(k, 2)} x ${numero(k, 2)} x ${numero(k, 2)} = ${numero(f, 4)}`];
  for (const c of res.cores) {
    linhas.push(`${c.nome}: ${numero(c.gramas100, 1)} g x ${numero(f, 4)} = ${numero(c.gramasPeca, 2)} g`);
  }
  linhas.push(`TOTAL: ${numero(res.gramasPeca100, 1)} g x ${numero(f, 4)} = ${numero(res.gramasPeca, 2)} g`);
  return linhas;
}

// ── Relatorio em texto (igual ao .txt do Bot_Marketing) ─────────────────────

function pad(txt: string, n: number, dir: "esq" | "dir" = "esq"): string {
  return dir === "esq" ? txt.padEnd(n) : txt.padStart(n);
}

export function relatorio(
  res: Resultado,
  info: { titulo?: string; link?: string; perfil?: string; placas?: number; segundos?: number },
): string {
  const L: string[] = [];
  const n = res.pecas;
  const sep = "=".repeat(64);
  L.push(sep);
  L.push(`FILAMENTO — ${info.titulo || "gramas informados na mao"}`);
  if (info.link) L.push(`Link: ${info.link}`);
  if (info.perfil) L.push(`Perfil: ${info.perfil}`);
  const extra: string[] = [];
  if (info.placas) extra.push(`${info.placas} placa(s)`);
  if (info.segundos) extra.push(`~${horas(info.segundos)} de impressao por peca`);
  if (extra.length) L.push(extra.join(" | "));
  L.push(
    `Rolo: ${numero(res.roloG, 0)} g por ${reais(res.precoRolo)}` +
      (res.margemPct ? ` | margem de ${numero(res.margemPct, 0)}% sobre o slicer` : ""),
  );
  const escalado = res.escalaPct !== 100;
  if (escalado) {
    L.push(
      `Escala: peca a ${numero(res.escalaPct, 0)}% do tamanho original -> peso x${numero(res.fatorEscala, 3)} ` +
        "(escala uniforme, volume ao cubo)",
    );
  }
  L.push(sep);
  L.push("");
  L.push("POR PECA (1 unidade):");
  const col100 = escalado ? ` ${pad("100%", 8, "dir")}` : "";
  L.push(`  ${pad("Cor", 20)}${col100} ${pad("Gramas", 8, "dir")} ${pad("Custo", 12, "dir")} ${pad("Pecas/rolo", 11, "dir")} ${pad("Sobra", 9, "dir")}`);
  for (const c of res.cores) {
    const rotulo = c.hex.startsWith("#") ? `${c.nome} ${c.hex}` : c.nome;
    const v100 = escalado ? ` ${pad(numero(c.gramas100, 1) + "g", 8, "dir")}` : "";
    L.push(
      `  ${pad(rotulo, 20)}${v100} ${pad(numero(c.gramasPeca, 1) + "g", 8, "dir")} ${pad(reais(c.custoPeca), 12, "dir")} ` +
        `${pad(String(c.pecasPorRolo), 11, "dir")} ${pad(numero(c.sobra1Rolo, 0) + "g", 9, "dir")}`,
    );
  }
  const t100 = escalado ? ` ${pad(numero(res.gramasPeca100, 1) + "g", 8, "dir")}` : "";
  L.push(`  ${pad("TOTAL", 20)}${t100} ${pad(numero(res.gramasPeca, 1) + "g", 8, "dir")} ${pad(reais(res.custoPeca), 12, "dir")}`);
  if (escalado) {
    L.push("");
    L.push("CONTA DA ESCALA:");
    L.push(...explicarEscala(res));
  }
  L.push("");
  L.push(`PRA COMECAR precisa de ${res.rolosParaComecar} rolo(s), um de cada cor: ${reais(res.custoParaComecar)}.`);
  L.push(`Com 1 rolo de cada da pra fazer ${res.maxPecas1RoloCada} peca(s) — o gargalo e o ${res.gargalo}.`);
  L.push(`Material gasto por peca: ${reais(res.custoPeca)} (${numero(res.gramasPeca, 0)} g).`);
  if (n > 1) {
    L.push("");
    L.push(`PRA ${n} PECAS:`);
    L.push(`  ${pad("Cor", 20)} ${pad("Gasta", 9, "dir")} ${pad("Rolos", 6, "dir")} ${pad("Custo rolos", 13, "dir")} ${pad("Sobra", 9, "dir")}`);
    for (const c of res.cores) {
      L.push(
        `  ${pad(c.nome, 20)} ${pad(numero(c.gramasLote, 0) + "g", 9, "dir")} ${pad(String(c.rolosLote), 6, "dir")} ` +
          `${pad(reais(c.custoRolosLote), 13, "dir")} ${pad(numero(c.sobraLote, 0) + "g", 9, "dir")}`,
      );
    }
    L.push(`  Comprar ${res.rolosLote} rolo(s) = ${reais(res.custoRolosLote)}; sobram ${numero(res.sobraLote, 0)} g no total.`);
    L.push(`  Material realmente consumido: ${reais(res.custoMaterialLote)} (${numero(res.gramasLote, 0)} g).`);
    if (info.segundos) L.push(`  Tempo de impressao do lote: ~${horas(info.segundos * n)}.`);
  }
  L.push(sep);
  return L.join("\n");
}

// ── Fluxo completo ───────────────────────────────────────────────────────────

export interface CalculoCompleto {
  res: Resultado;
  texto: string;
  info: InfoModelo;
  origem: "makerworld" | "manual";
  link: string;
}

/** Busca o modelo no MakerWorld, escolhe o perfil e calcula. */
export async function calcularPorLink(
  link: string,
  op: OpcoesCalculo & { perfilId?: number | null },
): Promise<CalculoCompleto> {
  const { idModelo, idPerfil: idPerfilLink } = extrairIds(link);
  if (idModelo === null) {
    throw new ErroFilamento("Nao achei o numero do modelo no link. Ele fica em .../models/NUMERO-nome");
  }
  const modelo = await buscarModelo(idModelo);
  const perfil = escolherPerfil(modelo, op.perfilId ?? idPerfilLink);
  const { cores, placas, segundos } = gramasDoPerfil(perfil);
  const res = calcular(cores, op);
  const titulo = limparHtml(modelo.title || modelo.titleTranslated || `modelo ${idModelo}`);
  const perfilTitulo = limparHtml(perfil.title || perfil.titleTranslated || String(perfil.id ?? ""));
  const idPerfil = Number(perfil.id ?? 0) || null;
  const info: InfoModelo = {
    titulo,
    perfil: perfilTitulo,
    placas,
    segundos,
    listaPlacas: placasDoPerfil(perfil),
    idModelo,
    idPerfil,
    outrosPerfis: perfisDoModelo(modelo).filter((p) => p.id !== idPerfil),
  };
  return {
    res,
    texto: relatorio(res, { titulo, link, perfil: perfilTitulo, placas, segundos }),
    info,
    origem: "makerworld",
    link,
  };
}

/** Calcula a partir dos gramas digitados na mao ("preto=110, vermelho=7"). */
export function calcularManual(gramasTexto: string, titulo: string, op: OpcoesCalculo): CalculoCompleto {
  const cores = gramasManuais(gramasTexto);
  const res = calcular(cores, op);
  const nome = titulo.trim() || "gramas na mao";
  return {
    res,
    texto: relatorio(res, { titulo: nome }),
    info: { titulo: nome, perfil: "", placas: 0, segundos: 0, listaPlacas: [], idModelo: null, idPerfil: null, outrosPerfis: [] },
    origem: "manual",
    link: "",
  };
}
