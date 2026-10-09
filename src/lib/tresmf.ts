/**
 * tresmf.ts — Le o arquivo .3mf do Bambu Studio (roda no navegador).
 *
 * O .3mf e um zip. O que interessa fica em Metadata/:
 *   slice_info.config -> so vem preenchido no arquivo FATIADO
 *                        (Exportar arquivo fatiado da placa = .gcode.3mf):
 *                        tempo (prediction), gramas (weight), cores e objetos
 *                        de cada placa
 *   plate_N.gcode     -> o G-code; o cabecalho tambem tem tempo e gramas
 *   model_settings.config -> placas e as pecas (model_instance) de cada
 *                        uma; vem ate no projeto salvo sem fatiar
 *   plate_N.json      -> objetos de cada placa (plano B pra contar pecas)
 *
 * Sem dependencias: le o indice do zip na mao e descompacta com o
 * DecompressionStream do navegador.
 */

export interface PlacaArquivo {
  indice: number;
  /** Objetos na placa (sem a torre de limpeza) = pecas impressas. */
  pecas: number;
  /** null quando o arquivo nao foi fatiado. */
  gramas: number | null;
  segundos: number | null;
  cores: Array<{ hex: string; gramas: number }>;
}

export interface ArquivoLido {
  placas: PlacaArquivo[];
  /** true se pelo menos uma placa tem gramas e tempo. */
  fatiado: boolean;
}

export class ErroArquivo extends Error {}

// ── Zip ──────────────────────────────────────────────────────────────────────

interface EntradaZip {
  nome: string;
  metodo: number;
  tamanho: number;
  inicioLocal: number;
}

function indiceDoZip(buf: ArrayBuffer): EntradaZip[] {
  const dv = new DataView(buf);
  // Fim do diretorio central: assinatura 0x06054b50 nos ultimos ~64 KB.
  let fim = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new ErroArquivo("Esse arquivo nao e um .3mf valido.");
  let total = dv.getUint16(fim + 10, true);
  let pos = dv.getUint32(fim + 16, true);
  // Zip64: o indice de verdade fica no registro zip64 antes do fim.
  if (pos === 0xffffffff && fim >= 20 && dv.getUint32(fim - 20, true) === 0x07064b50) {
    const fim64 = Number(dv.getBigUint64(fim - 12, true));
    total = Number(dv.getBigUint64(fim64 + 32, true));
    pos = Number(dv.getBigUint64(fim64 + 48, true));
  }

  const decoder = new TextDecoder();
  const entradas: EntradaZip[] = [];
  for (let n = 0; n < total && dv.getUint32(pos, true) === 0x02014b50; n++) {
    const metodo = dv.getUint16(pos + 10, true);
    let tamanho = dv.getUint32(pos + 20, true);
    const tamNome = dv.getUint16(pos + 28, true);
    const tamExtra = dv.getUint16(pos + 30, true);
    const tamComent = dv.getUint16(pos + 32, true);
    let inicioLocal = dv.getUint32(pos + 42, true);
    const nome = decoder.decode(new Uint8Array(buf, pos + 46, tamNome));
    // Campo extra zip64 (id 0x0001) quando os tamanhos nao cabem em 32 bits.
    if (tamanho === 0xffffffff || inicioLocal === 0xffffffff) {
      let e = pos + 46 + tamNome;
      const fimExtra = e + tamExtra;
      while (e + 4 <= fimExtra) {
        const id = dv.getUint16(e, true);
        const tam = dv.getUint16(e + 2, true);
        if (id === 0x0001) {
          let p = e + 4;
          if (dv.getUint32(pos + 24, true) === 0xffffffff) p += 8; // descompactado
          if (tamanho === 0xffffffff) {
            tamanho = Number(dv.getBigUint64(p, true));
            p += 8;
          }
          if (inicioLocal === 0xffffffff) inicioLocal = Number(dv.getBigUint64(p, true));
          break;
        }
        e += 4 + tam;
      }
    }
    entradas.push({ nome, metodo, tamanho, inicioLocal });
    pos += 46 + tamNome + tamExtra + tamComent;
  }
  return entradas;
}

async function lerEntrada(buf: ArrayBuffer, e: EntradaZip): Promise<string> {
  const dv = new DataView(buf);
  if (dv.getUint32(e.inicioLocal, true) !== 0x04034b50) throw new ErroArquivo("Arquivo .3mf corrompido.");
  const inicio = e.inicioLocal + 30 + dv.getUint16(e.inicioLocal + 26, true) + dv.getUint16(e.inicioLocal + 28, true);
  const dados = new Uint8Array(buf, inicio, e.tamanho);
  if (e.metodo === 0) return new TextDecoder().decode(dados);
  if (e.metodo !== 8) throw new ErroArquivo("O .3mf usa uma compressao que nao sei ler.");
  const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(fluxo).text();
}

// ── Conteudo do Bambu Studio ─────────────────────────────────────────────────

function atributo(tag: string, nome: string): string | null {
  const m = tag.match(new RegExp(`\\b${nome}="([^"]*)"`));
  return m ? m[1] : null;
}

function metadado(bloco: string, chave: string): string | null {
  for (const m of bloco.matchAll(/<metadata\b[^>]*>/g)) {
    if (atributo(m[0], "key") === chave) return atributo(m[0], "value");
  }
  return null;
}

const TORRE = /wipe[_ ]?tower|prime[_ ]?tower/i;

