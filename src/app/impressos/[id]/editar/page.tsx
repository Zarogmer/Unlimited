import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { paraInput } from "@/lib/formato";
import { Titulo } from "@/components/ui";
import { FormApagar } from "@/components/FormApagar";
import { FormImpresso } from "../../FormImpresso";
import { apagarImpresso } from "../../actions";

export const metadata = { title: "Editar impresso" };
export const dynamic = "force-dynamic";

export default async function PaginaEditarImpresso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = await prisma.impresso.findUnique({ where: { id } });
  if (!i) notFound();

  return (
    <>
      <Titulo
        acoes={
          <>
            {i.calculoId && (
              <Link href={`/calculos/${i.calculoId}`} className="botao botao-secundario">
                Ver calculo
              </Link>
            )}
            <FormApagar acao={apagarImpresso} id={i.id} mensagem={`Apagar o impresso "${i.modelo}"?`} />
          </>
        }
      >
        Editar impresso
      </Titulo>
      <FormImpresso
        titulo={i.modelo}
        valores={{
          id: i.id,
          calculoId: i.calculoId,
          modelo: i.modelo,
          link: i.link,
          quando: i.quando.toLocaleDateString("sv-SE"),
          escalaPct: paraInput(i.escalaPct, 2),
          quantidade: String(i.quantidade),
          custoPeca: paraInput(i.custoPeca, 2),
          outrosPeca: paraInput(i.outrosPeca, 2),
          precoVenda: paraInput(i.precoVenda, 2),
          segundosPeca: i.segundosPeca ? String(i.segundosPeca) : "",
          obs: i.obs,
        }}
      />
    </>
  );
}
