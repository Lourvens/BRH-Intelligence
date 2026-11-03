import { LandingIcon } from "./icons";

export function GraphSectionHeading() {
  return (
    <div className="graph-section-heading">
      <div>
        <p className="eyebrow">
          <span />
          LE GRAPHE · RELIER LES SOURCES
        </p>
        <h2>Un document. Tout un réseau de pistes.</h2>
      </div>
      <div>
        <p>
          Suivez les institutions, les circulaires, les indicateurs et les
          documents qui se répondent. Chaque lien garde sa source.
        </p>
        <a href="/brh-corpus/graph">
          Ouvrir le graphe complet <LandingIcon name="arrow" size={15} />
        </a>
      </div>
    </div>
  );
}
