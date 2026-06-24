import styles from "./HowItWorks.module.css";

const steps = [
  {
    n: "01",
    title: "Connect your wallet",
    body: "Link a wallet on the 0G Galileo testnet. When you generate a signal, you sign once so the receipt goes to your wallet, not ours.",
  },
  {
    n: "02",
    title: "Share your view",
    body: "Tell us what you think about any major pair in the list. We capture live prices at that exact moment.",
  },
  {
    n: "03",
    title: "Get AI analysis",
    body: "AI reads your thesis and gives you a long or short call, how strong it is, and why.",
  },
  {
    n: "04",
    title: "Own your receipt",
    body: "Your call is stored safely, recorded on chain, and tied to a token in your wallet that proves you made it.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className={styles.section}>
      <h2>How it works</h2>
      <div className={styles.grid}>
        {steps.map((step) => (
          <article key={step.n} className={styles.step}>
            <span className={styles.n}>{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
