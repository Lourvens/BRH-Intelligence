import {
  bicCitation,
  brhCitation,
  cooperativesCitation,
  inflationCitation,
  servicePointsCitation,
} from "./citations";
import type { ChatCitation, ChatThread } from "./types";

export const longDocumentCitations: ChatCitation[] = [
  inflationCitation,
  brhCitation,
  bicCitation,
  cooperativesCitation,
  servicePointsCitation,
];

export const longDocumentContent = `# Note de synthèse — lire les publications de la BRH

Cette note de démonstration rassemble, en un seul fil, plusieurs façons de lire le corpus : un cadre institutionnel, des indicateurs conjoncturels, une lecture de l’inclusion financière et des repères de crédit. Elle ne remplace pas les documents originaux ; chaque affirmation renvoie à une publication et à une page.

> « La création de la Banque de la République d’Haïti (BRH) a été actée par la loi du 17 août 1979, après la scission de la Banque Nationale de la République d’Haïti (BNRH) en deux entités indépendantes. »

## 1. Le cadre institutionnel

La BRH est une banque centrale : son rôle ne se limite pas à la conduite de la politique monétaire. Elle supervise aussi des acteurs du système financier et produit des documents de référence sur l’inclusion financière, le crédit et la stabilité.

### Trois repères à retenir

- **1979** — la loi du 17 août 1979 acte la création de la BRH.
- **Avril 2013** — le Bureau d’Information sur le Crédit (BIC) est mis en service.
- **Décembre 2013** — le système financier compte 2 476 points de service.

Ces repères ne racontent pas, à eux seuls, l’histoire du système financier. Ils donnent cependant une chronologie utile pour situer les publications les unes par rapport aux autres.

## 2. L’inflation en novembre 2025

En novembre 2025, l’inflation annuelle s’est établie à **28,3 %**, contre **32,2 %** en octobre. La note mensuelle décrit une décélération en variation mensuelle comme en rythme annuel.

> « En novembre 2025, le taux d’inflation s’est décéléré tant en variation mensuelle qu’en rythme annuel. Sur une base annuelle, il est passé de 32,2 % en octobre 2025 à 28,3 % au cours du mois sous revue. »

La lecture doit rester prudente : un ralentissement du rythme annuel n’est pas une baisse des prix. Il indique que la variation sur douze mois est moins forte que le mois précédent.

### Ce que l’on peut dire

- Le mouvement est documenté par une source mensuelle.
- La comparaison porte sur deux mois consécutifs.
- La note ne permet pas, à elle seule, d’expliquer les causes du mouvement.

## 3. L’inclusion financière

La Stratégie Nationale d’Inclusion Financière donne une photographie du réseau : **2 476 points de service** en décembre 2013, dont **445 agences complètes** et **2 031 points de cash-in/cash-out**.

Le même document recense **97 coopératives d’épargne et de crédit** sous la tutelle de la Banque centrale. Ces deux chiffres ne mesurent pas la même chose : l’un décrit la présence physique, l’autre le nombre d’institutions supervisées.

> « Les coopératives d’épargne et de crédit opèrent sous la tutelle de la Banque centrale ; le document en recense 97. »

## 4. Le crédit et le BIC

Le BIC est mis en service en avril 2013. Il s’inscrit dans un effort plus large d’organisation de l’information sur le crédit. Les publications du BIC permettent de suivre les consultations de rapports de crédit et de distinguer les consultations HIT des consultations non-HIT.

- **Montée en charge** : les consultations HIT progressent fortement après 2016—2017.
- **Repli** : elles reculent ensuite jusqu’à l’exercice 2021—2022.
- **Dernier exercice disponible** : 49 423 consultations HIT et 13 240 non-HIT.

Le BIC illustre une idée simple : la donnée de crédit n’est pas seulement un chiffre ; elle a une histoire institutionnelle et des usages qui évoluent.

## 5. Tableau de repères

| Repère | Période | Lecture |
|---|---|---|
| Création de la BRH | 17 août 1979 | Scission de la BNRH |
| Mise en service du BIC | Avril 2013 | Organisation de l’information sur le crédit |
| Points de service | Décembre 2013 | 2 476 points, dont 445 agences |
| Coopératives supervisées | 2013 | 97 institutions |
| Inflation annuelle | Novembre 2025 | 28,3 %, contre 32,2 % en octobre |

## 6. Limites de lecture

Cette note est une démonstration de mise en forme. Elle ne construit pas de prévision, ne compare pas des séries qui ne sont pas comparables et ne complète pas les lacunes du corpus.

> « Chaque réponse renvoie à un document et à une page. » — Principe de l’assistant documentaire.

Pour prolonger la lecture, on peut consulter [le corpus documentaire](/brh-corpus), puis ouvrir les documents cités.

### En une phrase

**La valeur d’une réponse documentaire tient autant à ce qu’elle cite qu’à la manière dont elle délimite ce qu’elle ne dit pas.**

*Note de démonstration · contenu préenregistré · les chiffres renvoient aux pages citées.*`;

export const longDocumentThread: ChatThread = {
  id: "note-de-synthese",
  title: "Note de synthèse — lecture longue",
  updatedAt: "10:42",
  group: "Aujourd’hui",
  messages: [
    {
      id: "note-q",
      role: "user",
      content:
        "Génère une note de synthèse longue sur les publications de la BRH.",
    },
    {
      id: "note-a",
      role: "assistant",
      content: longDocumentContent,
      citations: longDocumentCitations,
    },
  ],
};
