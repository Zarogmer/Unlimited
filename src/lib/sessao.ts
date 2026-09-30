// Token da sessao: um HMAC-like da senha compartilhada. Roda tanto no
// proxy quanto no servidor, por isso so usa Web Crypto (sem imports do Node).

export const COOKIE_SESSAO = "unlimited_sessao";

export async function tokenSessao(senha: string): Promise<string> {
  const segredo = process.env.APP_SEGREDO || "unlimited-3d";
  const dados = new TextEncoder().encode(`${senha}|${segredo}`);
  const hash = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** true quando o app esta protegido por senha (APP_SENHA definida). */
export function protegido(): boolean {
  return Boolean(process.env.APP_SENHA);
}
