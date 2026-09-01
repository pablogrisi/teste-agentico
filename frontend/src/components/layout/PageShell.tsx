import type { ReactNode } from "react";
import { Topbar } from "@/components/topbar/Topbar";
import styles from "./PageShell.module.css";

interface PageShellProps {
  children: ReactNode;
  /**
   * `true` para telas que ocupam a altura da viewport sem rolar a página
   * (ex.: a tela de análise, com visor + painel). Default: conteúdo em fluxo normal.
   */
  fill?: boolean;
}

/** Frame base de todas as telas: Topbar institucional fixa + área de conteúdo. */
export function PageShell({ children, fill = false }: PageShellProps) {
  return (
    <div className={styles.app}>
      <Topbar />
      <div className={fill ? styles.contentFill : styles.content}>{children}</div>
    </div>
  );
}
