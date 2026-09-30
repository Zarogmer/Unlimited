import Link from "next/link";
import { prisma } from "@/lib/db";
import { dataHora, gramas, numero, reais } from "@/lib/formato";
import { Card, Titulo, Vazio } from "@/components/ui";

export const metadata = { title: "Calculos" };
export const dynamic = "force-dynamic";

export default async function PaginaCalculos() {
  const calculos = await prisma.calculo.findMany({
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { impressos: true } } },
  });

  return (
    <>
      <Titulo
        acoes={
          <Link href="/calculadora" className="botao botao-primario">
            Novo calculo
          </Link>
        }
      >
        Calculos de filamento
      </Titulo>
      <Card>
        {calculos.length === 0 ? (
          <Vazio>Nenhum calculo salvo ainda.</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Modelo</th>
                  <th className="num">Escala</th>
                  <th className="num">Pecas</th>
                  <th className="num">Gramas/peca</th>
                  <th className="num">Custo/peca</th>
                  <th>Gargalo</th>
                  <th className="num">Rolos lote</th>
                  <th className="num">Impressos</th>
                </tr>
              </thead>
              <tbody>
                {calculos.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap text-muted">{dataHora(c.criadoEm)}</td>
                    <td>
                      <Link href={`/calculos/${c.id}`} className="font-medium hover:text-accent">
                        {c.titulo}
                      </Link>
                      {c.perfil && <div className="text-xs text-muted">{c.perfil}</div>}
                    </td>
                    <td className="num">{numero(c.escalaPct, 0)}%</td>
                    <td className="num">{c.pecas}</td>
                    <td className="num">{gramas(c.gramasPeca)}</td>
                    <td className="num">{reais(c.custoPeca)}</td>
                    <td>{c.gargalo}</td>
                    <td className="num">
                      {c.rolosLote} <span className="text-muted">({reais(c.custoRolosLote)})</span>
                    </td>
                    <td className="num">{c._count.impressos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
