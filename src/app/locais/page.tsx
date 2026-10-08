import Link from "next/link";
import { prisma } from "@/lib/db";
import { estoque } from "@/lib/locais";
import { data, dataHora, numero } from "@/lib/formato";
import { Card, Kpi, Titulo, Vazio } from "@/components/ui";
import { FormApagar } from "@/components/FormApagar";
import { apagarLocal } from "./actions";
import { FormLocal } from "./FormLocal";
import { FormMover } from "./FormMover";

export const metadata = { title: "Locais" };
export const dynamic = "force-dynamic";

export default async function PaginaLocais({ searchParams }: { searchParams: Promise<{ impresso?: string }> }) {
  const [{ impresso }, locais, impressos, movimentos, kitItens] = await Promise.all([
    searchParams,
    prisma.local.findMany({ orderBy: { nome: "asc" } }),
    prisma.impresso.findMany({ orderBy: [{ quando: "desc" }, { criadoEm: "desc" }] }),
    prisma.movimento.findMany({ orderBy: { quando: "desc" } }),
    prisma.kitItem.findMany(),
  ]);
  const e = estoque(impressos, movimentos, kitItens);
  const usados = new Set([
    ...movimentos.flatMap((m) => [m.deLocalId, m.paraLocalId]),
    ...kitItens.map((k) => k.deLocalId),
  ]);
  const nomeLocal = (id: string | null) => (id ? (locais.find((l) => l.id === id)?.nome ?? "?") : "Sem local");
  const modelo = (id: string) => impressos.find((i) => i.id === id)?.modelo ?? "?";
  const semLocal = e.itens.filter((i) => i.semLocal > 0);

  return (
    <>
      <Titulo>Locais</Titulo>
      <p className="mb-5 max-w-2xl text-sm text-muted">
        Cadastre os lugares onde as pecas ficam e mova as pecas boas de cada lote pra la. Peca boa que ainda nao foi
        levada pra lugar nenhum fica em &quot;Sem local&quot;.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi rotulo="Pecas em locais" valor={String(e.emLocais)} detalhe={`${locais.length} local(is) cadastrado(s)`} />
        <Kpi
          rotulo="Sem local"
          valor={String(e.semLocal)}
          detalhe="boas que ainda nao foram pra lugar nenhum"
          cor={e.semLocal > 0 ? "acento" : undefined}
        />
        <Kpi rotulo="Pecas boas" valor={String(e.emLocais + e.semLocal)} detalhe={`${impressos.length} lote(s)`} />
      </div>

      <div className="space-y-4">
        <Card titulo="Cadastrar local">
          <FormLocal />
        </Card>

        {locais.length > 0 && impressos.length > 0 && (
          <FormMover
            impressoInicial={impresso}
            locais={locais.map((l) => ({ id: l.id, nome: l.nome }))}
            lotes={e.itens.map((i) => ({
              impressoId: i.impressoId,
              rotulo: `${i.modelo} · ${numero(i.escalaPct, 0)}% · ${data(i.quando)} · ${i.boas} boa(s)`,
              semLocal: i.semLocal,
              porLocal: i.porLocal,
            }))}
          />
        )}

        {locais.length === 0 ? (
          <Vazio>Nenhum local cadastrado ainda. Cadastre o primeiro acima.</Vazio>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {locais.map((l) => {
              const la = e.itens.filter((i) => i.porLocal[l.id] > 0);
              return (
                <Card
                  key={l.id}
                  titulo={
                    <span className="flex items-baseline justify-between gap-2">
                      <span>{l.nome}</span>
                      <span className="text-base tabular-nums text-text">{e.totalPorLocal[l.id] ?? 0} peca(s)</span>
                    </span>
                  }
                >
                  {l.obs && <p className="mb-2 text-xs text-muted">{l.obs}</p>}
                  {la.length === 0 ? (
                    <p className="text-sm text-muted">Nenhuma peca aqui.</p>
                  ) : (
                    <table className="tabela">
                      <tbody>
                        {la.map((i) => (
                          <tr key={i.impressoId}>
                            <td>
                              <Link href={`/impressos/${i.impressoId}/editar`} className="hover:text-accent">
                                {i.modelo}
                              </Link>
                              <div className="text-xs text-muted">
                                {data(i.quando)} · {numero(i.escalaPct, 0)}%
                              </div>
                            </td>
                            <td className="num">{i.porLocal[l.id]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-muted hover:text-text">editar local</summary>
                    <div className="mt-2 space-y-2">
                      <FormLocal id={l.id} nome={l.nome} obs={l.obs} />
                      {usados.has(l.id) ? (
                        <p className="text-xs text-muted">Ja teve movimentacao, entao nao da pra apagar (so renomear).</p>
                      ) : (
                        <FormApagar
                          acao={apagarLocal}
                          id={l.id}
                          mensagem={`Apagar o local "${l.nome}"?`}
                          rotulo="apagar local"
                          className="text-sm text-red/80 hover:text-red"
                        />
                      )}
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        )}

        <Card titulo={`Sem local (${e.semLocal})`}>
          {semLocal.length === 0 ? (
            <p className="text-sm text-muted">Todas as pecas boas ja estao em algum local.</p>
          ) : (
            <table className="tabela">
              <tbody>
                {semLocal.map((i) => (
                  <tr key={i.impressoId}>
                    <td>
                      <Link href={`/impressos/${i.impressoId}/editar`} className="hover:text-accent">
                        {i.modelo}
                      </Link>
                      <div className="text-xs text-muted">
                        {data(i.quando)} · {numero(i.escalaPct, 0)}% · {i.boas} boa(s) no lote
                      </div>
                    </td>
                    <td className="num">{i.semLocal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {movimentos.length > 0 && (
          <Card titulo="Ultimas movimentacoes">
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Modelo</th>
                    <th>De</th>
                    <th>Para</th>
                    <th className="num">Pecas</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentos.slice(0, 20).map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap text-muted">{dataHora(m.quando)}</td>
                      <td>{modelo(m.impressoId)}</td>
                      <td>{nomeLocal(m.deLocalId)}</td>
                      <td>{nomeLocal(m.paraLocalId)}</td>
                      <td className="num">{m.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
