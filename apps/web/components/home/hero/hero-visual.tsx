import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import Image from "next/image";

export function HeroVisual() {
  return (
    <div className="group relative flex h-full min-h-[360px] flex-col justify-between overflow-hidden rounded-3xl border border-azure/30 bg-navy shadow-xl lg:min-h-[640px]">
      <Image
        src="/brh-archive-vault.jpg"
        alt="Archive documentaire de la Banque de la République d’Haïti"
        fill
        priority
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="object-cover object-center opacity-80 transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/45 to-transparent" />

      <div className="absolute left-4 right-4 top-4 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-navy/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-md">
          <span className="size-2 rounded-full bg-emerald" />
          Archive publique
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-navy/90 px-3 py-1.5 text-[11px] font-bold text-gold shadow-sm backdrop-blur-md">
          <ShieldCheck className="size-3.5" aria-hidden />
          Citations vérifiables
        </span>
      </div>

      <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/15 bg-navy-deep/85 p-4 text-white backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-caption font-bold">
            <FileText className="size-4 text-azure" aria-hidden />
            Traçabilité documentaire
          </span>
          <span className="font-mono text-[11px] text-white/60">
            OCR · 2026
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-white/70">
          Chaque passage conserve son document, sa page et le texte publié par
          la BRH.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald">
          <CheckCircle2 className="size-3" aria-hidden />
          Source localisable
        </span>
      </div>
    </div>
  );
}
