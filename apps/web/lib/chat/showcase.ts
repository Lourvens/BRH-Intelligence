import { bicConsultationsChart, servicePointsDonut } from "./artifacts";
import {
  bicCitation,
  bicConsultationsCitation,
  inflationCitation,
  servicePointsCitation,
} from "./citations";
import { agenciesBar, inflationArea } from "./gallery";
import { creditNetwork } from "./network-artifact";
import { institutionalTree } from "./tree-artifact";
import type { ChatThread } from "./types";

export const showcaseThread: ChatThread = {
  id: "showcase-multimessage",
  title: "Galerie multi-messages",
  updatedAt: "1 oct.",
  group: "Cette semaine",
  messages: [
    {
      id: "showcase-q1",
      role: "user",
      content: "Commence par une lecture longue de l’inflation.",
    },
    {
      id: "showcase-a1",
      role: "assistant",
      content:
        "La série annuelle permet de lire la trajectoire complète, pas seulement le dernier point. La forme de l’aire aide à repérer les paliers et les accélérations, tandis que la note mensuelle documente le passage de 32,2 % à 28,3 % entre octobre et novembre 2025.",
      citations: [inflationCitation],
      artifacts: [inflationArea],
    },
    {
      id: "showcase-q2",
      role: "user",
      content: "Ajoute les consultations HIT et non-HIT du BIC.",
    },
    {
      id: "showcase-a2",
      role: "assistant",
      content:
        "Les deux séries se lisent ensemble : la montée en charge des consultations HIT est bien plus marquée que celle des non-HIT, puis les deux trajectoires se replient. Le graphique conserve les deux échelles dans une même unité de lecture.",
      citations: [bicConsultationsCitation],
      artifacts: [bicConsultationsChart],
    },
    {
      id: "showcase-q3",
      role: "user",
      content: "Montre la répartition des agences complètes.",
    },
    {
      id: "showcase-a3",
      role: "assistant",
      content:
        "Le donut donne la composition des 445 agences : banques, coopératives et institutions de microfinance. La même table est ensuite proposée en barres, plus lisible quand on compare les effectifs.",
      citations: [servicePointsCitation],
      artifacts: [servicePointsDonut],
    },
    {
      id: "showcase-q4",
      role: "user",
      content: "Passe la répartition en barres pour comparer les ordres de grandeur.",
    },
    {
      id: "showcase-a4",
      role: "assistant",
      content:
        "La vue en barres rend les écarts plus faciles à comparer, notamment entre les 172 IMF et les 175 banques. Le donut reste utile pour la part relative ; la barre est préférable pour la lecture des effectifs.",
      citations: [servicePointsCitation],
      artifacts: [agenciesBar],
    },
    {
      id: "showcase-q5",
      role: "user",
      content: "Et l’arbre institutionnel complet, avec ses branches ?",
    },
    {
      id: "showcase-a5",
      role: "assistant",
      content:
        "L’arbre place la BRH à la racine, puis sépare le BIC, la supervision des coopératives et la stratégie d’inclusion financière. Les branches terminales portent les consultations du BIC et les indicateurs d’inclusion. La vue Réseau permet de relire les mêmes liens comme un graphe, et la vue Diagramme comme un flux.",
      citations: [bicCitation, servicePointsCitation],
      artifacts: [institutionalTree],
    },
    {
      id: "showcase-q6",
      role: "user",
      content: "Termine par le réseau des usages du BIC.",
    },
    {
      id: "showcase-a6",
      role: "assistant",
      content:
        "Le réseau ne se réduit pas à une chaîne : les consultations HIT renvoient vers le BIC, le BIC éclaire la supervision, et la stratégie d’inclusion financière relie les coopératives aux points de service. C’est un graphe avec plusieurs chemins, pas un arbre.",
      citations: [bicCitation, bicConsultationsCitation],
      artifacts: [creditNetwork],
    },
  ],
};
