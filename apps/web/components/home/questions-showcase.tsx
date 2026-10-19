"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Check, ExternalLink, Filter, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  BankInstitutionIcon,
  CreditBureauIcon,
  MonetaryPolicyIcon,
  PageSourceIcon,
  ShieldCheckIcon,
} from "@/components/illustrations/icons";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { questions, questionsSection } from "@/lib/content/home";
import { cn } from "@/lib/utils";

const topicIcons = {
  Institution: BankInstitutionIcon,
  Crédit: CreditBureauIcon,
  "Inclusion financière": ShieldCheckIcon,
  "Politique monétaire": MonetaryPolicyIcon,
};

const categories = [
  "Toutes",
  "Institution",
  "Crédit",
  "Inclusion financière",
  "Politique monétaire",
] as const;

export function QuestionsShowcase() {
  const [selectedCategory, setSelectedCategory] = useState<string>("Toutes");

  const filteredQuestions =
    selectedCategory === "Toutes"
      ? questions
      : questions.filter((q) => q.topic === selectedCategory);

  return (
    <section id="questions" className="scroll-mt-20 py-20 bg-surface">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section Heading */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow flex items-center gap-2 text-ink-muted">
              <span className="size-1.5 rounded-full bg-azure" />
              {questionsSection.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-[2rem] font-bold tracking-tight text-navy sm:text-[2.5rem]">
              {questionsSection.title}
            </h2>
            <p className="mt-3 text-body leading-relaxed text-ink-muted">
              {questionsSection.intro}
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 rounded-full border border-border bg-surface-alt/70 p-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-micro font-medium transition-all",
                  selectedCategory === cat
                    ? "bg-navy text-white shadow-sm"
                    : "text-ink-muted hover:text-navy",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid with Aceternity CardSpotlight */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {filteredQuestions.map((item, idx) => {
            const Icon = topicIcons[item.topic as keyof typeof topicIcons] ?? PageSourceIcon;

            return (
              <CardSpotlight
                key={item.question}
                className="flex flex-col justify-between border-border/80 bg-surface shadow-sm hover:border-azure/50"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1 text-micro font-medium text-navy">
                      <Icon className="size-3.5 text-azure" />
                      {item.topic}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald">
                      <Check className="size-3" />
                      Sourcé
                    </span>
                  </div>

                  {/* Question */}
                  <h3 className="mt-5 font-display text-lead font-bold leading-snug text-navy">
                    {item.question}
                  </h3>

                  {/* Answer Highlight */}
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-display text-[2rem] font-extrabold tracking-tight text-navy">
                      {item.answer}
                    </span>
                  </div>

                  <p className="mt-2 text-small leading-relaxed text-ink-muted">
                    {item.detail}
                  </p>
                </div>

                {/* Footer with exact page citation */}
                <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4 text-micro text-ink-muted">
                  <div className="flex items-center gap-2 min-w-0 pr-3">
                    <PageSourceIcon className="size-4 shrink-0 text-navy" />
                    <span className="truncate font-medium text-ink">
                      {item.source}
                      {item.date ? ` · ${item.date}` : ""}
                    </span>
                  </div>

                  <span className="shrink-0 rounded-md bg-navy/5 px-2 py-0.5 font-bold text-navy font-mono">
                    Page&nbsp;{item.page}
                  </span>
                </div>
              </CardSpotlight>
            );
          })}
        </div>
      </div>
    </section>
  );
}
