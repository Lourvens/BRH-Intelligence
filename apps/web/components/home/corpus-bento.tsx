"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { InflationRadarInteractive } from "@/components/illustrations/inflation-radar-interactive";
import { OcrScannerVisual } from "@/components/illustrations/ocr-scanner-visual";
import {
  BankInstitutionIcon,
  BookStackIcon,
  CreditBureauIcon,
  MonetaryPolicyIcon,
  OcrScanIcon,
  PageSourceIcon,
  RefusalGateIcon,
} from "@/components/illustrations/icons";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { corpus } from "@/lib/content/home";

const documentFamilies = [
  { name: "Notes d'inflation", count: "Mensuel", icon: MonetaryPolicyIcon },
  { name: "Politique monétaire", count: "Trimestriel", icon: Scale },
  { name: "Bulletins statistiques", count: "Périodique", icon: FileSpreadsheet },
  { name: "Circulaires & avis", count: "Réglementaire", icon: FileText },
  { name: "Inclusion financière", count: "Stratégie", icon: CreditBureauIcon },
  { name: "Appels d'offres", count: "Institution", icon: BankInstitutionIcon },
];

export function CorpusBento() {
  return (
    <section id="corpus" className="scroll-mt-20 py-20 bg-bg">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section Heading */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-micro font-semibold uppercase tracking-[0.12em] text-ink-muted">
            <span className="size-1.5 rounded-full bg-azure" />
            {corpus.eyebrow}
          </div>
          <h2 className="mt-3 font-display text-[2rem] font-bold tracking-tight text-navy sm:text-[2.5rem]">
            {corpus.title}
          </h2>
          <p className="mt-3 text-body leading-relaxed text-ink-muted">
            {corpus.intro}
          </p>
        </div>

        {/* Bento Grid */}
        <BentoGrid className="mt-12">
          {/* Card 1: Interactive Inflation Radar (ColSpan 2) */}
          <BentoGridItem
            colSpan={2}
            className="bg-surface p-6 sm:p-7"
            header={<InflationRadarInteractive />}
            icon={<MonetaryPolicyIcon className="size-5" />}
            badge="Série officielle IHSI / BRH"
            title="Observatoire de l'inflation en Haïti"
            description="Chaque point de données renvoie à sa note mensuelle officielle de la BRH avec page exacte. Les graphiques restent nus et fidèles aux données brutes."
          />

          {/* Card 2: 6 Document Families & Archive Composition */}
          <BentoGridItem
            colSpan={1}
            className="bg-surface p-6 flex flex-col justify-between"
            header={
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <span className="text-micro font-semibold uppercase tracking-wider text-ink-muted">
                    Typologie des publications
                  </span>
                  <span className="text-[11px] font-bold text-navy">1 169 PDF</span>
                </div>

                <div className="grid gap-2 pt-1">
                  {documentFamilies.map((fam) => {
                    const Icon = fam.icon;
                    return (
                      <div
                        key={fam.name}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-alt/60 px-3 py-2 text-micro transition-colors hover:border-azure/30 hover:bg-surface-alt"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="size-3.5 text-navy" />
                          <span className="font-medium text-ink">{fam.name}</span>
                        </div>
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                          {fam.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            }
            icon={<BookStackIcon className="size-5" />}
            badge="Archives brh.ht"
            title="Six familles de publications"
            description="L'ensemble des arrêtés, circulaires de réserves obligatoires et bulletins est répertorié dans un catalogue immuable."
          />

          {/* Card 3: Targeted OCR Visualizer (ColSpan 1) */}
          <BentoGridItem
            colSpan={1}
            className="bg-surface p-6"
            header={<OcrScannerVisual />}
            icon={<OcrScanIcon className="size-5" />}
            badge="PaddleOCR-VL"
            title="OCR Ciblé & Coordonnées"
            description="Les pages sans couche texte subissent une transcription haute fidélité conservant l'ordonnancement exact des lignes et des paragraphes."
          />

          {/* Card 4: Integrity & Zero Hallucination Protocol (ColSpan 2) */}
          <BentoGridItem
            colSpan={2}
            className="bg-surface p-6 sm:p-7"
            header={
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Standard Chatbot vs BRH Intelligence */}
                <div className="rounded-xl border border-scarlet/20 bg-scarlet/[0.03] p-4">
                  <div className="flex items-center gap-2 text-micro font-semibold text-scarlet">
                    <AlertTriangle className="size-4" />
                    Réponse sans source
                  </div>
                  <p className="mt-2 text-micro leading-relaxed text-ink-muted">
                    Invente des chiffres économiques plausibles lorsqu&apos;une donnée manque. Risque critique en analyse financière et juridique.
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10.5px] font-semibold text-scarlet">
                    <span>Pas de page citée</span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald/30 bg-emerald/[0.04] p-4">
                  <div className="flex items-center gap-2 text-micro font-semibold text-emerald">
                    <ShieldCheck className="size-4" />
                    BRH Intelligence (Refus Explicite)
                  </div>
                  <p className="mt-2 text-micro leading-relaxed text-ink-muted">
                    Si aucun passage n&apos;atteint le seuil de pertinence strict, l&apos;agent refuse de répondre en signalant l&apos;absence de document à l&apos;appui.
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald">
                    <CheckCircle2 className="size-3.5" />
                    <span>Source citée</span>
                  </div>
                </div>
              </div>
            }
            icon={<RefusalGateIcon className="size-5" />}
            badge="Gouvernance RAG"
            title="Le principe de refus explicite"
            description="Dans le domaine bancaire, ne pas savoir vaut infiniment mieux que fabuler. Notre graphe d'agent valide la corrélation sémantique avant toute émission de texte."
          />
        </BentoGrid>
      </div>
    </section>
  );
}
