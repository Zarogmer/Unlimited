import Link from "next/link";
import { prisma } from "@/lib/db";
import { contas } from "@/lib/impressos";
import { estoque } from "@/lib/locais";
import { contasKit } from "@/lib/kits";
import { data, numero, pct, reais } from "@/lib/formato";
import { Card, Kpi, Titulo, Vazio } from "@/components/ui";
import { FormApagar } from "@/components/FormApagar";
import { apagarKit } from "./actions";

export const metadata = { title: "Kits" };
export const dynamic = "force-dynamic";

export default async function PaginaKits() {
  const [kits, impressos, movimentos, kitItens] = await Promise.all([
    prisma.kit.findMany({ orderBy: { criadoEm: "desc" }, include: { itens: true } }),
    prisma.impresso.findMany({ orderBy: [{ quando: "desc" }, { criadoEm: "desc" }] }),
    prisma.movimento.findMany(),
    prisma.kitItem.findMany(),
  ]);
  const lotes = new Map(impressos.map((i) => [i.id, { ...i, c: contas(i) }]));
  const e = estoque(impressos, movimentos, kitItens);
  const comPecas = e.itens.filter((i) => i.boas > 0);

  const resumo = kits.map((k) => {
    // O mesmo lote pode ter vindo de varios locais: junta numa linha so.
    const porLote = new Map<string, number>();
    for (const it of k.itens) porLote.set(it.impressoId, (porLote.get(it.impressoId) ?? 0) + it.quantidade);
    const linhas = [...porLote].map(([impressoId, quantidade]) => {
      const l = lotes.get(impressoId);
      return {
        impressoId,
        modelo: l?.modelo ?? "?",
        quantidade,
        custoPorBoa: l?.c.custoPorBoa ?? 0,
        precoAvulso: l?.precoVenda ?? 0,
      };
    });
    return { k, linhas, c: contasKit(linhas, k.outrosCusto, k.precoVenda) };
  });
  const custo = resumo.reduce((a, r) => a + r.c.custoTotal, 0);
  const venda = resumo.reduce((a, r) => a + r.k.precoVenda, 0);
  const lucro = venda - custo;

  return (
    <>
      <Titulo
        acoes={
          <Link href="/kits/novo" className="botao botao-primario">
            Montar kit
          </Link>
        }
      >
        Kits
      </Titulo>
      <p className="mb-5 max-w-2xl text-sm text-muted">
        Junte pecas de varios lotes num produto so (ex.: um suporte com varios chaveiros) e veja quanto ele custou de
        verdade pra saber quanto cobrar. As pecas do kit saem do estoque; o que sobra continua guardado.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi rotulo="Kits montados" valor={String(kits.length)} detalhe={`${e.emKits} peca(s) em kits`} />
        <Kpi rotulo="Custo dos kits" valor={reais(custo)} detalhe="pecas + outros custos" />
        <Kpi rotulo="Venda dos kits" valor={reais(venda)} />
        <Kpi
          rotulo="Lucro"
          valor={reais(lucro)}
          detalhe={venda > 0 ? `margem de ${pct((lucro / venda) * 100)}` : "informe o preco dos kits"}
          cor={lucro >= 0 ? "verde" : "vermelho"}
        />
      </div>

      <div className="space-y-4">
        {kits.length === 0 ? (
          <Vazio>Nenhum kit montado ainda. Clique em &quot;Montar kit&quot; e escolha as pecas.</Vazio>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {resumo.map(({ k, linhas, c }) => (
              <Card
                key={k.id}
                titulo={
                  <span className="flex items-baseline justify-between gap-2">
                    <Link href={`/kits/${k.id}/editar`} className="normal-case tracking-normal text-text hover:text-accent">
                      {k.nome}
                    </Link>
                    <span className="text-base tabular-nums text-text">{c.pecas} peca(s)</span>
                  </span>
                }
              >
                {k.obs && <p className="mb-2 text-xs text-muted">{k.obs}</p>}
                <table className="tabela">
                  <tbody>
                    {linhas.map((l) => (
                      <tr key={l.impressoId}>
                        <td>
                          <Link href={`/impressos/${l.impressoId}/editar`} className="hover:text-accent">
                            {l.modelo}
                          </Link>
                          <div className="text-xs text-muted">{reais(l.custoPorBoa)} por peca</div>
                        </td>
                        <td className="num">{l.quantidade}×</td>
                        <td className="num">{reais(l.quantidade * l.custoPorBoa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                  {k.outrosCusto > 0 && <Linha rotulo="Outros custos" valor={reais(k.outrosCusto)} />}
                  <Linha rotulo="Custo total" valor={reais(c.custoTotal)} forte />
                  {k.precoVenda > 0 ? (
                    <>
                      <Linha rotulo="Preco do kit" valor={reais(k.precoVenda)} />
                      <Linha
                        rotulo={`Lucro (margem ${pct(c.margemPct)})`}
                        valor={reais(c.lucro)}
                        cor={c.lucro >= 0 ? "text-green" : "text-red"}
                      />
                    </>
                  ) : (
                    <Linha rotulo="Preco do kit" valor="nao informado" />
                  )}
                  {c.avulso > 0 && <Linha rotulo="Vendendo avulso" valor={reais(c.avulso)} />}
                </dl>
                <div className="mt-3 flex items-center justify-end gap-3">
                  <Link href={`/kits/${k.id}/editar`} className="text-sm text-muted hover:text-text">
                    editar
                  </Link>
                  <FormApagar
                    acao={apagarKit}
                    id={k.id}
                    mensagem={`Desmontar o kit "${k.nome}"? As pecas voltam pro estoque.`}
                    rotulo="desmontar"
                    className="text-sm text-red/80 hover:text-red"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card titulo="Estoque de pecas">
          {comPecas.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma peca boa registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th className="num">Boas</th>
                    <th className="num">Em kits</th>
                    <th className="num">Em estoque</th>
                  </tr>
                </thead>
                <tbody>
                  {comPecas.map((i) => {
                    const guardadas = i.semLocal + Object.values(i.porLocal).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={i.impressoId}>
                        <td>
                          <Link href={`/impressos/${i.impressoId}/editar`} className="hover:text-accent">
                            {i.modelo}
                          </Link>
                          <div className="text-xs text-muted">
                            {data(i.quando)} · {numero(i.escalaPct, 0)}% · {reais(lotes.get(i.impressoId)?.c.custoPorBoa ?? 0)}{" "}
                            por peca
                          </div>
                        </td>
                        <td className="num">{i.boas}</td>
                        <td className="num text-muted">{i.emKits || "—"}</td>
                        <td className={`num font-medium ${guardadas > 0 ? "" : "text-muted"}`}>{guardadas}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Linha({ rotulo, valor, forte, cor = "" }: { rotulo: string; valor: string; forte?: boolean; cor?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{rotulo}</dt>
      <dd className={`tabular-nums ${forte ? "font-semibold" : ""} ${cor}`}>{valor}</dd>
    </div>
  );
}
