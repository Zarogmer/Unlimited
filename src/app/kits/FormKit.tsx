"use client";

import { useActionState, useState } from "react";
import { salvarKit, type EstadoKit } from "./actions";
import { Campo, Card, Erro } from "@/components/ui";
import { contasKit } from "@/lib/kits";
import { num, pct, reais } from "@/lib/formato";

export interface LoteKit {
  impressoId: string;
  rotulo: string;
  /** Pecas em estoque (sem local + locais), contando as que ja estao neste kit ao editar. */
  disponivel: number;
  custoPorBoa: number;
  precoVenda: number;
}

export interface ValoresKit {
  id?: string;
  nome: string;
  outrosCusto: string;
  precoVenda: string;
  obs: string;
  itens: Array<{ impressoId: string; quantidade: string }>;
}

export function FormKit({ valores, lotes }: { valores: ValoresKit; lotes: LoteKit[] }) {
  const [estado, acao, pendente] = useActionState<EstadoKit, FormData>(salvarKit, {});
  const [v, setV] = useState(valores);
  const [itens, setItens] = useState(valores.itens);

  const lote = (id: string) => lotes.find((l) => l.impressoId === id);
  const usados = new Set(itens.map((i) => i.impressoId));
  const livres = lotes.filter((l) => !usados.has(l.impressoId));

  const muda = (campo: keyof Omit<ValoresKit, "itens">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [campo]: e.target.value });
  const mudaItem = (n: number, campo: "impressoId" | "quantidade", valor: string) =>
    setItens(itens.map((it, i) => (i === n ? { ...it, [campo]: valor } : it)));

  const c = contasKit(
    itens.map((it) => ({
      quantidade: num(it.quantidade, 0),
      custoPorBoa: lote(it.impressoId)?.custoPorBoa ?? 0,
      precoAvulso: lote(it.impressoId)?.precoVenda ?? 0,
    })),
    num(v.outrosCusto),
    num(v.precoVenda),
  );
  const precoTem = num(v.precoVenda) > 0;

  return (
    <form action={acao} className="grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-start">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <input
        type="hidden"
        name="itens"
        value={JSON.stringify(itens.map((it) => ({ impressoId: it.impressoId, quantidade: num(it.quantidade, 0) })))}
      />

      <div className="space-y-4">
        <Card titulo="Kit">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome do kit" className="sm:col-span-2">
              <input
                name="nome"
                className="campo"
                value={v.nome}
                onChange={muda("nome")}
                placeholder="Ex.: Suporte Nossa Senhora com 6 chaveiros"
                required
              />
            </Campo>
            <Campo rotulo="Outros custos do kit (R$)" dica="Argolas, embalagem, etiqueta... do kit inteiro.">
              <input name="outrosCusto" className="campo" inputMode="decimal" value={v.outrosCusto} onChange={muda("outrosCusto")} />
            </Campo>
            <Campo rotulo="Preco de venda do kit (R$)">
              <input name="precoVenda" className="campo" inputMode="decimal" value={v.precoVenda} onChange={muda("precoVenda")} />
            </Campo>
            <Campo rotulo="Observacao" className="sm:col-span-2">
              <input name="obs" className="campo" value={v.obs} onChange={muda("obs")} />
            </Campo>
          </div>
        </Card>

        <Card titulo="Pecas do kit">
          {itens.length === 0 && (
            <p className="mb-3 text-sm text-muted">Adicione o suporte e os chaveiros que vao no kit.</p>
          )}
          <div className="space-y-3">
            {itens.map((it, n) => {
              const l = lote(it.impressoId);
              const q = num(it.quantidade, 0);
              const sobra = l ? l.disponivel - q : 0;
              const opcoes = lotes.filter((o) => o.impressoId === it.impressoId || !usados.has(o.impressoId));
              return (
                <div key={n} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_6rem_auto] sm:items-start">
                  <Campo rotulo="Lote">
                    <select className="campo" value={it.impressoId} onChange={(e) => mudaItem(n, "impressoId", e.target.value)}>
                      {opcoes.map((o) => (
                        <option key={o.impressoId} value={o.impressoId}>
                          {o.rotulo} ({o.disponivel} em estoque)
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo rotulo="Quantas">
                    <input
                      type="number"
                      min={1}
                      max={l?.disponivel}
                      className="campo"
                      value={it.quantidade}
                      onChange={(e) => mudaItem(n, "quantidade", e.target.value)}
                      required
                    />
                  </Campo>
                  <button
                    type="button"
                    className="text-sm text-red/80 hover:text-red sm:mt-8"
                    onClick={() => setItens(itens.filter((_, i) => i !== n))}
                  >
                    tirar
                  </button>
                  {l && (
                    <p className={`text-xs sm:col-span-3 ${sobra < 0 ? "text-red" : "text-muted"}`}>
                      {reais(l.custoPorBoa)} por peca · {reais(q * l.custoPorBoa)} no kit ·{" "}
                      {sobra < 0 ? `so tem ${l.disponivel} em estoque` : `sobram ${sobra} em estoque`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {livres.length > 0 ? (
            <button
              type="button"
              className="botao botao-secundario mt-3"
              onClick={() => setItens([...itens, { impressoId: livres[0].impressoId, quantidade: "1" }])}
            >
              + Adicionar peca
            </button>
          ) : (
            lotes.length === 0 && <p className="text-sm text-muted">Nenhum lote com peca boa em estoque.</p>
          )}
        </Card>
      </div>

      <Card titulo="Custo do kit" className="lg:sticky lg:top-20">
        <div className={`text-3xl font-semibold tabular-nums ${!precoTem ? "text-accent" : c.lucro >= 0 ? "text-green" : "text-red"}`}>
          {precoTem ? reais(c.lucro) : reais(c.custoTotal)}
        </div>
        <p className="mb-3 text-xs text-muted">
          {precoTem ? `lucro · margem de ${pct(c.margemPct)}` : "custo total — informe o preco pra ver o lucro"}
        </p>
        <dl className="space-y-1 text-sm">
          <Linha rotulo="Pecas" valor={String(c.pecas)} />
          <Linha rotulo="Custo das pecas" valor={reais(c.custoPecas)} />
          <Linha rotulo="Outros custos" valor={reais(num(v.outrosCusto))} />
          <Linha rotulo="Custo total" valor={reais(c.custoTotal)} forte />
          {precoTem && <Linha rotulo="Preco do kit" valor={reais(num(v.precoVenda))} />}
          {c.avulso > 0 && <Linha rotulo="Vendendo avulso" valor={reais(c.avulso)} />}
        </dl>
        {c.custoTotal > 0 && (
          <p className="mt-3 text-xs text-muted">
            Pra margem de 50%: {reais(c.custoTotal * 2)} · 60%: {reais(c.custoTotal / 0.4)}
          </p>
        )}
        <div className="mt-4">
          <Erro mensagem={estado.erro} />
        </div>
        <button type="submit" className="botao botao-primario mt-3 w-full" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar kit"}
        </button>
      </Card>
    </form>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{rotulo}</dt>
      <dd className={`tabular-nums ${forte ? "font-semibold" : ""}`}>{valor}</dd>
    </div>
  );
}
