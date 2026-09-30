"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./actions";
import { Campo, Erro } from "@/components/ui";

export function FormLogin({ voltar }: { voltar: string }) {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {});
  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="voltar" value={voltar} />
      <Campo rotulo="Senha">
        <input name="senha" type="password" className="campo" autoFocus required autoComplete="current-password" />
      </Campo>
      <Erro mensagem={estado.erro} />
      <button type="submit" className="botao botao-primario w-full" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
