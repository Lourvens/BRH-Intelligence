"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { LandingIcon } from "./icons";

const INFLATION_DOC =
  "/documents/note-mensuelle-dinflation-du-mois-de-novembre-2025?page=3";
const POLICY_SEARCH = "/brh-corpus?q=politique%20mon%C3%A9taire";
const RESERVES_SEARCH = "/brh-corpus?q=r%C3%A9serves%20obligatoires";

const tabs = [
  "Suivre une série",
  "Comparer deux périodes",
  "Retrouver un texte",
];

function SourceChip({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a className="source-chip" href={href}>
      <span aria-hidden />
      {children}
      <LandingIcon name="arrow" size={14} />
    </a>
  );
}

function SeriesPanel() {
  return (
    <>
      <p className="demo-question">
        Quel était le taux d’inflation annuel en novembre 2025 ?
      </p>
      <div className="metric-row">
        <div>
          <strong>28,3 %</strong>
          <span>glissement annuel · novembre 2025</span>
        </div>
        <div className="trend-down">
          ↓ 3,9 pts <span>depuis octobre</span>
        </div>
      </div>
      <p className="serif-answer">
        En novembre 2025, l’inflation annuelle s’est décélérée, passant de 32,2
        % en octobre à 28,3 %.
      </p>
      <div className="chart-wrap">
        <svg
          viewBox="0 0 420 108"
          role="img"
          aria-label="Évolution mensuelle de l’inflation en 2025, baisse à 28,3 % en novembre"
        >
          <g className="grid-lines">
            <path d="M30 18H405M30 50H405M30 82H405" />
          </g>
          <path
            className="chart-area"
            d="M30 80C65 73 82 65 112 66S166 46 193 51s53-15 82-11 50-1 78 17 35 12 52 4V93H30Z"
          />
          <path
            className="chart-line"
            pathLength="1"
            d="M30 80C65 73 82 65 112 66S166 46 193 51s53-15 82-11 50-1 78 17 35 12 52 4"
          />
          <circle cx="405" cy="61" r="4" />
          <text x="30" y="105">
            JAN.
          </text>
          <text x="193" y="105">
            JUIN
          </text>
          <text x="376" y="105">
            NOV.
          </text>
        </svg>
        <span className="chart-label">28,3 %</span>
      </div>
      <SourceChip href={INFLATION_DOC}>
        Note mensuelle d’inflation — novembre 2025 <b>p. 3</b>
      </SourceChip>
      <a className="verified-footer" href={INFLATION_DOC}>
        Exemple vérifié <span>·</span> Ouvrir la page source{" "}
        <LandingIcon name="arrow" size={14} />
      </a>
    </>
  );
}

function ComparePanel() {
  return (
    <>
      <p className="demo-question">
        Comment la politique monétaire a-t-elle évolué entre 2023 et 2024 ?
      </p>
      <p className="serif-answer">
        Les publications décrivent une orientation adaptée au contexte de chaque
        période. La comparaison ci-dessous conserve les passages sources côte à
        côte.
      </p>
      <div className="compare-table">
        <div className="compare-head">
          <span>Élément documenté</span>
          <b>2023</b>
          <b>2024</b>
        </div>
        <div>
          <span>Cadre d’analyse</span>
          <b>Publication 2023</b>
          <b>Publication 2024</b>
        </div>
        <div>
          <span>Passage source</span>
          <em>Page citée</em>
          <em>Page citée</em>
        </div>
      </div>
      <SourceChip href={POLICY_SEARCH}>
        Rapport annuel 2023 <b>page citée</b>
      </SourceChip>
      <SourceChip href={POLICY_SEARCH}>
        Rapport annuel 2024 <b>page citée</b>
      </SourceChip>
      <a className="verified-footer" href={POLICY_SEARCH}>
        Exemple vérifié <span>·</span> Ouvrir les pages sources{" "}
        <LandingIcon name="arrow" size={14} />
      </a>
    </>
  );
}

function TextPanel() {
  return (
    <>
      <p className="demo-question">
        Quelles circulaires encadrent les réserves obligatoires ?
      </p>
      <a className="document-row" href={RESERVES_SEARCH}>
        <LandingIcon name="file" />
        <div>
          <strong>Circulaires & avis</strong>
          <span>Publication BRH · page citée</span>
        </div>
        <LandingIcon name="arrow" size={16} className="doc-arrow" />
      </a>
      <div className="excerpt-box">
        <span className="page-marker">PASSAGE LOCALISÉ</span>
        <p>
          « Le texte applicable précise les dispositions relatives aux{" "}
          <mark>réserves obligatoires</mark>… »
        </p>
        <small>Document BRH · p. citée</small>
      </div>
      <a className="verified-footer" href={RESERVES_SEARCH}>
        Exemple vérifié <span>·</span> Ouvrir le document{" "}
        <LandingIcon name="arrow" size={14} />
      </a>
    </>
  );
}

export function HeroDemo() {
  const [tab, setTab] = useState(0);
  const [pointerChange, setPointerChange] = useState(false);
  const reducedMotion = useReducedMotion();
  const direction = useRef(1);

  return (
    <div className="product-window">
      <div className="window-bar">
        <div className="demo-brand">
          <span>BI</span>
          <div>
            <strong>Agent BRH Intelligence</strong>
            <small>Analyse du corpus public</small>
          </div>
        </div>
        <span className="verified">
          <LandingIcon name="shield" size={12} /> réponse vérifiée
        </span>
      </div>
      <div
        className="demo-tabs"
        role="tablist"
        aria-label="Exemples de réponses"
      >
        {tabs.map((label, index) => (
          <button
            key={label}
            role="tab"
            id={`demo-tab-${index}`}
            aria-controls="demo-panel"
            tabIndex={tab === index ? 0 : -1}
            aria-selected={tab === index}
            onClick={(event) => {
              direction.current = index > tab ? 1 : -1;
              setPointerChange(event.detail > 0);
              setTab(index);
            }}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
              else if (event.key === "ArrowLeft")
                next = (index + tabs.length - 1) % tabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = tabs.length - 1;
              else return;
              event.preventDefault();
              setPointerChange(false);
              setTab(next);
              document.getElementById(`demo-tab-${next}`)?.focus();
            }}
          >
            {label}
            {tab === index && (
              <motion.span
                className="demo-tab-indicator"
                layoutId="hero-demo-tab"
                transition={{ duration: pointerChange && !reducedMotion ? 0.22 : 0, ease: [0.23, 1, 0.32, 1] }}
              />
            )}
          </button>
        ))}
      </div>
      <motion.div
        className="demo-panel"
        id="demo-panel"
        role="tabpanel"
        aria-labelledby={`demo-tab-${tab}`}
        key={tab}
        initial={pointerChange && !reducedMotion ? { opacity: 0, x: direction.current * 10 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="answer-card" data-tab={tab}>
          {tab === 0 && <SeriesPanel />}
          {tab === 1 && <ComparePanel />}
          {tab === 2 && <TextPanel />}
        </div>
      </motion.div>
    </div>
  );
}
