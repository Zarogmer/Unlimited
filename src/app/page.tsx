import Link from "next/link";
import { prisma } from "@/lib/db";
import { lerConfig } from "@/lib/config";
import { contas, totais } from "@/lib/impressos";
import { estoque } from "@/lib/locais";
import { dataHora, numero, pct, reais } from "@/lib/formato";
import { Card, Kpi, Titulo, Vazio } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Painel() {
  const [impressos, locais, movimentos, kitItens, config] = await Promise.all([
    prisma.impresso.findMany({ orderBy: { quando: "desc" } }),
    prisma.local.findMany({ orderBy: { nome: "asc" } }),
    prisma.movimento.findMany(),
    prisma.kitItem.findMany(),
    lerConfig(),
  ]);
  const t = totais(impressos);
  const e = estoque(impressos, movimentos, kitItens);
  const ultimos = impressos.slice(0, 6);

  return (
    <>
      <Titulo
        acoes={
          <>
            <Link href="/impressos/novo" className="botao botao-primario">
              Registrar impresso
            </Link>
            <Link href="/locais" className="botao botao-secundario">
              Movimentar pecas
            </Link>
          </>
        }
      >
        Painel
      </Titulo>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          rotulo="Pecas boas"
          valor={String(t.boas)}
          detalhe={`${t.pecas} impressas · ${t.perdas} perdida(s) · ${t.lotes} lote(s)`}
        />
        <Kpi rotulo="Custo total" valor={reais(t.custoTotal)} detalhe="material + outros custos" />
        <Kpi rotulo="Receita" valor={reais(t.receita)} detalhe="so as pecas boas" />
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
            <Vazio>Nada registrado ainda. Clique em &quot;Registrar impresso&quot; e cole o link do MakerWorld.</Vazio>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th className="num">Boas</th>
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
                      <td className="num whitespace-nowrap">
                        {c.boas}
                        {c.perdas > 0 && <span className="text-xs text-red"> +{c.perdas} perdida(s)</span>}
                      </td>
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

        <Card titulo="Onde estao as pecas">
          {locais.length === 0 ? (
            <Vazio>Nenhum local cadastrado ainda. Cadastre em &quot;Locais&quot; pra controlar onde cada peca esta.</Vazio>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Local</th>
                  <th className="num">Pecas</th>
                </tr>
              </thead>
              <tbody>
                {locais.map((l) => {
                  const la = e.itens.filter((i) => i.porLocal[l.id] > 0);
                  return (
                    <tr key={l.id}>
                      <td>
                        {l.nome}
                        <div className="text-xs text-muted">
                          {la.map((i) => `${i.porLocal[l.id]}× ${i.modelo}`).join(" · ") || "vazio"}
                        </div>
                      </td>
                      <td className="num">{e.totalPorLocal[l.id] ?? 0}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="text-muted">Sem local</td>
                  <td className={`num ${e.semLocal > 0 ? "text-accent" : "text-muted"}`}>{e.semLocal}</td>
                </tr>
              </tbody>
            </table>
          )}
          <div className="mt-3 text-right">
            <Link href="/locais" className="text-sm text-muted hover:text-text">
              Ver locais →
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
