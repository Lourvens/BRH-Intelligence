import { Landmark } from "lucide-react";
import Image from "next/image";

import { SectionHeading } from "./section-heading";
import { CorpusAside } from "./corpus/corpus-aside";
import { CorpusMetrics } from "./corpus/corpus-metrics";
import { InflationChart } from "./corpus/inflation-chart";

export function CorpusSection() {
  return (
    <section id="corpus" className="scroll-mt-20 border-b border-border bg-surface py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mb-12 grid items-center gap-8 lg:grid-cols-12">
          <SectionHeading
            className="lg:col-span-8"
            eyebrow="Le corpus"
            title="Une archive publique, citée page par page."
            intro="Rapports, notes de conjoncture, avis statutaires et rapports périodiques publiés par la Banque de la République d’Haïti. Le corpus est en français ; chaque passage garde sa page d’origine."
          />

          <div className="flex justify-end lg:col-span-4">
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-azure/20 bg-navy shadow-md">
              <Image
                src="/brh-corpus-archive.jpg"
                alt="Archives numériques de la Banque de la République d’Haïti"
                width={1024}
                height={765}
                className="h-36 w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Landmark className="size-3.5 text-gold" aria-hidden />
                  Archive publique
                </span>
                <span className="font-mono text-white/70">1 169 titres</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-14 grid items-start gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <InflationChart />
          </div>
          <div className="lg:col-span-5">
            <CorpusAside />
          </div>
        </div>

        <CorpusMetrics />
      </div>
    </section>
  );
}
