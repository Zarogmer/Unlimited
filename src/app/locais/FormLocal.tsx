"use client";

import { useActionState } from "react";
import { salvarLocal, type EstadoLocal } from "./actions";
import { Erro } from "@/components/ui";

/** Cadastra um local novo ou, com `id`, renomeia um que ja existe. */
export function FormLocal({ id, nome = "", obs = "" }: { id?: string; nome?: string; obs?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoLocal, FormData>(salvarLocal, {});
  return (
    <form action={acao} className="space-y-2">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="flex flex-wrap gap-2">
        <input
          name="nome"
          className="campo min-w-40 flex-1"
          defaultValue={nome}
          placeholder="Nome do local (ex.: Prateleira, Loja do centro)"
          required
        />
        <input name="obs" className="campo min-w-40 flex-1" defaultValue={obs} placeholder="Observacao (opcional)" />
        <button type="submit" className={`botao ${id ? "botao-secundario" : "botao-primario"}`} disabled={pendente}>
          {pendente ? "Salvando..." : id ? "Salvar" : "Cadastrar local"}
        </button>
      </div>
      <Erro mensagem={estado.erro} />
    </form>
  );
}
