import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { FeatureCards } from "./FeatureCards";
import { ActivityFeed } from "./ActivityFeed";
import { CodeSection } from "./CodeSection";
import { FeaturedQuote } from "./FeaturedQuote";
import { MerchantSection } from "./MerchantSection";
import { Testimonials } from "./Testimonials";
import { PricingSection } from "./PricingSection";
import { Footer } from "./Footer";

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Navbar />
      </header>
      <main className="landing-main">
        <section className="landing-hero-wrapper">
          <Hero />
          <FeatureCards />
        </section>
        <ActivityFeed />
        <CodeSection />
        <FeaturedQuote />
        <MerchantSection />
        <Testimonials />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
