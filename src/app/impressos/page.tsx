import Link from "next/link";
import { prisma } from "@/lib/db";
import { contas, totais } from "@/lib/impressos";
import { data, horas, numero, pct, reais } from "@/lib/formato";
import { Card, Kpi, Titulo, Vazio } from "@/components/ui";
import { FormApagar } from "@/components/FormApagar";
import { apagarImpresso } from "./actions";

export const metadata = { title: "Impressos" };
export const dynamic = "force-dynamic";

export default async function PaginaImpressos() {
  const impressos = await prisma.impresso.findMany({ orderBy: [{ quando: "desc" }, { criadoEm: "desc" }] });
  const t = totais(impressos);

  return (
    <>
      <Titulo
        acoes={
          <Link href="/impressos/novo" className="botao botao-primario">
            Registrar impresso
          </Link>
        }
      >
        Impressos
      </Titulo>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          rotulo="Pecas boas"
          valor={String(t.boas)}
          detalhe={`${t.pecas} impressas · ${t.perdas} perdida(s) · ${t.lotes} lote(s)`}
        />
        <Kpi rotulo="Custo total" valor={reais(t.custoTotal)} detalhe="material + outros custos" />
        <Kpi rotulo="Receita" valor={reais(t.receita)} detalhe="so as pecas boas" />
        <Kpi rotulo="Lucro" valor={reais(t.lucro)} detalhe={`margem de ${pct(t.margemPct)}`} cor={t.lucro >= 0 ? "verde" : "vermelho"} />
      </div>

      <Card>
        {impressos.length === 0 ? (
          <Vazio>
            Nada registrado ainda. Clique em &quot;Registrar impresso&quot; e cole o link do MakerWorld.
          </Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Modelo</th>
                  <th className="num">Escala</th>
                  <th className="num">Boas</th>
                  <th className="num">Custo/pc</th>
                  <th className="num">Venda/pc</th>
                  <th className="num">Custo total</th>
                  <th className="num">Receita</th>
                  <th className="num">Lucro</th>
                  <th className="num">Margem</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {impressos.map((i) => {
                  const c = contas(i);
                  return (
                    <tr key={i.id}>
                      <td className="whitespace-nowrap text-muted">{data(i.quando)}</td>
                      <td>
                        <Link href={`/impressos/${i.id}/editar`} className="font-medium hover:text-accent">
                          {i.modelo}
                        </Link>
                        <div className="text-xs text-muted">
                          {i.segundosPlaca > 0 && <>{horas(i.segundosPlaca)} a placa · </>}
                          {i.obs}
                        </div>
                      </td>
                      <td className="num">{numero(i.escalaPct, 0)}%</td>
                      <td className="num whitespace-nowrap">
                        {c.boas}
                        {c.perdas > 0 && <span className="text-xs text-red"> +{c.perdas} perdida(s)</span>}
                      </td>
                      <td className="num">{reais(c.custoUnitario)}</td>
                      <td className="num">{reais(i.precoVenda)}</td>
                      <td className="num">{reais(c.custoTotal)}</td>
                      <td className="num">{reais(c.receita)}</td>
                      <td className={`num font-medium ${c.lucro >= 0 ? "text-green" : "text-red"}`}>{reais(c.lucro)}</td>
                      <td className="num">{pct(c.margemPct)}</td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {c.boas > 0 && (
                            <Link href={`/locais?impresso=${i.id}`} className="text-sm text-muted hover:text-text">
                              mover
                            </Link>
                          )}
                          <Link href={`/impressos/${i.id}/editar`} className="text-sm text-muted hover:text-text">
                            editar
                          </Link>
                          <FormApagar
                            acao={apagarImpresso}
                            id={i.id}
                            mensagem={`Apagar o impresso "${i.modelo}" (${i.quantidade} peca(s))?`}
                            rotulo="apagar"
                            className="text-sm text-red/80 hover:text-red"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
