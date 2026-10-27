"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const examples = [
  {
    id: "explorer",
    label: "Explorer",
    question: "Par où commencer une recherche sur l’inflation ?",
    answer:
      "Une piste : retrouver les notes d’inflation, choisir une période, puis lire les passages dans leur contexte.",
    query: "inflation",
    action: "Rechercher les notes d’inflation",
  },
  {
    id: "comparer",
    label: "Comparer",
    question: "Comment suivre l’évolution de la politique monétaire ?",
    answer:
      "Une piste : rassembler les publications de plusieurs périodes et confronter leurs analyses en conservant chaque source.",
    query: "politique monétaire",
    action: "Rechercher les publications",
  },
  {
    id: "relier",
    label: "Relier",
    question: "Quels documents parlent de supervision bancaire ?",
    answer:
      "Une piste : partir du sujet, consulter les publications correspondantes et explorer les entités qui y sont mentionnées.",
    query: "supervision bancaire",
    action: "Explorer ce sujet",
  },
];

export function AgentPreview() {
  const [active, setActive] = useState("explorer");
  const reduced = useReducedMotion();
  const item = examples.find((example) => example.id === active)!;
  return (
    <div className="landing-agent-preview">
      <div className="landing-preview-top">
        <span>
          <Sparkles size={16} aria-hidden /> Assistant de recherche
        </span>
        <span className="landing-preview-label">
          Aperçu · intégration à venir
        </span>
      </div>
      <Tabs value={active} onValueChange={setActive}>
        <TabsList aria-label="Exemples de recherche" className="m-5 mb-0">
          {examples.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {active === item.id && (
                <motion.span
                  aria-hidden
                  className="landing-tab-indicator"
                  layoutId={reduced ? undefined : "landing-agent-tab"}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="landing-tab-label">{item.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent
          value={active}
          forceMount
          className="landing-preview-content"
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={active}
              initial={reduced ? false : { opacity: 0.5, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduced ? 0 : 0.16 }}
            >
              <p className="landing-user-question">{item.question}</p>
              <div className="landing-agent-answer">
                <span className="landing-agent-avatar">
                  <Sparkles size={17} aria-hidden />
                </span>
                <div>
                  <strong>De la question aux documents.</strong>
                  <p>{item.answer}</p>
                </div>
              </div>
              <Link
                className="landing-source-link"
                href={`/brh-corpus?q=${encodeURIComponent(item.query)}`}
              >
                <BookOpen size={18} aria-hidden />
                <span>
                  {item.action}
                  <small>Ouvrir une recherche réelle dans le corpus</small>
                </span>
                <ArrowRight size={17} aria-hidden />
              </Link>
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
      <p className="landing-preview-note">
        Exemples éditoriaux, sans réponse générée en direct.
      </p>
    </div>
  );
}
