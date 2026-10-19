"use client";

import { motion } from "framer-motion";
import { AlertCircle, Ban, CheckCircle2, Shield } from "lucide-react";

import {
  BankInstitutionIcon,
  ClockIcon,
  LanguageIcon,
  RefusalGateIcon,
  ShieldCheckIcon,
} from "@/components/illustrations/icons";
import { limitsSection } from "@/lib/content/home";

const perimeterItems = [
  {
    icon: LanguageIcon,
    title: "Corpus francophone exclusif",
    body: "L'ensemble des arrêtés, rapports et circulaires est analysé dans sa langue d'origine (français), évitant toute dérive de traduction.",
    tag: "Langue source",
  },
  {
    icon: ClockIcon,
    title: "Archive officielle, pas de flux temps réel",
    body: "Le corpus indexe les publications périodiques de la BRH, pas le carnet d'ordres ou les taux de change minute par minute.",
    tag: "Données arrêtées",
  },
  {
    icon: BankInstitutionIcon,
    title: "Documentation neutre, aucun conseil",
    body: "Les réponses apportent des éléments factuels sourcés ; elles ne constituent pas une recommandation financière ou juridique.",
    tag: "Informationnelle",
  },
  {
    icon: RefusalGateIcon,
    title: "Refus explicite",
    body: "Quand la réponse n'existe pas dans le corpus, l'agent le signale immédiatement plutôt que de simuler une certitude.",
    tag: "Refus explicite",
  },
];

export function TransparencySection() {
  return (
    <section id="limites" className="scroll-mt-20 py-20 bg-bg border-t border-border">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-2 text-ink-muted">
            <span className="size-1.5 rounded-full bg-azure" />
            {limitsSection.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[2rem] font-bold tracking-tight text-navy sm:text-[2.5rem]">
            {limitsSection.title}
          </h2>
          <p className="mt-3 text-body leading-relaxed text-ink-muted">
            {limitsSection.intro} — La rigueur de la recherche documentaire commence par la
            définition stricte de son périmètre d&apos;application.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {perimeterItems.map((item, idx) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition-all hover:border-navy/30 hover:shadow-card"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-surface-alt text-navy">
                      <Icon className="size-5" />
                    </span>
                    <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-small font-bold text-navy">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-small leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1.5 pt-3 border-t border-border/60 text-[11px] font-medium text-emerald">
                  <CheckCircle2 className="size-3.5" />
                  <span>Périmètre explicite</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
