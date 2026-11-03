"use client";

import { useLandingMotionCues } from "@/lib/hooks/use-landing-motion";

import { AgentJobs } from "./agent-jobs";
import { Closing } from "./closing";
import { CorpusWorkspace } from "./corpus-workspace";
import { Faq } from "./faq";
import { LandingFooter } from "./footer";
import { GraphSection } from "./graph-section";
import { Hero } from "./hero";
import { Method } from "./method";
import { ProofStrip } from "./proof-strip";
import { Provenance } from "./provenance";

export function LandingPage() {
  useLandingMotionCues();
  return (
    <div className="brh-home">
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
