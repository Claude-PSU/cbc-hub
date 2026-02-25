import Hero from "@/components/Hero";
import SocialProofBar from "@/components/SocialProofBar";
import MissionSection from "@/components/MissionSection";
import UpcomingEventBanner from "@/components/UpcomingEventBanner";
import FeaturesSection from "@/components/FeaturesSection";
import StatsSection from "@/components/StatsSection";
import NewsletterSection from "@/components/NewsletterSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <SocialProofBar />
      <MissionSection />
      <UpcomingEventBanner />
      <FeaturesSection />
      <StatsSection />
      <NewsletterSection />
    </>
  );
}
