-- CreateTable
CREATE TABLE "analise" (
    "id" UUID NOT NULL,
    "nup" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "analista_id" TEXT NOT NULL,
    "arquivo_pdf_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "motivo_erro" TEXT,
    "iniciada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analise_analista_id_iniciada_em_idx" ON "analise"("analista_id", "iniciada_em");
