"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ANALISE_POLL_MS } from "@/lib/data";
import type { StatusAnalise } from "@/lib/data";

const EM_PROCESSAMENTO: StatusAnalise[] = ["PENDENTE", "PROCESSANDO"];

/**
 * Enquanto a análise está em processamento, re-busca a página em intervalos
 * (`router.refresh()` → o Server Component recarrega). Para sozinho quando o status muda.
 */
export function AutoRefreshAnalise({ status }: { status: StatusAnalise }) {
  const router = useRouter();

  useEffect(() => {
    if (!EM_PROCESSAMENTO.includes(status)) return;
    const timer = setInterval(() => router.refresh(), ANALISE_POLL_MS);
    return () => clearInterval(timer);
  }, [status, router]);

  return null;
}
