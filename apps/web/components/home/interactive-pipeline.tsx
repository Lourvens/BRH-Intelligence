"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Cpu,
  Database,
  DownloadCloud,
  FileCheck2,
  FileSearch,
  Layers,
  Network,
  ScanLine,
  Server,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import {
  BankInstitutionIcon,
  LangGraphNodeIcon,
  OcrScanIcon,
  PageSourceIcon,
  PlugIcon,
  VectorDatabaseIcon,
} from "@/components/illustrations/icons";
import { cn } from "@/lib/utils";

interface PipelineNode {
  id: string;
  step: string;
  title: string;
  shortDesc: string;
  technicalDetails: string;
  icon: typeof Database;
  badge: string;
  highlight: string;
}

const nodes: PipelineNode[] = [
  {
    id: "crawl",
    step: "01",
    title: "Collecte & Inventaire",
    shortDesc: "Interrogation de l'API WordPress sur brh.ht",
    technicalDetails:
      "Extraction automatique via /wp-json/wp/v2/media?mime_type=application/pdf. Téléchargement idempotent indexé par hachage SHA-256 dans data/raw/web.",
    icon: DownloadCloud,
    badge: "1 169 PDF",
    highlight: "CAS SHA-256",
  },
  {
    id: "ocr",
    step: "02",
    title: "OCR & Découpage Page",
    shortDesc: "Transcription sélective et géoréférencement",
    technicalDetails:
      "PyMuPDF inspecte chaque page. Les pages scannées sont envoyées à l'OCR, préservant strictement les en-têtes et le numéro de page physique.",
    icon: ScanLine,
    badge: "PaddleOCR-VL",
    highlight: "Page-accurate",
  },
  {
    id: "vector",
    step: "03",
    title: "Indexation & Vectorstore",
    shortDesc: "Embeddings sémantiques haute dimension",
    technicalDetails:
      "Génération d'embeddings par passage avec métadonnées complètes (document, date, numéro de page, famille). Stockage des métadonnées dans PostgreSQL et des vecteurs dans Pinecone.",
    icon: Database,
    badge: "Pinecone",
    highlight: "Recherche sémantique",
  },
  {
    id: "agent",
    step: "04",
    title: "Agent LangGraph",
    shortDesc: "Raisonnement multi-étapes & FastMCP",
    technicalDetails:
      "Orchestration d'un graphe d'états LangGraph. Filtrage sémantique, vérification croisée des citations et déclenchement du refus en cas d'incertitude.",
    icon: Network,
    badge: "FastMCP Server",
    highlight: "Seuil de pertinence",
  },
  {
    id: "citation",
    step: "05",
    title: "Citation Vérifiable",
    shortDesc: "Réponse rédigée avec ancre de page",
    technicalDetails:
      "Chaque affirmation est annotée de repères [1], [2]. Un clic ouvre le document PDF d'origine directement à la page citée sans intermédiaire.",
    icon: FileCheck2,
    badge: "Source citée",
    highlight: "Visualisation immédiate",
  },
];

export function InteractivePipeline() {
  const [selectedId, setSelectedId] = useState<string>("agent");
  const activeNode = nodes.find((n) => n.id === selectedId) ?? nodes[3];

  return (
    <section id="methode" className="scroll-mt-20 py-20 bg-navy-deep text-white">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section Heading */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow flex items-center gap-2 text-azure">
              <span className="size-1.5 rounded-full bg-azure animate-pulse" />
              La méthode & l&apos;architecture
            </p>
            <h2 className="mt-3 font-display text-[2rem] font-bold tracking-tight text-white sm:text-[2.5rem]">
              Un pipeline transparent, pas une boîte noire.
            </h2>
            <p className="mt-3 text-body leading-relaxed text-white/70">
              Du téléchargement des PDF bruts jusqu&apos;à la citation de page,
              chaque transformation est documentée, traçable et reproductible.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-micro text-white/80">
            <PlugIcon className="size-4 text-azure" />
            <span>Même cœur partagé : Site Web + Serveur FastMCP</span>
          </div>
        </div>

        {/* Animated Connection Nodes Carousel / Timeline */}
        <div className="mt-14">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {nodes.map((node, index) => {
              const Icon = node.icon;
              const isSelected = node.id === selectedId;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedId(node.id)}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-2xl border p-4.5 transition-all duration-300",
                    isSelected
                      ? "border-azure bg-white/15 shadow-[0_0_24px_rgba(0,156,220,0.3)] ring-1 ring-azure"
                      : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10",
                  )}
                >
                  {/* Top Step + Indicator */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-micro font-bold text-azure">
                      {node.step}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors",
                        isSelected
                          ? "bg-azure text-white"
                          : "bg-white/10 text-white/60",
                      )}
                    >
                      {node.highlight}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="mt-4">
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-xl transition-colors",
                        isSelected
                          ? "bg-azure text-white"
                          : "bg-white/10 text-white/80 group-hover:bg-white/20",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-display text-small font-bold text-white">
                    {node.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                    {node.shortDesc}
                  </p>

                  {/* Glow bar at bottom if selected */}
                  {isSelected && (
                    <motion.div
                      layoutId="activePipelineGlow"
                      className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-azure via-gold to-azure"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Deep Dive Inspector */}
        <motion.div
          key={activeNode.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md sm:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-azure/20 px-3 py-1 font-mono text-micro font-bold text-azure">
                  Étape {activeNode.step}
                </span>
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-micro text-white/80">
                  {activeNode.badge}
                </span>
              </div>

              <h3 className="mt-3 font-display text-title font-bold text-white">
                {activeNode.title}
              </h3>
              <p className="mt-3 text-body leading-relaxed text-white/80">
                {activeNode.technicalDetails}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-micro">
                <span className="text-white/60">Propriété du pipeline :</span>
                <p className="mt-1 font-semibold text-white">
                  Idempotence & pages préservées
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-micro">
                <span className="text-white/60">Protocole d&apos;échange :</span>
                <p className="mt-1 font-semibold text-azure">
                  FastMCP & LangGraph SDK
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
