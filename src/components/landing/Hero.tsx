import { WalletInteraction } from "./WalletInteraction";

export function Hero() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-content">
        <h1 className="landing-hero-title">
          Private payments. Selective disclosure.
        </h1>
        <p className="landing-hero-subtitle">
          Private payments on Aleo with programmable privacy. Zero-knowledge receipts for merchants.
        </p>
        <div className="landing-hero-actions">
          <button className="landing-btn landing-btn-primary">
            <span>Get Started</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <a href="#why" className="landing-btn landing-btn-ghost">
            Why StealthPay
          </a>
        </div>
        <WalletInteraction />
      </div>
    </section>
  );
}
