-- CreateTable
CREATE TABLE "Configuracao" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "precoRolo" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "pesoRoloG" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "margemPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calculo" (
    "id" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" TEXT NOT NULL DEFAULT 'makerworld',
    "titulo" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '',
    "idModelo" INTEGER,
    "idPerfil" INTEGER,
    "perfil" TEXT NOT NULL DEFAULT '',
    "placas" INTEGER NOT NULL DEFAULT 0,
    "segundos" INTEGER NOT NULL DEFAULT 0,
    "pecas" INTEGER NOT NULL DEFAULT 1,
    "escalaPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "precoRolo" DOUBLE PRECISION NOT NULL,
    "pesoRoloG" DOUBLE PRECISION NOT NULL,
    "margemPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gramasPeca" DOUBLE PRECISION NOT NULL,
    "custoPeca" DOUBLE PRECISION NOT NULL,
    "gargalo" TEXT NOT NULL DEFAULT '',
    "rolosLote" INTEGER NOT NULL DEFAULT 0,
    "custoRolosLote" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resultado" JSONB NOT NULL,
    "outrosPerfis" JSONB NOT NULL DEFAULT '[]',
    "relatorio" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Calculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Impresso" (
    "id" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelo" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '',
    "escalaPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "custoPeca" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outrosPeca" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoVenda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "segundosPeca" INTEGER NOT NULL DEFAULT 0,
    "obs" TEXT NOT NULL DEFAULT '',
    "calculoId" TEXT,

    CONSTRAINT "Impresso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Calculo_criadoEm_idx" ON "Calculo"("criadoEm");

-- CreateIndex
CREATE INDEX "Impresso_quando_idx" ON "Impresso"("quando");

-- AddForeignKey
ALTER TABLE "Impresso" ADD CONSTRAINT "Impresso_calculoId_fkey" FOREIGN KEY ("calculoId") REFERENCES "Calculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
