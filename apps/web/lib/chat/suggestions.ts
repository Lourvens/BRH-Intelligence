import type { SuggestedQuestion } from "./types";

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
