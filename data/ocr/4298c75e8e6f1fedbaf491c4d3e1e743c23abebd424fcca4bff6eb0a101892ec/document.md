<!-- page 1 -->

# Stabilité du système bancaire et stress tests en Haïti : une approche bayésienne et quantile des risques systémiques

Jean Marie Cayemitte et Jean Sobocoeur Chrisin $ ^{*} $

Direction de la Recherche en Economie et Finance (DREF)

Banque de la Republique d'Haiti (BRH)

Juillet 2026

## Résumé

Cet article examine la stabilité du système bancaire haïtien à l'aide d'un cadre combinant un VAR Bayésien (BVAR) et une extension par quantiles, appliqué à des données annuelles (2000-2024). Cette approche, conçue pour les petits échantillons, permet de capturer les non-linéarités et les asymétries « régime-dépendantes » des relations macrofinancières, dépassant ainsi les limites des modèles linéaires standard. Les résultats révèlent une élasticité du rendement sur actifs à la croissance variant de 0,05 (en période de crises) à 0,12 (durant l'expansion), rejetant l'hypothèse de linéarité. La probabilité de défaut systémique atteint 15,2% sous stress politique, avec un ratio de capital comptable établi à 7,4%, dépassant le seuil réglementaire de 5%. Les mesures de risque systémique convergent entre BVAR et approche quantile (VaR systémique : 30,4-32,1M USD à 95%). L'étude propose un cadre applicable aux petites économies ouvertes et recommande un renforcement prudentiel, incluant un coussin anticyclique.

Mots clés : Stabilité bancaire, VAR bayésien, régression quantile, stress tests, risque systémique.

<!-- page 2 -->

## 1 Introduction

La résilience des systèmes bancaires face aux chocs macroéconomiques constitue un enjeu critique de stabilité financière, particulièrement dans les économies en développement caractérisées par une volatilité structurelle élevée (Mishkin, 1996; Levine, 2005). Dans le contexte haïtien, cette problématique revêt une acuité particulière au regard d'une triple vulnérabilité : une instabilité macroéconomique chronique (croissance moyenne de 0,87% sur 2000-2024 avec des fluctuations de -5,65% à +5,89%), une exposition récurrente aux chocs politiques et une sensibilité accrue aux catastrophes naturelles. Pourtant, malgré l'importance stratégique du secteur bancaire, très peu d'études ont à ce jour proposé, à notre connaissance, une analyse quantitative systématique de la résilience bancaire en Haïti à l'aide d'outils économétriques avancés.

La littérature existante s'est principalement concentrée sur les grandes économies ou les marchés émergents (Bassett et al., 2021), laissant un vide analytique concernant les petites économies ouvertes aux données limitées. Les approches conventionnelles, souvent linéaires et strictement fréquentistes, peinent à capturer les non-linéarités et asymétries susceptibles de caractériser les relations macro-financières dans des environnements volatiles (Caggiano et al., 2017). Par ailleurs, l'application des modèles VAR standards se heurte à la « malédiction de la dimensionnalité » dans des contextes d'échantillons réduits, limitant leur utilité là où les séries temporelles longues et de haute fréquence font défaut.

Les avancées méthodologiques récentes en économétrie bayésienne (Giannone et al., 2015; Koop, 2013; Korobilis, 2013) et en analyse quantile (Chavleishvili & Manganelli, 2024) offrent des pistes prometteuses. Le modèle Vectoriel Autotégressif Bayésien (BVAR), avec ses priors de Minnesota, permet de surmonter les problèmes de surparamétrisation inhérents aux petits échantillons. Son extension quantile permet de quantifier les non-linéarités dans les mécanismes de transmission, particulièrement importantes pour l'évaluation des risques en queue de distribution. Dao & Nguyen (2025) démontrent comment les modèles de régression quantile bayésienne avec a-priori de rétrécissement (shrinkage priors) sont idéaux pour identifier les facteurs de risque clés prédisant les risques de queue des banques. Leur approche permet de traiter des bases de données de grande dimension en une seule étape, contrairement aux modèles factoriels, et offre une meilleure interprétabilité en nommant des variables spécifiques plutôt que des facteurs composites. Ils montrent que des indicateurs de levier, les prix d'actifs et des mesures du marché du travail sont les meilleurs prédicteurs.

Cependant, trois lacunes principales subsistent :

1. Lacune méthodologique adaptative : Bien que les modèles BVAR et quantiles soient documentés théoriquement (Koop, 2013; Chavleishvili & Manganelli, 2024), leur application combinée et adaptée aux contraintes extrêmes des petites économies à données limitées reste rarement explorée. L'absence de modules d'estimation BQVAR spécialisés nécessite des approches créatives en deux étapes encore non documentées pour ce type de contexte.

2. Lacune empirique contextuelle : Aucune étude n'a systématiquement appliqué

<!-- page 3 -->

ces outils avancés au système bancaire haïtien. Les rares travaux sur la stabilité financière en Haïti se limitent généralement à des analyses descriptives ou à des modèles univariés (FMI, 2008), échouant à capturer les interdépendances complexes du système.

3. Lacune d'intégration théorico-empirique : La littérature néglige souvent la nécessaire adaptation des structures de variables (niveau vs. différences) pour conjuguer stationnarité statistique et pertinence économique interprétable dans des contextes de forte non-stationnarité comme celui d'Haïti. De plus, les cadres de stress tests dérivés des quantiles extrêmes pour évaluer la résilience systémique restent peu développés.

Notre recherche répond à ce triple déficit à travers trois contributions distinctes. Premièrement, nous implémentons le premier cadre combiné BVAR-quantile spécifiquement adapté aux contraintes de données haïtiennes. Cette approche duale permet d'estimer simultanément les relations moyennes (BVAR) et leurs variations conditionnelles aux régimes économiques (approche quantile). Deuxièmement, nous développons une structure de variables mixte intégrant des séries en niveau (PIB, taux d'intérêt réel) et en différences premières (taux de change, inflation, indicateurs bancaires), résolvant ainsi le dilemme entre stationnarité statistique et pertinence économique. Troisièmement, nous élaborons un cadre de stress testing fondé sur les quantiles extrêmes, offrant une évaluation probabiliste des vulnérabilités systémiques avec des implications réglementaires directes.

Sur le plan empirique, cette étude répond à trois interrogations complémentaires :

(1) Quelle est la résilience du système bancaire haïtien face aux chocs macroéconomiques typiques ?

(2) Comment les canaux de transmission variant-ils selon les régimes économiques ?

(3) Comment recalibrer les mesures conventionnelles de risque pour mieux refléter les spécificités locales ?

Au-delà de son apport spécifique au cas haïtien, ce travail établit un cadre méthodo-logique reproductible pour l'analyse de la stabilité bancaire dans les petites économies ouvertes aux données limitées.

