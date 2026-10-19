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
