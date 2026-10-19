import {
  bicCitation,
  brhCitation,
  cooperativesCitation,
  inflationCitation,
} from "./citations";
import { bicGraph, inflationChart } from "./artifacts";
import type {
  ChatArtifact,
  ChatCitation,
  ChatMessage,
  ChatThread,
  SuggestedQuestion,
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
];

export const suggestedQuestions: SuggestedQuestion[] = [
  {
    id: "inflation",
    category: "Inflation",
    question: "Quel était le taux d’inflation annuel en novembre 2025 ?",
    threadId: "inflation-nov-2025",
  },
  {
    id: "brh",
    category: "Institution",
    question: "Quand la BRH a-t-elle été créée ?",
    threadId: "creation-brh",
  },
  {
    id: "cooperatives",
    category: "Inclusion financière",
    question:
      "Combien de coopératives d’épargne et de crédit la BRH supervise-t-elle ?",
    threadId: "cooperatives",
  },
  {
    id: "bic",
    category: "Crédit",
    question: "Quand le Bureau d’Information sur le Crédit a-t-il vu le jour ?",
    threadId: "bureau-credit",
  },
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
    threadId: "cooperatives",
    words: ["coopérative", "coopératives", "97", "inclusion"],
  },
];

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
