import { CorpusSection } from "@/components/home/corpus-section";
import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { LimitsSection } from "@/components/home/limits-section";
import { MethodSection } from "@/components/home/method-section";
import { QuestionsSection } from "@/components/home/questions-section";
import { MotionRoot } from "@/components/motion/motion-root";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="bg-bg">
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      <MotionRoot>
        <SiteHeader />

        <main id="contenu">
          <Hero />
          <CorpusSection />
          <QuestionsSection />
          <MethodSection />
          <LimitsSection />
          <FinalCta />
        </main>

        <SiteFooter />
      </MotionRoot>
    </div>
  );
}
