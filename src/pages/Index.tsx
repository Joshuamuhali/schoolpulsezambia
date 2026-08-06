import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CommunitySection from "@/components/landing/CommunitySection";
import BeliefsSection from "@/components/landing/BeliefsSection";
import CTASection from "@/components/landing/CTASection";
import FAQSection from "@/components/landing/FAQSection";
import NotSureSection from "@/components/landing/NotSureSection";
import Footer from "@/components/landing/Footer";

const Index = () => (
  <div className="min-h-screen">
    <HeroSection />
    <FeaturesSection />
    <CommunitySection />
    <BeliefsSection />
    <CTASection />
    <FAQSection />
    <NotSureSection />
    <Footer />
  </div>
);

export default Index;