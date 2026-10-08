import { Titulo } from "@/components/ui";
import { FormKit } from "../FormKit";
import { lotesParaKit } from "../dados";

export const metadata = { title: "Montar kit" };
export const dynamic = "force-dynamic";

export default async function PaginaNovoKit() {
  const lotes = await lotesParaKit();
  return (
    <>
      <Titulo>Montar kit</Titulo>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Escolha as pecas que vao no kit (o suporte e os chaveiros) e quantas de cada. Elas saem do estoque; o que
        sobrar do lote continua guardado. O custo de cada peca e o custo real dela no lote, perdas incluidas.
      </p>
      <FormKit lotes={lotes} valores={{ nome: "", outrosCusto: "", precoVenda: "", obs: "", itens: [] }} />
    </>
  );
}
