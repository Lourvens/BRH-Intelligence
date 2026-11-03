"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const faqs = [
  [
    "D’où viennent les documents ?",
    "Des publications officielles de la BRH publiées sur brh.ht. Le corpus est en français et aucun contenu externe n’est ajouté.",
  ],
  [
    "Comment vérifier une réponse ?",
    "Chaque réponse cite le document et la page. Le lien ouvre le PDF officiel à la page correspondante.",
  ],
  [
    "Et si le corpus ne contient pas la réponse ?",
    "L’agent refuse explicitement plutôt que d’inventer une réponse.",
  ],
  [
    "Le corpus est-il à jour ?",
    "C’est une archive mise à jour lors des synchronisations. Ce n’est pas un flux en temps réel.",
  ],
  [
    "Puis-je explorer sans l’assistant ?",
    "Oui. La recherche, les filtres, le lecteur, les entités et le graphe sont accessibles directement.",
  ],
  ["En quelle langue sont les documents ?", "En français."],
];

export function Faq() {
  const [open, setOpen] = useState(0);
  const [pointerChange, setPointerChange] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <section className="section faq-section">
      <div className="faq-heading">
        <p className="eyebrow">
          <span />
          QUESTIONS FRÉQUENTES
        </p>
        <h2>
          Pour chercher
          <br />
          avec confiance.
        </h2>
        <p>Le fonctionnement, les sources et les limites du corpus.</p>
      </div>
      <div className="faq-list">
        {faqs.map(([question, answer], index) => {
          const isOpen = open === index;

          return (
            <div className={`faq-item ${isOpen ? "open" : ""}`} key={question}>
              <button
                id={`faq-trigger-${index}`}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${index}`}
                onClick={(event) => {
                  setPointerChange(event.detail > 0);
                  setOpen(isOpen ? -1 : index);
                }}
              >
                <span>{question}</span>
                <i aria-hidden="true">{isOpen ? "−" : "+"}</i>
              </button>
              <motion.div
                className="faq-answer"
                initial={false}
                animate={{
                  height: isOpen ? "auto" : 0,
                  opacity: isOpen ? 1 : 0,
                }}
                transition={{
                  duration: reducedMotion || !pointerChange ? 0 : 0.2,
                  ease: [0.23, 1, 0.32, 1],
                }}
                inert={!isOpen}
                aria-hidden={!isOpen}
                id={`faq-panel-${index}`}
                role="region"
                aria-labelledby={`faq-trigger-${index}`}
              >
                <p>{answer}</p>
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
