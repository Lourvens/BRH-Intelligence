import { ClosingCta } from "@/components/home/closing-cta";
import { CorpusSection } from "@/components/home/corpus-section";
import { Hero } from "@/components/home/hero";
import { LimitsSection } from "@/components/home/limits-section";
import { MethodSection } from "@/components/home/method-section";
import { QuestionsSection } from "@/components/home/questions-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader />
      <main id="contenu">
        <Hero />
        <CorpusSection />
        <QuestionsSection />
        <MethodSection />
        <LimitsSection />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
