-- CreateTable
CREATE TABLE "avaliacao_requisito" (
    "id" UUID NOT NULL,
    "analise_id" UUID NOT NULL,
    "requisito_id" UUID NOT NULL,
    "status_sugerido_ia" TEXT NOT NULL,
    "status_final" TEXT NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "comentario" TEXT,
    "pagina_referencia" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avaliacao_requisito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avaliacao_requisito_analise_id_idx" ON "avaliacao_requisito"("analise_id");

-- CreateIndex
CREATE UNIQUE INDEX "avaliacao_requisito_analise_id_requisito_id_key" ON "avaliacao_requisito"("analise_id", "requisito_id");

-- AddForeignKey
ALTER TABLE "avaliacao_requisito" ADD CONSTRAINT "avaliacao_requisito_analise_id_fkey" FOREIGN KEY ("analise_id") REFERENCES "analise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacao_requisito" ADD CONSTRAINT "avaliacao_requisito_requisito_id_fkey" FOREIGN KEY ("requisito_id") REFERENCES "requisito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
