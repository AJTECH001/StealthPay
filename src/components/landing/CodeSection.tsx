export function CodeSection() {
  const leoCode = `transition make_payment(
  sender_record: credits.aleo/credits,
  amount: u64,
  merchant: address
) -> (Payment, credits.aleo/credits, credits.aleo/credits) {
  let (merchant_credits, change_credits) =
    credits.aleo/transfer_private(sender_record, merchant, amount);
  
  let payment: Payment = Payment {
    owner: merchant,
    amount: amount,
    payer: self.caller,
  };
  
  return (payment, merchant_credits, change_credits);
}`;

  return (
    <section className="landing-code">
      <div className="landing-code-container">
        <div className="landing-code-header">
          <span className="landing-code-badge">Aleo SDK</span>
          <h2 className="landing-code-title">Integrate in under a minute</h2>
          <div className="landing-code-tabs">
            <button className="landing-code-tab active">Leo</button>
            <button className="landing-code-tab">React</button>
            <button className="landing-code-tab">TypeScript</button>
          </div>
        </div>
        <div className="landing-code-content">
          <div className="landing-code-info">
            <h3>Leo Program</h3>
            <p>Private payments with selective disclosure. One transition, full privacy.</p>
            <ul>
              <li>✓ Private value transfer</li>
              <li>✓ Merchant receipt records</li>
              <li>✓ Selective disclosure ready</li>
              <li>✓ Aleo Testnet deployed</li>
            </ul>
            <a href="#docs" className="landing-btn landing-btn-ghost">
              Learn More
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
          <div className="landing-code-block">
            <pre><code>{leoCode}</code></pre>
          </div>
        </div>
      </div>
    </section>
  );
}
