import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, protegido, tokenSessao } from "@/lib/sessao";
import { sair } from "@/app/entrar/actions";

const LINKS = [
  { href: "/", rotulo: "Painel" },
  { href: "/calculadora", rotulo: "Calculadora" },
  { href: "/calculos", rotulo: "Calculos" },
  { href: "/impressos", rotulo: "Impressos" },
  { href: "/configuracoes", rotulo: "Configuracoes" },
];

/** true se o app nao pede senha ou se o cookie da sessao esta valido. */
async function logado(): Promise<boolean> {
  const senha = process.env.APP_SENHA;
  if (!senha) return true;
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  return Boolean(token) && token === (await tokenSessao(senha));
}

export async function Nav() {
  const dentro = await logado();
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold">
          <span className="inline-block h-3 w-3 rounded-full bg-accent" aria-hidden />
          Unlimited 3D
        </Link>
        {dentro && (
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                {l.rotulo}
              </Link>
            ))}
          </nav>
        )}
        {dentro && protegido() && (
          <form action={sair} className="ml-auto">
            <button type="submit" className="text-sm text-muted hover:text-text">
              Sair
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
