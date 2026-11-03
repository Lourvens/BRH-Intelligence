import { LandingIcon } from "./icons";
import { QuestionForm } from "./question-form";

export function Closing() {
  return (
    <section className="section closing-section">
      <div className="closing-panel">
        <div className="closing-copy">
          <p className="eyebrow light">
            <span />
            COMMENCER UNE RECHERCHE
          </p>
          <h2>
            Posez votre
            <br />
            première question.
          </h2>
          <p>
            Un agent intégré au corpus de la BRH, pour lire, comparer et citer.
          </p>
        </div>
        <QuestionForm
          id="closing-question"
          placeholder="Écrivez votre question en français…"
          variant="closing"
        >
          <a href="/brh-corpus">
            Explorer le corpus <LandingIcon name="arrow" size={15} />
          </a>
        </QuestionForm>
        <div className="closing-proof">
          <span />
          <p>Sources publiques · Réponses citées page par page.</p>
        </div>
      </div>
    </section>
  );
}
