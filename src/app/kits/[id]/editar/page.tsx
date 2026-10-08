import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { paraInput } from "@/lib/formato";
import { Titulo } from "@/components/ui";
import { FormApagar } from "@/components/FormApagar";
import { FormKit } from "../../FormKit";
import { lotesParaKit } from "../../dados";
import { apagarKit } from "../../actions";

export const metadata = { title: "Editar kit" };
export const dynamic = "force-dynamic";

export default async function PaginaEditarKit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [k, lotes] = await Promise.all([
    prisma.kit.findUnique({ where: { id }, include: { itens: true } }),
    lotesParaKit(id),
  ]);
  if (!k) notFound();

  // O mesmo lote pode ter vindo de varios locais: no formulario vira uma linha so.
  const porLote = new Map<string, number>();
  for (const it of k.itens) porLote.set(it.impressoId, (porLote.get(it.impressoId) ?? 0) + it.quantidade);

  return (
    <>
      <Titulo
        acoes={
          <FormApagar
            acao={apagarKit}
            id={k.id}
            mensagem={`Desmontar o kit "${k.nome}"? As pecas voltam pro estoque.`}
            rotulo="Desmontar"
          />
        }
      >
        Editar kit
      </Titulo>
      <FormKit
        lotes={lotes}
        valores={{
          id: k.id,
          nome: k.nome,
          outrosCusto: k.outrosCusto ? paraInput(k.outrosCusto, 2) : "",
          precoVenda: k.precoVenda ? paraInput(k.precoVenda, 2) : "",
          obs: k.obs,
          itens: [...porLote].map(([impressoId, q]) => ({ impressoId, quantidade: String(q) })),
        }}
      />
    </>
  );
}
