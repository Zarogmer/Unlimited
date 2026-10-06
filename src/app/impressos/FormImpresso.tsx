"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { puxarFilamento, salvarImpresso, type EstadoImpresso, type FilamentoPuxado } from "./actions";
import { Amostra, Campo, Card, Erro } from "@/components/ui";
import { contas, custoMaterial, pecasPorPlacaValida } from "@/lib/impressos";
import { gramas as fmtGramas, horas, num, numero, paraInput, pct, reais } from "@/lib/formato";

export interface ValoresImpresso {
  id?: string;
  calculoId?: string | null;
  modelo: string;
  link: string;
  quando: string; // YYYY-MM-DD
  escalaPct: string;
  quantidade: string;
  perdas: string;
  pecasPorPlaca: string; // "1" = gramas e tempo por peca; N = da placa inteira com N pecas
  gramas100: string;
  precoRolo: string;
  pesoRoloG: string;
  custoPeca: string;
  outrosPeca: string;
  precoVenda: string;
  segundosPeca: string;
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
  const [porPlaca, setPorPlaca] = useState(pecasPorPlacaValida(valores.pecasPorPlaca) > 1);

  const muda = (campo: keyof ValoresImpresso) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV({ ...v, [campo]: e.target.value });

  // Por placa: gramas e tempo digitados sao da placa inteira; cada peca leva 1/N.
  const porPlacaN = porPlaca ? pecasPorPlacaValida(v.pecasPorPlaca) : 1;

  // Custo do material: pela conta do filamento quando tem gramas, senao o digitado.
  const gramas100 = num(v.gramas100);
  const gramasPeca100 = gramas100 / porPlacaN;
  const escala = num(v.escalaPct, 100) || 100;
  const mat = custoMaterial(gramasPeca100, escala, num(v.precoRolo), num(v.pesoRoloG));
  const custoPeca = gramas100 > 0 ? mat.custo : num(v.custoPeca);

  const c = contas({
    quantidade: num(v.quantidade, 0),
    perdas: num(v.perdas, 0),
    custoPeca,
    outrosPeca: num(v.outrosPeca),
    precoVenda: num(v.precoVenda),
  });
  const seg = Math.trunc(num(v.segundosPeca, 0));
  const placasLote = Math.ceil(c.impressas / porPlacaN);
  const segLote = porPlaca ? seg * placasLote : seg * c.impressas;

  function puxar() {
    if (!v.link.trim()) {
      setPuxado({ ok: false, erro: "Cole o link do modelo no MakerWorld primeiro." });
      return;
    }
    iniciarPuxar(async () => {
      const r = await puxarFilamento(v.link);
      setPuxado(r);
      if (r.ok) {
        setV((atual) => ({
          ...atual,
          modelo: atual.modelo.trim() ? atual.modelo : r.titulo ?? atual.modelo,
          gramas100: paraInput(r.gramas100 ?? 0, 1),
          segundosPeca: r.segundos ? String(r.segundos) : atual.segundosPeca,
        }));
      }
    });
  }

