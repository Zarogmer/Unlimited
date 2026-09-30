import { redirect } from "next/navigation";
import { protegido } from "@/lib/sessao";
import { FormLogin } from "./FormLogin";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ voltar?: string }>;
}) {
  if (!protegido()) redirect("/");
  const { voltar } = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="rounded-lg border border-border bg-surface p-6">
        <h1 className="mb-1 text-xl font-semibold">Unlimited 3D</h1>
        <p className="mb-5 text-sm text-muted">Digite a senha compartilhada para entrar.</p>
        <FormLogin voltar={voltar ?? "/"} />
      </div>
    </div>
  );
}
