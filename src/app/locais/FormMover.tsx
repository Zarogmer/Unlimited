"use client";

import { useActionState, useState } from "react";
import { moverPecas, type EstadoLocal } from "./actions";
import { Campo, Card, Erro } from "@/components/ui";

const SEM_LOCAL = "nenhum";

export interface LoteMover {
  impressoId: string;
  rotulo: string;
  semLocal: number;
  porLocal: Record<string, number>;
}

export interface LocalOpcao {
  id: string;
  nome: string;
}

export function FormMover({
  lotes,
  locais,
  impressoInicial = "",
}: {
  lotes: LoteMover[];
  locais: LocalOpcao[];
  impressoInicial?: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoLocal, FormData>(moverPecas, {});
  const [impressoId, setImpressoId] = useState(
    lotes.some((l) => l.impressoId === impressoInicial) ? impressoInicial : (lotes[0]?.impressoId ?? ""),
  );
  const [deEscolhido, setDe] = useState(SEM_LOCAL);
  const [paraEscolhido, setPara] = useState("");
  const [quantidade, setQuantidade] = useState("");

  const lote = lotes.find((l) => l.impressoId === impressoId);
  const saldo = (onde: string) => (onde === SEM_LOCAL ? (lote?.semLocal ?? 0) : (lote?.porLocal[onde] ?? 0));

  // Origens: so onde esse lote tem peca. Destinos: qualquer outro lugar.
  const origens = [SEM_LOCAL, ...locais.map((l) => l.id)].filter((o) => saldo(o) > 0);
  const de = origens.includes(deEscolhido) ? deEscolhido : (origens[0] ?? "");
  const destinos = [...locais.map((l) => l.id), SEM_LOCAL].filter((d) => d !== de);
  const para = destinos.includes(paraEscolhido) ? paraEscolhido : (destinos[0] ?? "");
  const nome = (onde: string) => (onde === SEM_LOCAL ? "Sem local" : (locais.find((l) => l.id === onde)?.nome ?? ""));
  const disponivel = de ? saldo(de) : 0;

  return (
    <Card titulo="Movimentar pecas">
      <form action={acao} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_6rem_auto] lg:items-start">
        <Campo rotulo="Lote impresso" className="sm:col-span-2 lg:col-span-1">
          <select name="impressoId" className="campo" value={impressoId} onChange={(e) => setImpressoId(e.target.value)}>
            {lotes.map((l) => (
              <option key={l.impressoId} value={l.impressoId}>
                {l.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="De">
          <select name="de" className="campo" value={de} onChange={(e) => setDe(e.target.value)}>
            {origens.length === 0 && <option value="">— sem pecas —</option>}
            {origens.map((o) => (
              <option key={o} value={o}>
                {nome(o)} ({saldo(o)})
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Para">
          <select name="para" className="campo" value={para} onChange={(e) => setPara(e.target.value)}>
            {destinos.map((d) => (
              <option key={d} value={d}>
                {nome(d)}
                {saldo(d) > 0 && d !== SEM_LOCAL ? ` (ja tem ${saldo(d)})` : ""}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Quantas" dica={disponivel > 0 ? `ate ${disponivel}` : undefined}>
          <input
            name="quantidade"
            type="number"
            min={1}
            max={Math.max(1, disponivel)}
            className="campo"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            required
          />
        </Campo>
        <button type="submit" className="botao botao-primario lg:mt-6" disabled={pendente || disponivel <= 0}>
          {pendente ? "Movendo..." : "Mover"}
        </button>
        <div className="sm:col-span-2 lg:col-span-5">
          <Erro mensagem={estado.erro} />
          {estado.ok && !estado.erro && <p className="text-sm text-green">Pecas movidas.</p>}
        </div>
      </form>
    </Card>
  );
}