  return (
    <form action={acao} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {v.calculoId && <input type="hidden" name="calculoId" value={v.calculoId} />}
      <input type="hidden" name="pecasPorPlaca" value={porPlacaN} />
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
            <Campo rotulo="Link do MakerWorld" className="sm:col-span-2" dica="Com o link, o botao abaixo puxa os gramas do modelo.">
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
              <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm sm:col-span-2">
                <div className="text-muted">
                  {puxado.titulo} · {puxado.perfil}
                  {puxado.placas ? ` · ${puxado.placas} placa(s)` : ""} · {fmtGramas(puxado.gramas100 ?? 0)} a 100%
                  {puxado.segundos ? ` · ~${horas(puxado.segundos)}` : ""} (perfil inteiro)
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {puxado.cores?.map((cor) => (
                    <span key={cor.hex} className="inline-flex items-center gap-1">
                      <Amostra hex={cor.hex} nome={cor.nome} /> <span className="text-muted">{fmtGramas(cor.gramas100)}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted">
                  {!porPlaca
                    ? 'O MakerWorld informa a placa inteira. Se ela imprime varias pecas de uma vez (chaveiros, miniaturas), escolha "Por placa" abaixo e diga quantas.'
                    : (puxado.placas ?? 0) > 1
                      ? `Esse perfil tem ${puxado.placas} placas: os gramas e o tempo sao a soma delas. Em "Pecas por placa" conte as pecas de todas.`
                      : "Os gramas e o tempo sao da placa: cada peca leva a parte dela."}
                </div>
              </div>
            )}
            <div className="sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">Gramas e tempo informados</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPorPlaca(false)}
                  className={`botao ${!porPlaca ? "botao-primario" : "botao-secundario"}`}
                >
                  Por peca
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPorPlaca(true);
                    if (pecasPorPlacaValida(v.pecasPorPlaca) < 2) setV((atual) => ({ ...atual, pecasPorPlaca: "" }));
                  }}
                  className={`botao ${porPlaca ? "botao-primario" : "botao-secundario"}`}
                >
                  Por placa
                </button>
                {porPlaca && (
                  <label className="flex items-center gap-2 whitespace-nowrap text-sm">
                    <input
                      type="number"
                      min={1}
                      className="campo w-24"
                      value={v.pecasPorPlaca}
                      onChange={muda("pecasPorPlaca")}
                      placeholder="9"
                      required
                    />
                    pecas por placa
                  </label>
                )}
              </div>
              <span className="mt-1 block text-xs text-muted">
                {porPlaca && porPlacaN < 2
                  ? "Diga quantas pecas saem em cada placa."
                  : porPlaca
                  ? `Gramas e tempo da placa inteira, divididos por ${porPlacaN} peca(s).` +
                    (c.impressas > 0 ? ` ${c.impressas} peca(s) = ${placasLote} placa(s).` : "")
                  : "Gramas e tempo de uma peca so. Placa cheia de pecas iguais? Use \"Por placa\"."}
              </span>
            </div>
            <Campo rotulo="Quando">
              <input name="quando" type="date" className="campo" value={v.quando} onChange={muda("quando")} />
            </Campo>
            <Campo rotulo="Escala (%)" dica={`Tamanho no slicer. Fator no peso: ${numero(mat.fator, 4)}.`}>
              <input name="escalaPct" className="campo" value={v.escalaPct} onChange={muda("escalaPct")} inputMode="decimal" />
            </Campo>
            <Campo rotulo="Pecas impressas" dica="Tudo que saiu da impressora, boas e ruins.">
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
              rotulo={porPlaca ? "Tempo da placa (segundos)" : "Tempo por peca (segundos)"}
              dica={
                seg <= 0
                  ? "Opcional."
                  : porPlaca
                    ? `= ${horas(seg)} por placa, ~${horas(seg / porPlacaN)} por peca, ${horas(segLote)} no lote`
                    : `= ${horas(seg)} por peca, ${horas(segLote)} no lote`
              }
            >
              <input name="segundosPeca" className="campo" value={v.segundosPeca} onChange={muda("segundosPeca")} inputMode="numeric" />
            </Campo>
          </div>
        </Card>

        <Card titulo="Filamento (custo do material)">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              rotulo={porPlaca ? "Gramas da placa a 100%" : "Gramas por peca a 100%"}
              dica={
                porPlaca
                  ? "Soma de todas as cores da placa inteira no tamanho original (o MakerWorld informa)."
                  : "Soma de todas as cores no tamanho original."
              }
            >
              <input name="gramas100" className="campo" value={v.gramas100} onChange={muda("gramas100")} inputMode="decimal" />
            </Campo>
            <Campo rotulo="Preco do rolo (R$)">
              <input name="precoRolo" className="campo" value={v.precoRolo} onChange={muda("precoRolo")} inputMode="decimal" />
            </Campo>
            <Campo rotulo="Peso do rolo (g)">
              <input name="pesoRoloG" className="campo" value={v.pesoRoloG} onChange={muda("pesoRoloG")} inputMode="numeric" />
            </Campo>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {gramas100 > 0 ? (
              <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted">Custo do material por peca</div>
                <div className="text-xl font-semibold text-accent">{reais(mat.custo)}</div>
                <div className="text-xs text-muted">
                  {porPlaca && <>{numero(gramas100, 1)} g ÷ {porPlacaN} pecas = </>}
                  {numero(gramasPeca100, 1)} g × {numero(mat.fator, 4)} = {fmtGramas(mat.gramas)} na escala de {numero(escala, 0)}%
                  {num(v.pesoRoloG) > 0 && ` · R$ ${numero(num(v.precoRolo) / num(v.pesoRoloG), 3)} por grama`}
                </div>
              </div>
            ) : (
              <Campo rotulo="Custo do material por peca (R$)" dica="Sem os gramas, digite o custo direto.">
                <input name="custoPeca" className="campo" value={v.custoPeca} onChange={muda("custoPeca")} inputMode="decimal" />
              </Campo>
            )}
            <Campo rotulo="Outros custos por peca (R$)" dica="Energia, embalagem, pintura, ima...">
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
        <Card titulo="Lucro do lote" className="lg:sticky lg:top-20">
          <div className={`text-3xl font-semibold tabular-nums ${c.lucro >= 0 ? "text-green" : "text-red"}`}>{reais(c.lucro)}</div>
          <div className="mt-1 text-sm text-muted">
            {reais(c.lucroPeca)} por peca boa · margem {pct(c.margemPct)}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted">Pecas impressas</dt>
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
            <dt className="text-muted">Custo total ({c.impressas} impressas)</dt>
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
