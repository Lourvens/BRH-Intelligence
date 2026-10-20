import {
  bicCitation,
  brhCitation,
  cooperativesCitation,
  servicePointsCitation,
} from "./citations";
import { institutionalTree } from "./tree-artifact";
import type { ChatThread } from "./types";

export const treeThread: ChatThread = {
  id: "institution-tree",
  title: "Arbre institutionnel",
  updatedAt: "10:38",
  group: "Aujourd’hui",
  messages: [
    {
      id: "tree-q",
      role: "user",
      content:
        "Montre-moi l’arbre institutionnel qui relie la BRH, le BIC et les indicateurs du corpus.",
    },
    {
      id: "tree-a",
      role: "assistant",
      content:
        "Voici une lecture arborescente des liens documentés : la BRH est la racine, le BIC et la supervision des coopératives forment deux branches, puis les consultations et les indicateurs d’inclusion financière prolongent ces branches.\n\nL’arbre est dérivé de la table : chaque ligne relie un nœud source à un nœud cible, avec le type de relation et la page source.",
      citations: [
        brhCitation,
        bicCitation,
        cooperativesCitation,
        servicePointsCitation,
      ],
      artifacts: [institutionalTree],
    },
  ],
};
