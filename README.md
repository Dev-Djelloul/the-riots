# Veille

Veille est une application web française de veille éditoriale. Elle agrège des articles provenant de flux RSS et Atom, relie les mentions géographiques aux départements et communes de France métropolitaine, et suit les actualités de mobilisation dans 48 pays d’Europe.

> Veille relaie des articles publiés par les médias référencés et attribue chaque contenu à sa source d’origine. Les catégories et regroupements sont générés automatiquement à partir des mots-clés ; la carte ne place que les lieux associés à un indice textuel d’événement, à vérifier. La sélection dépend des flux disponibles et ne représente pas l’ensemble de la couverture médiatique. Manifestations et émeutes sont des catégories distinctes.

## Fonctionnalités

- Agrégation de 26 flux RSS/Atom publics, actualisée à l’ouverture et automatiquement toutes les cinq minutes.
- Recherche, sélection des articles par jour au calendrier (avec raccourci « Aujourd’hui » et accès à tout l’historique disponible), filtre par sujet et tri chronologique.
- Carte Leaflet interactive couvrant les 96 départements métropolitains et le référentiel de 34 746 communes.
- Remplissage spectral des départements et repères communaux cliquables fondés sur des indices textuels rapprochant un événement d’un lieu ; les articles non retenus comme indices restent visibles comme lieux cités. Le champ et le passage d’origine sont conservés pour vérification.
- Navigation cartographique au zoom tactile à deux doigts, déplacement par glissement, molette, double-clic, clavier, boutons de zoom et recentrage sur la zone France/Europe.
- Depuis un article de la carte, accès à sa fiche dans le fil, aperçu de son image lorsqu’elle est disponible et mise en évidence temporaire de la fiche sélectionnée. Les popups longs et leur aperçu sont adaptés à la zone visible de la carte.
- Bascule France / Europe et filtre par pays pour les 46 États membres du Conseil de l’Europe, ainsi que la Biélorussie et la Russie.
- Drapeaux dans les vues et filtres par pays ; logos des médias (avec repli sur un monogramme coloré) dans la liste des sources et les articles, et aperçu d’image des articles quand le flux en fournit une.
- Chronologie éditoriale regroupant les articles européens par date, ville citée et sujet détecté, avec le nombre de médias distincts.
- Comparateur de couverture par pays, comptant les articles et médias distincts reçus dans les flux ; les lignes filtrent la chronologie. Ce n’est pas un décompte d’événements.
- Liens partageables qui conservent la recherche, le jour sélectionné, le sujet, la vue France/Europe et le pays sélectionné.
- Jusqu’à cinq flux RSS/Atom personnels sécurisés en HTTPS, enregistrés uniquement dans le navigateur et agrégés lors des actualisations ; les flux sont filtrés par les mots-clés de veille. Les flux personnalisés sont transmis en requête non mise en cache et les redirections ne sont pas suivies.
- Graphique de tendances quotidiennes par pays, filtrable par sujet et sur 7 ou 30 jours. Il s’appuie sur les articles actuellement disponibles, pas sur une archive exhaustive.
- Liste « À lire plus tard » persistante dans le navigateur, conservée localement même après la disparition d’un article des flux.
- Alertes personnalisées par ville/mot-clé et pays facultatif, avec notifications navigateur sur action explicite. Les alertes se déclenchent lorsque Veille est ouverte et récupère de nouveaux articles ; elles ne fonctionnent pas en arrière-plan. Sur iPhone/iPad, les notifications web nécessitent d’ajouter Veille à l’écran d’accueil et de l’ouvrir depuis son icône.
- Agora, assistant IA de veille qui répond aux demandes libres, traduit les articles, les analyse avec la recherche Web d’OpenRouter ou consulte les archives pour une date choisie. Le modèle `openrouter/auto` sélectionne le modèle adapté à chaque demande ; l’interface affiche le modèle réellement utilisé. La recherche Web est activée par défaut et peut être désactivée dans la fenêtre. Les suggestions rapides sont compactes ; les titres mis en évidence sont colorés et les citations Web présentent les métadonnées disponibles (extrait ou image) dans leur aperçu, sans téléchargement serveur depuis les sites cités. Les réponses passent par OpenRouter et nécessitent le secret Cloudflare Pages `OPENROUTER_API_KEY` ; l’utilisation du service peut être facturée par OpenRouter. Agora peut se tromper : vérifie les sources originales.
- Recherche quotidienne GNews par pays et dans les langues disponibles ; titres et extraits affichés dans leur langue d’origine, sans traduction automatique.
- Fil visuel de jusqu’à six articles illustrés par une image fournie dans leur flux RSS.
- Lecteurs vidéo officiels chargés au clic et liens de secours vers les chaînes ou sites des médias.
- Bouton flottant « Retour vers le haut », disponible après avoir fait défiler la page.
- Recherches publiques par hashtag ou mot-clé sur les réseaux sociaux, statut de disponibilité des API officielles, et lecteur des publications publiques compatibles.
- PWA installable avec mise en cache de l’interface et des dernières données de veille pour un accès hors connexion.

