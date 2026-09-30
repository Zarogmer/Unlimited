import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, tokenSessao } from "@/lib/sessao";

// Porta de entrada: se APP_SENHA estiver definida, toda pagina exige o
// cookie da sessao (login em /entrar). Sem APP_SENHA (dev local) passa tudo.
export async function proxy(request: NextRequest) {
  const senha = process.env.APP_SENHA;
  if (!senha) return NextResponse.next();

  const token = request.cookies.get(COOKIE_SESSAO)?.value;
  if (token && token === (await tokenSessao(senha))) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = "";
  const voltar = request.nextUrl.pathname + request.nextUrl.search;
  if (voltar && voltar !== "/") url.searchParams.set("voltar", voltar);
  return NextResponse.redirect(url);
}

export const config = {
  // Tudo, menos a tela de login, o healthcheck, os assets do Next e arquivos estaticos.
  matcher: ["/((?!entrar|api/health|_next/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
