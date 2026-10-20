import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} est une interface publique de recherche documentaire en français
sur les publications officielles de la Banque de la République d’Haïti (BRH).
Les réponses renvoient au document et à la page qui les soutiennent.

Le corpus est francophone. L’interface ne traduit pas automatiquement les
questions ou les réponses, et ne produit pas de réponse sans passage sourcé :
si aucun passage pertinent n’est trouvé, l’assistant refuse explicitement.

L’interface \`/assistant\` est actuellement une démonstration avec des réponses
préenregistrées. Le serveur MCP et l’agent LangGraph partagent le même service
de recherche documentaire.

## Pages

- [Accueil](${SITE_URL}/): présentation du corpus, de la méthode et des usages.
- [Assistant documentaire](${SITE_URL}/assistant): espace de question-réponse avec citations, tableaux et visualisations.
- [Sitemap](${SITE_URL}/sitemap.xml): pages publiques indexables.

## Corpus et méthode

- Les documents proviennent des publications officielles de la BRH et des séries de l’IHSI.
- La recherche s’appuie sur des passages extraits des PDF, avec leur document et leur page.
- Les réponses doivent citer une source ; l’absence de source pertinente entraîne un refus.
- Le corpus est une archive mise à jour par lots, sans flux temps réel.

## Optional

- [Code source](https://github.com/Lourvens/BRH-Intelligence): dépôt public du projet.
- [Décisions d’architecture](https://github.com/Lourvens/BRH-Intelligence/tree/main/docs/adr): choix de conception et compromis techniques.
`;

export function GET() {
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
