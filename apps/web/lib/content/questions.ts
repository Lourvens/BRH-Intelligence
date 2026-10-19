export type QuestionExample = {
  topic: string;
  question: string;
  answer: string;
  detail: string;
  source: string;
  page: number;
  date?: string;
};

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
