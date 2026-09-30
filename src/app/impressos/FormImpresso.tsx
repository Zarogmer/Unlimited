"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { puxarFilamento, salvarImpresso, type EstadoImpresso, type FilamentoPuxado } from "./actions";
import { Amostra, Campo, Card, Erro } from "@/components/ui";
import { contas, custoMaterial } from "@/lib/impressos";
import { gramas as fmtGramas, horas, num, numero, paraInput, pct, reais } from "@/lib/formato";

export interface ValoresImpresso {
  id?: string;
  calculoId?: string | null;
  modelo: string;
  link: string;
  quando: string; // YYYY-MM-DD
  escalaPct: string;
  quantidade: string;
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

  const muda = (campo: keyof ValoresImpresso) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV({ ...v, [campo]: e.target.value });

  // Custo do material: pela conta do filamento quando tem gramas, senao o digitado.
  const gramas100 = num(v.gramas100);
  const escala = num(v.escalaPct, 100) || 100;
  const mat = custoMaterial(gramas100, escala, num(v.precoRolo), num(v.pesoRoloG));
  const custoPeca = gramas100 > 0 ? mat.custo : num(v.custoPeca);

  const c = contas({
    quantidade: num(v.quantidade, 0),
    custoPeca,
    outrosPeca: num(v.outrosPeca),
    precoVenda: num(v.precoVenda),
  });
  const seg = Math.trunc(num(v.segundosPeca, 0));

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
                  {puxado.titulo} · {puxado.perfil} · {fmtGramas(puxado.gramas100 ?? 0)} a 100%
                  {puxado.segundos ? ` · ~${horas(puxado.segundos)} por peca` : ""}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {puxado.cores?.map((cor) => (
                    <span key={cor.hex} className="inline-flex items-center gap-1">
                      <Amostra hex={cor.hex} nome={cor.nome} /> <span className="text-muted">{fmtGramas(cor.gramas100)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Campo rotulo="Quando">
              <input name="quando" type="date" className="campo" value={v.quando} onChange={muda("quando")} />
            </Campo>
            <Campo rotulo="Escala (%)" dica={`Tamanho no slicer. Fator no peso: ${numero(mat.fator, 4)}.`}>
              <input name="escalaPct" className="campo" value={v.escalaPct} onChange={muda("escalaPct")} inputMode="decimal" />
            </Campo>
            <Campo rotulo="Quantidade de pecas">
              <input name="quantidade" type="number" min={1} className="campo" value={v.quantidade} onChange={muda("quantidade")} />
            </Campo>
            <Campo
              rotulo="Tempo por peca (segundos)"
              dica={seg > 0 ? `= ${horas(seg)} por peca, ${horas(seg * num(v.quantidade, 0))} no lote` : "Opcional."}
            >
              <input name="segundosPeca" className="campo" value={v.segundosPeca} onChange={muda("segundosPeca")} inputMode="numeric" />
            </Campo>
          </div>
        </Card>

        <Card titulo="Filamento (custo do material)">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Gramas por peca a 100%" dica="Soma de todas as cores no tamanho original (o MakerWorld informa).">
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
                  {numero(gramas100, 1)} g × {numero(mat.fator, 4)} = {fmtGramas(mat.gramas)} na escala de {numero(escala, 0)}%
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
            {reais(c.lucroPeca)} por peca · margem {pct(c.margemPct)}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted">Material por peca</dt>
            <dd className="num">{reais(custoPeca)}</dd>
            <dt className="text-muted">Outros por peca</dt>
            <dd className="num">{reais(num(v.outrosPeca))}</dd>
            <dt className="text-muted">Custo unitario</dt>
            <dd className="num">{reais(c.custoUnitario)}</dd>
            <dt className="text-muted">Custo total</dt>
            <dd className="num">{reais(c.custoTotal)}</dd>
            <dt className="text-muted">Receita</dt>
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
