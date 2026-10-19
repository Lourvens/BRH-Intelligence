export const corpus = {
  eyebrow: "Le corpus",
  title: "Une archive publique, citée page par page.",
  intro:
    "Notes d'inflation, politique monétaire, bulletins statistiques, circulaires : les PDF viennent de brh.ht. Le corpus est en français ; chaque passage garde sa page d'origine.",
  chartTitle: "Inflation annuelle en Haïti",
  chartSubtitle: "Novembre 2022 → novembre 2025 · en\u00A0%",
  chartSummary:
    "L'inflation annuelle est passée de 40,8\u00A0% en novembre 2022 à 28,3\u00A0% en novembre 2025, après un point bas à 22,5\u00A0% en novembre 2023.",
  chartSource:
    "IHSI / BRH · Note mensuelle d'inflation, novembre 2025, p.\u00A03",
  excerpt: {
    label: "Extrait officiel",
    document: "Note mensuelle · nov. 2025",
    page: 3,
    title: "Indice des Prix à la Consommation",
    body: "En novembre 2025, le taux d'inflation s'est décéléré tant en variation mensuelle qu'en rythme annuel. Sur une base annuelle, il est passé de 32,2\u00A0% en octobre 2025 à 28,3\u00A0% au cours du mois sous revue.",
    highlight: "28,3\u00A0%",
    source: "Note mensuelle d'inflation, novembre 2025",
    status: "Extrait sourcé",
  },
  familiesTitle: "Ce que contient le corpus",
  families: [
    "Notes d'inflation",
    "Politique monétaire",
    "Bulletins statistiques",
    "Circulaires et avis",
    "Documents d'information",
    "Appels à candidatures",
  ],
  stats: [
    {
      value: "1\u202F169",
      label: "PDF recensés",
      note: "Inventaire brh.ht",
    },
    {
      value: "34",
      label: "documents transcrits",
      note: "Batch OCR en cours",
    },
    {
      value: "1\u202F192",
      label: "pages profilées",
      note: "Échantillon de 116 documents",
    },
    {
      value: "2018—2026",
      label: "période couverte",
      note: "Échantillon stratifié",
    },
  ],
  statsSource:
    "Sources : inventaire brh.ht (15/10/2026) · échantillon OCR de 116 documents.",
} as const;

/** Annual inflation, from the note's chart. Nov. 2025 is the narrative value. */
export const inflationSeries = [
  { label: "nov. 2022", value: 40.8 },
  { label: "mai 2023", value: 40.5 },
  { label: "nov. 2023", value: 22.5 },
  { label: "mai 2024", value: 28.0 },
  { label: "nov. 2024", value: 29.5 },
  { label: "mai 2025", value: 29.0 },
  { label: "sept. 2025", value: 31.0 },
  { label: "nov. 2025", value: 28.3 },
] as const;
