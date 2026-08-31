import { CEARA_LOGO_SRC } from "@/assets/brand";
import { ChevronDown } from "@/components/icons";
import styles from "./Topbar.module.css";

/** Barra superior institucional, comum a todas as telas. */
export function Topbar({ userName = "Usuário Analista" }) {
  return (
    <header className={styles.topbar}>
      <img className={styles.logo} src={CEARA_LOGO_SRC} alt="Governo do Estado do Ceará" />
      <button className={styles.user} type="button">
        <span className={styles.userName}>{userName}</span>
        <ChevronDown size={16} />
      </button>
    </header>
  );
}
