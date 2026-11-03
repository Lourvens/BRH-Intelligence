import { INFLATION_DEMO_DOCUMENT } from "@/lib/landing/demo-content";

import { LandingIcon } from "./icons";

export function Provenance() {
  return (
    <section className="provenance-section" id="sources">
      <div className="section provenance-grid">
        <div className="document-preview">
          <div className="paper-edge">
            <span>BRH</span>
            <small>
              NOTE MENSUELLE D’INFLATION
              <br />
              NOVEMBRE 2025
            </small>
          </div>
          <div className="paper-content">
            <span className="page-no">03</span>
            <p className="paper-kicker">ÉVOLUTION DE L’INFLATION</p>
            <h3>Analyse mensuelle</h3>
            <p>
              En novembre 2025, l’inflation annuelle s’est décélérée, passant de
              32,2 % en octobre à <mark>28,3 %</mark>.
            </p>
            <div className="paper-lines">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="paper-source">
              <span />
              Note mensuelle d’inflation — novembre 2025 · <b>p. 3</b>
            </div>
            <a href={INFLATION_DEMO_DOCUMENT}>
              Ouvrir la page dans le corpus{" "}
              <LandingIcon name="arrow" size={15} />
            </a>
          </div>
        </div>
        <div className="provenance-copy">
          <p className="eyebrow gold">
            <span />
            LA PROVENANCE
          </p>
          <h2>
            Une réponse sans source
            <br />
            n’est pas une réponse.
          </h2>
          <p className="lead">
            Chaque réponse renvoie au document et à la page. Si le corpus ne
            contient pas la réponse, l’agent le dit.
          </p>
          <div className="assurance-list">
            <div>
              <span>
                <LandingIcon name="file" />
              </span>
              <div>
                <h3>Document + page</h3>
                <p>Le passage reste localisé dans le PDF officiel.</p>
              </div>
            </div>
            <div>
              <span>
                <LandingIcon name="shield" />
              </span>
              <div>
                <h3>Refus explicite</h3>
                <p>Pas de passage pertinent, pas de réponse inventée.</p>
              </div>
            </div>
            <div>
              <span>FR</span>
              <div>
                <h3>Français, sources publiques</h3>
                <p>Publications de la BRH, sans contenu externe.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
