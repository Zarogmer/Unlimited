"use client";

import { useActionState, useState } from "react";
import { salvarImpresso, type EstadoImpresso } from "./actions";
import { Campo, Card, Erro } from "@/components/ui";
import { contas } from "@/lib/impressos";
import { horas, num, pct, reais } from "@/lib/formato";

export interface ValoresImpresso {
  id?: string;
  calculoId?: string | null;
  modelo: string;
  link: string;
  quando: string; // YYYY-MM-DD
  escalaPct: string;
  quantidade: string;
  custoPeca: string;
  outrosPeca: string;
  precoVenda: string;
  segundosPeca: string;
  obs: string;
}

export function FormImpresso({ valores, titulo }: { valores: ValoresImpresso; titulo: string }) {
  const [estado, acao, pendente] = useActionState<EstadoImpresso, FormData>(salvarImpresso, {});
  const [v, setV] = useState(valores);
  const muda = (campo: keyof ValoresImpresso) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV({ ...v, [campo]: e.target.value });

  const c = contas({
    quantidade: num(v.quantidade, 0),
    custoPeca: num(v.custoPeca),
    outrosPeca: num(v.outrosPeca),
    precoVenda: num(v.precoVenda),
  });
  const seg = Math.trunc(num(v.segundosPeca, 0));

  return (
    <form action={acao} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {v.calculoId && <input type="hidden" name="calculoId" value={v.calculoId} />}
      <Card titulo={titulo}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Modelo" className="sm:col-span-2">
            <input name="modelo" className="campo" value={v.modelo} onChange={muda("modelo")} required />
          </Campo>
          <Campo rotulo="Link (opcional)" className="sm:col-span-2">
            <input name="link" className="campo" value={v.link} onChange={muda("link")} placeholder="https://makerworld.com/..." />
          </Campo>
          <Campo rotulo="Quando">
            <input name="quando" type="date" className="campo" value={v.quando} onChange={muda("quando")} />
          </Campo>
          <Campo rotulo="Escala (%)" dica="Tamanho no slicer. A calculadora ja calcula o custo na escala certa.">
            <input name="escalaPct" className="campo" value={v.escalaPct} onChange={muda("escalaPct")} inputMode="decimal" />
          </Campo>
          <Campo rotulo="Quantidade de pecas">
            <input name="quantidade" type="number" min={1} className="campo" value={v.quantidade} onChange={muda("quantidade")} />
          </Campo>
          <Campo rotulo="Tempo por peca (segundos)" dica={seg > 0 ? `= ${horas(seg)} por peca, ${horas(seg * num(v.quantidade, 0))} no lote` : "Opcional."}>
            <input name="segundosPeca" className="campo" value={v.segundosPeca} onChange={muda("segundosPeca")} inputMode="numeric" />
          </Campo>
          <Campo rotulo="Custo do material por peca (R$)" dica="O que a calculadora achou.">
            <input name="custoPeca" className="campo" value={v.custoPeca} onChange={muda("custoPeca")} inputMode="decimal" />
          </Campo>
          <Campo rotulo="Outros custos por peca (R$)" dica="Energia, embalagem, pintura, ima...">
            <input name="outrosPeca" className="campo" value={v.outrosPeca} onChange={muda("outrosPeca")} inputMode="decimal" />
          </Campo>
          <Campo rotulo="Preco de venda por peca (R$)" className="sm:col-span-2">
            <input name="precoVenda" className="campo" value={v.precoVenda} onChange={muda("precoVenda")} inputMode="decimal" />
          </Campo>
          <Campo rotulo="Observacao" className="sm:col-span-2">
            <textarea name="obs" className="campo min-h-20" value={v.obs} onChange={muda("obs")} />
          </Campo>
        </div>
      </Card>

      <div className="space-y-4">
        <Card titulo="Lucro do lote">
          <div className={`text-3xl font-semibold tabular-nums ${c.lucro >= 0 ? "text-green" : "text-red"}`}>
            {reais(c.lucro)}
          </div>
          <div className="mt-1 text-sm text-muted">
            {reais(c.lucroPeca)} por peca · margem {pct(c.margemPct)}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted">Custo unitario</dt>
            <dd className="num">{reais(c.custoUnitario)}</dd>
            <dt className="text-muted">Custo total</dt>
            <dd className="num">{reais(c.custoTotal)}</dd>
            <dt className="text-muted">Receita</dt>
            <dd className="num">{reais(c.receita)}</dd>
          </dl>
        </Card>
        <Erro mensagem={estado.erro} />
        <button type="submit" className="botao botao-primario w-full" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
