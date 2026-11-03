import { HeroDemo } from "./hero-demo";
import { LandingIcon } from "./icons";
import { QuestionForm } from "./question-form";

export function Hero() {
  return (
    <section className="hero" id="agent">
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            BRH INTELLIGENCE · AGENT D’ANALYSE
          </p>
          <h1>
            L’agent d’analyse de <span>l’économie haïtienne.</span>
          </h1>
          <p className="hero-lead">
            Posez une question. Il lit les publications de la BRH, compare les
            documents, construit les graphiques et renvoie chaque réponse à sa
            page.
          </p>
          <QuestionForm
            id="hero-question"
            placeholder="Quel était le taux d’inflation en novembre 2025 ?"
            chips={[
              "Inflation en 2025",
              "Réserves obligatoires",
              "Politique monétaire 2023–2024",
            ]}
          />
          <div className="hero-links">
            <a href="/brh-corpus">
              Explorer le corpus <LandingIcon name="arrow" size={16} />
            </a>
            <span>Réponses citées · Sources publiques · Français</span>
          </div>
        </div>
        <div className="hero-product">
          <div className="product-glow" />
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
