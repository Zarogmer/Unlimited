import type { ReactNode } from "react";

export function Titulo({ children, acoes }: { children: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{children}</h1>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Card({
  titulo,
  children,
  className = "",
}: {
  titulo?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-surface p-4 ${className}`}>
      {titulo && <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</h2>}
      {children}
    </section>
  );
}

export function Kpi({
  rotulo,
  valor,
  detalhe,
  cor,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  cor?: "verde" | "vermelho" | "acento";
}) {
  const corValor =
    cor === "verde" ? "text-green" : cor === "vermelho" ? "text-red" : cor === "acento" ? "text-accent" : "";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{rotulo}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${corValor}`}>{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-muted">{detalhe}</div>}
    </div>
  );
}

export function Campo({
  rotulo,
  dica,
  children,
  className = "",
}: {
  rotulo: string;
  dica?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-muted">{dica}</span>}
    </label>
  );
}

export function Erro({ mensagem }: { mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <div role="alert" className="rounded-md border border-red/50 bg-red/10 px-3 py-2 text-sm text-red">
      {mensagem}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

/** Bolinha com a cor do filamento (hex) ao lado do nome. */
export function Amostra({ hex, nome }: { hex: string; nome: string }) {
  const valido = /^#[0-9A-Fa-f]{6}$/.test(hex);
  return (
    <span className="inline-flex items-center gap-2">
      {valido && (
        <span
          className="inline-block h-3.5 w-3.5 rounded-full border border-white/20"
          style={{ background: hex }}
          aria-hidden
        />
      )}
      <span>{nome}</span>
      {valido && <span className="font-mono text-xs text-muted">{hex}</span>}
    </span>
  );
}
