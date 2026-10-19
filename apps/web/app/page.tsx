import { CorpusBento } from "@/components/home/corpus-bento";
import { Hero } from "@/components/home/hero";
import { InteractivePipeline } from "@/components/home/interactive-pipeline";
import { MetricsBanner } from "@/components/home/metrics-banner";
import { QuestionsShowcase } from "@/components/home/questions-showcase";
import { RadiantCta } from "@/components/home/radiant-cta";
import { TransparencySection } from "@/components/home/transparency-section";
import { MotionRoot } from "@/components/motion/motion-root";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-navy selection:text-white">
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      <MotionRoot>
        <SiteHeader />

        <main id="contenu">
          {/* 1. Hero with Aceternity Spotlight and Interactive Agent Console */}
          <Hero />

          {/* 2. Key Metrics Banner with Animated Counters */}
          <MetricsBanner />

          {/* 3. Corpus Bento Grid with Inflation Radar and OCR Scanner */}
          <CorpusBento />

          {/* 4. Interactive Pipeline Architecture with Animated Beams */}
          <InteractivePipeline />

          {/* 5. Questions & Citations with Card Spotlight and Category Filters */}
          <QuestionsShowcase />

          {/* 6. Transparency, Integrity & Strict Perimeter */}
          <TransparencySection />

          {/* 7. Radiant Aceternity Call to Action */}
          <RadiantCta />
        </main>

        <SiteFooter />
      </MotionRoot>
    </div>
  );
}
