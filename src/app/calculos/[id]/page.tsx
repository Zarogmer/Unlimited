import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { explicarEscala, type PerfilResumo, type Resultado } from "@/lib/filamento";
import { dataHora, gramas, horas, numero, pct, reais } from "@/lib/formato";
import { Amostra, Card, Kpi, Titulo } from "@/components/ui";
import { FormApagar } from "@/components/FormApagar";
import { apagarCalculo } from "@/app/calculadora/actions";

export const dynamic = "force-dynamic";

export default async function PaginaCalculo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.calculo.findUnique({ where: { id }, include: { impressos: true } });
  if (!c) notFound();

  const res = c.resultado as unknown as Resultado;
  const outros = (c.outrosPerfis as unknown as PerfilResumo[]) ?? [];
  const escalado = res.escalaPct !== 100;
  const n = res.pecas;

  const linkRecalcular = (perfil?: number) => {
    const p = new URLSearchParams();
    if (c.origem === "manual") p.set("modo", "manual");
    if (c.link) p.set("link", c.link);
    if (perfil) p.set("perfil", String(perfil));
    p.set("pecas", String(c.pecas));
    p.set("escala", String(c.escalaPct));
    return `/calculadora?${p.toString()}`;
  };

  return (
    <>
      <Titulo
        acoes={
          <>
            <Link href={`/impressos/novo?calculo=${c.id}`} className="botao botao-verde">
              Registrar como impresso
            </Link>
            <Link href={linkRecalcular()} className="botao botao-secundario">
              Recalcular
            </Link>
            <a href={`/calculos/${c.id}/relatorio`} className="botao botao-secundario" download>
              Baixar .txt
            </a>
            <FormApagar acao={apagarCalculo} id={c.id} mensagem={`Apagar o calculo "${c.titulo}"?`} />
          </>
        }
      >
        {c.titulo}
      </Titulo>

      <div className="mb-4 text-sm text-muted">
        {dataHora(c.criadoEm)}
        {c.perfil && <> · Perfil: {c.perfil}</>}
        {c.placas > 0 && <> · {c.placas} placa(s)</>}
        {c.segundos > 0 && <> · ~{horas(c.segundos)} de impressao por peca</>}
        {c.link && (
          <>
            {" · "}
            <a href={c.link} target="_blank" rel="noopener noreferrer" className="underline hover:text-text">
              abrir no MakerWorld
            </a>
          </>
        )}
        <div>
          Rolo: {numero(res.roloG, 0)} g por {reais(res.precoRolo)}
          {res.margemPct ? ` · margem de ${pct(res.margemPct)} sobre o slicer` : ""}
          {escalado && (
            <>
              {" · "}
              Escala: peca a {numero(res.escalaPct, 0)}% do tamanho original → peso ×{numero(res.fatorEscala, 3)}
            </>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi rotulo="Material por peca" valor={reais(res.custoPeca)} detalhe={gramas(res.gramasPeca)} cor="acento" />
        <Kpi rotulo="Pra comecar" valor={reais(res.custoParaComecar)} detalhe={`${res.rolosParaComecar} rolo(s), um de cada cor`} />
        <Kpi rotulo="Pecas com 1 rolo de cada" valor={String(res.maxPecas1RoloCada)} detalhe={`gargalo: ${res.gargalo}`} />
        <Kpi rotulo={`Rolos pra ${n} peca(s)`} valor={String(res.rolosLote)} detalhe={reais(res.custoRolosLote)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Por peca (1 unidade)" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Cor</th>
                  <th>Tipo</th>
                  {escalado && <th className="num">100%</th>}
                  <th className="num">Gramas</th>
                  <th className="num">Custo</th>
                  <th className="num">Pecas/rolo</th>
                  <th className="num">Sobra no rolo</th>
                </tr>
              </thead>
              <tbody>
                {res.cores.map((cor) => (
                  <tr key={cor.hex} className={cor.hex === res.gargaloHex ? "bg-accent/5" : ""}>
                    <td>
                      <Amostra hex={cor.hex} nome={cor.nome} />
                      {cor.hex === res.gargaloHex && <span className="ml-2 text-xs text-accent">gargalo</span>}
                    </td>
                    <td className="text-muted">{cor.tipo}</td>
                    {escalado && <td className="num text-muted">{gramas(cor.gramas100)}</td>}
                    <td className="num">{gramas(cor.gramasPeca)}</td>
                    <td className="num">{reais(cor.custoPeca)}</td>
                    <td className="num">{cor.pecasPorRolo}</td>
                    <td className="num text-muted">{gramas(cor.sobra1Rolo, 0)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td>TOTAL</td>
                  <td />
                  {escalado && <td className="num text-muted">{gramas(res.gramasPeca100)}</td>}
                  <td className="num">{gramas(res.gramasPeca)}</td>
                  <td className="num">{reais(res.custoPeca)}</td>
                  <td />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {escalado && (
          <Card titulo="Conta da escala (volume ao cubo)">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted">
              {explicarEscala(res).join("\n")}
            </pre>
          </Card>
        )}

        {n > 1 && (
          <Card titulo={`Pra ${n} pecas`} className={escalado ? "" : "lg:col-span-2"}>
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Cor</th>
                    <th className="num">Gasta</th>
                    <th className="num">Rolos</th>
                    <th className="num">Custo rolos</th>
                    <th className="num">Sobra</th>
                  </tr>
                </thead>
                <tbody>
                  {res.cores.map((cor) => (
                    <tr key={cor.hex}>
                      <td>
                        <Amostra hex={cor.hex} nome={cor.nome} />
                      </td>
                      <td className="num">{gramas(cor.gramasLote, 0)}</td>
                      <td className="num">{cor.rolosLote}</td>
                      <td className="num">{reais(cor.custoRolosLote)}</td>
                      <td className="num text-muted">{gramas(cor.sobraLote, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                Comprar <b>{res.rolosLote} rolo(s)</b> = <b>{reais(res.custoRolosLote)}</b>; sobram {gramas(res.sobraLote, 0)} no total.
              </li>
              <li>
                Material realmente consumido: {reais(res.custoMaterialLote)} ({gramas(res.gramasLote, 0)}).
              </li>
              {c.segundos > 0 && <li>Tempo de impressao do lote: ~{horas(c.segundos * n)}.</li>}
            </ul>
          </Card>
        )}

        {outros.length > 0 && (
          <Card titulo="Outros perfis desse modelo" className="lg:col-span-2">
            <ul className="divide-y divide-border/60 text-sm">
              {outros.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {p.titulo || `perfil ${p.id}`}
                    {p.padrao && <span className="ml-2 text-xs text-muted">(padrao)</span>}
                    <span className="ml-2 text-xs text-muted">
                      {p.placas} placa(s) · {p.gramas} g · {horas(p.segundos) || "?"}
                    </span>
                  </span>
                  <Link href={linkRecalcular(p.id)} className="text-accent hover:underline">
                    calcular com esse perfil →
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {c.impressos.length > 0 && (
          <Card titulo="Lotes impressos a partir desse calculo" className="lg:col-span-2">
            <ul className="text-sm">
              {c.impressos.map((i) => (
                <li key={i.id}>
                  <Link href={`/impressos/${i.id}/editar`} className="hover:text-accent">
                    {dataHora(i.quando)} — {i.quantidade} peca(s) a {numero(i.escalaPct, 0)}%
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card titulo="Relatorio em texto" className="lg:col-span-2">
          <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-muted">{c.relatorio}</pre>
        </Card>
      </div>
    </>
  );
}
