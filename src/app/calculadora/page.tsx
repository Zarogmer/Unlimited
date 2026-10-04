import { redirect } from "next/navigation";

// A calculadora virou a tela "Registrar impresso": la o link do MakerWorld
// ja puxa os gramas e calcula o custo do material.
export default function PaginaCalculadora() {
  redirect("/impressos/novo");
}
