import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <h1>
        Every market call you can
        <span className={styles.accent}> prove later.</span>
      </h1>
      <p className={styles.lead}>
        Write what you think about a market. Attestra saves your call with live prices, runs AI on
        it, and gives you a receipt you own. Anyone can check it later. No need to take our word
        for it.
      </p>
    </section>
  );
}