### Médias suivis

| Source | Flux |
| --- | --- |
| franceinfo | `https://www.franceinfo.fr/titres.rss` |
| BFMTV | `https://www.bfmtv.com/rss/news-24-7/` |
| CNEWS | `https://www.cnews.fr/rss.xml` |
| Le Monde | `https://www.lemonde.fr/rss/une.xml` |
| France 24 | `https://www.france24.com/fr/rss` |
| RFI | `https://www.rfi.fr/fr/rss` |
| Le Figaro | `https://www.lefigaro.fr/rss/figaro_actualites.xml` |
| Libération | `https://www.liberation.fr/arc/outboundfeeds/rss-all/?outputType=xml` |
| Ouest-France | `https://www.ouest-france.fr/rss-en-continu.xml` |
| Sud Ouest | `https://www.sudouest.fr/rss.xml` |
| 20 Minutes | `https://www.20minutes.fr/feeds/rss-une.xml` |
| La Croix | `https://www.la-croix.com/feeds/rss/site.xml` |
| L’Humanité | `https://www.humanite.fr/feed` |
| La Dépêche du Midi | `https://www.ladepeche.fr/rss.xml` |
| Le Parisien | `https://feeds.leparisien.fr/leparisien/rss` |
| France Inter | `https://www.radiofrance.fr/franceinter/rss` |
| L’Express | `https://www.lexpress.fr/rss/alaune.xml` |
| Challenges | `https://www.challenges.fr/rss.xml` |
| VRT NWS (Belgique) | `https://www.vrt.be/vrtnws/nl.rss.articles.xml` (Atom) |
| RTBF Info (Belgique) | `https://rss.rtbf.be/article/rss/highlight_rtbfinfo_info-belgique.xml?source=internal` |
| El País (Espagne) | `https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada` |
| elDiario.es (Espagne) | `https://www.eldiario.es/rss/` |
| Rai News (Italie) | `https://www.rainews.it/rss/tutti` |
| la Repubblica (Italie) | `https://www.repubblica.it/rss/cronaca/rss2.0.xml` |
| tagesschau (Allemagne) | `https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml` |
| Deutsche Welle (Allemagne) | `https://rss.dw.com/xml/rss-de-all` |

