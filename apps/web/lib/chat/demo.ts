import {
  bicCitation,
  bicConsultationsCitation,
  brhCitation,
  cooperativesCitation,
  inflationCitation,
  servicePointsCitation,
} from "./citations";
import {
  bicConsultationsChart,
  bicGraph,
  inflationChart,
  servicePointsDonut,
} from "./artifacts";
import { chartGallery } from "./gallery";
import { longDocumentThread } from "./long-document";
import { treeThread } from "./tree-demo";
import type {
  ChatArtifact,
  ChatCitation,
  ChatMessage,
  ChatThread,
} from "./types";
function assistant(
  id: string,
  content: string,
  citations: ChatCitation[],
  artifacts?: ChatArtifact[],
): ChatMessage {
  return { id, role: "assistant", content, citations, artifacts };
}

export const demoThreads: ChatThread[] = [
  {
    id: "inflation-nov-2025",
    title: "Inflation de novembre 2025",
    updatedAt: "10:42",
    group: "Aujourd’hui",
    messages: [
      {
        id: "inflation-q",
        role: "user",
        content: "Quel était le taux d’inflation annuel en novembre 2025 ?",
      },
      assistant(
        "inflation-a",
        "En novembre 2025, l’inflation annuelle en Haïti s’est établie à 28,3 %, contre 32,2 % en octobre 2025. La note mensuelle décrit une décélération en variation mensuelle comme en rythme annuel.",
        [inflationCitation],
        [inflationChart],
      ),
    ],
  },
  {
    id: "creation-brh",
    title: "Création de la BRH",
    updatedAt: "Hier",
    group: "Cette semaine",
    messages: [
      {
        id: "brh-q",
        role: "user",
        content: "Quand la BRH a-t-elle été créée ?",
      },
      assistant(
        "brh-a",
        "La Banque de la République d’Haïti a été créée par la loi du 17 août 1979, après la scission de la Banque Nationale de la République d’Haïti.",
        [brhCitation],
      ),
    ],
  },
  {
    id: "bureau-credit",
    title: "Bureau d’Information sur le Crédit",
    updatedAt: "12 oct.",
    group: "Cette semaine",
    messages: [
      {
        id: "bic-q",
        role: "user",
        content: "Quand le Bureau d’Information sur le Crédit a-t-il vu le jour ?",
      },
      assistant(
        "bic-a",
        "Le Bureau d’Information sur le Crédit (BIC) a été mis en service en avril 2013, après la création du BCNH en 2005.",
        [bicCitation],
        [bicGraph],
      ),
    ],
  },
  {
    id: "cooperatives",
    title: "Coopératives supervisées",
    updatedAt: "10 oct.",
    group: "Cette semaine",
    messages: [
      {
        id: "coop-q",
        role: "user",
        content:
          "Combien de coopératives d’épargne et de crédit la BRH supervise-t-elle ?",
      },
      assistant(
        "coop-a",
        "La BRH supervise 97 coopératives d’épargne et de crédit, qui opèrent sous sa tutelle.",
        [cooperativesCitation],
      ),
    ],
  },
  {
    id: "refusal-example",
    title: "Réserve obligatoire 2024",
    updatedAt: "8 oct.",
    group: "Cette semaine",
    messages: [
      {
        id: "refusal-q",
        role: "user",
        content:
          "Quelle est la réserve obligatoire des banques commerciales en 2024 ?",
      },
      {
        id: "refusal-a",
        role: "assistant",
        content:
          "Le corpus ne contient pas de passage qui soutient cette question. L’agent ne formule pas de réponse sans source.",
        refused: true,
      },
    ],
  },
  {
    id: "bic-consultations",
    title: "Consultations du BIC",
    updatedAt: "6 oct.",
    group: "Cette semaine",
    messages: [
      {
        id: "bic-consultations-q",
        role: "user",
        content: "Comment ont évolué les consultations de rapports de crédit du BIC ?",
      },
      assistant(
        "bic-consultations-a",
        "Selon les données officielles du Bureau d’Information sur le Crédit (BIC), les consultations de rapports de crédit ont connu une montée en charge rapide après l’exercice 2016—2017.\n\nLa trajectoire se lit en trois temps :\n\n- **Montée en charge (2017—2019)** : les consultations HIT passent de 11 103 à 109 313, avec un sommet en 2018—2019.\n- **Repli (2019—2021)** : elles redescendent à 73 681 puis 70 084.\n- **Dernier exercice (2021—2022)** : 49 423 consultations HIT et 13 240 non-HIT, pour un total de 62 663.",
        [bicConsultationsCitation],
        [bicConsultationsChart],
      ),
    ],
  },
  {
    id: "service-points",
    title: "Agences complètes",
    updatedAt: "5 oct.",
    group: "Cette semaine",
    messages: [
      {
        id: "service-points-q",
        role: "user",
        content: "Comment se répartissent les agences complètes du système financier ?",
      },
      assistant(
        "service-points-a",
        "En décembre 2013, le système financier comptait 445 agences complètes : 175 banques, 98 coopératives et 172 institutions de microfinance.",
        [servicePointsCitation],
        [servicePointsDonut],
      ),
    ],
  },
  {
    id: "chart-gallery",
    title: "Galerie de graphiques",
    updatedAt: "4 oct.",
    group: "Cette semaine",
    messages: [
      {
        id: "chart-gallery-q",
        role: "user",
        content: "Montre-moi les types de graphiques disponibles.",
      },
      assistant(
        "chart-gallery-a",
        "Aperçu des visualisations générées à partir des tables du corpus : courbe, aire, barres, camembert et donut. Les données restent celles du document source.",
        [inflationCitation, servicePointsCitation],
        chartGallery,
      ),
    ],
  },
  longDocumentThread,
  treeThread,
];

export const refusalAnswer: ChatMessage = {
  id: "fresh-refusal",
  role: "assistant",
  content:
    "Le corpus ne contient pas de passage qui soutient cette question. L’agent ne formule pas de réponse sans source.",
  refused: true,
};

const matchRules = [
  {
    threadId: "inflation-nov-2025",
    words: ["inflation", "28,3", "32,2", "novembre 2025"],
  },
  { threadId: "creation-brh", words: ["création", "créée", "1979", "bnrh"] },
  { threadId: "bureau-credit", words: ["bureau", "crédit", "bic", "2013"] },
  {
    threadId: "bic-consultations",
    words: ["consultation", "consultations", "hit", "non-hit"],
  },
  {
    threadId: "service-points",
    words: ["point de service", "points de service", "agences", "banques", "imf"],
  },
  {
    threadId: "cooperatives",
    words: ["coopérative", "coopératives", "97", "inclusion"],
  },
  {
    threadId: "chart-gallery",
    words: ["graphique", "graphiques", "visualisation", "galerie", "camembert"],
  },
  {
    threadId: "note-de-synthese",
    words: ["synthèse", "note de synthèse", "lecture longue", "longue"],
  },
];

matchRules.push({ threadId: "institution-tree", words: ["arbre", "hiérarchie", "institutionnel"] });
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function findDemoAnswer(question: string) {
  const normalized = normalize(question);
  const match = matchRules.find((rule) =>
    rule.words.some((word) => normalized.includes(normalize(word))),
  );

  if (!match) return refusalAnswer;

  const thread = demoThreads.find((item) => item.id === match.threadId);
  return (
    thread?.messages.find((message) => message.role === "assistant") ??
    refusalAnswer
  );
}
