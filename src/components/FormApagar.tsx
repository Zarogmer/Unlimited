"use client";

// Formulario de "apagar" com confirmacao no navegador antes de mandar a action.
export function FormApagar({
  acao,
  id,
  mensagem,
  rotulo = "Apagar",
  className = "botao botao-perigo",
}: {
  acao: (formData: FormData) => Promise<void>;
  id: string;
  mensagem: string;
  rotulo?: string;
  className?: string;
}) {
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>
        {rotulo}
      </button>
    </form>
  );
}
