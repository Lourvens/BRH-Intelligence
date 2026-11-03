import { CorpusCount } from "@/components/corpus/stats-provider";

import { LandingIcon } from "./icons";

export function ProofStrip() {
  return (
    <section className="proof-strip" aria-label="Le corpus en chiffres">
      <div className="proof-grid">
        <div>
          <strong>
            <CorpusCount metric="readable_documents" />
          </strong>
          <span>documents lisibles</span>
        </div>
        <div>
          <strong>
            <CorpusCount metric="readable_pages" />
          </strong>
          <span>pages lisibles</span>
        </div>
        <div className="proof-icon">
          <i>
            <LandingIcon name="book" />
          </i>
          <span>
            Sources publiques
            <br />
            <b>BRH</b>
          </span>
        </div>
        <div className="proof-icon">
          <i>
            <LandingIcon name="quote" />
          </i>
          <span>
            Réponses citées
            <br />
            <b>page par page</b>
          </span>
        </div>
      </div>
    </section>
  );
}
