import { Landmark, ShieldCheck } from "lucide-react";
import Image from "next/image";

export function ArchiveStrip() {
  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-border bg-gradient-to-r from-surface-alt via-bg to-surface-alt px-5 py-4 sm:px-8 md:flex-row">
      <div className="flex items-center gap-4">
        <div className="size-14 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-surface shadow-md">
          <Image
            src="/brh-corpus-archive.jpg"
            alt="Archives numériques de la Banque de la République d’Haïti"
            width={1024}
            height={765}
            className="size-full object-cover"
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption font-bold text-navy">
              Archive documentaire &amp; source officielle
            </span>
            <span className="rounded border border-emerald/30 bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald">
              SOURCE PUBLIQUE
            </span>
          </div>
          <span className="mt-0.5 block text-[11px] text-ink-muted">
            Chaque passage conserve son document, sa page et le texte publié
            par la BRH.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-navy shadow-sm">
          <Landmark className="size-3.5 text-gold-ink" aria-hidden />
          Archive publique
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-navy shadow-sm">
          <ShieldCheck className="size-3.5 text-emerald" aria-hidden />
          Source : brh.ht
        </span>
      </div>
    </div>
  );
}
