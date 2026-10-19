"use client";

import { motion } from "framer-motion";

import {
  BankInstitutionIcon,
  LanguageIcon,
  PageSourceIcon,
  RefusalGateIcon,
} from "@/components/illustrations/icons";

const pillars = [
  { icon: PageSourceIcon, tone: "text-azure", label: "Citations page par page" },
  { icon: RefusalGateIcon, tone: "text-emerald", label: "Refus explicite" },
  { icon: LanguageIcon, tone: "text-navy", label: "Corpus francophone" },
  {
    icon: BankInstitutionIcon,
    tone: "text-gold-ink",
    label: "Documents publiés sur brh.ht",
  },
];

export function HeroTrust() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.45 }}
      className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 border-t border-border/70 pt-8 text-small font-medium text-ink-muted"
    >
      {pillars.map((pillar) => {
        const Icon = pillar.icon;

        return (
          <div key={pillar.label} className="flex items-center gap-2">
            <Icon className={`size-4 ${pillar.tone}`} />
            <span className="text-ink">{pillar.label}</span>
          </div>
        );
      })}
    </motion.div>
  );
}
