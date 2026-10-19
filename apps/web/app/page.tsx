import { AccessCta } from "@/components/home/access-cta";
import { ComparisonSection } from "@/components/home/comparison-section";
import { CorpusSection } from "@/components/home/corpus-section";
import { FaqSection } from "@/components/home/faq-section";
import { Hero } from "@/components/home/hero";
import { PipelineSection } from "@/components/home/pipeline-section";
import { UsagesSection } from "@/components/home/usages-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader />
      <main id="contenu">
        <Hero />
        <PipelineSection />
        <CorpusSection />
        <UsagesSection />
        <ComparisonSection />
        <FaqSection />
        <AccessCta />
      </main>
      <SiteFooter />
    </div>
  );
}