Les flux sont filtrés par mots-clés multilingues liés aux manifestations, rassemblements, tensions et dégradations. En France, le moteur repère des noms de communes ou de départements dans le titre et l’extrait avec des indices de contexte et une résolution de certains homonymes. En Europe, il reconnaît un répertoire limité de grandes villes et de capitales, dans plusieurs langues et variantes de noms. Chaque lieu reconnu conserve le champ d’origine (titre ou extrait), le texte utilisé, le type d’indice (formulation de localisation ou dateline) et une confiance indicative : une dateline est considérée moins probante qu’une préposition de lieu. La carte n’affiche que les lieux introduits par un indice de localisation et associés à proximité à un terme d’événement ; les autres, datelines comprises, restent des lieux cités, non cartographiés comme lieux d’événement. Un indice n’est pas une confirmation journalistique et peut nécessiter une vérification humaine. Cette confiance mesure la force du signal textuel, pas la probabilité que le lieu soit celui de l’événement. Certaines archives peuvent associer un pays au périmètre de leur requête ou à la configuration d’un flux ; cette association de couverture ne prouve pas que l’événement s’y soit déroulé. Pour GNews, le pays de la requête n’est plus utilisé comme localisation de repli. L’adresse technique du site média ne sert jamais à localiser l’événement. Le Parisien n’inclut pas systématiquement l’heure de publication ; sa date est estimée depuis le permalien et signalée dans l’interface. La durée de rétention dépend des éditeurs et ne forme pas une archive exhaustive.

La chronologie européenne regroupe par journée, pays, ville citée et catégorie de mots-clés. Lorsqu’aucune ville n’est identifiée, l’article reste isolé et n’est pas fusionné avec d’autres actualités du pays. Le nombre affiché correspond aux médias distincts dans les flux suivis, et non au nombre d’événements. Une même information peut être reprise d’une dépêche commune. Sur la carte Europe, les contours et le nombre d’articles associés décrivent la couverture des pays suivis ; les repères ne sont ajoutés que si le texte associe un terme d’événement à la ville, sans confirmer cette localisation. Leur position correspond au centre de la ville, pas à une adresse d’incident.

### Couverture européenne et archive

Un Worker Cloudflare distinct interroge GNews une fois par jour pour chacun des 48 pays configurés (les 46 membres du Conseil de l’Europe, plus la Biélorussie et la Russie), puis conserve les résultats par pays dans le KV `HISTORY` pendant 400 jours. Quatre lots tournent à 02:00, 08:00, 14:00 et 20:00 UTC ; ensemble, ils collectent la journée précédente en quatre groupes de douze pays. Les articles sont consultables depuis le calendrier et l’archive. Cela représente jusqu’à 48 appels GNews par jour. Lorsqu’une date historique sans données précollectées est ouverte avec « Tous les pays », une recherche GDELT couvre les 48 pays dans une seule requête ; si GDELT est indisponible, une recherche mondiale GNews (avec la clé API, si elle est configurée) puis les flux Google Actualités servent de replis. Le repli GNews ne conserve que les articles dont le titre ou l’extrait permet d’identifier un lieu européen. Les résultats disponibles sont mis en cache dans KV. Une recherche par pays utilise GNews lorsqu’une clé est configurée ; ces recherches manuelles peuvent consommer des appels supplémentaires.

