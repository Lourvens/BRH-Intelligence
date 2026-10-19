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
  trace: "Trace #2025-N11",
  requestLabel: "Requête macroéconomique",
  question: "Quelle est l'inflation annuelle en novembre 2025 ?",
  answerLead: "En novembre 2025, l'inflation annuelle est passée à",
  answerFigure: "28,3\u00A0%",
  answerTail: ", contre 32,2\u00A0% en octobre 2025.",
  source: "Note mensuelle d'inflation — novembre 2025",
  page: 3,
  footer: "Contenu réel du corpus · la recherche conversationnelle arrive bientôt.",
  steps: [
    {
      label: "Recherche dans le corpus",
      detail: "3 passages retenus · recherche sémantique",
      time: "0,2\u00A0s",
    },
    {
      label: "Lecture de la page 3",
      detail: "Note mensuelle d'inflation · Tableau 1",
      time: "0,5\u00A0s",
    },
    {
      label: "Réponse rédigée",
      detail: "Avec citation vérifiable",
      time: "0,3\u00A0s",
    },
  ],
} as const;