/** Placas do slice_info.config (vazio no projeto salvo sem fatiar). */
function placasDoSliceInfo(xml: string): PlacaArquivo[] {
  const placas: PlacaArquivo[] = [];
  for (const m of xml.matchAll(/<plate>([\s\S]*?)<\/plate>/g)) {
    const bloco = m[1];
    const objetos = [...bloco.matchAll(/<object\b[^>]*>/g)].filter(
      (o) => atributo(o[0], "skipped") !== "true" && !TORRE.test(atributo(o[0], "name") ?? ""),
    );
    const cores = [...bloco.matchAll(/<filament\b[^>]*>/g)]
      .map((f) => ({
        hex: (atributo(f[0], "color") ?? "#000000").slice(0, 7).toUpperCase(),
        gramas: Number(atributo(f[0], "used_g") ?? 0) || 0,
      }))
      .filter((c) => c.gramas > 0);
    const peso = Number(metadado(bloco, "weight") ?? NaN);
    const tempo = Number(metadado(bloco, "prediction") ?? NaN);
    placas.push({
      indice: Number(metadado(bloco, "index") ?? placas.length + 1) || placas.length + 1,
      pecas: objetos.length,
      gramas: Number.isFinite(peso) && peso > 0 ? peso : cores.length ? cores.reduce((s, c) => s + c.gramas, 0) : null,
      segundos: Number.isFinite(tempo) && tempo > 0 ? Math.round(tempo) : null,
      cores,
    });
  }
  return placas;
}

/** "9h 20m 11s" / "1d 2h 3m" -> segundos. */
function duracao(txt: string): number {
  let s = 0;
  for (const [, n, u] of txt.matchAll(/(\d+)\s*([dhms])/g)) {
    s += Number(n) * ({ d: 86_400, h: 3_600, m: 60, s: 1 } as Record<string, number>)[u];
  }
  return s;
}

/** Tempo e gramas do cabecalho do G-code (plano B se o slice_info nao tiver). */
function doGcode(gcode: string): { segundos: number | null; gramas: number | null } {
  const cabecalho = gcode.slice(0, 20_000);
  const t = cabecalho.match(/;\s*total estimated time:\s*([^\n;]+)/i) ?? cabecalho.match(/;\s*estimated printing time[^=]*=\s*([^\n]+)/i);
  const g = cabecalho.match(/;\s*total filament weight \[g\]\s*:\s*([^\n]+)/i);
  const gramas = g ? g[1].split(",").reduce((s, x) => s + (Number(x) || 0), 0) : 0;
  const segundos = t ? duracao(t[1]) : 0;
  return { segundos: segundos > 0 ? segundos : null, gramas: gramas > 0 ? gramas : null };
}

/** Placas do projeto e quantas pecas (model_instance) tem em cada uma. */
function placasDoModelSettings(xml: string): Array<{ indice: number; pecas: number }> {
  return [...xml.matchAll(/<plate>([\s\S]*?)<\/plate>/g)].map((m, n) => ({
    indice: Number(metadado(m[1], "plater_id") ?? n + 1) || n + 1,
    pecas: (m[1].match(/<model_instance>/g) ?? []).length,
  }));
}

/** Pecas de cada placa pelo plate_N.json (existe ate sem fatiar). */
function pecasDoPlateJson(json: string): number {
  try {
    const dados = JSON.parse(json) as { bbox_objects?: Array<{ name?: string }> };
    return (dados.bbox_objects ?? []).filter((o) => !TORRE.test(o.name ?? "")).length;
  } catch {
    return 0;
  }
}

/** Le um .3mf / .gcode.3mf do Bambu Studio. */
export async function lerTresMf(arquivo: Blob): Promise<ArquivoLido> {
  const buf = await arquivo.arrayBuffer();
  const entradas = indiceDoZip(buf);
  const achar = (nome: string) => entradas.find((e) => e.nome === nome);

  const slice = achar("Metadata/slice_info.config");
  let placas = slice ? placasDoSliceInfo(await lerEntrada(buf, slice)) : [];

  // Projeto sem fatiar: pelo menos as placas e as pecas de cada uma.
  const ajustes = achar("Metadata/model_settings.config");
  const doProjeto = ajustes ? placasDoModelSettings(await lerEntrada(buf, ajustes)) : [];
  if (placas.length === 0) {
    placas = doProjeto.map((x) => ({ ...x, gramas: null, segundos: null, cores: [] }));
  }
  if (placas.length === 0) {
    const jsons = entradas
      .map((e) => ({ e, m: e.nome.match(/^Metadata\/plate_(\d+)\.json$/) }))
      .filter((x) => x.m)
      .sort((a, b) => Number(a.m![1]) - Number(b.m![1]));
    for (const { e, m } of jsons) {
      placas.push({ indice: Number(m![1]), pecas: pecasDoPlateJson(await lerEntrada(buf, e)), gramas: null, segundos: null, cores: [] });
    }
  }

  // Completa com o G-code o que o slice_info nao trouxe (ou as pecas, pelo json).
  for (const p of placas) {
    if (p.gramas === null || p.segundos === null) {
      const g = achar(`Metadata/plate_${p.indice}.gcode`);
      if (g) {
        const lido = doGcode(await lerEntrada(buf, g));
        p.gramas ??= lido.gramas;
        p.segundos ??= lido.segundos;
      }
    }
    if (p.pecas === 0) p.pecas = doProjeto.find((x) => x.indice === p.indice)?.pecas ?? 0;
    if (p.pecas === 0) {
      const j = achar(`Metadata/plate_${p.indice}.json`);
      if (j) p.pecas = pecasDoPlateJson(await lerEntrada(buf, j));
    }
  }

  placas = placas.filter((p) => p.pecas > 0 || p.gramas !== null);
  if (placas.length === 0) throw new ErroArquivo("Nao achei nenhuma placa nesse arquivo. E um .3mf do Bambu Studio?");
  return { placas, fatiado: placas.some((p) => p.gramas !== null && p.segundos !== null) };
}