La recherche conserve les mots-clés locaux même lorsque GNews ne prend pas en charge la langue correspondante ; dans ce cas, aucun filtre de langue n’est envoyé, plutôt que de remplacer les termes locaux par une recherche anglaise trop large. Le pays utilisé par la requête GNews décrit son périmètre de recherche et ne localise pas l’événement : sans ville ou pays identifié dans le titre ou l’extrait, l’article reste non localisé et n’est pas attribué à ce pays sur la carte. Les anciennes entrées en cache qui utilisaient ce repli, y compris celles sans métadonnée de provenance, sont neutralisées à leur lecture. L’étendue réelle dépend des médias indexés par GNews, des langues et pays acceptés par son API, de ses quotas et de la disponibilité de chaque requête : cette veille ne garantit donc pas un recensement exhaustif. La carte Europe affiche les contours des 48 pays suivis depuis le GeoJSON mondial de [johan/world.geo.json](https://github.com/johan/world.geo.json), issu de Natural Earth ; le navigateur conserve ce fichier en cache pour l’usage hors connexion. Les contours locaux de cinq pays initiaux servent de repli si la source mondiale est indisponible ; les frontières manquantes ne sont alors pas remplacées par de fausses positions d’événement. Une erreur empêchant le chargement des données géographiques reste signalée dans l’interface.

### Localisation actuelle et feuille de route internationale

La carte actuelle est un outil de repérage éditorial, pas un système professionnel de géolocalisation d’incidents. Elle ne lit pas nécessairement l’article intégral : elle travaille principalement avec son titre et l’extrait fourni par le flux. En France, un lieu reconnu peut être une commune ou un département ; son point représente le centre de la commune, pas l’adresse exacte. En Europe, le répertoire de lieux est partiel. Les articles rattachés à un pays et les couleurs des contours mesurent une association de couverture, pas une preuve de localisation ni un décompte d’événements. La carte ne transforme jamais un simple pays ou le pays du média en coordonnées d’événement. Les fiches d’article et les popups exposent le texte source utilisé afin que le lecteur puisse vérifier le repérage ; ces passages restent des données non vérifiées du flux d’origine.

L’extension au reste du monde n’est pas encore en place. Elle ne consiste pas à ajouter simplement des pays ou des marqueurs : il faut étendre ensemble les sources, les langues, le référentiel géographique, l’extraction des lieux et la validation de la qualité. La progression envisagée est la suivante ; chaque étape devra être évaluée avant d’élargir la couverture.

1. **Fiabiliser la base européenne.** Constituer un jeu d’articles vérifiés, notamment des cas de faux positifs, de datelines et de lieux homonymes. Mesurer séparément les lieux correctement repérés, les attributions erronées et les articles pour lesquels le système s’abstient. Conserver pour chaque décision le passage source, le champ, le type de signal et la provenance.
2. **Créer un référentiel géographique mondial.** Remplacer progressivement les listes partielles de villes par un gazetteer hiérarchique : lieux habités, subdivisions administratives et pays, noms locaux et translittérations, identifiants stables et coordonnées. Normaliser les pays avec des codes ISO et documenter la version, la licence et la date de mise à jour des limites et référentiels. Ne pas confondre le point représentatif d’une ville ou d’un pays avec une adresse d’événement.
3. **Élargir les sources et les langues par région.** Définir pour chaque pays des médias suivis, langues, variantes de mots-clés, règles de requête et limites de quotas. Ajouter les sources par lots après vérification de leur stabilité, de leur pertinence éditoriale, de leurs conditions d’utilisation et de leur attribution. La traduction peut aider à la lecture, mais les titres originaux et les éléments ayant servi à la localisation doivent rester accessibles.
4. **Améliorer l’extraction et la résolution des lieux.** Distinguer explicitement un lieu d’événement d’une dateline, du siège d’un média, d’une comparaison ou d’une simple mention. Résoudre les homonymes avec le contexte hiérarchique et linguistique. Une extraction assistée par IA pourra proposer des entités structurées, mais elle ne devra jamais créer seule une localisation confirmée : si les indices sont insuffisants ou contradictoires, l’article reste non localisé ou nécessite une vérification humaine.
5. **Séparer articles et événements.** Développer un rapprochement explicable des articles qui couvrent le même événement, avec prudence face aux reprises d’agence, aux mises à jour et aux événements distincts dans une même ville. Les nombres d’articles et de médias ne doivent être présentés comme des nombres d’événements qu’après déduplication et validation adaptées.
6. **Adapter la carte et les performances au monde entier.** Charger les limites par région et au niveau de détail utile, gérer les fuseaux horaires et les dates locales, éviter de surcharger la carte par regroupement des marqueurs et préserver filtres, liens partageables et usage mobile. Les données géographiques devront avoir une provenance, une licence et une stratégie de mise à jour documentées.
7. **Étendre seulement après mesure.** Piloter sur quelques pays et langues représentatifs, comparer les résultats à des annotations humaines, publier les limites connues et surveiller les erreurs avant d’ajouter une nouvelle région. Les critères doivent inclure la précision de localisation, les erreurs d’attribution, la couverture des sources, les coûts/quotas, la latence et la fraîcheur des données.

Une localisation exploitable doit rester explicable et révisable : source, extrait probant, lieu retenu, rôle du lieu, niveau de précision, provenance et raison de l’association. Le niveau de confiance doit représenter la solidité des indices disponibles, et non une garantie de vérité. L’adresse précise ne doit être affichée que si l’article la fournit clairement et si son usage est approprié. Les licences, conditions de réutilisation, règles de cache, quotas et exigences de confidentialité des fournisseurs doivent être vérifiés avant toute intégration.

Le Worker de collecte est configuré séparément de Pages (`wrangler.europe.toml`). Déployer le Worker puis lui ajouter le secret GNews déjà utilisé par Pages :

```sh
./node_modules/.bin/wrangler deploy --config wrangler.europe.toml
./node_modules/.bin/wrangler secret put GNEWS_API_KEY --config wrangler.europe.toml
```

Le Worker et Pages doivent utiliser le même compte Cloudflare pour partager le KV `HISTORY`. Les journaux du Worker indiquent les pays dont la requête a échoué ; une collecte partielle reste accessible sans effacer les résultats des autres pays.

Pour activer Agora en production, ajouter la clé OpenRouter aux secrets du projet Pages `the-riots` via `wrangler pages secret put OPENROUTER_API_KEY --project-name the-riots` ; Wrangler la demande de façon interactive. Ne la place pas dans le dépôt, une commande contenant sa valeur ou le navigateur.

### Vidéos en direct

Les lecteurs des chaînes suivantes ne sont créés qu’après un clic :

- franceinfo, BFMTV, CNEWS et Euronews français utilisent les lecteurs YouTube officiels ; les directs peuvent varier selon la programmation et les droits.
- France 24 utilise son lecteur officiel `embed.france24.com`.
- LCI propose sur sa chaîne YouTube des directs ponctuels, pas nécessairement une diffusion continue.
- TV5MONDE Info propose une chaîne YouTube d’actualité ; la disponibilité du lecteur et des programmes TV5MONDE peut varier selon le pays.

Les cartes conservent des liens de repli officiels pour chaque média. Ne pas remplacer ces lecteurs par des flux HLS tiers ou des sources qui ne sont pas fournies par les chaînes.

La section **Directs européens** intègre les lecteurs YouTube officiels de DW News (anglais) et RTVE Noticias (espagnol), chargés uniquement après un clic. RTVE Play reste disponible en lien de secours si YouTube n’autorise pas l’intégration du direct. Des accès directs pointent également vers RTBF Info sur Auvio, Rai News 24 sur RaiPlay et les livestreams ARD ; VRT NWS publie des vidéos et éditions spéciales, sans garantir un flux continu. Les lecteurs des diffuseurs peuvent être soumis à des restrictions géographiques, de droits ou de compte.

## Technologies et organisation

- Application statique HTML, CSS et JavaScript natifs, sans étape de compilation.
- Cloudflare Pages Functions fournit les routes API.
- `functions/api/veille.js` récupère les flux RSS et Atom, repère les mots-clés et les lieux côté serveur.
- `functions/api/social.js` expose les statuts des plateformes et, si configuré, les recherches de chaînes Twitch en direct.
- `functions/api/veille.js` filtre les articles par règles (termes sûrs, termes ambigus avec contexte, exclusions). Les cas ambigus (jusqu’à 20 par requête) sont tranchés par Workers AI via le binding `AI` déclaré dans `wrangler.toml` ; sans binding ou en cas d’erreur, ils sont écartés.
- `app.js` charge les archives séparément avant l’appel à Agora pour éviter de cumuler les délais de recherche et de génération.
- `functions/api/agora.js` transmet à OpenRouter Auto un lot limité d’articles récents ou archivés et restitue les références vers leurs sources ; la recherche Web utilise l’outil OpenRouter `openrouter:web_search`. La clé reste un secret côté serveur et l’endpoint valide l’origine, les URL, la taille du corps et le nombre d’articles.
- `app.js` gère l’interface, les articles, la carte et les lecteurs.
- `geography.js` rapproche les articles des données géographiques.
- `service-worker.js`, `manifest.webmanifest` et les icônes `icons/` fournissent les fonctions PWA.
- `europe-countries.js` décrit les pays, mots-clés, langues et capitales de la veille européenne.
- `workers/europe-collector.js` collecte chaque jour les archives GNews ; `wrangler.europe.toml` configure le Worker, le cron, Workers AI et le KV partagé.
- `data/communes.json` et `data/departements.geojson` fournissent les référentiels cartographiques français ; `data/europe-countries.geojson` conserve les contours locaux de repli des cinq pays initiaux. La vue Europe complète ces limites avec les contours des 48 pays suivis.
- `tests/` contient les tests de l’analyse RSS, des fonctionnalités sociales, de la géographie et du mode PWA hors connexion.
- Les styles et la bibliothèque Leaflet sont chargés depuis des CDN ; ils ne sont pas disponibles hors connexion. Les données cartographiques locales et les contours européens distants sont mis en cache.

### Icônes et logos

Les icônes Facebook, Instagram, TikTok, Twitch et YouTube dans `icons/` ont été fournies dans le projet. Les logos des chaînes d’information sont des ressources Wikimedia Commons : [franceinfo](https://commons.wikimedia.org/wiki/File:Franceinfo.svg), [France 24](https://commons.wikimedia.org/wiki/File:France_24_logo_(2013).svg), [BFMTV](https://commons.wikimedia.org/wiki/File:BFMTV_2025.svg), [Euronews](https://commons.wikimedia.org/wiki/File:Euronews_Logo_2025.svg), [LCI / TF1 Info](https://commons.wikimedia.org/wiki/File:Tf1_info_lci.png), [TV5MONDE](https://commons.wikimedia.org/wiki/File:Logo_TV5_Monde_-_2021.svg) et [CNEWS](https://commons.wikimedia.org/wiki/File:Canal_News_logo.svg). Les noms et marques restent la propriété de leurs ayants droit ; les logos servent uniquement à identifier les liens et lecteurs officiels.

Les pays sont identifiés par des drapeaux emoji. Les 26 médias RSS/Atom affichent leur icône ou logo (`icons/press/` : favicons et apple-touch-icons des sites, logos Wikimedia Commons pour RTVE, France Inter, Le Parisien, 20 Minutes et CNEWS), avec repli sur un monogramme coloré. Ce sont des repères d’interface ; les marques restent la propriété de leurs ayants droit.

La carte utilise les tuiles [OpenStreetMap](https://www.openstreetmap.org/copyright). Les limites départementales généralisées à 1 000 m viennent du jeu [Contours administratifs](https://www.data.gouv.fr/datasets/contours-administratifs/), notamment basé sur Admin Express de l’IGN, sous Licence Ouverte Etalab 2.0. Le référentiel des communes vient de l’API Découpage Administratif (`geo.api.gouv.fr`). Les contours européens proviennent des limites [Natural Earth 1:110m](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/) distribuées au format GeoJSON par [johan/world.geo.json](https://github.com/johan/world.geo.json) ; Natural Earth place ses données dans le domaine public. Ces limites généralisées couvrent les pays suivis, sans subdivisions régionales. Les couleurs correspondent aux mentions dans les articles ; elles n’expriment pas l’intensité d’incidents.

## Développement local

Prérequis : Node.js 22 ou ultérieur et npm.

```sh
npm ci
./node_modules/.bin/wrangler pages dev .
```

Wrangler affiche l’adresse locale à ouvrir. Pages Functions et routes `/api/*` sont ainsi disponibles pendant le développement. Le service worker n’est activé que dans un contexte sécurisé (HTTPS ou `localhost`).

Vérifications rapides :

```sh
node --check app.js
node --check pwa.js
node --check service-worker.js
node --test tests/*.test.mjs
git diff --check
```

## PWA et mode hors connexion

Le navigateur propose **Installer l’app** quand il prend en charge l’installation. Sur iOS/iPadOS, ouvrir le menu de partage de Safari puis choisir **Sur l’écran d’accueil**.

Après une première visite connectée :

- l’application, ses scripts, ses styles, son icône et les données géographiques locales sont mis en cache ;
- la dernière réponse réussie de `/api/veille` est conservée et affichée avec une indication de données hors connexion si le réseau est absent ;
- la liste de lecture, les alertes et l’historique des articles déjà vus sont stockés dans le navigateur et ne sont pas synchronisés entre appareils ;
- les flux personnels sont également stockés dans le navigateur et ne sont pas inclus dans les liens partagés ;
- les routes `/api/social`, les flux RSS, les polices et scripts tiers, les tuiles cartographiques et les lecteurs vidéo nécessitent toujours une connexion.

Les résultats de veille affichés hors connexion sont ceux de la dernière actualisation réussie. Les actions de recherche ou de rafraîchissement peuvent nécessiter un accès réseau.

Pour publier une nouvelle version du service worker, incrémenter les identifiants de cache dans `service-worker.js`. Le navigateur installe le nouveau cache et supprime ensuite les anciennes versions `veille-*`.

## Configuration des plateformes sociales

Sans identifiants API, Facebook, Instagram et TikTok affichent les limites d’accès officielles. Les résultats Twitch nécessitent les secrets suivants dans les paramètres Cloudflare Pages du projet :

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`

Ne jamais ajouter de secret au dépôt ni le transmettre dans une commande ou un journal. Après modification d’un secret Cloudflare, vérifier le déploiement associé.

En développement local, mettre les identifiants dans `.dev.vars` (fichier local ignoré par Git), puis lancer Pages avec Wrangler. L’API Meta requiert l’accès Page Public Content Access pour les pages non gérées ; la recherche Instagram par hashtag demande un compte professionnel lié et des permissions appropriées ; la Research API TikTok est réservée aux projets de recherche approuvés. Veille n’effectue aucun scraping de ces plateformes.

## Déploiement Cloudflare Pages

Le projet Pages s’appelle `the-riots` et le compte utilisé pour ses déploiements est celui configuré dans Wrangler.

```sh
./node_modules/.bin/wrangler pages deploy . \
  --project-name the-riots \
  --branch main \
  --commit-message "Description du déploiement"
```

Après le déploiement, vérifier la page de production, les routes `/api/veille` et `/api/social`, puis l’installation du service worker dans les outils de développement du navigateur.

## Domaine personnalisé

Le domaine personnalisé de Veille est [the-riots.digitalblueskye.com](https://the-riots.digitalblueskye.com), associé au projet Pages `the-riots` dans **Workers & Pages → `the-riots` → Custom domains**. L’URL `pages.dev` du déploiement et le domaine personnalisé peuvent servir les mêmes fichiers ; si leur affichage diffère temporairement, vérifier d’abord le cache du navigateur et la mise à jour du service worker avant de conclure à un déploiement manquant.

Pour configurer ou réparer ce domaine, l’associer d’abord au projet Pages dans Cloudflare plutôt que de créer uniquement un enregistrement CNAME à la main. Cloudflare gère alors le DNS et le certificat selon la configuration du domaine. Référence : [Domaines personnalisés Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Données cartographiques

Les données locales sont dans `data/communes.json` et `data/departements.geojson`. Les limites administratives sont attribuées selon les indications de leur source. La carte met en contexte les lieux cités et la couverture des médias ; les couleurs distinguent les départements mentionnés dans les articles.
