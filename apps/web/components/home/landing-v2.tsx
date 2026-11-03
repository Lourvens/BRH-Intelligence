import { AgentJobs } from "./landing/agent-jobs";
import { Closing } from "./landing/closing";
import { CorpusWorkspace } from "./landing/corpus-workspace";
import { Faq } from "./landing/faq";
import { LandingFooter } from "./landing/footer";
import { GraphSection } from "./landing/graph-section";
import { Hero } from "./landing/hero";
import { Method } from "./landing/method";
import { ProofStrip } from "./landing/proof-strip";
import { Provenance } from "./landing/provenance";
import { LandingMotionCues } from "./landing/motion-cues";

export function ResearchLandingV2() {
  return (
    <div className="brh-home">
      <LandingMotionCues />
      <main>
        <Hero />
        <ProofStrip />
        <AgentJobs />
        <CorpusWorkspace />
        <GraphSection />
        <Method />
        <Provenance />
        <Faq />
        <Closing />
      </main>
      <LandingFooter />
    </div>
  );
}
