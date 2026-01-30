export function ActivityFeed() {
  const activities = [
    { type: "Balance", amount: "1,250", unit: "credits" },
    { type: "Payment Received", amount: "25", unit: "credits" },
    { type: "Transfer Private", amount: "0.24", unit: "credits" },
    { type: "Payment Received", amount: "50", unit: "credits" },
    { type: "Transfer Private", amount: "0.15", unit: "credits" },
    { type: "Receipt Created", amount: "—", unit: "" },
    { type: "Payment Received", amount: "10", unit: "credits" },
    { type: "Transfer Private", amount: "0.33", unit: "credits" },
    { type: "Transfer Private", amount: "0.28", unit: "credits" },
    { type: "Payment Received", amount: "25", unit: "credits" },
    { type: "Transfer Private", amount: "0.24", unit: "credits" },
    { type: "Receipt Revealed", amount: "—", unit: "" },
    { type: "Subscription", amount: "10", unit: "credits" },
    { type: "Transfer Private", amount: "0.33", unit: "credits" },
    { type: "Customer Acquired", amount: "50", unit: "credits" },
  ];

  return (
    <section className="landing-activity">
      <div className="landing-activity-container">
        <div className="landing-activity-left">
          <span className="landing-activity-badge">Now on Testnet</span>
          <h3 className="landing-activity-title">A realtime view of your private payments</h3>
          <p className="landing-activity-desc">
            Track payments, receipts & selective disclosure in realtime. Full privacy with programmable transparency.
          </p>
          <a href="#docs" className="landing-btn landing-btn-ghost">
            Read the docs
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
        <div className="landing-activity-right">
          <div className="landing-activity-feed">
            <h4 className="landing-activity-feed-title">Activity</h4>
            <div className="landing-activity-feed-balance">
              <span>Balance</span>
              <span className="landing-activity-feed-amount">1,250 credits</span>
            </div>
            <div className="landing-activity-feed-list">
              {activities.map((a, i) => (
                <div key={i} className="landing-activity-item">
                  <div className="landing-activity-item-content">
                    <h5>{a.type}</h5>
                    <span className="landing-activity-item-amount">{a.amount} {a.unit}</span>
                  </div>
                  <div className="landing-activity-item-icon">◆</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
