export const feedbackCategories = {
  inaccuracy: "Réponse inexacte",
  bug: "Problème technique",
  suggestion: "Suggestion",
  other: "Autre",
} as const;

export type FeedbackCategory = keyof typeof feedbackCategories;

export const feedbackLimits = {
  messageMin: 10,
  messageMax: 4000,
  pagePathMax: 500,
  answerExcerptMax: 2000,
} as const;

export type FeedbackInput = {
  category: FeedbackCategory;
  message: string;
  page_path: string;
  thread_id?: string | null;
  answer_excerpt?: string | null;
};

export function feedbackMessageError(message: string): string | null {
  const length = message.trim().length;
  if (length < feedbackLimits.messageMin) return "Ajoutez quelques détails (au moins 10 caractères).";
  if (length > feedbackLimits.messageMax) return "Votre avis doit contenir au plus 4 000 caractères.";
  return null;
}
