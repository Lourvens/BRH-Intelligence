import type { ChatCitation } from "./types";

export const inflationCitation: ChatCitation = {
  id: "inflation-nov-2025-p3",
  pdfUrl: "https://www.brh.ht/wp-content/uploads/NOTE-MENSUELLE-DINFLATION-DU-MOIS-DOCTOBRE-2025.pdf#page=3",
  title: "Note mensuelle d’inflation — novembre 2025",
  page: 3,
  snippet:
    "En novembre 2025, le taux d’inflation s’est décéléré tant en variation mensuelle qu’en rythme annuel. Sur une base annuelle, il est passé de 32,2 % en octobre 2025 à 28,3 % au cours du mois sous revue.",
  source: "IHSI / BRH",
  kind: "Note mensuelle",
};

export const brhCitation: ChatCitation = {
  id: "banques-centrales-p5",
  pdfUrl: "https://www.brh.ht/wp-content/uploads/2018/08/historique.pdf#page=5",
  title: "Les banques centrales : histoire et rôle",
  page: 5,
  snippet:
    "La création de la Banque de la République d’Haïti (BRH) a été actée par la loi du 17 août 1979, après la scission de la Banque Nationale de la République d’Haïti (BNRH) en deux entités indépendantes.",
  source: "Document d’information",
  kind: "Institution",
};

export const bicCitation: ChatCitation = {
  id: "bureau-credit-p5",
  pdfUrl: "https://www.brh.ht/wp-content/uploads/2018/08/trifolio_bic.pdf#page=5",
  title: "Importance du Bureau de Crédit dans l’Économie",
  page: 5,
  snippet:
    "En avril 2013, les efforts conjugués par les différentes parties prenantes ont permis d’aboutir à l’érection du Bureau d’Information sur le Crédit (BIC).",
  source: "Document d’information",
  kind: "Crédit",
};

export const cooperativesCitation: ChatCitation = {
  id: "inclusion-financiere-p10",
  pdfUrl: "https://www.brh.ht/wp-content/uploads/LIGNES-DIRECTRICES-AUX-COOPERATIVES-DEPARGNE-ET-DE-CREDIT.pdf#page=10",
  title: "Stratégie Nationale d’Inclusion Financière",
  page: 10,
  snippet:
    "Les coopératives d’épargne et de crédit opèrent sous la tutelle de la Banque centrale ; le document en recense 97.",
  source: "Document d’information",
  kind: "Inclusion financière",
};

export const servicePointsCitation: ChatCitation = {
  id: "inclusion-financiere-p9",
  pdfUrl: "https://www.brh.ht/wp-content/uploads/allocutiong1_inclusion_financiere.pdf#page=9",
  title: "Stratégie Nationale d’Inclusion Financière",
  page: 9,
  snippet:
    "En décembre 2013, le système financier comptait 2 476 points de service, dont 445 agences complètes et 2 031 points de cash-in/cash-out.",
  source: "BRH · Tableau des points de service",
  kind: "Inclusion financière",
};

export const bicConsultationsCitation: ChatCitation = {
  id: "bureau-credit-p6",
  pdfUrl: "https://www.brh.ht/wp-content/uploads/2018/08/trifolio_bic.pdf#page=6",
  title: "Importance du Bureau de Crédit dans l’Économie",
  page: 6,
  snippet:
    "Entre 2016-17 et 2021-22, les consultations HIT ont reculé de 107 166 à 49 423, tandis que les consultations non-HIT sont passées de 44 188 à 13 240.",
  source: "BIC · Historique des consultations",
  kind: "Crédit",
};

export function uniqueCitations(citations: readonly ChatCitation[]) {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    if (seen.has(citation.id)) return false;
    seen.add(citation.id);
    return true;
  });
}
