import { prisma } from "@/lib/db";
import { paraInput } from "@/lib/formato";
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
  const { calculo } = await searchParams;
  let valores: ValoresImpresso = {
    modelo: "",
    link: "",
    quando: hoje(),
    escalaPct: "100",
    quantidade: "1",
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
      origem = c.titulo;
      valores = {
        ...valores,
        calculoId: c.id,
        modelo: c.titulo,
        link: c.link,
        escalaPct: paraInput(c.escalaPct, 2),
        quantidade: String(c.pecas),
        custoPeca: paraInput(c.custoPeca, 2),
        segundosPeca: c.segundos ? String(c.segundos) : "",
      };
    }
  }

  return (
    <>
      <Titulo>Registrar impresso</Titulo>
      {origem && (
        <p className="mb-4 text-sm text-muted">
          Preenchido a partir do calculo &quot;{origem}&quot;. Falta o preco de venda (e outros custos, se tiver).
        </p>
      )}
      <FormImpresso valores={valores} titulo="Lote impresso" />
    </>
  );
}
