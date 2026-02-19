export function MerchantSection() {
  return (
    <section className="landing-merchant">
      <div className="landing-merchant-container">
        <div className="landing-merchant-left">
          <span className="landing-merchant-badge">Built for simplicity</span>
          <h2 className="landing-merchant-title">Private payments made simple</h2>
          <a href="#integrate" className="landing-btn landing-btn-primary">
            Integrate StealthPay
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
        <div className="landing-merchant-right">
          <div className="landing-merchant-card">
            <h3>StealthPay on Aleo</h3>
            <p>Forget all about payment privacy. We handle it all with zero-knowledge proofs.</p>
            <ul>
              <li>✓ Private value transfer</li>
              <li>✓ Selective disclosure</li>
              <li>✓ Private receipt records</li>
            </ul>
            <a href="#docs" className="landing-btn landing-btn-ghost">
              Learn more
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
          <div className="landing-merchant-visual">
            <div className="landing-merchant-visual-placeholder">
              <span>stealthpay.aleo</span>
              <span>Aleo Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
