export type HeroPreset = {
  id: string;
  filter: string;
  question: string;
  category: string;
  answerLead: string;
  answerHighlight: string;
  answerTail: string;
  documentTitle: string;
  documentMeta: string;
  page: number;
};

export const heroCopy = {
  eyebrow: "Recherche documentaire · Banque de la République d’Haïti",
  titleLead: "Posez une question.",
  titleAccent: "Obtenez la citation exacte.",
  intro:
    "Recherche sémantique sur les rapports, notes et circulaires publiés par la Banque de la République d’Haïti. Chaque réponse renvoie au document et à la page qui la soutiennent.",
  searchLabel: "Recherche sémantique dans 1 192 pages profilées :",
  quickLabel: "Exemples rapides :",
  indexNote: "34 documents transcrits",
} as const;

export const heroFilters = [
  { id: "all", label: "Toutes les publications" },
  { id: "inflation", label: "Notes d’inflation" },
  { id: "institution", label: "Institution" },
  { id: "credit", label: "Crédit" },
] as const;

export const heroPresets: readonly HeroPreset[] = [
  {
    id: "inflation",
    filter: "inflation",
    question: "Quel était le taux d’inflation annuel en novembre 2025 ?",
    category: "Note d’inflation",
    answerLead:
      "En novembre 2025, l’inflation annuelle en Haïti s’est établie à",
    answerHighlight: "28,3\u00A0%",
    answerTail: ", contre 32,2\u00A0% en octobre 2025.",
    documentTitle: "Note mensuelle d’inflation — novembre 2025",
    documentMeta: "IHSI / BRH · p. 3",
    page: 3,
  },
  {
    id: "institution",
    filter: "institution",
    question: "Quand la Banque de la République d’Haïti a-t-elle été créée ?",
    category: "Institution",
    answerLead: "La BRH a été créée par la loi du",
    answerHighlight: "17 août 1979",
    answerTail: ", après la scission de la BNRH.",
    documentTitle: "Les banques centrales : histoire et rôle",
    documentMeta: "Document d’information · p. 5",
    page: 5,
  },
  {
    id: "credit",
    filter: "credit",
    question: "Quand le Bureau d’Information sur le Crédit a-t-il vu le jour ?",
    category: "Crédit",
    answerLead:
      "Le Bureau d’Information sur le Crédit (BIC) a été mis en service en",
    answerHighlight: "avril 2013",
    answerTail: ", après la création du BCNH en 2005.",
    documentTitle: "Importance du Bureau de Crédit dans l’Économie",
    documentMeta: "Document d’information · p. 5",
    page: 5,
  },
];

export const heroExamples = [
  { id: "inflation", label: "Inflation annuelle en novembre 2025" },
  { id: "credit", label: "Date de création du Bureau de Crédit" },
] as const;

export const heroStats = [
  { label: "Docs transcrits", value: "34", unit: "docs" },
  { label: "Pages profilées", value: "1\u202F192", unit: "pages" },
  { label: "Période couverte", value: "2018—2026", unit: "" },
] as const;
