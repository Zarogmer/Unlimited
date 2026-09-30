import Link from "next/link";
import { prisma } from "@/lib/db";
import { lerConfig } from "@/lib/config";
import { contas, totais } from "@/lib/impressos";
import { dataHora, gramas, numero, pct, reais } from "@/lib/formato";
import { Card, Kpi, Titulo, Vazio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Painel() {
  const [impressos, calculos, config] = await Promise.all([
    prisma.impresso.findMany({ orderBy: { quando: "desc" } }),
    prisma.calculo.findMany({ orderBy: { criadoEm: "desc" }, take: 6 }),
    lerConfig(),
  ]);
  const t = totais(impressos);
  const ultimos = impressos.slice(0, 6);

  return (
    <>
      <Titulo
        acoes={
          <>
            <Link href="/calculadora" className="botao botao-primario">
              Calcular filamento
            </Link>
            <Link href="/impressos/novo" className="botao botao-secundario">
              Registrar impresso
            </Link>
          </>
        }
      >
        Painel
      </Titulo>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi rotulo="Pecas impressas" valor={String(t.pecas)} detalhe={`${t.lotes} lote(s)`} />
        <Kpi rotulo="Custo total" valor={reais(t.custoTotal)} detalhe="material + outros custos" />
        <Kpi rotulo="Receita" valor={reais(t.receita)} detalhe="tudo que foi vendido" />
        <Kpi
          rotulo="Lucro"
          valor={reais(t.lucro)}
          detalhe={`margem de ${pct(t.margemPct)}`}
          cor={t.lucro >= 0 ? "verde" : "vermelho"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Ultimos impressos">
          {ultimos.length === 0 ? (
            <Vazio>Nada registrado ainda. Calcule na calculadora e clique em &quot;Registrar como impresso&quot;.</Vazio>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th className="num">Qtd</th>
                  <th className="num">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((i) => {
                  const c = contas(i);
                  return (
                    <tr key={i.id}>
                      <td>
                        <Link href={`/impressos/${i.id}/editar`} className="hover:text-accent">
                          {i.modelo}
                        </Link>
                        <div className="text-xs text-muted">
                          {dataHora(i.quando)} · {numero(i.escalaPct, 0)}%
                        </div>
                      </td>
                      <td className="num">{i.quantidade}</td>
                      <td className={`num ${c.lucro >= 0 ? "text-green" : "text-red"}`}>{reais(c.lucro)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="mt-3 text-right">
            <Link href="/impressos" className="text-sm text-muted hover:text-text">
              Ver todos →
            </Link>
          </div>
        </Card>

        <Card titulo="Ultimos calculos">
          {calculos.length === 0 ? (
            <Vazio>Nenhum calculo ainda. Cole um link do MakerWorld na calculadora.</Vazio>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th className="num">Escala</th>
                  <th className="num">Custo/peca</th>
                </tr>
              </thead>
              <tbody>
                {calculos.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/calculos/${c.id}`} className="hover:text-accent">
                        {c.titulo}
                      </Link>
                      <div className="text-xs text-muted">
                        {dataHora(c.criadoEm)} · {c.pecas} peca(s) · {gramas(c.gramasPeca)}
                      </div>
                    </td>
                    <td className="num">{numero(c.escalaPct, 0)}%</td>
                    <td className="num">{reais(c.custoPeca)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-3 text-right">
            <Link href="/calculos" className="text-sm text-muted hover:text-text">
              Ver todos →
            </Link>
          </div>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted">
        Rolo padrao: {numero(config.pesoRoloG, 0)} g por {reais(config.precoRolo)}
        {config.margemPct ? ` · margem de ${pct(config.margemPct)} sobre o slicer` : ""} —{" "}
        <Link href="/configuracoes" className="underline hover:text-text">
          alterar
        </Link>
      </p>
    </>
  );
}
