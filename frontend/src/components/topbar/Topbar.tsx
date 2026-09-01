import { CearaLogo } from "@/components/brand/CearaLogo";
import { ChevronDownIcon } from "@/components/icons";
import styles from "./Topbar.module.css";

interface TopbarProps {
  /**
   * Nome exibido no seletor de usuário. No MVP há um analista único e fixo
   * (ver glossário); o valor real virá da config/camada de dados nos ciclos por RF.
   */
  userName?: string;
}

/** Barra superior institucional, comum a todas as telas. */
export function Topbar({ userName = "Usuário Analista" }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <CearaLogo className={styles.logo} />
      {/* Seletor de usuário sem dropdown nesta slice — chrome de layout, não comportamento. */}
      <button className={styles.user} type="button">
        <span className={styles.userName}>{userName}</span>
        <ChevronDownIcon />
      </button>
    </header>
  );
}
