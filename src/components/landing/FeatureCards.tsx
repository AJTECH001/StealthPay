export function FeatureCards() {
  const features = [
    {
      title: "Private Payments & Receipts",
      description: "Fully private value transfer with zero-knowledge proofs. Private Payment records for merchants with selective disclosure.",
      link: "#",
      tags: ["Private Transfer", "ZK Proofs", "Merchant Receipts", "Aleo Credits", "On-chain"],
    },
    {
      title: "Selective Disclosure",
      description: "Merchants own private receipt records. Reveal only what's needed for compliance, refunds, or analytics.",
      link: "#",
      tags: [
        { name: "Merchant A", plan: "Premium", period: "Monthly" },
        { name: "Merchant B", plan: "Pro", period: "Monthly" },
        { name: "Merchant C", plan: "Enterprise", period: "Yearly" },
      ],
      isAvatars: true,
    },
    {
      title: "Aleo Program",
      description: "Deployed on Aleo testnet. Upgradable under admin policy. Built with Leo.",
      link: "#",
      tags: [
        { label: "Program ID", value: "stealthpay.aleo" },
        { label: "Network", value: "Aleo Testnet" },
        { label: "Status", value: "Deployed" },
      ],
      isStats: true,
    },
  ];

  return (
    <section className="landing-feature-cards">
      <div className="landing-feature-cards-grid">
        {features.map((feature, i) => (
          <a key={i} href={feature.link} className="landing-feature-card">
            <div className="landing-feature-card-content">
              <h3 className="landing-feature-card-title">{feature.title}</h3>
              <p className="landing-feature-card-desc">{feature.description}</p>
              <div className="landing-feature-card-tags">
                {feature.isAvatars ? (
                  (feature.tags as { name: string; plan: string; period: string }[]).map((t, j) => (
                    <div key={j} className="landing-feature-avatar-row">
                      <div className="landing-feature-avatar" />
                      <div>
                        <span className="landing-feature-avatar-name">{t.name}</span>
                        <span className="landing-feature-avatar-plan">{t.plan} • {t.period}</span>
                      </div>
                    </div>
                  ))
                ) : feature.isStats ? (
                  (feature.tags as { label: string; value: string }[]).map((t, j) => (
                    <div key={j} className="landing-feature-stat">
                      <span className="landing-feature-stat-label">{t.label}</span>
                      <span className="landing-feature-stat-value">{t.value}</span>
                    </div>
                  ))
                ) : (
                  (feature.tags as string[]).map((tag, j) => (
                    <span key={j} className="landing-feature-tag">{tag}</span>
                  ))
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
