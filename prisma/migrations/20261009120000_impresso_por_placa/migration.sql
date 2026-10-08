-- Lote = placa inteira: gramas e tempo passam a ser do lote todo.
-- Antes eram de uma peca (pecasPorPlaca = 1) ou de uma placa com N pecas;
-- converte pra que gramas / quantidade continue dando o mesmo por peca.
UPDATE "Impresso"
SET "gramas100" = "gramas100" / GREATEST("pecasPorPlaca", 1) * "quantidade",
    "segundosPeca" = ROUND("segundosPeca"::double precision / GREATEST("pecasPorPlaca", 1) * "quantidade");

-- AlterTable
ALTER TABLE "Impresso" DROP COLUMN "pecasPorPlaca";
