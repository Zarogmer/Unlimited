-- CreateTable
CREATE TABLE "Kit" (
    "id" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,
    "outrosCusto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoVenda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "obs" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Kit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitItem" (
    "id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "kitId" TEXT NOT NULL,
    "impressoId" TEXT NOT NULL,
    "deLocalId" TEXT,

    CONSTRAINT "KitItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitItem_kitId_idx" ON "KitItem"("kitId");

-- CreateIndex
CREATE INDEX "KitItem_impressoId_idx" ON "KitItem"("impressoId");

-- AddForeignKey
ALTER TABLE "KitItem" ADD CONSTRAINT "KitItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitItem" ADD CONSTRAINT "KitItem_impressoId_fkey" FOREIGN KEY ("impressoId") REFERENCES "Impresso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitItem" ADD CONSTRAINT "KitItem_deLocalId_fkey" FOREIGN KEY ("deLocalId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