Sur le plan réglementaire, il convient de souligner que le système bancaire haïtien a connu une transition majeure avec l'entrée en vigueur de la Circulaire n° 88-1 le 1er avril 2021, remplaçant la Circulaire n° 88 de 1998. Cette nouvelle norme introduit une distinction fondamentale entre le ratio de levier (Actif / Fonds propres) et le ratio de solvabilité basé sur les risques (RAR). Afin d'assurer une continuité statistique rigoureuse sur la période 2000-2024, la présente étude privilégie l'utilisation du ratio de capital comptable (Avoir / Actif). Dans le cadre de la Circulaire 88-1, ce ratio correspond désormais au ratio de levier, dont le multiple maximal autorisé est de 20 fois l'actif (soit un seuil de conformité de 5%). Parallèlement, les exigences de fonds propres pondérés par les risques (RAR) ont été relevées à un minimum de 12%, atteignant 14,5% en incluant le volant de conservation (Banque de la République d'Haïti, 2021). Bien que la nature agrégée des données historiques limite le calcul rétroactif du RAR sur 25 ans, nos simulations de stress

<!-- page 4 -->

tests intègrent ces nouveaux paliers pour évaluer la résilience structurelle du système face aux chocs macroéconomiques.

La suite de l'article s'article autour de cinq sections complémentaires. La section 2 présente le cadre méthodologique détaillé, incluant la sélection et la transformation des variables, la spécification des modèles BVAR et quantile, et la procédure de validation. La section 3 expose les résultats d'estimation du modèle BVAR, avec un accent particulier sur les fonctions de réponse impulsionnelle et la décomposition de la variance. La section 4 analyse les non-linéarités à travers le modèle quantile et l'examen de la variabilité des coefficients à travers les différents quantiles. La section 5 détaille les résultats des stress tests bancaires basés sur des scénarios calibrés à partir des quantiles extrêmes. Enfin, la section 6 conclut et discute les implications de politique économique.

## 2 Cadre méthodologique

### 2.1 Données et sélection des variables

L'étude utilise des données annuelles couvrant la période 2000-2024, soit 25 observations. Bien que certaines séries soient disponibles sur une base trimestrielle, la fréquence annuelle a été privilégiée pour garantir la cohérence temporelle de l'ensemble des variables, compte tenu de la disponibilité limitée et de l'hétérogénéité des données macroéconomiques et financières en Haïti. Cette contrainte est caractéristique des petites économies en développement et justifie le recours à des méthodes économétriques adaptées aux petits échantillons (Caggiano et al., 2017). Toutes les séries proviennent de sources officielles : la Banque de la République d'Haïti (données économiques et financières), la Banque Mondiale (indicateurs institutionnels), et la base EM-DAT (catastrophes naturelles).

Le modèle intègre sept variables endogènes structurées selon une approche mixte pour conjuguer exigence de stationnarité et pertinence économique. Deux variables sont maintenues en niveau : le taux de croissance du produit intérieur brut réel (PIBtx_niveau) et le taux d'intérêt réel (IntReel_niveau) $ ^{1} $. Le maintien du taux d'intérêt réel en niveau, conjugué à l'inclusion de l'inflation en différence première, répond à une triple exigence :

(1) respecter les propriétés de stationnarité distinctes des séries (le taux réel est stationnaire en niveau alors que l'inflation nécessite différenciation),

(2) capturer séparément le coût effectif du crédit (via le taux réel) et l'effet d'érosion du pouvoir d'achat (via l'inflation),

(3) éviter les problèmes de colinéarité et d'identification qui surviendraient avec une spécification intégrée.

Cette approche permet notamment d'isoler l'impact spécifique du coût du financement sur la solvabilité des emprunteurs dans un système financier à faible profondeur, tout en respectant les contraintes économétriques imposées par la taille limitée de l'échantillon.

<!-- page 5 -->

Cinq variables sont transformées en différences premières pour assurer leur stationnarité : le taux de change gourde/dollar (d_TxCh), le taux d'inflation (d_Infl), le ratio de fonds propres (d_RatioFA), les prêts non performants (d_Pretsitx) et le rendement sur actifs (d_ROA).

Trois variables exogènes complètent le système pour isoler les chocs spécifiques : les transferts de la diaspora en différence première (d_Transf), un indicateur binaire d'instabilité politique (InstPol) prenant la valeur 1 lors des années de crises politiques majeures, et un indicateur binaire de catastrophes naturelles (CatNatM) activé pour les événements à impact systémique (séismes, ouragans).

### 2.2 Tests de stationnarité et spécification du modèle

Les propriétés de stationnarité des séries sont vérifiées via le test de Dickey-Fuller augmenté (ADF), les tests de Phillips-Perron (PP) et de KPSS. Le critère d'information bayésien (BIC) a été retenu pour la sélection du nombre optimal de retards. Les résultats (Tableau 1) confirment la nécessité de transformer certaines variables.

TABLE 1 – Résultats des tests de stationnarité en niveau

| Variable | ADF Stat | ADF p | PP p | KPSS stat |
| --- | --- | --- | --- | --- |
| PIBtx | -4.2927 | 0.01 | 0.01 | 0.4176 |
| Infl | -1.9251 | 0.487 | 0.5721 | 0.3368 |
| TxCh | 0.4504 | 0.8097 | 0.9021 | 0.7761 |
| IntReel | -5.1899 | 0.01 | 0.041 | 0.2758 |
| ROA | -2.9964 | 0.1826 | 0.2085 | 0.2085 |
| RatioFA | -1.1999 | 0.3236 | 0.2818 | 0.8162 |
| RatioDA | -0.1307 | 0.6035 | 0.1937 | 0.705 |
| Pretsitx | -1.4315 | 0.8768 | 0.7788 | 0.259 |
| Transf | 0.9487 | 0.7109 | 0.8641 | 0.8875 |

Note : Fourni uniquement à titre indicatif, le ratio dépôts/actifs (RatioDA) a été excluì par souci de parcimonie.

Source : Auteurs

Le modèle BVAR suit la spécification standard :

 $$ Y_{t}=A_{0}+\sum_{i=1}^{p}A_{i}Y_{t-i}+\sum_{j=1}^{q}B_{j}X_{t-j}+\varepsilon_{t},\quad\varepsilon_{t}\sim N(0,\Sigma) $$

où  $ Y_t $ représente le vecteur des 7 variables endogènes,  $ X_t $ le vecteur des 3 variables exogènes, et  $ \varepsilon_t \sim N(0, \Sigma) $ (vecteur des termes d'erreur qui suit une loi normale).

L'ordre des retards $p=1$ a été sélectionné sur la base du critère BIC afin de minimiser la perte de degrés de liberté liée à la petite taille de l'échantillon ($n=25$), tandis que

<!-- page 6 -->

l'ordre q pour les variables exogènes a été maintenu à 1 pour préserver la parcimonie du modèle.

### 2.3 Estimation bayésienne et choix de priors

L'estimation repose sur une approche bayésienne avec priors de Minnesota, une méthode dont la supériorité est établie pour les modèles VAR appliqués aux petits échantillons (Koop, 2013). En imposant une structure de rétrécissement (shrinkage), cette approche permet d'extraire des signaux significatifs tout en neutralisant le bruit statistique inhérent aux 25 observations annuelles.

Les hyperparamètres sont calibrés comme suit :

—  $ \lambda_{1}=0,2 $ pour les coefficients propres, reflétant une persistance attendue modérée;

—  $ \lambda_{2}=0,1 $ pour les coefficients croisés, traduisant l'hypothèse des interactions plus faibles entre variables;

—  $ \lambda_{3}=0 $, 5 pour la décroissance harmonique des coefficients en fonction des retards.

L'estimation est réalisée par échantillonnage de Gibbs sur 5 000 itérations, dont 1 000 sont rejetées en phase de burn-in. La convergence des chaînes est diagnostiquée à l'aide des statistiques de Gelman-Rubin.

L'identification structurelle repose sur une décomposition de Cholesky avec l'ordre de causalité prédictive suivant :

Variables exogènes  $ \rightarrow $ PIBtx  $ \rightarrow $ inflation  $ \rightarrow $ taux de change  $ \rightarrow $ taux d'intérêt réel  $ \rightarrow $ indicateurs bancaires

Cet ordre reflète la structure typique des petites économies ouvertes où les chocs externes et réels précédent les ajustements monétaires et financiers domestiques (Ostry et al., 2012). Cette séquence est cohérente avec la littérature sur les économies en développement caractérisées par : (1) une forte sensibilité aux chocs externes, (2) une transmission rapide des chocs réels aux prix domestiques, et (3) des ajustements monétaires et financiers qui opèrent avec des retards institutionnels et de marché.

### 2.4 Extension quantile : Modèle de régressions quantiles bayésiennes avec pénalisation LASSO (Approche en deux étapes)

En raison de l'indisponibilité de packages spécialisés pour l'estimation BQVAR intégrée, nous adoptons une approche en deux étapes.

Pour chaque quantile  $ \tau \in \{0, 0.5; 0, 25; 0, 50; 0, 75; 0, 95\} $, le modèle suivant est estimé séparément pour chaque variable endogène :

 $$ Q_{y_{i}}(\tau|\boldsymbol{F}_{t-1})=\alpha_{i}(\tau)+\sum_{j=1}^{7}\beta_{i,j}(\tau)y_{j,t-1}+\sum_{k=1}^{3}\gamma_{i,k}(\tau)x_{k,t}+\varepsilon_{i,t}(\tau) $$

où  $ Q_{y_i}(\tau|F_{t-1}) $ désigne le quantile  $ \tau $ conditionnel de la variable  $ y_i $, compte tenu de l'ensemble d'information  $ F_{t-1} $ disponible à  $ t-1 $.

<!-- page 7 -->

L'estimation repose sur la minimisation de la fonction de perte quantile « check function » standard :

 $$ \min_{\theta_{i}(\tau)}\sum_{t=1}^{T}\rho_{\tau}\left(y_{i,t}-X_{t}^{\prime}\theta_{i}(\tau)\right),\quad\mathrm{o u}\rho_{\tau}(u)=u(\tau-\mathbf{1}_{u<0}) $$

Un terme de pénalisation LASSO est introduit afin de limiter les problèmes de surparamétrisation, avec  $ \lambda $ le paramètre de régularisation (norme  $ L_1 $). Cette approche est en effet appliquée pour gérer les problèmes de dimensionnalité, avec sélection du paramètre  $ \lambda $ par validation croisée sur 3 blocs temporellement ordonnées (pour contrôler l'intensité de la pénalisation) (Hyndman & Athanasopoulos, 2018).

### 2.5 Procédures de validation et tests de robustesse

La validation du modèle repose sur quatre procédures complémentaires :

1. Tests de diagnostic des résidus : Tests de Ljung-Box pour l'autocorrélation (jusqu'au lag 4), tests ARCH pour l'hétéroscédasticité et tests de Jarque-Bera pour la normalité.

2. Validation hors échantillon : Division des données en échantillon d'entraînement (2000-2017) et de test (2018-2024), avec calcul du RMSE relatif pour chaque variable.

3. Analyses de sensibilité : Variations systématiques des hyperparamètres des priors  $ (\lambda_1 \in [0,1;0,3], \lambda_2 \in [0,05;0,15]) $ et de l'ordre des retards  $ (p \in \{1,2\} $.

4. Tests de stabilité structurelle : Procédures CUSUM et tests de Chow pour détecter d'éventuels bris structurels.

La performance prédictive est évaluée via le ratio RMSE relatif (RMSE du modèle divisé par RMSE d'un modèle naïf de persistance), avec des valeurs inférieures à 1 indiquant une performance supérieure.

### 2.6 Cadre de stress testing

Les stress tests bancaires sont construits à partir des quantiles extrêmes estimés à partir du modèle BQVAR en deux étapes (modèle bayésien-quantile avec Lasso), ce qui permet de simuler explicitement des trajectories macrofinancières conditionnelles à des états de stress sévère.

Trois scénarios de stress sont élaborés :

— Scénario 1 - Crise politique ( $ \tau = 0,25 $): Combinaison de contraction économique (-5%), poussée inflationniste (+15%), et dépréciation de la monnaie (+25%).

— Scénario 2 - Catastrophe naturelle ( $ \tau = 0,05 $): Choc plus prononcé sur l'activité (-8%) avec augmentation compensatoire des transferts (reflétant les mécanismes de solidarité).

— Scénario 3 - Crise financière ( $ \tau = 0,05 $, variante financière) : Focus sur la détérioration rapide des conditions financières et bancaires.

<!-- page 8 -->

Deux indicateurs complémentaires de risque systémique sont mobilisés :

— La probabilité de défaut (PD) estimée à l'aide d'un modèle logistique, dans lequel les variables explicatives sont issues des trajectories simulées par les modèles BVAR et quantile;

— La Value-at-Risk systémique (VaR) au seuil de 95% calculée selon la formule :

 $$ \mathrm{VaR}_{95\%}=\mathrm{EAD}\times\mathrm{PD}\times\mathrm{LGD}\times k_{VaR} $$

avec EAD (Exposition at Default) fixé à 100 millions USD, LGD (Loss Given Default) $ ^{2} $ fixé à 45% (correspondant à une valeur médiane observée pour les économies en développement selon Demirguc-Kunt et al. (2013)) et  $ k_{VaR} $ fixé à 2,5.

Ce cadre méthodologique rigoureux mais pragmatique permet de surmonter les limitations des données haïtiennes (période restreinte 2000-2024, faible degré de granularité) tout en produisant des résultats robustes et économiquement interprétables, comme le démontreront les sections suivantes.

## 3 Résultats du modèle BVAR et analyse des dynamiques macro-financières

### 3.1 Qualité d'ajustement et diagnostics du modèle

L'estimation du modèle BVAR produit des résultats robustes avec une convergence satisfaisante des algorithms MCMC, attestée par des statistiques de Gelman-Rubin inférieures à 1,05 pour l'ensemble des paramètres, ce qui atteste d'une exploration adéquate à posteriori. Cette convergence est obtenue malgré la taille limitée de l'échantillon, confirmant l'intérêt de l'approche bayésienne dans les contextes de données restreintes. Le  $ R^{2} $ ajusté moyen s'établit à 0,72, variant de 0,65 pour la variable d'inflation à 0,81 pour le PIB, indiquant une capacité explicative globalement raisonnable compte tenu de la complexité des relations modélisées et de la taille limitée de l'échantillon.

Les diagnostics des résidus (Tableau 2) confirment l'adéquation de la spécification dynamique. Les tests de Ljung-Box ne rejettent pas l'hypothèse nulle d'absence d'autocorrélation des résidus jusqu'au lag 4 (p-values > 0,10). De même, les tests ARCH ne détectent pas d'hétéroscédasticité conditionnelle significative. En revanche, le test de Jarque-Bera rejette l'hypothèse de normalité pour certaines équations, notamment celles relatives au PIB, à l'inflation et à la rentabilité (ROA). Cette non-normalité, fréquente dans les séries macrofinancières, constitue un argument en faveur du recours à une modélisation conditionnelle par quantiles.

<!-- page 9 -->

TABLE 2 – Tests de diagnostic des résidus du modèle BVAR

| Variable | Ljung-Box (lag 4) | ARCH (lag 2) | Jarque-Bera |
| --- | --- | --- | --- |
| PIBtx_niveau | 0,112 | 0,234 | 0,045 $ ^{*} $ |
| d_TxCh | 0,287 | 0,156 | 0,118 |
| IntReel_niveau | 0,189 | 0,302 | 0,063 |
| d_Infl | 0,334 | 0,178 | 0,027 $ ^{*} $ |
| d_RatioFA | 0,256 | 0,421 | 0,155 |
| d_Pretsitx | 0,198 | 0,367 | 0,089 |
| d_ROA | 0,223 | 0,291 | 0,041 $ ^{*} $ |

$ ^{*} $ p < 0,05 indiquant un rejet de la normalité.

### 3.2 Fonctions de réponse impulsionnelle

Les fonctions de réponse impulsionnelle (FRI), calculées sur un horizon de huit périodes, à partir de la distribution a posteriori des paramètres et présentées avec des intervalles de créabilité à 95%, révèlent des dynamiques de transmission complexes et économiquement cohérentes. Les réponses aux chocs les plus significatifs sont présentées de manière détaillée en annexe (Figures 3 et 4), tandis que le tableau 3 synthétise les effets maximaux des principaux chocs qui seront analysés ci-après.

#### 3.2.1 Chocs de croissance économique

Un choc positif d'une déviation standard sur le PIB réel (≈+2,94 points) génère des ajustements progressifs dans l'ensemble du système macrofinancier. Le taux de change répond par une dépréciation maximale de 10,53 points observée après deux périodes (intervalle de crédibilité : [8,21 ; 12,85]), suivie d'un retour progressif vers l'équilibre. Cette réponse, conforme au modèle Mundell-Fleming, reflète l'effet combiné de l'augmentation des importations et des sorties de capitaux.

L'inflation montre une réponse positive avec un pic de 5,99 points atteint à l'horizon quatre périodes (IC95% : [4,12 ; 7,86]), illustrant les pressions de demande et les rigidités structurelles de l'offre. Les indicateurs bancaires réagissent de manière différenciée : les prêts non performants diminuent de 0,03 point avec une persistance sur six périodes (élasticité à la croissance : -0,010), tandis que le ROA s'améliore de 0,02 point après trois périodes (élasticité : +0,007). Le ratio de fonds propres enregistre une amélioration cumulative de 0,04 point, traduisant l'effet bénéfique de la croissance sur la solidité financière.

#### 3.2.2 Chocs de taux de change

Les chocs de dépréciation du taux de change (+2,59 points) produisent des effets macrofinanciers plus prononcés et moins favorables. Une dépréciation génère une réponse inflationniste significative (pass-through) avec un pic de 2,17 points après quatre périodes (IC95% : [1,45 ; 2,89]), confirmant l'importance du canal externe dans une économie haïtienne fortement dépendante des importations.

<!-- page 10 -->

Les effets sur le secteur bancaire sont négatifs et persistants. Le ROA subit une détérioration immédiate de 0,02 point, s'accentuant à 0,04 point après trois périodes. Cette réponse reflète l'effet double des dépréciations : augmentation des coûts d'exploitation (importations de biens intermédiaires) et dégradation de la qualité des actifs (dollarisation implicite des crédits). Les prêts non performants augmentent de 0,05 point avec un effet persistant (élasticité au taux de change : +0,019), tandis que le ratio de fonds propres enregistre une diminution cumulative de 0,03 point, signalant une érosion graduelle des coussins de capital.

#### 3.2.3 Chocs d'inflation

Les chocs inflationnistes (+11,2 points) ont des effets asymétriques et globalement défavorables sur le système financier. Une poussée inflationniste génère une réponse négative du ROA atteignant 0,03 point après deux périodes, résultat de l'érosion des marges d'intermédiation et de l'augmentation des coûts opérationnels. Les prêts non performants augmentent de 0,04 point, avec maximum atteint à l'horizon trois, reflétant la détérioration de la capacité de remboursement des emprunteurs face à l'érosion de leur pouvoir d'achat.

Le taux de change montre une dépréciation retardée de 0,03 point, suggérant des effets de second tour dans la dynamique des prix relatifs. La croissance économique réagit négativement avec un décalage, enregistrant une contraction de 0,02 point après trois périodes, confirmant l'effet récessif des chocs inflationnistes dans un contexte de faible indexation des salaires.

TABLE 3 – Effets maximaux dans les fonctions de réponse impulsionnelle

| Choc $ \rightarrow $ Variable | Effet Max | Horizon | Intervalle 95% |
| --- | --- | --- | --- |
| PIB $ \rightarrow $ d_TxCh | +10,53 | 2 | [8,21; 12,85] |
| PIB $ \rightarrow $ d_Infl | +5,99 | 4 | [4,12; 7,86] |
| d_TxCh $ \rightarrow $ d_Infl | +2,17 | 4 | [1,45; 2,89] |
| d_TxCh $ \rightarrow $ d_ROA | -0,04 | 3 | [-0,06; -0,02] |
| d_Infl $ \rightarrow $ d_Pretsitx | +0,04 | 3 | [0,02; 0,06] |
| InstPol $ \rightarrow $ d_Pretsitx | +0,06 | 3 | [0,04; 0,08] |

Source : Auteurs

#### 3.2.4 Impact des variables exogènes sur le système financier

Les effets des variables conditionnantes du modèle BVAR révèlent la sensibilité accrue du système financier aux facteurs non macroéconomiques. Un épisode d'instabilité politique (InstPol = 1) entraîne une augmentation immédiate des prêts non performants de 0,06 point (IC95% : [0,04 ; 0,08]), avec un pic observé après trois périodes. Le ROA montre une détérioration progressive atteignant -0,03 point à moyen terme. L'analyse des coefficients conditionnels révèle que ces effets sont d'une amplitude comparable à ceux associés à

<!-- page 11 -->

une contraction conditionnelle des transferts de la diaspora d'environ 0,3 milliard USD, soulignant le rôle stabilisateur implicite de ces flux dans l'atténuation des vulnérabilités financières.

Les catastrophes naturelles génèrent des effets plus complexes : contraction initiale de l'activité économique (-0,8 point) suivie d'une reprise progressive, et augmentation temporaire des transferts (+0,2 milliard USD) liée à l'aide internationale. L'effet net sur le ratio de fonds propre devient légèrement positif après quatre périodes, suggérant un rôle partiellement stabilisateur des flux externes.

### 3.3 Décomposition de la variance

La décomposition de la variance de l'erreur de prévision (Tableau 4) fournit des éclairages complémentaires sur la structure des chocs et leur persistance temporelle.

TABLE 4 – Décomposition de la variance (%) à différents horizons

| Variable | Horizon | Choc propre | Inflation | PIB | TxCh | Autres |
| --- | --- | --- | --- | --- | --- | --- |
| d_Pretsitx | 4 | 45,2 | 29,8 | 15,3 | 6,1 | 3,6 |
| d_Pretsitx | 8 | 40,1 | 34,7 | 14,9 | 7,3 | 3,0 |
| d_ROA | 4 | 39,8 | 25,4 | 19,7 | 10,2 | 4,9 |
| d_ROA | 8 | 35,3 | 29,6 | 18,4 | 12,1 | 4,6 |
| d_RatioFA | 4 | 54,6 | 24,8 | 5,3 | 4,2 | 11,1 |
| d_RatioFA | 8 | 49,7 | 29,5 | 6,1 | 5,4 | 9,3 |

Source : Auteurs

#### 3.3.1 Analyse par variable

À l'horizon de quatre périodes, la variance des prêts non performants s'explique à 45,2% par des facteurs idiosyncratiques, 29,8% par l'inflation, et 15,3% par la croissance économique. Cette structure évolue significativement à l'horizon de huit périodes, avec une diminution de la part des chocs sectoriels (40,1%) et une augmentation de la contribution de l'inflation (34,7%).

Le rendement sur actifs présente une structure différente avec 39,8% de variance attribuable aux chocs sectoriels à l'horizon quatre, 25,4% aux facteurs macroéconomiques (principalement inflation), et 10,2% au taux de change. Là encore, la contribution macroéconomique augmente avec l'horizon (29,6% à huit périodes).

Le ratio de fonds propres dépend majoritairement de facteurs propres (54,6% à quatre périodes), avec des contributions notables de l'inflation (24,8%) et, de manière plus originale, des transferts de la diaspora (8,9%, incluse dans "Autres"). Cette dernière contribution atteint 9,8% à l'horizon huit, soulignant le rôle stabilisateur structurel des flux externes.

<!-- page 12 -->

#### 3.3.2 Contributions transversales

L'analyse transversale révèle que l'inflation apparaît comme la variable explicative dominante du système, contribuant entre 25 et 35% de la variance des indicateurs financiers selon l'horizon et la variable considérée. Cette prédominance reflète l'importance des canaux de transmission nominale dans une économie faiblement indexée.

Les transferts de la diaspora expliquent une part significative de la variance du ratio de fonds propres (8,9-9,8%), mais aussi du PIB (6,2-7,1%) et du taux de change (4,3-5,2%). Cette contribution multifacette souligne la dépendance structurelle de l'économie haïtienne aux flux financiers externes.

La variance résiduelle importante attribuée aux chocs spécifiques sectoriels (30-45% selon les variables) indique que des facteurs non capturés par le modèle macroéconomique, probablement liés à la gouvernance bancaire, à la régulation sectorielle, ou à des chocs de liquidité, influencent substantiellement la dynamique du système financier haïtien.

### 3.4 Validations et robustesse

#### 3.4.1 Stabilité structurelle

Les tests de stabilité structurelle (CUSUM et tests de Chow) ne détectent pas de bris significatifs dans les coefficients sur la période 2000-2024, à l'exception d'un ajustement mineur en 2010, possiblement lié au séisme qui a affecté l'économie haïtienne.

#### 3.4.2 Performance prédictive hors échantillon

Les tests de robustesse hors échantillon (Tableau 5) révèlent que le modèle BVAR surpasse systématiquement le modèle de référence naïf par persistance. Le ratio moyen des RMSE, calculé comme la moyenne arithmétique des trois ratios RMSE (BVAR/modèle de persistance) obtenus sur les trois blocs temporellement ordonnées de la validation croisée, s'établit à 0,857, avec des performances particulièrement marquées pour le taux d'intérêt réel (0,690) et le PIB (0,720), tandis que l'inflation (0,940) et le taux de change (0,910) présentent des améliorations plus limitées. Ces résultats confirment la validité du modèle pour la prévision des variables clés du système macro-financier haïtien.

TABLE 5 – Performance predictive hors échantillon (2018-2024)

| Variable | RMSE Moyen | Écart-type RMSE | MAE Moyen | RMSE Relatif |
| --- | --- | --- | --- | --- |
| Taux d'intérêt réel | 0,1423 | 0,0648 | 0,1351 | 0,690 |
| PIB | 5,7201 | 1,7302 | 5,3005 | 0,720 |
| Ratio de fonds propres | 0,0126 | 0,0029 | 0,0112 | 0,890 |
| Taux de change | 11,0015 | 6,4403 | 8,6002 | 0,910 |
| Rendement sur actifs | 0,0140 | 0,0063 | 0,0119 | 0,920 |
| Prêts non performants | 0,0241 | 0,0030 | 0,0203 | 0,930 |
| Inflation | 11,2003 | 3,0804 | 9,1801 | 0,940 |

<!-- page 13 -->

Note : RMSE Relatif = RMSE (BVAR) / RMSE (Prévision naïve par persistance). Valeur < 1 indique une performance supérieure du modèle BVAR par rapport au modèle naïf de référence. MAE = Mean Absolute Error.

Source : Auteurs basés sur la validation croisée à 3 blocs (n = 25 observations, 2000-2024)

#### 3.4.3 Sensibilité aux spécifications

Les analyses de sensibilité confirment la robustesse des résultats principaux. La variation des hyperparamètres des priors ( $ \lambda_1 \in [0,1;0,3] $,  $ \lambda_2 \in [0,05;0,15] $) produit des changements mineurs dans l'amplitude des coefficients mais préserve leur signe et significativité. L'augmentation de l'ordre des retards à  $ p = 2 $ n'améliore pas significativement la qualité d'ajustement ( $ \Delta \text{BIC} = +3,2 $) et complique l'interprétation économique sans modifier substantiellement les relations identifiées.

### 3.5 Discussion et limites du cadre BVAR

Les résultats du modèle BVAR révèlent un système financier haïtien modérément résilient mais structurellement vulnérable à certains canaux de transmission. La persistance modérée des chocs (demi-vies de 3-5 périodes) suggère une capacité d'absorption à court terme mais également une lenteur des mécanismes d'ajustement qui peut amplifier les chocs prolongés.

La prédominance de l'inflation comme variable explicative, combinée à la sensibilité au taux de change, souligne l'importance cruciale de la stabilité macroéconomique nominale pour la santé du système bancaire. Cette dépendance est particulièrement préoccupante dans un contexte de forte volatilité inflationniste et de tendance structurelle à la dépréciation monétaire.

Le rôle stabilisateur des transferts, bien que modeste en amplitude, apparaît statistiquement significatif et économiquement pertinent. Ce résultat suggère que les politiques visant à renforcer et canaliser ces flux pourraient constituer un levier complémentaire pour la stabilité financière, au-delà de leurs effets macroéconomiques directs.

Enfin, l'importance des chocs idiosyncratiques (30-45% selon les variables) appelle à un approfondissement des analyses microprudentielles et sectorielles, indiquant que les vulnérabilités du système bancaire haïtien ne peuvent être pleinement comprises à travers le seul prisme macroéconomique.

Ces résultats, bien que riches d'enseignements, reposent sur des effets moyens conditionnels et supposent des relations linéaires et symétriques. Or, les diagnostics de non-normalité et l'importance des chocs extrêmes laissent présager que les mécanismes de transmission peuvent différer significativement dans les queues de distribution. Cette limitation motive l'introduction, dans la section suivante, de l'approche quantile, conçue pour capturer explicitement les asymétries et les risques macrofinanciers extrêmes.

<!-- page 14 -->

## 4 Analyse des non-linéarités par l'approche quantile

### 4.1 Méthodologie et validation de l'approche en deux étapes

L'analyse des non-linéarités repose sur une estimation du modèle quantile mise en œuvre selon une approche en deux étapes, adaptée aux contraintes de taille de l'échantillon. Le modèle est estimé sur cinq quantiles stratégiques ( $ \tau \in \{0, 0.5; 0, 25; 0, 50; 0, 75; 0, 95\} $). Au total, 175 coefficients conditionnels sont estimés (après sélection par le LASSO).

La validation de cette approche alternative est établie à partir de trois critères complémentaires. Premièrement, les tests de continuité des fonctions de coefficients entre quantiles adjacents (test de Wald pour discontinuités locales, p > 0,10 pour 92% des relations). Ensuite, la cohérence directionnelle avec le BVAR est élevée (concordance des signes à 87% pour le quantile médian), et enfin les intervalles de confiance obtenus par bootstrap (500 réplications) présentent une stabilité satisfaisante.

La Figure 1 illustre l'évolution interquantile des coefficients clés, en mettant en évidence les non-linéarités significatives pour certaines relations macro-financières, une dispersion interquantile marquée. Les écarts-types transversaux atteignent 0,25 pour les élasticités les plus sensibles au régime économique, contre seulement 0,10 pour les relations les plus stables.

<table>
  <thead><tr><th>Variable</th><th>Coefficient</th><th>0.25</th><th>0.50</th><th>0.75</th><th>1.00</th></tr></thead>
  <tbody>
    <tr><td>(Intercept)</td><td>1.0</td><td>-10.0</td><td>-5.0</td><td>0.0</td><td>5.0</td></tr>
    <tr><td>(Intercept)</td><td>0.5</td><td>-5.0</td><td>-2.0</td><td>2.0</td><td>5.0</td></tr>
    <tr><td>(Intercept)</td><td>0.0</td><td>0.0</td><td>2.0</td><td>5.0</td><td>8.0</td></tr>
    <tr><td>(Intercept)</td><td>-0.5</td><td>2.0</td><td>5.0</td><td>8.0</td><td>9.0</td></tr>
    <tr><td>(Intercept)</td><td>-1.0</td><td>5.0</td><td>8.0</td><td>9.0</td><td>9.0</td></tr>
    <tr><td>Xegox_CatNatM</td><td>1.0</td><td>10.0</td><td>8.0</td><td>5.0</td><td>2.0</td></tr>
    <tr><td>Xegox_CatNatM</td><td>0.5</td><td>5.0</td><td>2.0</td><td>0.0</td><td>-2.0</td></tr>
    <tr><td>Xegox_CatNatM</td><td>0.0</td><td>0.0</td><td>-2.0</td><td>-5.0</td><td>-8.0</td></tr>
    <tr><td>Xegox_CatNatM</td><td>-0.5</td><td>-2.0</td><td>-5.0</td><td>-8.0</td><td>-9.0</td></tr>
    <tr><td>Xegox_CatNatM</td><td>-1.0</td><td>-5.0</td><td>-8.0</td><td>-9.0</td><td>-9.0</td></tr>
    <tr><td>Xegox_d_Transf</td><td>1.0</td><td>0.0</td><td>-2.0</td><td>-5.0</td><td>-8.0</td></tr>
    <tr><td>Xegox_d_Transf</td><td>0.5</td><td>-2.0</td><td>-5.0</td><td>-8.0</td><td>-9.0</td></tr>
    <tr><td>Xegox_d_Transf</td><td>0.0</td><td>-5.0</td><td>-8.0</td><td>-9.0</td><td>-9.0</td></tr>
    <tr><td>Xegox_d_Transf</td><td>-0.5</td><td>-8.0</td><td>-9.0</td><td>-9.0</td><td>-9.0</td></tr>
    <tr><td>Xegox_d_Transf</td><td>-1.0</td><td>-9.0</td><td>-9.0</td><td>-9.0</td><td>-9.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>1.0</td><td>2.0</td><td>5.0</td><td>8.0</td><td>5.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>0.5</td><td>0.0</td><td>2.0</td><td>5.0</td><td>2.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>0.0</td><td>-2.0</td><td>-5.0</td><td>-8.0</td><td>-5.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-0.5</td><td>-5.0</td><td>-10.0</td><td>-15.0</td><td>-12.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-1.0</td><td>-12.0</td><td>-18.0</td><td>-22.0</td><td>-20.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-1.2</td><td>-15.0</td><td>-20.0</td><td>-25.0</td><td>-22.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-1.5</td><td>-20.0</td><td>-25.0</td><td>-28.0</td><td>-25.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-1.8</td><td>-25.0</td><td>-30.0</td><td>-32.0</td><td>-30.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-2.0</td><td>-30.0</td><td>-35.0</td><td>-38.0</td><td>-35.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-2.2</td><td>-35.0</td><td>-40.0</td><td>-42.0</td><td>-40.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-2.5</td><td>-40.0</td><td>-45.0</td><td>-48.0</td><td>-45.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-2.8</td><td>-45.0</td><td>-50.0</td><td>-52.0</td><td>-50.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-3.0</td><td>-50.0</td><td>-55.0</td><td>-58.0</td><td>-55.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-3.2</td><td>-55.0</td><td>-60.0</td><td>-62.0</td><td>-60.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-3.5</td><td>-60.0</td><td>-65.0</td><td>-68.0</td><td>-65.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-3.8</td><td>-65.0</td><td>-70.0</td><td>-72.0</td><td>-70.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-4.0</td><td>-70.0</td><td>-75.0</td><td>-78.0</td><td>-75.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-4.2</td><td>-75.0</td><td>-80.0</td><td>-82.0</td><td>-80.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-4.5</td><td>-80.0</td><td>-85.0</td><td>-88.0</td><td>-85.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-4.8</td><td>-85.0</td><td>-90.0</td><td>-92.0</td><td>-90.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-5.0</td><td>-90.0</td><td>-95.0</td><td>-98.0</td><td>-95.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-5.2</td><td>-95.0</td><td>-100.0</td><td>-102.0</td><td>-100.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-5.5</td><td>-100.0</td><td>-105.0</td><td>-108.0</td><td>-105.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-5.8</td><td>-105.0</td><td>-110.0</td><td>-112.0</td><td>-110.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-6.0</td><td>-110.0</td><td>-115.0</td><td>-118.0</td><td>-115.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-6.2</td><td>-115.0</td><td>-120.0</td><td>-122.0</td><td>-120.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-6.5</td><td>-120.0</td><td>-125.0</td><td>-128.0</td><td>-125.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-6.8</td><td>-125.0</td><td>-130.0</td><td>-132.0</td><td>-130.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-7.0</td><td>-130.0</td><td>-135.0</td><td>-138.0</td><td>-135.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-7.2</td><td>-135.0</td><td>-140.0</td><td>-142.0</td><td>-140.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-7.5</td><td>-140.0</td><td>-145.0</td><td>-148.0</td><td>-145.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-7.8</td><td>-145.0</td><td>-150.0</td><td>-152.0</td><td>-150.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-8.0</td><td>-150.0</td><td>-155.0</td><td>-158.0</td><td>-155.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-8.2</td><td>-155.0</td><td>-160.0</td><td>-162.0</td><td>-160.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-8.5</td><td>-160.0</td><td>-165.0</td><td>-168.0</td><td>-165.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-8.8</td><td>-165.0</td><td>-170.0</td><td>-172.0</td><td>-170.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-9.0</td><td>-170.0</td><td>-175.0</td><td>-178.0</td><td>-175.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-9.2</td><td>-175.0</td><td>-180.0</td><td>-182.0</td><td>-180.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-9.5</td><td>-180.0</td><td>-185.0</td><td>-188.0</td><td>-185.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-9.8</td><td>-185.0</td><td>-190.0</td><td>-192.0</td><td>-190.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-10.0</td><td>-190.0</td><td>-195.0</td><td>-198.0</td><td>-195.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-10.2</td><td>-195.0</td><td>-200.0</td><td>-202.0</td><td>-200.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-10.5</td><td>-200.0</td><td>-205.0</td><td>-208.0</td><td>-205.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-10.8</td><td>-205.0</td><td>-210.0</td><td>-212.0</td><td>-210.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-11.0</td><td>-210.0</td><td>-215.0</td><td>-218.0</td><td>-215.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-11.2</td><td>-215.0</td><td>-220.0</td><td>-222.0</td><td>-220.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-11.5</td><td>-220.0</td><td>-225.0</td><td>-228.0</td><td>-225.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-11.8</td><td>-225.0</td><td>-230.0</td><td>-232.0</td><td>-230.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-12.0</td><td>-230.0</td><td>-235.0</td><td>-238.0</td><td>-235.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-12.2</td><td>-235.0</td><td>-240.0</td><td>-242.0</td><td>-240.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-12.5</td><td>-240.0</td><td>-245.0</td><td>-248.0</td><td>-245.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-12.8</td><td>-245.0</td><td>-250.0</td><td>-252.0</td><td>-250.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-13.0</td><td>-250.0</td><td>-255.0</td><td>-258.0</td><td>-255.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-13.2</td><td>-255.0</td><td>-260.0</td><td>-262.0</td><td>-260.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-13.5</td><td>-260.0</td><td>-265.0</td><td>-268.0</td><td>-265.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-13.8</td><td>-265.0</td><td>-270.0</td><td>-272.0</td><td>-270.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-14.0</td><td>-270.0</td><td>-275.0</td><td>-278.0</td><td>-275.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-14.2</td><td>-275.0</td><td>-280.0</td><td>-282.0</td><td>-280.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-14.5</td><td>-280.0</td><td>-285.0</td><td>-288.0</td><td>-285.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-14.8</td><td>-285.0</td><td>-290.0</td><td>-292.0</td><td>-290.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-15.0</td><td>-290.0</td><td>-295.0</td><td>-298.0</td><td>-295.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-15.2</td><td>-295.0</td><td>-300.0</td><td>-302.0</td><td>-300.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-15.5</td><td>-300.0</td><td>-305.0</td><td>-308.0</td><td>-305.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-15.8</td><td>-305.0</td><td>-310.0</td><td>-312.0</td><td>-310.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-16.0</td><td>-310.0</td><td>-315.0</td><td>-318.0</td><td>-315.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-16.2</td><td>-315.0</td><td>-320.0</td><td>-322.0</td><td>-320.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-16.5</td><td>-320.0</td><td>-325.0</td><td>-328.0</td><td>-325.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-16.8</td><td>-325.0</td><td>-330.0</td><td>-332.0</td><td>-330.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-17.0</td><td>-330.0</td><td>-335.0</td><td>-338.0</td><td>-335.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-17.2</td><td>-335.0</td><td>-340.0</td><td>-342.0</td><td>-340.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-17.5</td><td>-340.0</td><td>-345.0</td><td>-348.0</td><td>-345.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-17.8</td><td>-345.0</td><td>-350.0</td><td>-352.0</td><td>-350.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-18.0</td><td>-350.0</td><td>-355.0</td><td>-358.0</td><td>-355.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-18.2</td><td>-355.0</td><td>-360.0</td><td>-362.0</td><td>-360.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-18.5</td><td>-360.0</td><td>-365.0</td><td>-368.0</td><td>-365.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-18.8</td><td>-365.0</td><td>-370.0</td><td>-372.0</td><td>-370.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-19.0</td><td>-370.0</td><td>-375.0</td><td>-378.0</td><td>-375.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-19.2</td><td>-375.0</td><td>-380.0</td><td>-382.0</td><td>-380.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-19.5</td><td>-380.0</td><td>-385.0</td><td>-388.0</td><td>-385.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-19.8</td><td>-385.0</td><td>-390.0</td><td>-392.0</td><td>-390.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-20.0</td><td>-390.0</td><td>-395.0</td><td>-398.0</td><td>-395.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-20.2</td><td>-395.0</td><td>-400.0</td><td>-402.0</td><td>-400.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-20.5</td><td>-400.0</td><td>-405.0</td><td>-408.0</td><td>-405.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-20.8</td><td>-405.0</td><td>-410.0</td><td>-412.0</td><td>-410.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-21.0</td><td>-410.0</td><td>-415.0</td><td>-418.0</td><td>-415.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-21.2</td><td>-415.0</td><td>-420.0</td><td>-422.0</td><td>-420.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-21.5</td><td>-420.0</td><td>-425.0</td><td>-428.0</td><td>-425.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-21.8</td><td>-425.0</td><td>-430.0</td><td>-432.0</td><td>-430.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-22.0</td><td>-430.0</td><td>-435.0</td><td>-438.0</td><td>-435.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-22.2</td><td>-435.0</td><td>-440.0</td><td>-442.0</td><td>-440.0</td></tr>
    <tr><td>Xegox_InstPol</td><td>-22.5</td><td>-440.0</td><td>-445.0</td><td>-448.0</td></tr>
  </tbody>
</table>

FIGURE 1 – Evolution des coefficients des principales variables macro-financières à travers les quantiles

### 4.2 Relations croissance-rentabilité bancaire : élasticités dépendantes du régime

L'examen de la relation entre croissance économique et rentabilité bancaire (ROA) met en évidence une élasticité croissante à travers les quantiles (Tableau 6). Au quantile 0,05 (situations de crise sévère), l'élasticité du ROA à la croissance n'est que de 0,05 (IC90% : [0,02 ; 0,08]), traduisant une capacité limitée du système bancaire à transformer

<!-- page 15 -->

les gains de croissance en profitabilité en période de stress. Cette faible sensibilité reflète les rigidités structurelles et inefficacités qui caractérisent le système bancaire durant les épisodes de contraction économique : rationnement du crédit, augmentation des provisions et compression des marges d'intermédiation.

TABLE 6 – Élasticités ROA à la croissance par quantile

| Quantile | Élasticité | Intervalle 90% | Interprétation |
| --- | --- | --- | --- |
| 0,05 | 0,05 | [0,02 ; 0,08] | Crises sévères |
| 0,25 | 0,07 | [0,04 ; 0,10] | Stress modéré |
| 0,50 | 0,08 | [0,06 ; 0,10] | Régime médian |
| 0,75 | 0,10 | [0,07 ; 0,13] | Croissance soutenue |
| 0,95 | 0,12 | [0,09 ; 0,15] | Expansion forte |

## Source : Auteurs

Au quantile médian (0,50), cette élasticité atteint 0,08 (IC90% : [0,06 ; 0,10]), se rapprochant des estimations standards de la littérature pour les économies en développement (Flamini et al., 2009). Dans le quantile 0,95 (périodes de forte expansion), l'élasticité s'élève à 0,12 (IC90% : [0,09 ; 0,15]), démontrant une sensibilité accrue de 140% par rapport au quantile de crise. Cette progression suggère que les établissements bancaires capturent plus efficacement les bénéfices de la croissance durant les phases expansionnistes, possiblement grâce à une meilleure allocation du crédit et à une gestion plus proactive des opportunités de marché.

La pente de la relation (différence d'élasticité entre quantiles extrêmes = 0,07) est statistiquement significative (test de pente = 3,42, p < 0,01), confirmant l'existence d'une non-linéarité économique substantielle. Cette variation a des implications importantes pour l'évaluation des risques : les modèles linéaires standards sous-estiment la vulnérabilité du système en période de crise (-30% d'erreur relative) et surestiment la sensibilité en expansion (+50%), avec des conséquences directes sur la calibration des stress tests.

### 4.3 Transmission inflation-prêts non performants : profil modérément concave

La transmission des chocs d'inflation vers les prêts non performants présente un profil modérément concave. Au quantile 0,05, l'élasticité est de 0,15 (IC90% : [0,11 ; 0,19]), soulignant la vulnérabilité accrue de la qualité du crédit aux pressions inflationnistes durant les épisodes de contraction économique. Cette sensibilité élevée peut s'expliquer par l'effet combiné de la détérioration du pouvoir d'achat des emprunteurs et de l'augmentation des taux d'intérêt réels dans un contexte de rigidités nominales.

<!-- page 16 -->

TABLE 7 - Élasticités prêts non performants à l'inflation par quantile

| Quantile | Élasticité | Intervalle 90% | Interprétation |
| --- | --- | --- | --- |
| 0,05 | 0,15 | [0,11 ; 0,19] | Crises sévères |
| 0,25 | 0,13 | [0,09 ; 0,16] | Stress modéré |
| 0,50 | 0,11 | [0,08 ; 0,18] | Régime médian |
| 0,75 | 0,09 | [0,07 ; 0,13] | Croissance soutenue |
| 0,95 | 0,08 | [0,05 ; 0,11] | Expansion forte |

Source : Auteurs

Cette élasticité décroît progressivement à travers les quantiles pour atteindre 0,08 au quantile 0,95 (IC90% : [0,05 ; 0,11]), soit une réduction de 47% en période d'expansion. Cette évolution suggère que, durant les phases de croissance robuste, les ménages et entreprises disposent de plus grandes capacités d'absorption des chocs de prix, limitant ainsi l'impact sur la qualité du crédit.

La forme concave de cette relation (coefficient de concavité = -0,023, p < 0,05) a des implications pour la politique monétaire : les autorités doivent être particulièrement vigilantes face à l'inflation durant les récessions, où ses effets sur la stabilité financière sont amplifiés.

### 4.4 Pass-through taux de change-inflation : asymétrie limitée mais significative

L'impact des variations de taux de change sur l'inflation montre une asymétrie en U inversé (Tableau 8). Au quantile 0,05, l'élasticité est de 0,20 (IC90% : [0,15 ; 0,25]), reflétant une transmission modérée en situation de crise. Cette élasticité augmente à 0,28 au quantile médian (IC90% : [0,23 ; 0,33]), avant de se stabiliser autour de 0,25 au quantile 0,95 (IC90% : [0,20 ; 0,30]).

TABLE 8 – Coefficient de pass-through taux de change  $ \rightarrow $ inflation

| Quantile | Coefficient | IC 90% | Variation vs 0,50 |
| --- | --- | --- | --- |
| 0,05 | 0,20 | [0,15 ; 0,25] | -28,6% |
| 0,25 | 0,24 | [0,19 ; 0,29] | -14,3% |
| 0,50 | 0,28 | [0,23 ; 0,33] | Référence |
| 0,75 | 0,26 | [0,21 ; 0,31] | -7,1% |
| 0,95 | 0,25 | [0,20 ; 0,30] | -10,7% |

Source : Auteurs

Cette configuration suggère que les mécanismes de pass-through opèrent différemment selon les régimes économiques. En période de stress, des mécanismes d'absorption, tels que les contrôles des prix (via interventions administratives) ou la compression des marges, pourraient atténuer la transmission. En régime médian, la transmission est plus complète,

<!-- page 17 -->

reflétant le fonctionnement normal des mécanismes de marché. En période de forte expansion, des rigidités nominales ou des stratégies de tarification pourraient également modérer la transmission.

La variabilité interquantile (écart-type = 0,028) est statistiquement significative (test F = 2,89, p < 0,05), invalidant l'hypothèse d'une relation linéaire constante.

### 4.5 Variables institutionnelles : sensibilités différenciées

Les coefficients associés aux variables de contrôle institutionnelles présentent des variations notables dépendantes des quantiles (Tableau 9). L'effet des transferts de la diaspora sur le ratio de fonds propres augmente de manière monotone, passant de 0,15 au quantile 0,05 à 0,35 au quantile 0,95 ( $ \Delta = +0,20 $, p < 0,01), confirmant le rôle stabilisateur croissant des flux externes en période favorable. Cette progression pourrait s'expliquer par une utilisation plus efficiente des transferts durant les phases expansionnistes, possiblement orientées vers l'investissement productif plutôt que vers la consommation courante.

TABLE 9 – Coefficients des variables institutionnelles par quantile

| Relation | $ \tau=0,05 $ | $ \tau=0,25 $ | $ \tau=0,50 $ | $ \tau=0,75 $ | $ \tau=0,95 $ | $ \Delta(0,95-0,05) $ |
| --- | --- | --- | --- | --- | --- | --- |
| Transf $ \rightarrow $ RatioFA | 0,15 | 0,22 | 0,28 | 0,32 | 0,35 | $ +0,20^{**} $ |
| InstPol $ \rightarrow $ NPL | 0,12 | 0,10 | 0,09 | 0,08 | 0,07 | $ -0,05^{*} $ |
| CatNatM $ \rightarrow $ PIB | -0,08 | -0,06 | -0,04 | -0,03 | -0,02 | $ +0,06^{*} $ |
| InstPol $ \rightarrow $ Transf | -0,25 | -0,20 | -0,18 | -0,15 | -0,12 | $ +0,13^{**} $ |

Note :  $ ^{*}p<0.05 $;  $ ^{**}p<0.01 $

Source : Auteurs

L'impact de l'instabilité politique sur les prêts non performants varie de 0,12 à 0,07 entre les quantiles extrêmes ( $ \Delta = -0,05 $, p < 0,05), indiquant une sensibilité décroissante aux chocs politiques en situation économique robuste. Cette réduction suggère qu'une économie en expansion dispose de mécanismes de résilience plus importants face aux turbulences politiques, possiblement grâce à des tampons de capital plus importants et à une diversification accrue des portefeuilles.

Les catastrophes naturelles montrent un impact négatif sur le PIB à tous les quantiles, mais d'intensité décroissante (de -0,08 à -0,02), suggérant une meilleure capacité de réponse aux chocs exogènes durant les expansions économiques.

### 4.6 Persistance des chocs : variabilité modérée selon les régimes

La persistance des chocs, mesurée par les coefficients autorégressifs (Tableau 10), montre une variabilité modérée mais systématique selon les régimes économiques.

<!-- page 18 -->

TABLE 10 – Coefficients autorégressifs moyens par quantile

| Variable | $ \tau=0,05 $ | $ \tau=0,25 $ | $ \tau=0,50 $ | $ \tau=0,75 $ | $ \tau=0,95 $ |
| --- | --- | --- | --- | --- | --- |
| PIB | 0,52 | 0,58 | 0,65 | 0,68 | 0,72 |
| Inflation | 0,48 | 0,53 | 0,61 | 0,64 | 0,67 |
| NPL | 0,62 | 0,65 | 0,68 | 0,70 | 0,73 |
| ROA | 0,45 | 0,50 | 0,55 | 0,60 | 0,65 |
| Moyenne | 0,52 | 0,57 | 0,62 | 0,66 | 0,69 |

Source : Auteurs

Au quantile 0,05, la persistance moyenne est de 0,52 contre 0,69 au quantile 0,95, suggérant une dynamique légèrement plus erratique en période de crise et plus lisse en période d'expansion. Cette différence de 33% dans la persistance a des implications importantes pour la conception des politiques de stabilisation : les chocs négatifs pourraient nécessiter des interventions plus fréquentes mais de moindre ampleur, tandis que les chocs positifs pourraient justifier des actions plus structurelles et durables.

### 4.7 Incertitude estimationnelle et tests de robustesse

L'analyse des intervalles de confiance révèle que l'incertitude estimationnelle est plus élevée dans les queues de distribution, avec des intervalles 25% plus larges au quantile 0,05 qu'au quantile médian. Cette hétéroscédasticité est statistiquement significative (test d'égalité des variances par bootstrap avec 500 réplications, p < 0,05), confirmant la difficulté accrue d'estimation dans les régimes extrêmes avec un échantillon limité. Elle suggère également la nécessité d'interpréter avec prudence les résultats relatifs aux quantiles extrêmes, particulièrement dans le contexte haïtien caractérisé par un nombre restreint d'observations de crise sévère.

Les tests de robustesse incluent :

1. La validation croisée : Les coefficients restent stables avec suppression de 20% des observations aléatoirement (variation moyenne < 0,03) même si le nombre limité d'observations nous appelle à la prudence.

2. La comparaison avec des méthodes alternatives : Approche à noyau $ ^{3} $ vs. régression quantile (corrélation > 0,85).

3. Les tests de spécification : les tests de Ramsey RESET ne rejettent pas la forme fonctionnelle (p > 0,10).

La cohérence des résultats à travers les quantiles a été vérifiée via l'examen de la continuité des fonctions de coefficients. Pour 85% des relations, les coefficients évoluent

<!-- page 19 -->

de manière progressive entre les quantiles adjacents (test de discontinuité, p > 0,10), supportant la robustesse des structures identifiées. Cependant, certaines discontinuités mineures apparaissent pour les relations impliquant les transferts et l'instabilité politique, suggérant des effets de seuil potentiels dans ces canaux de transmission.

### 4.8 Implications pour l'évaluation des risques

Les implications de ces non-linéarités pour l'évaluation des risques sont substantielles et multiples :

#### 4.8.1 Sous-estimation des vulnérabilités en crise

Les modèles linéaires standards sous-estiment systématiquement la vulnérabilité du système bancaire durant les épisodes de stress. Par exemple, pour la relation croissance-ROA, l'élasticité linéaire (0,08) sous-estime de 38% la sensibilité en crise (0,05 vs. projection linéaire de 0,065) et surestime de 33% la sensibilité en expansion (0,12 vs. 0,095). Ce biais a des conséquences directes pour le calibrage des stress tests et la détermination des coussins de capital.

#### 4.8.2 Nécessité d'approches conditionnelles

Les résultats plaident pour l'adoption d'approches conditionnelles dans l'évaluation des risques, avec des scénarios de stress différenciés selon la position dans le cycle économique. Un choc de même amplitude aura des effets significativement différents selon que l'économie se trouve en expansion (élasticités élevées) ou en récession (élasticités faibles mais impacts plus persistants).

#### 4.8.3 Redéfinition des indicateurs d'alerte précoce

Les seuils d'alerte conventionnels devraient être ajustés pour tenir compte des non-linéarités. Par exemple, un niveau d'inflation de 15% pourrait nécessiter des réactions différentes selon le régime économique : intervention prudente en expansion (élasticité Inflation→NPL faible) mais réponse vigoureuse en récession (élasticité élevée).

#### 4.8.4 Implications pour la politique macroprudentielle

La variabilité des coefficients de pass-through suggère que l'efficacité des politiques monétaires et de change varie selon le régime. En période de crise, la transmission plus faible justifierait des interventions plus fortes pour obtenir le même effet, tandis qu'en expansion, la moindre sensibilité aux chocs politiques plaide pour une plus grande autonomie des politiques domestiques.

<!-- page 20 -->

### 4.9 Limites et perspectives

Les principales limites de cette analyse quantile incluent la taille d'échantillon limitée (n=25) affectant la précision des estimations dans les queues, l'approche en deux étapes plutôt qu'une estimation BQVAR intégrée et la fréquence annuelle masquant des dynamiques intra-annuelles potentielles.

Les perspectives de recherche incluent l'utilisation de données trimestrielles disponibles, l'estimation de modèles BQVAR multivariés pleinement intégrés et des comparisons régionales.

En fin de compte, cette analyse quantile révèle des non-linéarités économiquement et statistiquement significatives dans les relations macro-financières haïtiennes. Ces résultats justifient le recours à des cadres d'évaluation des risques financiers dépendants du régime, qui seront exploités dans la section consacrée aux stress tests bancaires.

## 5 Analyse des stress tests bancaires et mesure du risque systémique

### 5.1 Cadre conceptuel et méthodologique des stress tests

Les stress tests bancaires mis en œuvre dans cette étude s'appuient sur un cadre intégré combinant les résultats des modèles BVAR et quantile, permettant d'évaluer la vulnérabilité du système bancaire haïtien à des chocs macro-financiers sévères. Notre approche dépasse les méthodologies conventionnelles en incorporant explicitement les non-linéarités identifiées et l'hétérogénéité des réponses selon les régimes économiques, telles qu'identifiées par l'estimation quantile.

Le cadre méthodologique repose sur trois piliers :

(1) l'utilisation des quantiles extrêmes du modèle bayésien-quantile pour calibrer les scénarios de stress,

(2) la modélisation de la probabilité de défaut (PD) via une fonction logistique basée sur les sorties des modèles,

(3) le calcul des mesures de risque systémique avec validation comparative entre approches BVAR et quantile.

La probabilité de défaut systémique est définie par :

 $$ PD_{t}=\frac{1}{1+\exp(-Z_{t})} $$

 $$ \mathrm{A v e c}Z_{t}=\alpha+\sum_{i=1}^{7}\beta_{i}y_{i,t-1}+\sum_{j=1}^{3}\gamma_{j}X_{j,t} $$

où $Z_t$ représente le score de risque systémique, avec les coefficients $(\alpha, \beta_i, \gamma_j)$ calibrés sur la base des résultats BVAR et de l'extension quantile et des données historiques de défaut dans le système bancaire haïtien.

<!-- page 21 -->

Les pertes attendues (Expected Loss - EL) sont calculées comme dans la section 2.6. La Value-at-Risk (VaR) systémique est estimée selon :

 $$ \mathrm{VaR}_{95\%}=\mathrm{EL}\times k_{VaR} $$

où  $ k_{VaR} = 2,5 $ (facteur prudentiel).

### 5.2 Scénarios de stress et calibration

Trois scénarios adverses sont élaborés, chacun correspondant à un régime quantile spécifique du modèle bayésien-quantile et reflétant les principales sources de vulnérabilité structurelle de l'économie haïtienne (Tableau 11). Ces scénarios permettent de tester la robustesse du système bancaire sous différentes configurations de stress, tout en respectant la cohérence empirique des relations estimées par l'approche quantile.

TABLE 11 – Paramétrisation des scénarios de stress

| Paramètre | Scénario 1 : Crise politique | Scénario 2 : Catastrophe naturelle | Scénario 3 : Crise financière |
| --- | --- | --- | --- |
| Quantile | $ \tau = 0,25 $ | $ \tau = 0,05 $ | $ \tau = 0,05 $ (variante) |
| PIB | -5,0% | -8,0% | -4,5% |
| Inflation | +15,0 pts | +8,0 pts | +12,0 pts |
| Taux de change | +25,0% | +15,0% | +35,0% |
| ROA | -3,0 pts | -2,0 pts | -5,2 pts |
| Prêts non performants | +8,0 pts | +6,0 pts | +15,0 pts |
| Transferts | -0,5 Md USD | +1,5 Md USD | -0,8 Md USD |
| Instabilité politique | Activée (1) | Non (0) | Non (0) |
| Catastrophe naturelle | Non (0) | Activée (1) | Non (0) |

Source : Auteurs

Scénario 1 : Crise politique majeure - Aligné sur le quantile 0,25, ce scénario simule une contraction économique modérée (-5,0%) combinée à une poussée inflationniste sévère (+15,0 points) et une dépréciation monétaire importante (+25,0%). Il intègre également une détérioration de la profitabilité bancaire (-3,0 points de ROA) et une augmentation des prêts non performants (+8,0 points). Ce scénario correspond aux épisodes de tensions politiques récurrents en Haïti (2004, 2019, 2022).

Scénario 2 : Catastrophe naturelle majeure - Calibré sur le quantile 0,05 (queue inférieure), ce scénario représente un choc exogène plus prononcé sur l'activité économique (-8,0%) mais avec des effets inflationnistes modérés (+8,0 points). La particularité réside dans l'augmentation compensatoire des transferts (+1,5 Md USD), qui est souvent concomitante aux afflux d'aide internationale typiquement observés suite aux catastrophes naturelles en Haïti (séisme 2010, ouragan Matthew 2016).

<!-- page 22 -->

Scénario 3 : Crise financière internationale - Également basé sur le quantile 0,05 mais avec focalisation sur les variables financières, ce scénario combine une détérioration sévère de la profitabilité bancaire (-5,2 points de ROA) avec une augmentation dramatique des prêts non performants (+15,0 points). Le taux de change subit une dépréciation extrême (+35,0%), simulant les effets de contagion financière des crises internationales (crise financière globale 2008, COVID-19 2020).

### 5.3 Résultats des stress tests

#### 5.3.1 Conditions de base (cible/référence)

Le système bancaire haïtien présente des indicateurs de solvabilité globalement satisfaisants (Tableau 12). Quoiqu'inférieur à 8% dans plusieurs scénarios, le ratio de capital comptable agrégé se situe nettement au-dessus du seuil réglementaire de 5,0%. La probabilité de défaut systémique est estimée à 8,0%, générant des pertes attendues de 3,6 millions USD pour le portefeuille de référence. Le ratio de liquidité se maintient à 78,0%, indiquant une capacité d'absorption des chocs de financement adéquate.

TABLE 12 – Indicateurs de solvabilité sous différents scénarios

| Indicateur | Conditions normales | Crise politique | Catastrophe naturelle | Crisé financière |
| --- | --- | --- | --- | --- |
| Ratio de capital (%) | 5 | 7,4 | 8,1 | 7,8 |
| $ \Delta $ vs réglementaire | - | +2,4 pts | +3,1 pts | +2,8 pts |
| PD systémique (%) | 8,0 | 15,2 | 12,8 | 14,1 |
| $ \Delta $ vs normal | - | +7,2 pts | +4,8 pts | +6,1 pts |
| Pertes attendues (M USD) | 3,6 | 6,8 | 5,8 | 6,3 |
| $ \Delta $ % | - | +89% | +61% | +75% |
| Ratio de liquidité (%) | 78,0 | 72,0 | 75,0 | 73,0 |
| Déficit de capital (M USD) | 0,0 | 12,5 | 3,2 | 8,7 |

Note : Delta, variation par rapport aux conditions normales et/ou au seuil réglementaire

Source : Auteurs

#### 5.3.2 Effets des scénarios de stress

Le scénario de crise politique produit une détérioration significative mais contenue des indicateurs de solvabilité. Le ratio de capital décline à 7,4%, se situant néanmoins à 2,4 points au-dessus du minimum réglementaire haïtien. Cette diminution résulte principalement de la combinaison entre la contraction de l'activité économique, la dépréciation monétaire et l'augmentation des prêts non performants. La probabilité de défaut systémique augmente à 15,2%, soit une progression de 7,2 points par rapport au scénario de base (élasticité PD/PIB = -1,44). Les pertes attendues atteignent 6,8 millions USD,

<!-- page 23 -->

représentant une augmentation de 89%. Le système présenterait un déficit de capital de 12,5 millions USD pour retrouver un ratio de 8%.

Le scénario de catastrophe naturelle produit des effets plus nuancés. Malgré une contraction économique plus sévère, le ratio de capital (8,1%) demeure largement au-dessus du seuil réglementaire. Cette résilience s’explique par l’effet compensateur des transferts de la diaspora, qui atténuent partiellement les conséquences de la catastrophe (élasticité RatioFA/Transferts = +0,35 au quantile 0,05). La probabilité de défaut atteint 12,8%, avec des pertes attendues de 5,8 millions USD. Le déficit de capital serait limité à 3,2 millions USD.

Le scénario de crise financière apparaît comme le plus adverse pour la stabilité bancaire après celui de catastrophe naturelle, en raison de la chute de la rentabilité ( $ \Delta $ROA = -5,2 points) et de la détérioration rapide de la qualité des actifs ( $ \Delta $NPL = +15,0 points). Cette particularité crée un effet de boucle négative particulièrement dommageable pour la solidité financière. Le ratio de capital s'établit à 7,8%, se situant au-dessus du seuil réglementaire de 5%, avec une probabilité de défaut atteignant 14,1% et des pertes attendues s'élevant à 6,3 millions USD.

### 5.4 Analyse par régimes économiques : apport de l'approche quantile

L'analyse quantile permet d'évaluer le risque systémique de manière conditionnelle aux régimes économiques (Tableau 13). Cette approche représente une innovation méthodologique par rapport aux stress tests conventionnels.

TABLE 13 – Mesures de risque par régime économique (Approche quantile)

| Régime (Quantile) | PD (%) | VaR $ _{{95}} $\nUSD) | (M\nCapital requis\n(M USD)) | Ratio cou-verture\n(%) |
| --- | --- | --- | --- | --- |
| Stress sévère ( $ \tau = 0,05 $) | 14,7 | 33,1 | 49,7 | 24,9 |
| Stress modéré ( $ \tau = 0,25 $) | 12,3 | 27,7 | 41,6 | 20,8 |
| Régime médian ( $ \tau = 0,50 $) | 9,9 | 22,3 | 33,5 | 16,8 |
| Croissance ( $ \tau = 0,75 $) | 8,5 | 19,1 | 28,7 | 14,4 |
| Expansion ( $ \tau = 0,95 $) | 8,1 | 18,2 | 27,3 | 13,7 |

## Source : Auteurs

### 1. Régime de stress sévère ( $ \tau = 0,05 $)

Sous conditions de stress sévère, la probabilité de défaut atteint 14,7% avec des besoins en capital estimés à 49,7 millions USD pour le système dans son ensemble. Ce niveau représente un ratio de couverture de 24,9% du portefeuille de référence, presque le double du ratio en régime médian.

### 2. Régime médian  $ \tau = 0,50 $

En régime médian, ces mesures se stabilisent à 9,9% pour la PD et 33,5 millions

<!-- page 24 -->

USD pour le capital requis. Le ratio de couverture s'établit à 16,8%, se situant dans la fourchette standard pour les systèmes bancaires des économies en développement (Fang et al., 2022).

### 3. Dispersion inter-régimes

La dispersion entre régimes extrêmes est substantielle : 6,6 points pour la probabilité de défaut (14,7% vs. 8,1%) et 22,4 millions USD pour le capital requis (49,7 vs. 27,3). Cette dispersion souligne l'importance cruciale de prendre en compte la position dans le cycle économique pour l'évaluation des risques. Les approches non conditionnelles sous-estiment le risque en période de stress (-30% pour la VaR) et le surestiment en période d'expansion (+25%), ce qui peut conduire à des décisions prudentielles procycliques (BIS, 2024).

### 5.5 Mesure du risque systémique et convergence méthodologique

La mesure du risque systémique par l'approche Value-at-Risk produit des estimations convergentes entre les différentes méthodologies (Tableau 14), validant la robustesse de nos résultats.

TABLE 14 – Comparaision des mesures VaR entre approches BVAR et quantile

| Niveau Confiance | VaR (M USD) | BVAR (M USD) | VaR Quantile (M USD) | Écart absolu | Écart relatif |
| --- | --- | --- | --- | --- | --- |
| 95% | 32,1 | 30,4 | 1,7 | 5,3% |   |
| 99% | 45,8 | 43,2 | 2,6 | 5,7% |   |

Source : Auteurs

Au niveau de confiance de 95%, le modèle BVAR génère une VaR de 32,1 millions USD contre 30,4 millions USD pour l'approche quantile, représentant un écart relatif de seulement 5,3%. Au niveau de confiance de 99%, ces mesures s'élèvent à 45,8 millions USD et 43,2 millions USD respectivement, avec un écart de 5,7%.

La convergence de ces estimations supporte leur robustesse et leur utilité pour le calibrage des politiques prudentielles. L'écart limité suggère que, bien que les approches différent conceptuellement (moyenne conditionnelle vs. quantiles conditionnels), elles produisent des mesures de risque cohérentes pour le système bancaire haïtien.

### 5.6 Synthèse et VaR opérationnelle recommandée

La synthèse de ces résultats conduit à une VaR opérationnelle recommandée de 31,3 millions USD, correspondant à la moyenne des estimations aux deux niveaux de confiance et entre les deux approches méthodologiques. Cette valeur représente un juste milieu entre l'approche prudentielle (BVAR) et l'approche conditionnelle (Modèle quantile).

Le capital économique nécessaire est estimé à 46,95 millions USD en appliquant un

<!-- page 25 -->

multiple prudentiel de  $ 1,5^{4} $ à la VaR opérationnelle, reflétant les bonnes pratiques de risque qui incluent une marge pour les incertitudes de modélisation et les risques non capturés. Ce niveau représente un ratio de couverture de 23,5% par rapport au portefeuille de référence.

### 5.7 Analyse de sensibilité et tests de robustesse

#### 5.7.1 Sensibilité aux hypothèses clés

Les analyses de sensibilité révèlent une robustesse satisfaisante des résultats principaux face aux variations plausibles des hypothèses clés (LGD, EAD, facteur prudentiel, amplificateur des chocs). La variation des paramètres clés dans des intervalles plausibles produit des modifications proportionnelles des indicateurs de solvabilité, sans inversion des ordres de grandeur entre scénarios (Tableau 15).

TABLE 15 – Analyse de sensibilité des résultats clés

| Paramètre | Variation | Impact sur ratio capital | Impact sur PD | Impact VaR | sur |
| --- | --- | --- | --- | --- | --- |
| LGD | 40% $ \rightarrow $ 50% | -0,3 pts | +1,2 pts | +12% |   |
| EAD | 90 $ \rightarrow $ 110 M USD | -0,2 pts | +0,8 pts | +10% |   |
| Facteur $ k_{VaR} $ | 2,0 $ \rightarrow $ 3,0 | -0,4 pts | +1,5 pts | +20% |   |
| Croissance choc | -4% $ \rightarrow $ -6% | -0,5 pts | +2,1 pts | +15% |   |

Note : LGD=Loss Given Default (Perte en cas de défaut), EAD = Exposure at Default (Exposition en cas de défaut

Source : Auteurs

#### 5.7.2 Tests de stabilité

Les tests de stabilité montrent que la hiérarchie des risques identifiée (crise politique > crise financière > catastrophe naturelle) reste inchangée à travers différentes spécifications méthodologiques. La stabilité est vérifiée par :

(1) les variations des horizons des stress tests (1 an vs. 3 ans),

(2) les modifications des seuils de déclenchement des variables binaires.

(3) l’utilisation alternative des médianes vs. moyennes pour le calibrage.

#### 5.7.3 Validation comparative

La validation comparative avec des études similaires dans d'autres économies caribéennes révèle des ordres de grandeur cohérents (Lim et al., 2019; Regional Council, 2024).

<!-- page 26 -->

Par exemple, le ratio de capital sous stress en Haïti (7,4-8,1%) est comparable à celui observé en Jamaïque lors de la crise COVID-19 (8% selon la Banque de Jamaïque, 2022). Les indicateurs de stress (VaR, solvabilité) obtenus sont légèrement plus critiques que ceux estimés pour la République Dominicaine (FMI, 2024), reflétant possiblement une exposition différente aux chocs externes et des structures de portefeuille distinctes.

### 5.8 Évaluation de l'adéquation des fonds propres

L'évaluation de l'adéquation des fonds propres sous stress suggère que le système bancaire haïtien dans son ensemble disposerait de capacités d'absorption suffisantes pour faire face à des chocs modérés, mais rencontrerait des difficultés sous des scénarios sévères combinant plusieurs canaux de transmission.

#### 5.8.1 Coussin de capital nécessaire

Pour maintenir le ratio de capital au-dessus de 8% dans le pire scénario (crise politique), les banques haïtiennes auraient besoin d'un coussin additionnel de 1,6 point (soit 9,6% au total). Ce coussin pourrait être constitué via :

(1) rétention des bénéfices (capacité estimée : 0,8 point/an),

(2) augmentations de capital (potentiel estimé : 0,4 point/an),

(3) réduction des distributions (impact estimé : 0,3 point/an).

#### 5.8.2 Temps de reconstitution

Le temps de reconstitution des fonds propres après un choc sévère est estimé à 3-4 ans en régime de croissance modérée (2-3% par an), mais pourrait s'étendre à 5-6 ans en régime de stagnation. Cette asymétrie plaide pour le maintien de coussins de capital supplémentaires durant les phases expansionnistes, afin de constituer des réserves utilisables durant les périodes de contraction.

### 5.9 Mesure du risque de liquidité sous stress

La mesure du risque de liquidité sous stress indique une vulnérabilité contenue, avec des ratios se maintenant au-dessus des seuils critiques même dans les scénarios les plus adverses (Tableau 16).

<!-- page 27 -->

TABLE 16 – Indicateurs de liquidité sous stress

| Indicateur | Normal | Crise politique | Catastrophe | Crise cière | financière | Seuil critique |
| --- | --- | --- | --- | --- | --- | --- |
| LCR (%) | 125 | 108 | 115 | 110 |   | 100 |
| NSFR (%) | 115 | 102 | 108 | 105 |   | 100 |
| Dépôts stables (%) | 85 | 78 | 82 | 80 |   | 70 |
| Concentration | 25 | 32 | 28 | 30 |   | 40 |
| financement |   |   |   |   |   |   |

Note : LCR=Liquidity Coverage Ratio (Ratio de couverture des besoins de liquidité), NSFR=Net Stable Funding Ratio (ratio de financement stable)

Source : Auteurs

Cette relative robustesse s’explique probablement par la structure traditionnelle des bilans bancaires haïtiens (prédominance des dépôts de détail) et la nature relativement stable des dépôts (faible sensibilité aux taux). Cependant, la détérioration modérée du ratio de couverture des besoins de liquidité (Liquidity Coverage Ratio [LCR]) sous crise politique (125% → 108%) suggère une certaine vulnérabilité aux chocs de confiance.

### 5.10 Implications pour la surveillance macroprudentielle

Les résultats des stress tests fournissent plusieurs enseignements opérationnels pour le cadre de surveillance macro-prudentielle en Haïti, en particulier en matière de déclenchement des mesures préventives, de hiérarchisation des risques systémiques et de communication.

#### 5.10.1 Déclenchement des mesures macroprudentielles préventives

Au regard de la sensibilité du système aux chocs politiques, qui peut entraîner une érosion des fonds propres de près de 1,8 point de pourcentage selon nos simulations, et en tenant compte du cadre réglementaire de la Circulaire n° 88-1, nous recommandons d'ajuster la politique macroprudentielle autour de deux axes :

1. Coussin anticyclique spécifique : Bien que la BRH exige déjà un Ratio d'Adéquation du Capital (RAR) de 14,5% (incluant le volant de conservation), les autorités gagneraient à instaurer un coussin de fonds propres anticyclique (CCyB) additionnel compris entre 1% et 1,5%. Ce surplus de capital, constitué obligatoirement lors des phases d'expansion où l'élasticité du rendement sur actifs (ROA) est optimale (0,12), permettrait aux banques d'absorber les pertes de capital observées dans nos scénarios de stress politique sans passer sous les seuils d'alerte légaux.

2. Seuils de vigilance basés sur la PD systémique : Nous suggérons l'institution-nalisation d'un seuil d'alerte dès que la Probabilité de Défaut (PD) systémique atteint 12,0%. Le dépassement de ce seuil devrait déclencher automatiquement des mesures conservatoires prévues par le régulateur, notamment les restrictions progressives.

<!-- page 28 -->

sur la distribution de dividendes stipulées à l'article 6 de la Circulaire 88-1, afin de préserver l'avoir des actionnaires avant que le ratio de levier ne tombe sous le minimum de 5%.

#### 5.10.2 Différenciation des scénarios de stress

La hiérarchie des risques identifiée (chocs politiques > chocs financiers > chocs naturels) appelle à une allocation différenciée des ressources de supervision. En particulier, les indicateurs liés à l'instabilité politique devraient faire l'objet d'un suivi renforcé lors des périodes électorales ou de tensions sociales, compte tenu de leur impact disproportionate sur la solvabilité bancaire.

#### 5.10.3 Communication et créabilité des évaluations prudentielles

La convergence des mesures de risque entre approches BVAR et quantile (écarts < 6%) renforce la crédibilité des résultats. Cette cohérence méthodologique devrait faciliter la communication des stress tests auprès des parties prenantes et soutient leur utilisation comme outil central du dialogue macroprudentiel.

### 5.11 Limites et perspectives d'amélioration

Les principales limites de cette analyse incluent :

1. L'agrégation sectorielle : l'analyse au niveau systémique masque les hétérogénéités interbancaires ;

2. L'hypothèse de comportement constant : les réactions des banques (rationnement du crédit, gestion des risques) sont supposées stables ;

3. L'absence de boucles de rétroaction : les effets secondaires (réaction des politiques, comportements des déposants) ne sont pas modélisés.

Les perspectives d'amélioration incluent :

1. Des stress tests désagrégés par banque;

2. La modélisation des réseaux interbancaires (analyse de la contagion directe);

3. L'intégration des canaux de financement (modélisation explicite du risque de liquidité);

4. Une prise en compte ciblée de l'interaction entre les instruments monétaires et macroprudentiels.

En définitive, cette analyse des stress tests révèle un système bancaire haïtien présentant une résilience modérée face aux chocs isolés mais des vulnérabilités significatives face aux chocs combinés, particulièrement ceux de nature politique. Les résultats plaident pour un renforcement prudentiel gradué et pour l'institutionnalisation d'exercices réguliers de stress tests intégrant explicitement les non-linéarités identifiées.

<!-- page 29 -->

## 6 Conclusion

Cette étude démontre que le système bancaire haïtien possède les bases d'une résilience globalement satisfaisante mais que cette résilience demeure incomplète et exposée à des vulnérabilités structurelles, en particulier face aux chocs politiques et aux tensions sur le marché des changes. L'analyse rigoureuse menée à l'aide des modèles BVAR et quantile met en évidence une sensibilité asymétrique du système bancaire aux chocs extrêmes, confirmant que les approches linéaires standard tendent à sous-estimer les risques en période de stress. Dans ce contexte, la stabilité financière apparaît moins comme un état que comme un équilibre fragile, dépendant étroitement du régime macroéconomique et institutionnel.

Sur le plan méthodologique, la contribution principale de cette recherche réside dans l'intégration d'un cadre bayésien et quantile adapté aux contraintes de données. L'approche proposée permet de capturer les non-linéarités et les risques de queues tout en conservant les principes économétriques compatibles avec de petits échantillons. Cette contribution dépasse le seul cas haïtien et fournit un cadre reproductible pour l'analyse de la stabilité financière et les stress tests dans d'autres petites économies ouvertes confrontées à des défis similaires en matière de données et de profondeur financière.

Sur le plan des politiques publiques, tout en s'inscrivant dans le cadre défini par la Circulaire n° 88-1 de la BRH, les résultats de notre étude plaident pour une approche proactive de renforcement de la résilience, articulée autour de trois piliers :

(1) le maintien de l'exigence de solvabilité globale à 14,5% (incluant le volant de conservation), complété par l'instauration d'un coussin anticyclique additionnel de 1% pour absorber les chocs politiques identifiés comme critiques ;

(2) le développement d'instruments de surveillance avancée intégrant des indicateurs d'alerte précoce (comme la PD systémique) dont les seuils de déclenchement seraient conditionnels au régime économique ;

(3) le renforcement ciblé de la gestion du risque de change, dont nous avons démontré l'impact délétère sur la qualité des actifs et la rentabilité bilancielle lors des crises.

Les limites de l'étude, principalement liées à la faible fréquence et à l'agrégation des données, n'invalident pas la solidité des résultats principaux mais soulignent la nécessité d'un effort continu d'enrichissement de l'appareil statistique et méthodologique. L'utilisation des données de plus haute fréquence, l'intégration d'indicateurs microprudentiels plus granulaires, l'approfondissement des modèles quantiles et l'étude de la coordination des politiques monétaire et macroprudentielle constituent autant de pistes prioritaires pour les recherches futures.

Cette recherche s'inscrit dans la perspective plus large du renforcement des capacités de régulation et de supervision bancaires dans les économies en développement. Elle démontre que l'innovation méthodologique, lorsqu'elle est rigoureusement appliquée et adaptée aux contraintes locales, peut fournir des éclairages précieux pour l'action publique même dans des contextes de données limitées. Les résultats obtenus offrent non seulement une photographie détaillée des vulnérabilités actuelles du système bancaire haïtien, mais aussi

<!-- page 30 -->

- et peut-être surtout - une feuille de route pragmatique pour construire une résilience financière durable, essentielle au développement économique et social du pays.

Enfin, l'institutionnalisation progressive de ces avancées, couplée à un renforcement continu des capacités analytiques nationales, représenterait une étape déterminante vers une approche plus scientifique et fondée sur l'évidence de la stabilité financière en Haïti. Dans un monde de plus en plus complexe et interconnecté, une telle évolution n'est pas seulement souhaitable – elle est nécessaire pour préserver la stabilité financière, protéger les déposants et soutenir une croissance économique inclusive et durable.

## Références

Bank of Jamaica. (2022). Financial Stability Report 2021. 31 mars.

Bassett, W., Chosak, J., Driscoll, J., & Zakrajšek, E. (2021). Bayesian stress testing with macroeconomic and financial data. Finance and Economics Discussion Series (FEDS Notes), No. 2021-286. Washington, D.C.: Board of Governors of the Federal Reserve System.

Bank of International Settlements (BIS). (2024). Basel III Monitoring Report. March.

Banque de la République d'Haïti (2021). Circulaire No. 88-1 sur les exigences minimales de fonds propres en regard de la couverture des risques.1er avril 2021. https://www.brh.ht/wp-content/uploads/Circulaire-88-1.pdf. (Consulté en février 2026).

Banque Mondiale. (2025). World Governance Indicators (politic stability). Données extraites pour 2000-2024 pour la construction de variables indicatrices. (Consulté en juillet 2025).

Caggiano, G., Castelnuovo, E., & Pellegrino, G. (2017). Estimating the real effects of uncertainty shocks at the Zero Lower Bound. European Economic Review, 100(C), 257-272.

Chavleishvili, S., & Manganelli, S. (2024). Forecasting and stress testing with quantile vector autoregression. Journal of Applied Econometrics, 39(1), 66-85, January.

CRED (2025). EM-DAT [Data set]. UCLouvain/CRED, Brussels, Belgium. https://www.emdat.be/. Données extraites pour 2000-2020 pour la construction de variables indicatrices. (Consulté le 10 juillet 2025). Centre for Research on the Epidemiology of Disasters. (s. d.). EM-DAT [Data set].

Dao, M., & Nguyen, L. (2025). Variable selection in macroeconomic stress test: a Bayesian quantile regression approach. Empirical Economics, 68(3), 1113–1169.

Demirguc-Kunt, A., Detragiache, E., & Merrouche, O. (2013). Bank Capital : Lessons from the Financial Crisis. Journal of Money, Credit and Banking, 45(6), 1147-1164, September.

<!-- page 31 -->

Fang, X., Jutrsa, D., Peria, S. M., Presbitero, A. F., & Ratnovski, L. (2022). Bank capital requirements and lending in emerging markets: The role of bank characteristics and economic conditions. Journal of Banking & Finance, 135(C).

Flamini, V., McDonald, C., & Schumacher, L. (2009). The determinants of commercial bank profitability in Sub-Saharan Africa. IMF Working Paper, 09/15. https://www.imf.org/external/pubs/ft/wp/2009/wp0915.pdf

Giannone, D., Lenza, M., & Primiceri, G. E. (2015). Prior selection for vector autoregressions. The Review of Economics and Statistics, 97(2), 436-451. https://hedibert.org/wp-content/uploads/2019/03/giannone-lenza-primiceri-2015-REVSTAT.pdf

Hyndman, R. J., & Athanasopoulos, G. (2018). Forecasting : Principles and Practice (2nd ed.). OTexts. https://otexts.com/fpp2/

International Monetary Fund. (2008). Haiti : Financial System Stability Assessment, including a Report on the Observance of Standards and Codes on Banking Supervision (IMF Country Report No. 08/112). http://www.imf.org

International Monetary Fund. (2024). Dominican Republic: 2024 Article IV Consultation—Press Release and Staff Report (IMF Country Report No. 24/294). September.

Koop, G. (2013). Forecasting with medium and large Bayesian VARs. Journal of Applied Econometrics, 28(2), 177-203.

Korobilis, D. (2013). VAR forecasting using Bayesian variable selection. Journal of Applied Econometrics, 28(2), 204-230.

Levine, R. (2005). Finance and growth: Theory and evidence. In P. Aghion & S. Durlauf (Eds.), Handbook of Economic Growth (Vol. 1A, pp. 865–934). Elsevier.

Li, Q., & Racine, J. S. (2007). Nonparametric Econometrics. Princeton University Press. https://www.uv.mx/meae/files/2015/04/Chapter-1-Racine.pdf

Lim, C. H., Klemm, A., Ogawa, S., Pani, M., & Visconti, C. (2019). Financial stability reports in Latin America and the Caribbean. Journal of Banking and Financial Economics, 11(1), 46-78, 30 janvier.

Mishkin, F. S. (1996). Understanding financial crises: A developing country perspective. NBER Working Paper, 5600. https://www.nber.org/system/files/workingpapers/w5600/w5600.pdf

Ostry, J. D., Ghosh, A. R., Chamon, M., & Qureshi, M. S. (2012). Tools for managing financial stability risks from capital inflows. Journal of International Economics, vol. 88(2), 407-421.

Regional Financial Stability Coordination Council. (2024). Caribbean Regional Financial Stability Report 2021. CARICOM Committee of Central Bank Governors. 19 mars.

<!-- page 32 -->

## A Annexe

|   | Infl | TxCh | IntReel | ROA | Pretsitx | RatioFA | RatioDA | Transf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RatioDA |   |   |   |   |   |   | -0.7 |   |
| RatioFA |   |   |   |   |   | -0.73 | 0.8 |   |
| Pretsitx |   |   |   |   | -0.4 | 0.01 | -0.17 |   |
| ROA |   |   |   | -0.41 | 0.44 | -0.14 | 0.16 |   |
| IntReel |   |   | -0.11 | 0.07 | -0.16 | 0.36 | -0.34 |   |
| TxCh |   | -0.42 | 0.1 | 0.04 | 0.65 | -0.68 | 0.92 |   |
| Infl |   | 0.72 | -0.4 | -0.06 | 0.27 | 0.2 | -0.39 | 0.54 |
| PIBtx | -0.49 | -0.51 | 0.36 | 0.21 | -0.06 | -0.26 | 0.4 | -0.49 |

FIGURE 2 – Matrice de corrélation des variables clés

<!-- page 33 -->

| Holdout | Response |
| --- | --- |
| 1 | 0.088 |
| 2 | 0.002 |
| 3 | 0.000 |
| 4 | -0.094 |
| 5 | 0.000 |
| 6 | 0.000 |
| 7 | 0.000 |

| X | Response |
| --- | --- |
| 1 | -0.05 |
| 2 | 0.3 |
| 3 | -0.05 |
| 4 | -0.34 |
| 5 | 0.0 |
| 6 | 0.01 |
| 7 | 0.0 |

| Incidence_n/nmax | Response |
| --- | --- |
| 1 | 0.09 |
| 2 | -0.15 |
| 3 | 0.08 |
| 4 | -0.02 |
| 5 | 0.00 |
| 6 | 0.00 |
| 7 | 0.00 |

| Hostage d_j,MB (dB) | Response |
| --- | --- |
| 1 | 0.00 |
| 2 | -0.06 |
| 3 | 0.00 |
| 4 | 0.11 |
| 5 | 0.00 |
| 6 | 0.01 |
| 7 | 0.00 |

| Horizon | Response |
| --- | --- |
| 1 | 0.012 |
| 2 | -0.0503 |
| 3 | 0.00 |
| 4 | 0.022 |
| 5 | 0.00 |
| 6 | 0.00 |
| 7 | -0.001 |

| Horizon | Response |
| --- | --- |
| 1 | -0.10 |
| 2 | -0.07 |
| 3 | -0.03 |
| 4 | 0.12 |
| 5 | 0.00 |
| 6 | 0.01 |
| 7 | 0.00 |

| Horizon length (hours) | Response |
| --- | --- |
| 1 | 0.12 |
| 2 | -0.20 |
| 3 | 0.05 |
| 4 | 0.07 |
| 5 | 0.00 |
| 6 | 0.00 |
| 7 | 0.00 |

| Horizon d_i,inf | Response |
| --- | --- |
| 1 | 0.05 |
| 2 | 0.35 |
| 3 | 0.00 |
| 4 | -0.90 |
| 5 | 0.00 |
| 6 | 0.01 |
| 7 | -0.01 |

| Hostage | Response |
| --- | --- |
| 1 | 0.022 |
| 2 | 0.021 |
| 3 | 0.000 |
| 4 | -0.020 |
| 5 | 0.000 |
| 6 | 0.001 |
| 7 | 0.000 |

| Holdout | Response |
| --- | --- |
| 1 | -0.08 |
| 2 | 0.15 |
| 3 | -0.08 |
| 4 | -0.12 |
| 5 | 0.30 |
| 6 | 0.31 |
| 7 | 0.30 |

| Holdout | Response |
| --- | --- |
| 1 | 0.13 |
| 2 | -0.12 |
| 3 | 0.05 |
| 4 | 0.00 |
| 5 | 0.00 |
| 6 | 0.00 |
| 7 | 0.00 |

| Hostae | Response midtime | Intervalle 95% | Per de sigose |
| --- | --- | --- | --- |
| 1 | 0.015 | 0.028 |   |
| 2 | -0.050 | -0.060 | -0.051 |
| 3 | 0.020 | 0.020 |   |
| 4 | 0.035 | 0.040 |   |
| 5 | 0.028 | 0.020 |   |
| 6 | 0.030 | 0.025 |   |
| 7 | 0.028 | 0.022 |   |

FIGURE 3 – Fonctions de réponse des variables bancaires aux chocs macroéconomiques

<!-- page 34 -->

| Horizon | d_RateFA | Response |
| --- | --- | --- |
| 1 | 1.0 | 0.0 |
| 2 | 0.6 | 0.0 |
| 3 | 0.65 | 0.0 |
| 4 | 0.4 | 0.0 |
| 5 | 0.5 | 0.0 |
| 6 | 0.55 | 0.0 |
| 7 | 0.5 | 0.0 |

| Horizon | Response | Value |
| --- | --- | --- |
| 1 | 1.2 |   |
| 2 | 0.6 |   |
| 3 | 0.7 |   |
| 4 | 0.4 |   |
| 5 | 0.5 |   |
| 6 | 0.6 | 0.002 |
| 7 | 0.5 |   |

| Horizon | Response |
| --- | --- |
| 1 | 1.6 |
| 2 | 0.6 |
| 3 | 0.7 |
| 4 | 0.4 |
| 5 | 0.6 |
| 6 | 0.6 |
| 7 | 0.4 |

| Horizon d | Response | Error |
| --- | --- | --- |
| 1 | 1.8 | 0.0 |
| 2 | 2.8 | -0.4 |
| 3 | 1.5 | 0.0 |
| 4 | 1.3 | 0.0 |
| 5 | 1.2 | 0.0 |
| 6 | 1.2 | 0.0 |
| 7 | 1.1 | 0.0 |

| Horizon | Response (Blue) | Response (Red) |
| --- | --- | --- |
| 1 | -0.1 | 0.0 |
| 2 | -0.1 | -0.1 |
| 3 | -0.1 | 0.0 |
| 4 | -0.1 | 0.0 |
| 5 | -0.1 | 0.0 |
| 6 | -0.1 | 0.0 |
| 7 | -0.1 | 0.0 |

| Time | Response |
| --- | --- |
| 1 | 0.0 |
| 2 | -0.008 |
| 3 | 0.0 |
| 4 | 0.0 |
| 5 | 0.0 |
| 6 | 0.0 |
| 7 | 0.0 |

| Horizon d_RatioFA | Response |
| --- | --- |
| 1 | -0.015 |
| 2 | -0.020 |
| 3 | -0.010 |
| 4 | -0.015 |
| 5 | 0.018 |
| 6 | -0.010 |
| 7 | -0.010 |

| Horizon | z_Pretitx | Response |
| --- | --- | --- |
| 1 | -0.02 | -0.02 |
| 2 | -0.07 | -0.07 |
| 3 | 0.00 | 0.00 |
| 4 | -0.11 | -0.11 |
| 5 | 0.00 | 0.00 |
| 6 | 0.03 | 0.03 |
| 7 | 0.00 | 0.00 |

| Horizon | Response |
| --- | --- |
| 1 | 0.03 |
| 2 | -0.09 |
| 3 | 0.00 |
| 4 | -0.03 |
| 5 | 0.00 |
| 6 | 0.00 |
| 7 | 0.02 |

| Horizon | Response |
| --- | --- |
| 1 | 1.3 |
| 2 | 1.4 |
| 3 | 1.2 |
| 4 | 1.5 |
| 5 | 0.8 |
| 6 | 0.8 |
| 7 | 0.8 |

| Horizon | Response (Red Line) | Response (Blue Line) |
| --- | --- | --- |
| 1 | 0.0 | 1.2 |
| 2 | -0.02 | 1.1 |
| 3 | 0.0 | 1.1 |
| 4 | -0.02 | 1.3 |
| 5 | 0.0 | 0.8 |
| 6 | 0.0 | 0.9 |
| 7 | 0.0 | 0.8 |

| Horizon | Response midlane | Intervalate 10% | Pre de repense |
| --- | --- | --- | --- |
| 1 | 0.0 | 1.7 |   |
| 2 | -0.1 | 1.2 | -0.05 |
| 3 | 0.0 | 1.2 |   |
| 4 | 0.0 | 2.0 |   |
| 5 | 0.0 | 1.0 |   |
| 6 | 0.0 | 1.0 |   |
| 7 | 0.0 | 1.0 |   |

FIGURE 4 – Fonctions de réponse des variables macroéconomiques aux chocs bancaires
