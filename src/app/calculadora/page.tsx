import { lerConfig } from "@/lib/config";
import { Titulo } from "@/components/ui";
import { FormCalculadora } from "./FormCalculadora";

export const metadata = { title: "Calculadora de filamento" };
export const dynamic = "force-dynamic";

export default async function PaginaCalculadora({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [config, sp] = await Promise.all([lerConfig(), searchParams]);
  return (
    <>
      <Titulo>Calculadora de filamento</Titulo>
      <p className="mb-5 max-w-3xl text-sm text-muted">
        Cole o link do modelo no MakerWorld. O sistema busca os gramas de cada cor em cada placa do
        perfil de impressao e responde quanto custa por peca, quantas pecas saem de um rolo, qual cor
        e o gargalo e quantos rolos comprar pro lote. Diminuiu a peca no slicer? Informe a escala: o
        peso cai com o cubo do tamanho (60% do tamanho = 21,6% do filamento).
      </p>
      <FormCalculadora
        config={config}
        inicial={{
          link: sp.link ?? "",
          perfil: sp.perfil ?? "",
          pecas: sp.pecas ?? "1",
          escala: sp.escala ?? "100",
          modo: sp.modo === "manual" ? "manual" : "link",
        }}
      />
    </>
  );
}
