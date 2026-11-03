import Link from "next/link";

import { LandingIcon } from "./icons";

const INFLATION_DOC =
  "/documents/note-mensuelle-dinflation-du-mois-de-novembre-2025?page=3";

function SearchPreview() {
  return (
    <div className="search-preview">
      <div className="mini-search">
        <LandingIcon name="search" size={17} />
        <span>inflation annuelle</span>
        <kbd>⌘ K</kbd>
      </div>
      <div className="filter-row">
        <b>Famille</b>
        <span>Année : 2025</span>
        <span>Entité</span>
      </div>
      <Link
        className="result-line"
        href="/brh-corpus?q=inflation%20annuelle"
      >
        <span>
          <LandingIcon name="file" size={16} />
        </span>
        <div>
          <strong>Note mensuelle d’inflation</strong>
          <small>Passages correspondants dans le corpus</small>
        </div>
        <b>
          <LandingIcon name="arrow" size={16} />
        </b>
      </Link>
    </div>
  );
}

function ReaderPreview() {
  return (
    <div className="reader-preview">
      <div className="reader-top">
        <span>NOTE MENSUELLE</span>
        <a className="reader-open" href={INFLATION_DOC}>
          Ouvrir le PDF ↗
        </a>
      </div>
      <span className="reader-page">PAGE 03</span>
      <h4>Évolution de l’inflation</h4>
      <p>
        Au cours du mois de novembre, l’évolution observée porte le taux
        d’inflation en glissement annuel à <mark>28,3 %</mark>.
      </p>
      <div className="text-rule wide" />
      <div className="text-rule" />
      <div className="text-rule short" />
      <span className="citation-pin">03</span>
    </div>
  );
}

export function CorpusWorkspace() {
  return (
    <section className="corpus-section" id="corpus">
      <div className="section corpus-inner">
        <div className="transition-line">
          <span>L’agent est la voie rapide.</span>
          <strong>Le corpus est la profondeur.</strong>
          <span>Les deux sont ouverts.</span>
        </div>
        <div className="corpus-heading">
          <div>
            <p className="eyebrow">
              <span />
              LE CORPUS
            </p>
            <h2>
              Tout le corpus.
              <br />
              Une seule entrée.
            </h2>
          </div>
          <p>
            Cherchez dans l’ensemble des publications, filtrez par famille,
            année ou entité, lisez la page exacte et suivez les connexions.
          </p>
        </div>
        <div className="bento-grid">
          <article className="bento-card search-card">
            <div className="bento-copy">
              <i>
                <LandingIcon name="search" />
              </i>
              <div>
                <h3>
                  <Link href="/brh-corpus" className="hover:text-navy-ink">
                    Chercher dans tout le corpus
                  </Link>
                </h3>
                <p>Un mot, une famille, une année, une entité.</p>
              </div>
            </div>
            <SearchPreview />
          </article>
          <article className="bento-card collections-card">
            <div className="bento-copy">
              <i>
                <LandingIcon name="book" />
              </i>
              <div>
                <h3>
                  <Link href="/brh-corpus" className="hover:text-navy-ink">
                    Des collections groupées
                  </Link>
                </h3>
                <p>Chaque famille garde son contexte.</p>
              </div>
            </div>
            <div className="collection-stack">
              <Link href="/brh-corpus?family=circular">
                <span>
                  Circulaires
                  <br />& avis
                </span>
                <LandingIcon name="arrow" />
              </Link>
              <Link href="/brh-corpus?family=inflation">
                <span>
                  Conjoncture
                  <br />& inflation
                </span>
                <LandingIcon name="arrow" />
              </Link>
              <Link href="/brh-corpus?family=annual-report">
                <span>
                  Rapports
                  <br />& bilans
                </span>
                <LandingIcon name="arrow" />
              </Link>
            </div>
          </article>
          <article className="bento-card reader-card">
            <div className="bento-copy">
              <i>
                <LandingIcon name="file" />
              </i>
              <div>
                <h3>
                  <Link href="/brh-corpus" className="hover:text-navy-ink">
                    Lire la page exacte
                  </Link>
                </h3>
                <p>
                  Le Markdown page par page et le PDF officiel, côte à côte.
                </p>
              </div>
            </div>
            <ReaderPreview />
          </article>
        </div>
        <p className="catalog-note">
          Mesures du catalogue. Ni couverture exhaustive, ni flux en temps réel.
          Le graphe est une aide à l’exploration, pas une cartographie complète
          des relations.
        </p>
      </div>
    </section>
  );
}
