-- CreateTable
CREATE TABLE "Local" (
    "id" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,
    "obs" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimento" (
    "id" TEXT NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantidade" INTEGER NOT NULL,
    "obs" TEXT NOT NULL DEFAULT '',
    "impressoId" TEXT NOT NULL,
    "deLocalId" TEXT,
    "paraLocalId" TEXT,

    CONSTRAINT "Movimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Movimento_impressoId_idx" ON "Movimento"("impressoId");

-- CreateIndex
CREATE INDEX "Movimento_quando_idx" ON "Movimento"("quando");

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_impressoId_fkey" FOREIGN KEY ("impressoId") REFERENCES "Impresso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_deLocalId_fkey" FOREIGN KEY ("deLocalId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_paraLocalId_fkey" FOREIGN KEY ("paraLocalId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

