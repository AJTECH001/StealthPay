export function PricingSection() {
  const tiers = [
    { name: "Free", fee: "1%", price: "—", features: ["Private payments", "Merchant receipts", "Selective disclosure"] },
    { name: "Pro", fee: "0.5%", price: "10 credits/mo", features: ["All Free features", "50% lower fees", "Priority support"] },
    { name: "Enterprise", fee: "0.25%", price: "100 credits/mo", features: ["All Pro features", "75% lower fees", "Dedicated support"] },
  ];

  const features = [
    { label: "Private Value Transfer", stealthpay: true, traditional: false },
    { label: "Selective Disclosure", stealthpay: true, traditional: false },
    { label: "Zero-Knowledge Receipts", stealthpay: true, traditional: false },
    { label: "Protocol Fee (Stripe-style)", stealthpay: true, traditional: true },
    { label: "Subscription Tiers", stealthpay: true, traditional: true },
    { label: "Merchant Receipt Records", stealthpay: true, traditional: true },
    { label: "Full Privacy by Default", stealthpay: true, traditional: false },
  ];

  return (
    <section className="landing-pricing">
      <div className="landing-pricing-container">
        <div className="landing-pricing-header">
          <h2>Transparent Pricing</h2>
          <p>Protocol fee deducted before crediting merchant. Subscribe for lower rates.</p>
          <div className="landing-pricing-tiers">
            {tiers.map((tier, i) => (
              <div key={i} className="landing-pricing-tier">
                <h4>{tier.name}</h4>
                <span className="landing-pricing-tier-fee">{tier.fee} per tx</span>
                <span className="landing-pricing-tier-price">{tier.price}</span>
                <ul>
                  {tier.features.map((f, j) => (
                    <li key={j}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="landing-pricing-links">
            <a href="#docs" className="landing-btn landing-btn-ghost">Docs</a>
            <a href="#github" className="landing-btn landing-btn-ghost">
              StealthPay vs Traditional
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
        <div className="landing-pricing-table-wrapper">
          <table className="landing-pricing-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>StealthPay</th>
                <th>Traditional</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr key={i}>
                  <td>{f.label}</td>
                  <td>
                    {f.stealthpay ? (
                      <span className="landing-pricing-check">✓</span>
                    ) : (
                      <span className="landing-pricing-empty">—</span>
                    )}
                  </td>
                  <td>
                    {f.traditional ? (
                      <span className="landing-pricing-check">✓</span>
                    ) : (
                      <span className="landing-pricing-empty">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
