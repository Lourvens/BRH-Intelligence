/**
 * All welcome-page copy and corpus facts in one reviewable module.
 *
 * Facts are grounded in the OCR corpus under `data/ocr/` and the crawl ledger.
 * Keep the `source`, `page` and `date` fields attached to every claim — the UI
 * uses them as citations, and they are the difference between a landing page
 * and a promise.
 */

export type QuestionExample = {
  topic: string;
  question: string;
  answer: string;
  detail: string;
  source: string;
  page: number;
  date?: string;
};

export const hero = {
  eyebrow: "Recherche documentaire · BRH",
  titleLead: "Posez une question.",
  titleAccent: "Obtenez la page.",
  intro:
    "BRH Intelligence interroge les rapports, notes et circulaires publiés sur brh.ht. Les réponses s'appuient sur des passages retrouvés dans le corpus et renvoient au document et à la page.",
  primaryCta: "Voir une réponse citée",
  secondaryCta: "Explorer le corpus",
  assurances: ["Corpus francophone", "Citations page par page", "Refus explicite"],
  note: "Aperçu de la recherche conversationnelle — le chat arrive bientôt.",
} as const;

export const demo = {
  badge: "Démonstration",
  question: "Quelle est l'inflation annuelle en novembre 2025 ?",
  answerLead: "En novembre 2025, l'inflation annuelle est passée à",
  answerFigure: "28,3\u00A0%",
  answerTail: ", contre 32,2\u00A0% en octobre 2025.",
  source: "Note mensuelle d'inflation — novembre 2025",
  page: 3,
  footer: "Contenu réel du corpus · la recherche conversationnelle arrive bientôt.",
  steps: [
    { label: "Recherche dans le corpus", detail: "3 passages retenus", time: "0,2\u00A0s" },
    { label: "Lecture de la page 3", detail: "Note mensuelle d'inflation", time: "0,5\u00A0s" },
    { label: "Réponse rédigée", detail: "Avec citation", time: "0,3\u00A0s" },
  ],
} as const;

export const corpus = {
  eyebrow: "Le corpus",
  title: "Une archive publique, citée page par page.",
  intro:
    "Notes d'inflation, politique monétaire, bulletins statistiques, circulaires : les PDF viennent de brh.ht. Le corpus est en français ; chaque passage garde sa page d'origine.",
  chartTitle: "Inflation annuelle en Haïti",
  chartSubtitle: "Novembre 2022 → novembre 2025",
  chartSummary:
    "L'inflation annuelle est passée de 40,8\u00A0% en novembre 2022 à 28,3\u00A0% en novembre 2025, après un point bas à 22,5\u00A0% en novembre 2023.",
  chartSource:
    "IHSI / BRH · Note mensuelle d'inflation, novembre 2025, p.\u00A03",
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

export const questionsSection = {
  eyebrow: "Exemples",
  title: "Des questions que le corpus peut nourrir.",
  intro:
    "Institution, crédit, inclusion financière, politique monétaire. Quatre questions types, avec leur réponse et leur source.",
} as const;

export const questions: readonly QuestionExample[] = [
  {
    topic: "Institution",
    question: "Quand la BRH a-t-elle été créée ?",
    answer: "17 août 1979",
    detail:
      "La loi scinde alors la BNRH en deux entités ; la BRH devient la banque centrale.",
    source: "Les banques centrales : histoire et rôle",
    page: 5,
    date: "Janvier 2025",
  },
  {
    topic: "Crédit",
    question: "Quand le Bureau d'Information sur le Crédit a-t-il vu le jour ?",
    answer: "Avril 2013",
    detail:
      "Le BCNH avait été créé en 2005 ; le BIC est mis en place après le séisme.",
    source: "Importance du Bureau de Crédit dans l'Économie",
    page: 5,
  },
  {
    topic: "Inclusion financière",
    question:
      "Combien de coopératives d'épargne et de crédit la BRH supervise-t-elle ?",
    answer: "97",
    detail: "Elles opèrent sous la tutelle de la Banque centrale.",
    source: "Stratégie Nationale d'Inclusion Financière",
    page: 10,
  },
  {
    topic: "Politique monétaire",
    question: "Quel était le taux d'inflation annuel en décembre 2020 ?",
    answer: "19,2\u00A0%",
    detail:
      "En baisse de 6 points de pourcentage par rapport au trimestre précédent.",
    source: "Note sur la politique monétaire",
    page: 6,
    date: "1er trimestre 2021",
  },
] as const;

export const method = {
  eyebrow: "La méthode",
  title: "Une réponse, pas une boîte noire.",
  intro:
    "Chercher, citer, ou refuser. Chaque étape est visible, et chaque affirmation renvoie à sa page.",
  steps: [
    {
      number: "01",
      title: "Vous posez la question",
      body: "En français, sans syntaxe à apprendre.",
    },
    {
      number: "02",
      title: "Le corpus est interrogé",
      body: "Les passages les plus proches sont retrouvés, avec leur document et leur page.",
    },
    {
      number: "03",
      title: "La réponse est rédigée",
      body: "À partir des passages retenus, avec des repères [1], [2].",
    },
    {
      number: "04",
      title: "La source est localisée",
      body: "Chaque repère renvoie au document et à la page exacte.",
    },
  ],
  illustrationCaption:
    "Une question, plusieurs passages, une page retenue.",
  refusalTitle: "Quand le corpus ne répond pas",
  refusalBody:
    "Si aucun passage ne dépasse le seuil de pertinence, l'agent ne répond pas : il indique que les documents ne soutiennent pas la question.",
  refusalBadge: "Refus explicite",
  underpinningsTitle: "Sous le capot",
  underpinnings: [
    {
      title: "Page par page",
      body: "Chaque page garde son numéro, pour une citation qui ouvre le PDF au bon endroit.",
    },
    {
      title: "OCR ciblé",
      body: "Les pages sans couche texte sont transcrites ; le pipeline décide page par page.",
    },
    {
      title: "Un seul cœur",
      body: "Le site et le serveur MCP partagent le même service de recherche.",
    },
  ],
} as const;

export const limitsSection = {
  eyebrow: "Périmètre",
  title: "Ce que BRH Intelligence ne fait pas.",
  intro: "Un périmètre clair vaut mieux qu'une promesse floue.",
  items: [
    {
      title: "Corpus francophone",
      body: "Les documents sont en français. Le créole et l'anglais ne sont pas couverts.",
    },
    {
      title: "Pas de données en direct",
      body: "Le corpus est une archive de publications, pas un flux de marché.",
    },
    {
      title: "Pas de conseil en investissement",
      body: "Les réponses documentent ; elles ne recommandent pas.",
    },
    {
      title: "Pas de réponse sans source",
      body: "Si le corpus ne soutient pas la question, l'agent refuse explicitement.",
    },
  ],
} as const;

export const finalCta = {
  eyebrow: "BRH Intelligence",
  title: "La réponse est dans le document.",
  intro:
    "Voyez comment une réponse remonte jusqu'à sa page, puis explorez ce que contient le corpus.",
  primary: "Voir une réponse citée",
  secondary: "Explorer le corpus",
} as const;

export const footer = {
  blurb:
    "Une interface de recherche sur les publications officielles de la Banque de la République d'Haïti.",
  source:
    "Les documents cités appartiennent à la Banque de la République d'Haïti et sont publiés sur brh.ht.",
  disclaimer:
    "Les réponses peuvent contenir des erreurs. Vérifiez la page citée.",
  asOf: "Inventaire du 15 octobre 2026",
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
