# Veille

Veille est une application web française de veille éditoriale. Elle agrège des articles provenant de flux RSS et Atom, relie les mentions géographiques aux départements et communes de France métropolitaine, et suit les actualités de mobilisation dans 48 pays d’Europe.

> Veille relaie des articles publiés par les médias référencés et attribue chaque contenu à sa source d’origine. Les catégories et regroupements sont générés automatiquement à partir des mots-clés ; la carte situe les lieux mentionnés dans les articles. La sélection dépend des flux disponibles et ne représente pas l’ensemble de la couverture médiatique. Manifestations et émeutes sont des catégories distinctes.

## Fonctionnalités

- Agrégation de 26 flux RSS/Atom publics, actualisée à l’ouverture et automatiquement toutes les cinq minutes.
- Recherche, sélection des articles par jour au calendrier (avec raccourci « Aujourd’hui » et accès à tout l’historique disponible), filtre par sujet et tri chronologique.
- Carte Leaflet interactive couvrant les 96 départements métropolitains et le référentiel de 34 746 communes.
- Remplissage spectral des départements mentionnés et repères communaux cliquables qui présentent les articles associés.
- Bascule France / Europe et filtre par pays pour les 46 États membres du Conseil de l’Europe, ainsi que la Biélorussie et la Russie.
- Drapeaux dans les vues et filtres par pays ; logos des médias (avec repli sur un monogramme coloré) dans la liste des sources et les articles, et aperçu d’image des articles quand le flux en fournit une.
- Chronologie éditoriale regroupant les articles européens par date, ville citée et sujet détecté, avec le nombre de médias distincts.
- Comparateur de couverture par pays, comptant les articles et médias distincts reçus dans les flux ; les lignes filtrent la chronologie. Ce n’est pas un décompte d’événements.
- Liens partageables qui conservent la recherche, le jour sélectionné, le sujet, la vue France/Europe et le pays sélectionné.
- Jusqu’à cinq flux RSS/Atom personnels sécurisés en HTTPS, enregistrés uniquement dans le navigateur et agrégés lors des actualisations ; les flux sont filtrés par les mots-clés de veille. Les flux personnalisés sont transmis en requête non mise en cache et les redirections ne sont pas suivies.
- Graphique de tendances quotidiennes par pays, filtrable par sujet et sur 7 ou 30 jours. Il s’appuie sur les articles actuellement disponibles, pas sur une archive exhaustive.
- Liste « À lire plus tard » persistante dans le navigateur, conservée localement même après la disparition d’un article des flux.
- Alertes personnalisées par ville/mot-clé et pays facultatif, avec notifications navigateur sur action explicite. Les alertes se déclenchent lorsque Veille est ouverte et récupère de nouveaux articles ; elles ne fonctionnent pas en arrière-plan. Sur iPhone/iPad, les notifications web nécessitent d’ajouter Veille à l’écran d’accueil et de l’ouvrir depuis son icône.
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

Les flux sont filtrés par mots-clés multilingues liés aux manifestations, rassemblements, tensions et dégradations. Les lieux européens sont associés uniquement lorsqu’un nom de ville ou de pays est repéré dans le titre ou l’extrait ; l’adresse d’un média ne sert jamais à déduire le pays de l’article. Le Parisien n’inclut pas systématiquement l’heure de publication ; sa date est estimée depuis le permalien et signalée dans l’interface. La durée de rétention dépend des éditeurs et ne forme pas une archive exhaustive.

La chronologie européenne regroupe par journée, pays, ville citée et catégorie de mots-clés. Lorsqu’aucune ville n’est identifiée, l’article reste isolé et n’est pas fusionné avec d’autres actualités du pays. Le nombre affiché correspond aux médias distincts dans les flux suivis, et non au nombre d’événements. Une même information peut être reprise d’une dépêche commune.

### Couverture européenne et archive

Un Worker Cloudflare distinct interroge GNews une fois par jour pour chacun des 48 pays configurés (les 46 membres du Conseil de l’Europe, plus la Biélorussie et la Russie), puis conserve les résultats par pays dans le KV `HISTORY` pendant 400 jours. Quatre lots tournent à 02:00, 08:00, 14:00 et 20:00 UTC ; ensemble, ils collectent la journée précédente en quatre groupes de douze pays. Les articles sont consultables depuis le calendrier et l’archive. Cela représente jusqu’à 48 appels GNews par jour. Lorsqu’une date historique sans données précollectées est ouverte avec « Tous les pays », une recherche GDELT couvre les 48 pays dans une seule requête ; si GDELT ne répond pas, les flux Google Actualités suivis servent de repli. Les résultats disponibles sont mis en cache dans KV. Une recherche par pays utilise GNews lorsqu’une clé est configurée ; ces recherches manuelles peuvent consommer des appels supplémentaires.

La recherche utilise la langue locale quand elle est prise en charge par GNews, sinon des mots-clés anglais. L’étendue réelle dépend des médias indexés par GNews, des langues et pays acceptés par son API, de ses quotas et de la disponibilité de chaque requête : cette veille ne garantit donc pas un recensement exhaustif. La carte Europe affiche les contours des 48 pays suivis depuis le GeoJSON mondial de [johan/world.geo.json](https://github.com/johan/world.geo.json), issu de Natural Earth ; le navigateur conserve ce fichier en cache pour l’usage hors connexion. Les contours locaux des cinq pays initiaux restent le repli si la source mondiale est indisponible ; dans ce cas, la carte signale explicitement le nombre de frontières manquantes et affiche des repères approximatifs pour les pays concernés.

Le Worker de collecte est configuré séparément de Pages (`wrangler.europe.toml`). Déployer le Worker puis lui ajouter le secret GNews déjà utilisé par Pages :

```sh
./node_modules/.bin/wrangler deploy --config wrangler.europe.toml
./node_modules/.bin/wrangler secret put GNEWS_API_KEY --config wrangler.europe.toml
```

Le Worker et Pages doivent utiliser le même compte Cloudflare pour partager le KV `HISTORY`. Les journaux du Worker indiquent les pays dont la requête a échoué ; une collecte partielle reste accessible sans effacer les résultats des autres pays.

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

Le domaine choisi pour Veille est `the-riots.digitalblueskye.com`, associé au projet Pages `the-riots` dans **Workers & Pages → `the-riots` → Custom domains**. Cloudflare a ajouté le domaine et indique qu'il est en cours d'initialisation. L'enregistrement prévu est un CNAME `the-riots` vers `the-riots.pages.dev` ; la propagation DNS peut prendre jusqu'à 48 heures. L'URL prévue est [https://the-riots.digitalblueskye.com](https://the-riots.digitalblueskye.com). Vérifier le statut du domaine et l'émission du certificat TLS dans Cloudflare avant de considérer la mise en service terminée.

Ne pas créer uniquement un enregistrement CNAME à la main : Cloudflare précise que le domaine doit d'abord être associé au projet Pages. Référence : [Domaines personnalisés Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Données cartographiques

Les données locales sont dans `data/communes.json` et `data/departements.geojson`. Les limites administratives sont attribuées selon les indications de leur source. La carte met en contexte les lieux cités et la couverture des médias ; les couleurs distinguent les départements mentionnés dans les articles.
