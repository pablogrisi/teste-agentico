"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons";
import { NovaAnaliseModal } from "./NovaAnaliseModal";
import styles from "./NovaAnaliseButton.module.css";

/** Botão "Nova análise" da toolbar: abre o modal de criação (RF-001 + RF-004). */
export function NovaAnaliseButton() {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  return (
    <>
      <button type="button" className={styles.botao} onClick={() => setAberto(true)}>
        <PlusIcon />
        Nova análise
      </button>
      {aberto && (
        <NovaAnaliseModal
          onFechar={() => setAberto(false)}
          onCriada={(id) => {
            setAberto(false);
            router.push(`/analise/${id}`);
          }}
        />
      )}
    </>
  );
}
