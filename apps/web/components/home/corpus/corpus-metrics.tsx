const metrics = [
  {
    value: "1\u202F169",
    label: "PDF recensés",
    note: "Inventaire brh.ht",
  },
  {
    value: "34",
    label: "Documents transcrits",
    note: "Transcription OCR",
  },
  {
    value: "1\u202F192",
    label: "Pages profilées",
    note: "Échantillon OCR",
  },
  {
    value: "2018—2026",
    label: "Période couverte",
    note: "Échantillon stratifié",
  },
];

export function CorpusMetrics() {
  return (
    <div className="border-t border-border pt-10">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-border bg-bg p-4"
          >
            <div className="mb-1 font-display text-3xl font-bold text-navy tabular-nums">
              {metric.value}
            </div>
            <div className="text-caption font-semibold text-ink">
              {metric.label}
            </div>
            <div className="text-[11px] text-ink-muted">{metric.note}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-[11px] text-ink-muted">
        Inventaire brh.ht et échantillon OCR au 15 octobre 2026.
      </p>
    </div>
  );
}
