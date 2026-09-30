import { lerConfig } from "@/lib/config";
import { Titulo } from "@/components/ui";
import { FormConfig } from "./FormConfig";

export const metadata = { title: "Configuracoes" };
export const dynamic = "force-dynamic";

export default async function PaginaConfiguracoes() {
  const config = await lerConfig();
  return (
    <>
      <Titulo>Configuracoes</Titulo>
      <p className="mb-5 max-w-2xl text-sm text-muted">
        Valores padrao da calculadora. Todo rolo e tratado como tendo este peso e custando este valor
        (da pra mudar na hora, em cada calculo).
      </p>
      <FormConfig config={config} />
    </>
  );
}
