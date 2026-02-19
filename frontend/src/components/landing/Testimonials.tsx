export function Testimonials() {
  const testimonials = [
    {
      quote: "The future of private payments is here. StealthPay brings programmable privacy to Web3.",
      author: "Web3 Builder",
      role: "Aleo Community",
    },
    {
      quote: "Open source + zero-knowledge + great DX. If you're building private payments, try StealthPay.",
      author: "Privacy Advocate",
      role: "DeFi Protocol",
    },
    {
      quote: "Selective disclosure changes everything. Merchants get receipts without compromising payer privacy.",
      author: "Merchant Lead",
      role: "Web3 Commerce",
    },
    {
      quote: "StealthPay is the cutting edge of how private payments might work in the future.",
      author: "ZK Researcher",
      role: "Aleo Ecosystem",
    },
    {
      quote: "There has never been a better time to build private payments. StealthPay makes it easy.",
      author: "Protocol Dev",
      role: "Layer 2",
    },
    {
      quote: "I switched to StealthPay for private receipts. Best decision ever.",
      author: "dApp Founder",
      role: "Web3 Studio",
    },
    {
      quote: "We switched because of the killer privacy model. Also love that it's on Aleo.",
      author: "CTO",
      role: "Privacy-first App",
    },
    {
      quote: "You can tell StealthPay is building privacy-first.",
      author: "Security Lead",
      role: "Crypto Startup",
    },
    {
      quote: "StealthPay has one of the BEST onboarding flows for a payment protocol. Took me less than 20 minutes.",
      author: "Integrator",
      role: "Web3 Agency",
    },
  ];

  return (
    <section className="landing-testimonials">
      <div className="landing-testimonials-container">
        <span className="landing-testimonials-badge">Testimonials</span>
        <h2 className="landing-testimonials-title">Why builders love StealthPay</h2>
        <div className="landing-testimonials-grid">
          {testimonials.map((t, i) => (
            <a key={i} href="#" className="landing-testimonial-card">
              <p className="landing-testimonial-quote">{t.quote}</p>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar" />
                <div>
                  <span className="landing-testimonial-name">{t.author}</span>
                  <span className="landing-testimonial-role">{t.role}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
