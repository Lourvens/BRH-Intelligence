import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  FileText,
  Network,
  Search,
  Sparkles,
} from "lucide-react";
import { CorpusCount } from "@/components/corpus/stats-provider";
import { AgentPreview } from "./agent-preview";
import { ConstellationMotion, LandingReveal } from "./landing-motion";
import { demo } from "./hero/data";

const subjects = [
  "Inflation",
  "Politique monétaire",
  "Supervision bancaire",
  "Inclusion financière",
];
const collections = [
  {
    number: "01",
    title: "Circulaires & avis",
    copy: "Retrouvez les textes qui encadrent l’activité bancaire et financière.",
    family: "circular",
    icon: FileText,
  },
  {
    number: "02",
    title: "Conjoncture & inflation",
    copy: "Consultez les publications pour situer les évolutions économiques.",
    family: "inflation",
    icon: Search,
  },
  {
    number: "03",
    title: "Rapports & bilans",
    copy: "Prenez du recul avec les analyses et les publications annuelles.",
    family: "annual-report",
    icon: BookOpen,
  },
];

export function ResearchLanding() {
  return (
    <div className="research-landing">
      <section className="landing-hero" id="apercu">
        <div className="landing-hero-grid landing-wrap">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">
              <span className="landing-status-dot" /> BRH CORPUS · L’ESPACE DE
              RECHERCHE
            </p>
            <h1>
              L’économie
              <br />
              haïtienne,
              <br />
              <span>à la source.</span>
            </h1>
            <p className="landing-intro">
              Les publications de la BRH, réunies pour mieux les explorer.
              Retrouvez un document, suivez ses connexions et découvrez
              l’assistant IA qui accompagnera vos recherches.
            </p>
            <div className="landing-actions">
              <Link className="landing-button" href="/brh-corpus">
                Explorer le corpus <ArrowRight size={18} aria-hidden />
              </Link>
              <a className="landing-text-link" href="#assistant">
                Découvrir l’assistant <Sparkles size={17} aria-hidden />
              </a>
            </div>
            <p className="landing-hero-note">
              Publications publiques. Lecture en français. Sources à portée de
              main.
            </p>
          </div>
          <div className="landing-hero-art">
            <div className="landing-art-halo" aria-hidden />
            <ConstellationMotion>
              <Image
                src="/illustrations/corpus-constellation.svg"
                width={720}
                height={680}
                priority
                alt="Des publications reliées à un assistant de recherche, à des sujets et à leurs pages sources."
              />
            </ConstellationMotion>
            <span className="landing-art-caption">
              LA DOCUMENTATION DEVIENT UN TERRAIN D’EXPLORATION
            </span>
          </div>
        </div>
        <div className="landing-hero-bottom landing-wrap">
          <span>Lire. Questionner. Relier.</span>
          <a href="#rechercher">
            Trouver votre point de départ <ArrowDown size={15} aria-hidden />
          </a>
        </div>
      </section>

      <section id="rechercher" className="landing-topics landing-wrap">
        <p className="landing-eyebrow">PARTIR D’UNE IDÉE</p>
        <div className="landing-section-heading">
          <h2>Quel sujet souhaitez-vous éclairer ?</h2>
          <p>
            Un mot, une question, une publication : chaque recherche a son point
            de départ.
          </p>
        </div>
        <div className="landing-topic-links">
          {subjects.map((subject) => (
            <Link
              key={subject}
              href={`/brh-corpus?q=${encodeURIComponent(subject)}`}
            >
              <Search size={16} aria-hidden />
              {subject}
              <ArrowRight size={16} aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section id="assistant" className="landing-agent-section">
        <div className="landing-wrap landing-two-columns">
          <LandingReveal>
            <p className="landing-eyebrow">
              <Sparkles size={15} aria-hidden /> VOTRE FUTUR PARTENAIRE DE
              RECHERCHE
            </p>
            <h2>
              Une question.
              <br />
              <span className="landing-muted-heading">
                De nouvelles pistes.
              </span>
            </h2>
            <p className="landing-body">
              Vous avez le sujet. L’assistant IA est conçu pour vous aider à
              avancer : retrouver des passages, rapprocher des publications et
              revenir aux sources.
            </p>
            <ol className="landing-agent-steps">
              <li>
                <span>01</span>Formulez votre question en français.
              </li>
              <li>
                <span>02</span>Explorez les documents et passages proposés.
              </li>
              <li>
                <span>03</span>Vérifiez la source et poursuivez votre recherche.
              </li>
            </ol>
            <Link href="/assistant" className="landing-text-link">
              Découvrir l’espace assistant <ArrowRight size={17} aria-hidden />
            </Link>
            <p className="landing-small-note">
              L’intégration de l’agent est en préparation. L’aperçu illustre le
              parcours prévu.
            </p>
          </LandingReveal>
          <AgentPreview />
        </div>
      </section>

      <section id="connexions" className="landing-connections landing-wrap">
        <div className="landing-section-heading">
          <div>
            <p className="landing-eyebrow">CHANGER DE PERSPECTIVE</p>
            <h2>
              Un document.
              <br />
              Tout un réseau de pistes.
            </h2>
          </div>
          <div>
            <p>
              Une institution, un sujet, une publication : explorez les mentions
              et les relations documentées dans le graphe, puis retrouvez les
              éléments qui les soutiennent.
            </p>
            <Link className="landing-text-link" href="/brh-corpus/graph">
              Explorer le graphe <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </div>
        <LandingReveal className="landing-network-art">
          <Image
            src="/illustrations/corpus-constellation.png"
            width={1440}
            height={1360}
            alt="Illustration du réseau de recherche : documents, assistant et sujets reliés autour des sources."
            sizes="(max-width: 767px) 100vw, 800px"
          />
          <div className="landing-network-label">
            <Network size={18} aria-hidden />
            <span>
              Suivez les connexions.
              <br />
              <small>Revenez toujours aux documents.</small>
            </span>
          </div>
          <span className="landing-illustration-note">
            Illustration du principe · disponibilité selon les données du corpus
          </span>
        </LandingReveal>
      </section>

      <section id="sources" className="landing-source-section">
        <div className="landing-wrap landing-two-columns">
          <div className="landing-paper">
            <div className="landing-paper-head">
              <span>PUBLICATION · EXTRAIT</span>
              <span>p. {demo.page}</span>
            </div>
            <p className="landing-eyebrow">{demo.documentCode}</p>
            <h3>
              Lire le chiffre.
              <br />
              Comprendre son contexte.
            </h3>
            <blockquote>« {demo.quote} »</blockquote>
            <div className="landing-paper-citation">
              <span className="landing-citation-mark">[1]</span>
              <div>
                {demo.source}
                <small>{demo.sourceMeta}</small>
              </div>
            </div>
            <Link href={demo.documentHref}>
              Lire la page dans le corpus <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <LandingReveal>
            <p className="landing-eyebrow">LE RÉFLEXE SOURCE</p>
            <h2>
              Le passage compte.
              <br />
              <span className="landing-muted-heading">Son contexte aussi.</span>
            </h2>
            <p className="landing-body">
              Un résultat de recherche n’est qu’un début. Ouvrez la publication,
              lisez les pages voisines et consultez le PDF original pour
              vérifier ce que le document dit réellement.
            </p>
            <div className="landing-source-principles">
              <p>
                <BookOpen size={20} aria-hidden />
                <span>
                  <strong>Une lecture qui garde le fil</strong>Le document et la
                  page restent vos repères.
                </span>
              </p>
              <p>
                <FileText size={20} aria-hidden />
                <span>
                  <strong>Le texte original à consulter</strong>La transcription
                  facilite la lecture ; le PDF permet de la vérifier.
                </span>
              </p>
            </div>
          </LandingReveal>
        </div>
      </section>

      <section id="collections" className="landing-collections landing-wrap">
        <div className="landing-section-heading">
          <div>
            <p className="landing-eyebrow">PRENDRE LE TEMPS D’APPROFONDIR</p>
            <h2>
              À chaque recherche,
              <br />
              ses publications.
            </h2>
          </div>
          <Link className="landing-text-link" href="/brh-corpus">
            Tout le catalogue <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
        <div className="landing-collection-grid">
          {collections.map((item) => (
              <LandingReveal key={item.number} interactive>
              <Link
                href={`/brh-corpus?family=${item.family}`}
                className="landing-collection-card"
              >
                <span className="landing-collection-top">
                  <item.icon size={25} aria-hidden />
                  <span>{item.number}</span>
                </span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <span className="landing-text-link">
                  Parcourir la collection <ArrowRight size={17} aria-hidden />
                </span>
              </Link>
            </LandingReveal>
          ))}
        </div>
        <div id="reperes" className="landing-measures">
          <div>
            <p className="landing-eyebrow">LE CORPUS EN REPÈRES</p>
            <p>Une archive qui s’enrichit au fil des mises à jour.</p>
          </div>
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
          <p className="landing-measure-note">
            Mesures du catalogue.
            <br />
            Ni couverture exhaustive, ni flux en temps réel.
          </p>
        </div>
      </section>

      <section className="landing-closing">
        <div className="landing-wrap">
          <p className="landing-eyebrow">LE PROCHAIN PAS VOUS APPARTIENT</p>
          <h2>
            Une source peut changer
            <br />
            votre compréhension.
          </h2>
          <p>Commencez par un sujet. Laissez les documents ouvrir la suite.</p>
          <div className="landing-actions">
            <Link className="landing-button" href="/brh-corpus">
              Commencer une recherche <ArrowRight size={18} aria-hidden />
            </Link>
            <Link className="landing-text-link" href="/assistant">
              Découvrir l’assistant IA <Sparkles size={17} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
