"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { puxarFilamento, salvarImpresso, type EstadoImpresso, type FilamentoPuxado } from "./actions";
import { Amostra, Campo, Card, Erro } from "@/components/ui";
import { contas, custoMaterial } from "@/lib/impressos";
import { gramas as fmtGramas, horas, num, numero, paraInput, pct, reais, segundosDeTexto } from "@/lib/formato";

/**
 * Um lote = uma placa. Gramas e tempo sao da placa inteira (o que o
 * fatiador mostra) e cada peca leva a parte dela: gramas / pecas impressas.
 */
export interface ValoresImpresso {
  id?: string;
  calculoId?: string | null;
  modelo: string;
  link: string;
  quando: string; // YYYY-MM-DD
  escalaPct: string;
  quantidade: string;
  perdas: string;
  gramasPlaca: string;
  precoRolo: string;
  pesoRoloG: string;
  custoPeca: string;
  outrosPeca: string;
  precoVenda: string;
  segundosPlaca: string; // "9h20", "45 min" ou segundos
  obs: string;
}

export interface CalculoOpcao {
  id: string;
  titulo: string;
  escalaPct: number;
  custoPeca: number;
}

export function FormImpresso({
  valores,
  titulo,
  calculos = [],
}: {
  valores: ValoresImpresso;
  titulo: string;
  calculos?: CalculoOpcao[];
}) {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState<EstadoImpresso, FormData>(salvarImpresso, {});
  const [v, setV] = useState(valores);
  const [puxando, iniciarPuxar] = useTransition();
  const [puxado, setPuxado] = useState<FilamentoPuxado | null>(null);
  const [placaEscolhida, setPlacaEscolhida] = useState("1");

  const muda = (campo: keyof ValoresImpresso) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV({ ...v, [campo]: e.target.value });

  // Custo do material por peca: gramas da placa / pecas, ou o valor digitado.
  const gramasPlaca = num(v.gramasPlaca);
  const pecas = Math.max(0, Math.trunc(num(v.quantidade, 0)));
  const gramasPeca100 = pecas > 0 ? gramasPlaca / pecas : 0;
  const escala = num(v.escalaPct, 100) || 100;
  const mat = custoMaterial(gramasPeca100, escala, num(v.precoRolo), num(v.pesoRoloG));
  const custoPeca = gramasPlaca > 0 ? mat.custo : num(v.custoPeca);

  const c = contas({
    quantidade: pecas,
    perdas: num(v.perdas, 0),
    custoPeca,
    outrosPeca: num(v.outrosPeca),
    precoVenda: num(v.precoVenda),
  });
  const seg = segundosDeTexto(v.segundosPlaca);

  /** Usa uma placa do MakerWorld ("todas" = soma do projeto inteiro). */
  function usarPlaca(r: FilamentoPuxado, qual: string) {
    setPlacaEscolhida(qual);
    const placa = r.listaPlacas?.find((pl) => String(pl.indice) === qual);
    const g = placa ? placa.gramas100 : (r.gramas100 ?? 0);
    const s = placa ? placa.segundos : (r.segundos ?? 0);
    setV((atual) => ({
      ...atual,
      modelo: atual.modelo.trim() ? atual.modelo : (r.titulo ?? atual.modelo),
      gramasPlaca: paraInput(g, 1),
      segundosPlaca: s > 0 ? horas(s) : atual.segundosPlaca,
    }));
  }

  function puxar() {
    if (!v.link.trim()) {
      setPuxado({ ok: false, erro: "Cole o link do modelo no MakerWorld primeiro." });
      return;
    }
    iniciarPuxar(async () => {
      const r = await puxarFilamento(v.link);
      setPuxado(r);
      if (r.ok) usarPlaca(r, (r.listaPlacas?.length ?? 0) > 1 ? String(r.listaPlacas?.[0].indice ?? "todas") : "todas");
    });
  }

  const listaPlacas = puxado?.ok ? (puxado.listaPlacas ?? []) : [];
  const placaAtual = listaPlacas.find((pl) => String(pl.indice) === placaEscolhida);
  const coresMostradas = placaAtual ? placaAtual.cores : (puxado?.cores ?? []);

  return (
    <form action={acao} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {v.calculoId && <input type="hidden" name="calculoId" value={v.calculoId} />}
      <div className="space-y-4">
        {calculos.length > 0 && !v.id && (
          <Card titulo="Comecar por um calculo salvo">
            <select
              className="campo"
              defaultValue={v.calculoId ?? ""}
              onChange={(e) => {
                if (e.target.value) router.push(`/impressos/novo?calculo=${e.target.value}`);
              }}
            >
              <option value="">— escolher um calculo da calculadora —</option>
              {calculos.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.titulo} · {numero(k.escalaPct, 0)}% · {reais(k.custoPeca)}/peca
                </option>
              ))}
            </select>
          </Card>
        )}

        <Card titulo={titulo}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Modelo" className="sm:col-span-2">
              <input name="modelo" className="campo" value={v.modelo} onChange={muda("modelo")} required />
            </Campo>
            <Campo
              rotulo="Link do MakerWorld"
              className="sm:col-span-2"
              dica="Opcional. Com o link, o botao puxa os gramas e o tempo da placa do projeto."
            >
              <div className="flex gap-2">
                <input name="link" className="campo" value={v.link} onChange={muda("link")} placeholder="https://makerworld.com/..." />
                <button type="button" onClick={puxar} disabled={puxando} className="botao botao-secundario whitespace-nowrap">
                  {puxando ? "Puxando..." : "Puxar filamento"}
                </button>
              </div>
            </Campo>
            {puxado && !puxado.ok && (
              <div className="sm:col-span-2">
                <Erro mensagem={puxado.erro} />
              </div>
            )}
            {puxado?.ok && (
              <div className="space-y-2 rounded-md border border-border bg-bg px-3 py-2 text-sm sm:col-span-2">
                <div className="text-muted">
                  {puxado.titulo} · {puxado.perfil}
                </div>
                {listaPlacas.length > 1 && (
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">O projeto tem {listaPlacas.length} placas. Qual voce imprimiu?</span>
                    <select className="campo" value={placaEscolhida} onChange={(e) => usarPlaca(puxado, e.target.value)}>
                      {listaPlacas.map((pl) => (
                        <option key={pl.indice} value={String(pl.indice)}>
                          {pl.indice}. {pl.nome || `Placa ${pl.indice}`} · {fmtGramas(pl.gramas100)}
                          {pl.segundos > 0 ? ` · ${horas(pl.segundos)}` : ""}
                        </option>
                      ))}
                      <option value="todas">
                        Todas juntas · {fmtGramas(puxado.gramas100 ?? 0)}
                        {puxado.segundos ? ` · ${horas(puxado.segundos)}` : ""}
                      </option>
                    </select>
                  </label>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {coresMostradas.map((cor) => (
                    <span key={cor.hex} className="inline-flex items-center gap-1">
                      <Amostra hex={cor.hex} nome={cor.nome} /> <span className="text-muted">{fmtGramas(cor.gramas100)}</span>
                    </span>
                  ))}
                </div>
                <div className="text-xs text-muted">
                  Montou a sua propria placa no fatiador? Use os gramas e o tempo que ele mostra: sao mais certos.
                </div>
              </div>
            )}
            <Campo rotulo="Quando">
              <input name="quando" type="date" className="campo" value={v.quando} onChange={muda("quando")} />
            </Campo>
            <Campo rotulo="Escala (%)" dica={`Tamanho no fatiador. Fator no peso: ${numero(mat.fator, 4)}.`}>
              <input name="escalaPct" className="campo" value={v.escalaPct} onChange={muda("escalaPct")} inputMode="decimal" />
            </Campo>
            <Campo rotulo="Pecas na placa" dica="Quantas pecas sairam da placa, boas e ruins.">
              <input name="quantidade" type="number" min={1} className="campo" value={v.quantidade} onChange={muda("quantidade")} />
            </Campo>
            <Campo
              rotulo="Pecas perdidas (falha ou defeito)"
              dica={
                c.impressas > 0
                  ? `= ${c.boas} boa(s) pra vender · aproveitamento de ${pct(c.aproveitamentoPct)}`
                  : "As que nao da pra vender."
              }
            >
              <input
                name="perdas"
                type="number"
                min={0}
                max={Math.max(0, c.impressas)}
                className="campo"
                value={v.perdas}
                onChange={muda("perdas")}
              />
            </Campo>
            <Campo
              rotulo="Tempo da placa"
              dica={seg > 0 ? `= ${horas(seg)} na placa${pecas > 0 ? `, ~${horas(seg / pecas)} por peca` : ""}` : 'Ex.: "9h20". Opcional.'}
            >
              <input name="segundosPlaca" className="campo" value={v.segundosPlaca} onChange={muda("segundosPlaca")} placeholder="9h20" />
            </Campo>
          </div>
        </Card>

        <Card titulo="Filamento (custo do material)">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Gramas da placa" dica="Total do fatiador (modelo + purga + torre), no tamanho original.">
              <input name="gramasPlaca" className="campo" value={v.gramasPlaca} onChange={muda("gramasPlaca")} inputMode="decimal" />
            </Campo>
            <Campo rotulo="Preco do rolo (R$)">
              <input name="precoRolo" className="campo" value={v.precoRolo} onChange={muda("precoRolo")} inputMode="decimal" />
            </Campo>
            <Campo rotulo="Peso do rolo (g)">
              <input name="pesoRoloG" className="campo" value={v.pesoRoloG} onChange={muda("pesoRoloG")} inputMode="numeric" />
            </Campo>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {gramasPlaca > 0 ? (
              <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted">Custo do material por peca</div>
                <div className="text-xl font-semibold text-accent">{reais(mat.custo)}</div>
                <div className="text-xs text-muted">
                  {numero(gramasPlaca, 1)} g ÷ {pecas} peca(s) = {fmtGramas(gramasPeca100)}
                  {escala !== 100 && <> × {numero(mat.fator, 4)} = {fmtGramas(mat.gramas)} na escala de {numero(escala, 0)}%</>}
                  {num(v.pesoRoloG) > 0 && ` · R$ ${numero(num(v.precoRolo) / num(v.pesoRoloG), 3)} por grama`}
                </div>
              </div>
            ) : (
              <Campo rotulo="Custo do material por peca (R$)" dica="Sem os gramas, digite o custo direto.">
                <input name="custoPeca" className="campo" value={v.custoPeca} onChange={muda("custoPeca")} inputMode="decimal" />
              </Campo>
            )}
            <Campo rotulo="Outros custos por peca (R$)" dica="Energia, embalagem, argola, ima...">
              <input name="outrosPeca" className="campo" value={v.outrosPeca} onChange={muda("outrosPeca")} inputMode="decimal" />
            </Campo>
          </div>
        </Card>

        <Card titulo="Venda">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Preco de venda por peca (R$)">
              <input name="precoVenda" className="campo" value={v.precoVenda} onChange={muda("precoVenda")} inputMode="decimal" />
            </Campo>
            <Campo rotulo="Observacao">
              <textarea name="obs" className="campo min-h-10" value={v.obs} onChange={muda("obs")} />
            </Campo>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card titulo="Lucro da placa" className="lg:sticky lg:top-20">
          <div className={`text-3xl font-semibold tabular-nums ${c.lucro >= 0 ? "text-green" : "text-red"}`}>{reais(c.lucro)}</div>
          <div className="mt-1 text-sm text-muted">
            {reais(c.lucroPeca)} por peca boa · margem {pct(c.margemPct)}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted">Pecas na placa</dt>
            <dd className="num">{c.impressas}</dd>
            <dt className="text-muted">Perdidas</dt>
            <dd className={`num ${c.perdas > 0 ? "text-red" : ""}`}>{c.perdas}</dd>
            <dt className="text-muted">Boas pra vender</dt>
            <dd className="num">
              {c.boas} ({pct(c.aproveitamentoPct)})
            </dd>
            <dt className="text-muted">Material por peca</dt>
            <dd className="num">{reais(custoPeca)}</dd>
            <dt className="text-muted">Outros por peca</dt>
            <dd className="num">{reais(num(v.outrosPeca))}</dd>
            <dt className="text-muted">Custo unitario</dt>
            <dd className="num">{reais(c.custoUnitario)}</dd>
            <dt className="text-muted">Custo da placa</dt>
            <dd className="num">{reais(c.custoTotal)}</dd>
            {c.perdas > 0 && (
              <>
                <dt className="text-muted">Custo real por peca boa</dt>
                <dd className="num">{reais(c.custoPorBoa)}</dd>
              </>
            )}
            <dt className="text-muted">Receita ({c.boas} boas)</dt>
            <dd className="num">{reais(c.receita)}</dd>
          </dl>
          <Erro mensagem={estado.erro} />
          <button type="submit" className="botao botao-primario mt-4 w-full" disabled={pendente}>
            {pendente ? "Salvando..." : "Salvar"}
          </button>
        </Card>
      </div>
    </form>
  );
}
