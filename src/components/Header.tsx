import { BrandLogo } from "./BrandLogo";
import { WalletButton } from "./WalletButton";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.brand}>
        <BrandLogo />
        <div>
          <span className={styles.name}>Attestra</span>
        </div>
      </a>
      <div className={styles.right}>
        <nav className={styles.nav}>
          <a href="#generate">Generate</a>
          <a href="#how">How it works</a>
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}
