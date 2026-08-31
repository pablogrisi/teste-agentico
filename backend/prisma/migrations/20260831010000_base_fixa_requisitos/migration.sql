warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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

