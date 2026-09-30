"use client";

import { useActionState, useState } from "react";
import { calcularAction, type EstadoCalculo } from "./actions";
import { Campo, Card, Erro } from "@/components/ui";
import type { Config } from "@/lib/config";
import { paraInput } from "@/lib/formato";

interface Inicial {
  link: string;
  perfil: string;
  pecas: string;
  escala: string;
  modo: "link" | "manual";
}

export function FormCalculadora({ config, inicial }: { config: Config; inicial: Inicial }) {
  const [estado, acao, pendente] = useActionState<EstadoCalculo, FormData>(calcularAction, {});
  const [modo, setModo] = useState<"link" | "manual">(inicial.modo);
  const [escala, setEscala] = useState(inicial.escala);
  const fator = Math.pow((Number(escala.replace(",", ".")) || 100) / 100, 3);

  return (
    <form action={acao} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <input type="hidden" name="modo" value={modo} />
      <Card titulo="Modelo">
        <div className="mb-4 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setModo("link")}
            className={`botao ${modo === "link" ? "botao-primario" : "botao-secundario"}`}
          >
            Link do MakerWorld
          </button>
          <button
            type="button"
            onClick={() => setModo("manual")}
            className={`botao ${modo === "manual" ? "botao-primario" : "botao-secundario"}`}
          >
            Gramas na mao
          </button>
        </div>

        {modo === "link" ? (
          <div className="space-y-4">
            <Campo
              rotulo="Link do modelo"
              dica="Ex.: https://makerworld.com/pt/models/3032883-chibi-spider-man#profileId-3409126 (o #profileId escolhe o perfil)."
            >
              <input
                name="link"
                className="campo"
                defaultValue={inicial.link}
                placeholder="https://makerworld.com/pt/models/..."
                required
              />
            </Campo>
            <Campo rotulo="Perfil (id, opcional)" dica="Vence o #profileId do link. Deixe vazio pra usar o padrao do modelo.">
              <input name="perfil" className="campo" defaultValue={inicial.perfil} placeholder="3409126" inputMode="numeric" />
            </Campo>
          </div>
        ) : (
          <div className="space-y-4">
            <Campo rotulo="Nome do modelo">
              <input name="titulo" className="campo" placeholder="Chibi Spider-Man" />
            </Campo>
            <Campo rotulo="Gramas por cor" dica="Uma cor por linha ou separadas por virgula: cor=gramas.">
              <textarea
                name="gramas"
                className="campo min-h-28 font-mono"
                placeholder={"preto=110\nvermelho=7,5\nbranco=19"}
              />
            </Campo>
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Quantas pecas" dica="Pra calcular os rolos do lote.">
            <input name="pecas" className="campo" defaultValue={inicial.pecas} inputMode="numeric" min={1} type="number" />
          </Campo>
          <Campo
            rotulo="Escala no slicer (%)"
            dica={`Escala uniforme. Fator no peso: ${fator.toFixed(4)} (${(fator * 100).toFixed(1)}% do filamento).`}
          >
            <input
              name="escala"
              className="campo"
              value={escala}
              onChange={(e) => setEscala(e.target.value)}
              inputMode="decimal"
            />
          </Campo>
        </div>
      </Card>

      <div className="space-y-4">
        <Card titulo="Rolo">
          <div className="space-y-4">
            <Campo rotulo="Preco do rolo (R$)">
              <input name="precoRolo" className="campo" defaultValue={paraInput(config.precoRolo)} inputMode="decimal" />
            </Campo>
            <Campo rotulo="Peso do rolo (g)">
              <input name="pesoRoloG" className="campo" defaultValue={paraInput(config.pesoRoloG, 0)} inputMode="numeric" />
            </Campo>
            <Campo rotulo="Margem sobre o slicer (%)" dica="Folga pra purga, falha, rolo com menos de 1 kg util.">
              <input name="margem" className="campo" defaultValue={paraInput(config.margemPct)} inputMode="decimal" />
            </Campo>
          </div>
        </Card>
        <Erro mensagem={estado.erro} />
        <button type="submit" className="botao botao-primario w-full" disabled={pendente}>
          {pendente ? "Consultando o MakerWorld..." : "Calcular"}
        </button>
      </div>
    </form>
  );
}
