export type QueryPreset = {
  id: string;
  pill: string;
  question: string;
  category: string;
  isRefusal?: boolean;
  answerLead: string;
  answerHighlight: string;
  answerTail: string;
  documentTitle: string;
  pageNumber?: number;
  totalPages?: number;
  documentExcerpt: string;
  documentDate: string;
};

export const presets: QueryPreset[] = [
  {
    id: "inflation",
    pill: "Inflation nov. 2025",
    question: "Quelle est l'inflation annuelle en novembre 2025 ?",
    category: "Note d'inflation",
    answerLead: "En novembre 2025, l'inflation annuelle en Haïti s'est établie à",
    answerHighlight: "28,3 %",
    answerTail: ", contre 32,2 % au mois précédent (octobre 2025).",
    documentTitle: "Note mensuelle d'inflation — novembre 2025",
    pageNumber: 3,
    totalPages: 10,
    documentExcerpt:
      "En novembre 2025, le taux d'inflation s'est décéléré tant en variation mensuelle qu'en rythme annuel. Sur une base annuelle, il est passé de 32,2 % en octobre 2025 à 28,3 % au cours du mois sous revue.",
    documentDate: "Novembre 2025",
  },
  {
    id: "institution",
    pill: "Création de la BRH",
    question: "Quand la Banque centrale a-t-elle été créée ?",
    category: "Loi organique",
    answerLead: "La Banque de la République d'Haïti a été officiellement instituée le",
    answerHighlight: "17 août 1979",
    answerTail: ", date à laquelle la loi scinde la BNRH en deux entités.",
    documentTitle: "Les banques centrales : histoire et rôle",
    pageNumber: 5,
    totalPages: 16,
    documentExcerpt:
      "La création de la Banque de la République d'Haïti (BRH) a été actée par la loi du 17 août 1979, après la scission de la Banque Nationale de la République d'Haïti (BNRH) en deux entités indépendantes.",
    documentDate: "Janvier 2025",
  },
  {
    id: "credit",
    pill: "Bureau de Crédit BIC",
    question: "Quand le Bureau d'Information sur le Crédit est-il né ?",
    category: "Document d'information",
    answerLead: "Le Bureau d'Information sur le Crédit (BIC) a été mis en service en",
    answerHighlight: "Avril 2013",
    answerTail: ", venant remplacer le BCNH créé en 2005.",
    documentTitle: "Importance du Bureau de Crédit dans l'Économie",
    pageNumber: 5,
    totalPages: 12,
    documentExcerpt:
      "En avril 2013, les efforts conjugés par les différentes parties prenantes ont permis d'aboutir à l'érection du Bureau d'Information sur le Crédit (BIC).",
    documentDate: "Document d'information",
  },
  {
    id: "refusal",
    pill: "Hors corpus",
    question: "Quel était le prix de clôture de l'action Microsoft hier ?",
    category: "Refus explicite",
    isRefusal: true,
    answerLead: "Refus explicite :",
    answerHighlight: "Question hors du corpus.",
    answerTail:
      " Les publications de la BRH ne couvrent pas les cotations boursières internationales. L'agent ne répond pas sans source.",
    documentTitle: "Périmètre du corpus",
    documentExcerpt:
      "Aucun passage pertinent n'a été trouvé dans les publications de la BRH. L'agent signale l'absence de source plutôt que de proposer une réponse non vérifiée.",
    documentDate: "Refus explicite",
  },
];
