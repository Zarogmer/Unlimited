import { prisma } from "@/lib/db";
import { lerConfig } from "@/lib/config";
import { paraInput } from "@/lib/formato";
import type { Resultado } from "@/lib/filamento";
import { Titulo } from "@/components/ui";
import { FormImpresso, type ValoresImpresso } from "../FormImpresso";

export const metadata = { title: "Registrar impresso" };
export const dynamic = "force-dynamic";

function hoje(): string {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

export default async function PaginaNovoImpresso({
  searchParams,
}: {
  searchParams: Promise<{ calculo?: string }>;
}) {
  const [{ calculo }, config, calculos] = await Promise.all([
    searchParams,
    lerConfig(),
    prisma.calculo.findMany({
      orderBy: { criadoEm: "desc" },
      take: 30,
      select: { id: true, titulo: true, escalaPct: true, custoPeca: true },
    }),
  ]);

  let valores: ValoresImpresso = {
    modelo: "",
    link: "",
    quando: hoje(),
    escalaPct: "100",
    quantidade: "1",
    gramas100: "",
    precoRolo: paraInput(config.precoRolo),
    pesoRoloG: paraInput(config.pesoRoloG, 0),
    custoPeca: "",
    outrosPeca: "",
    precoVenda: "",
    segundosPeca: "",
    obs: "",
  };
  let origem = "";

  if (calculo) {
    const c = await prisma.calculo.findUnique({ where: { id: calculo } });
    if (c) {
      const res = c.resultado as unknown as Resultado;
      origem = c.titulo;
      valores = {
        ...valores,
        calculoId: c.id,
        modelo: c.titulo,
        link: c.link,
        escalaPct: paraInput(c.escalaPct, 2),
        quantidade: String(c.pecas),
        gramas100: paraInput(res.gramasPeca100 ?? 0, 1),
        precoRolo: paraInput(c.precoRolo),
        pesoRoloG: paraInput(c.pesoRoloG, 0),
        custoPeca: paraInput(c.custoPeca, 2),
        segundosPeca: c.segundos ? String(c.segundos) : "",
      };
    }
  }

  return (
    <>
      <Titulo>Registrar impresso</Titulo>
      {origem ? (
        <p className="mb-4 text-sm text-muted">
          Preenchido a partir do calculo &quot;{origem}&quot;. Falta o preco de venda (e outros custos, se tiver).
        </p>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Cole o link do MakerWorld e clique em &quot;Puxar filamento&quot;: o custo do material sai dos gramas do
          modelo, da escala e do preco do rolo. Ou escolha um calculo salvo.
        </p>
      )}
      <FormImpresso valores={valores} titulo="Lote impresso" calculos={calculos} />
    </>
  );
}
