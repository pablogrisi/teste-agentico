-- CreateTable
CREATE TABLE "requisito" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "norma_lei" TEXT,
    "norma_artigo" TEXT,
    "norma_inciso" TEXT,
    "norma_paragrafo" TEXT,
    "norma_alinea" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requisito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "requisito_codigo_key" ON "requisito"("codigo");

-- CreateIndex
CREATE INDEX "requisito_area_ordem_idx" ON "requisito"("area", "ordem");
