import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PrivacyModelSection from "@/components/landing/PrivacyModelSection";
import CTASection from "@/components/landing/CTASection";
import FooterSection from "@/components/landing/FooterSection";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <StatsSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PrivacyModelSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}
