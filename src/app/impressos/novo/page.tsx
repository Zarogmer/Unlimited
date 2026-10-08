import { prisma } from "@/lib/db";
import { lerConfig } from "@/lib/config";
import { horas, paraInput } from "@/lib/formato";
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
    perdas: "0",
    gramasPlaca: "",
    precoRolo: paraInput(config.precoRolo),
    pesoRoloG: paraInput(config.pesoRoloG, 0),
    custoPeca: "",
    outrosPeca: "",
    precoVenda: "",
    segundosPlaca: "",
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
        // O calculo e por peca: a placa e o lote inteiro.
        gramasPlaca: paraInput((res.gramasPeca100 ?? 0) * c.pecas, 1),
        precoRolo: paraInput(c.precoRolo),
        pesoRoloG: paraInput(c.pesoRoloG, 0),
        custoPeca: paraInput(c.custoPeca, 2),
        segundosPlaca: c.segundos ? horas(c.segundos * c.pecas) : "",
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
          Informe a placa que saiu da impressora: quantas pecas, os gramas e o tempo que o fatiador mostra. O custo
          de cada peca e a placa dividida pelas pecas.
        </p>
      )}
      <FormImpresso valores={valores} titulo="Placa impressa" calculos={calculos} />
    </>
  );
}
