import { LandingIcon } from "./icons";

export function AgentJobs() {
  return (
    <section className="section jobs-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span />
            L’AGENT
          </p>
          <h2>
            Ce que l’agent fait
            <br />
            avec le corpus.
          </h2>
        </div>
        <p>Trois façons de partir d’une question, sans perdre la source.</p>
      </div>
      <div className="jobs-grid">
        <article className="job-card series-card">
          <div className="card-number">01</div>
          <div className="job-icon chart-icon">
            <svg viewBox="0 0 64 64" aria-hidden>
              <path d="M9 49c12-2 13-18 23-18s10 9 18 7 7-18 7-18" />
              <circle cx="57" cy="20" r="4" />
            </svg>
          </div>
          <h3>Suivre une série</h3>
          <p>
            Faites apparaître une évolution, puis ouvrez la note qui la
            documente.
          </p>
          <div className="micro-chart">
            <span>JAN.</span>
            <svg viewBox="0 0 300 72" aria-hidden>
              <path d="M3 58c45-8 55-25 92-18s54-31 94-19 66 22 108-6" />
              <circle cx="297" cy="15" r="4" />
            </svg>
            <span>NOV.</span>
          </div>
        </article>
        <article className="job-card compare-card">
          <div className="card-number">02</div>
          <div className="job-icon compare-icon">
            <span>23</span>
            <i />
            <span>24</span>
          </div>
          <h3>Comparer deux périodes</h3>
          <p>Confrontez deux publications et gardez chaque source.</p>
          <div className="comparison-bars">
            <i style={{ width: "72%" }} />
            <i style={{ width: "52%" }} />
          </div>
        </article>
        <article className="job-card find-card">
          <div className="card-number">03</div>
          <div className="job-icon page-icon">
            <LandingIcon name="file" size={34} />
            <b>p. 3</b>
          </div>
          <h3>Retrouver un texte</h3>
          <p>Circulaires, avis, rapports : arrivez à la page exacte.</p>
          <div className="citation-line">
            <span />
            Passage localisé <LandingIcon name="arrow" size={15} />
          </div>
        </article>
      </div>
    </section>
  );
}
