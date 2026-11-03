const steps = [
  ["01", "Posez votre question en français."],
  ["02", "L’agent cherche les passages et les données dans le corpus."],
  ["03", "Il compare, met en forme et cite."],
  ["04", "Vous ouvrez chaque source à la page citée."],
];

export function Method() {
  return (
    <section className="section method-section" id="methode">
      <div className="method-title">
        <p className="eyebrow">
          <span />
          LA MÉTHODE
        </p>
        <h2>
          De la question
          <br />à la source.
        </h2>
      </div>
      <div className="steps">
        {steps.map(([number, text], index) => (
          <div className="step" key={number}>
            <div className="step-top">
              <span>{number}</span>
              {index < steps.length - 1 && <i aria-hidden="true" />}
            </div>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <p className="method-note">
        Le corpus se parcourt aussi sans l’agent : recherche, filtres, lecteur
        page par page, entités et graphe.
      </p>
    </section>
  );
}
