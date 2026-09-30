"use client";

import { useActionState } from "react";
import { salvarConfigAction, type EstadoConfig } from "./actions";
import { Campo, Card, Erro } from "@/components/ui";
import type { Config } from "@/lib/config";
import { paraInput } from "@/lib/formato";

export function FormConfig({ config }: { config: Config }) {
  const [estado, acao, pendente] = useActionState<EstadoConfig, FormData>(salvarConfigAction, {});
  return (
    <form action={acao} className="max-w-lg space-y-4">
      <Card titulo="Rolo de filamento">
        <div className="space-y-4">
          <Campo rotulo="Preco do rolo (R$)">
            <input name="precoRolo" className="campo" defaultValue={paraInput(config.precoRolo)} inputMode="decimal" />
          </Campo>
          <Campo rotulo="Peso do rolo (g)">
            <input name="pesoRoloG" className="campo" defaultValue={paraInput(config.pesoRoloG, 0)} inputMode="numeric" />
          </Campo>
          <Campo
            rotulo="Margem sobre o slicer (%)"
            dica="Folga somada aos gramas de cada cor: purga da troca de cor, falha no meio, rolo com menos de 1 kg util. 0 = usa o numero cru do MakerWorld."
          >
            <input name="margemPct" className="campo" defaultValue={paraInput(config.margemPct)} inputMode="decimal" />
          </Campo>
        </div>
      </Card>
      <Erro mensagem={estado.erro} />
      {estado.ok && <p className="text-sm text-green">Configuracoes salvas.</p>}
      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
