"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, tokenSessao } from "@/lib/sessao";

export interface EstadoLogin {
  erro?: string;
}

export async function entrar(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const senhaCerta = process.env.APP_SENHA;
  if (!senhaCerta) redirect("/");

  const senha = String(formData.get("senha") ?? "");
  if (senha !== senhaCerta) {
    return { erro: "Senha incorreta." };
  }
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESSAO, await tokenSessao(senhaCerta), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 dias
  });
  const voltar = String(formData.get("voltar") ?? "");
  redirect(voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/");
}

export async function sair(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_SESSAO);
  redirect("/entrar");
}
