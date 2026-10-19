const families = [
  "Notes d’inflation",
  "Politique monétaire",
  "Bulletins statistiques",
  "Circulaires et avis",
  "Documents d’information",
  "Appels à candidatures",
];

export function CorpusAside() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-alt p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <span className="rounded bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">
            Extrait officiel
          </span>
          <span className="text-caption font-medium text-ink-muted">
            Note · nov. 2025
          </span>
        </div>

        <div className="relative rounded-xl border border-border bg-surface p-5 shadow-md">
          <div className="absolute -top-3 right-6 rounded-t bg-navy px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
            Page 3
          </div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gold-ink">
            Note mensuelle
          </div>
          <h4 className="mb-2 font-display text-small font-bold text-navy">
            Indice des Prix à la Consommation
          </h4>
          <p className="mb-4 text-[11px] leading-relaxed text-ink-muted">
            « En novembre 2025, le taux d’inflation s’est décéléré tant en
            variation mensuelle qu’en rythme annuel. Sur une base annuelle, il
            est passé de 32,2 % en octobre 2025 à{" "}
            <strong className="font-semibold text-navy">28,3 %</strong> au cours
            du mois sous revue. »
          </p>
          <div className="flex items-center justify-between border-t border-border pt-3 text-[11px]">
            <span className="text-ink-muted">IHSI / BRH</span>
            <span className="font-semibold text-azure">Extrait sourcé</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <h4 className="mb-3 text-caption font-bold uppercase tracking-wider text-navy">
          Ce que contient le corpus
        </h4>
        <div className="flex flex-wrap gap-2">
          {families.map((family) => (
            <span
              key={family}
              className="rounded-lg border border-border bg-bg px-3 py-1.5 text-caption font-medium text-ink transition-colors hover:border-navy"
            >
              {family}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
