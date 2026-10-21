# Veille

Veille est une application web française de veille éditoriale. Elle agrège des articles provenant de flux RSS, relie les mentions géographiques aux départements et communes de France métropolitaine, et propose des liens et lecteurs officiels de chaînes d’information.

> Veille ne vérifie pas les faits. Un article isolé ne confirme pas un événement ; les mentions sur la carte reflètent la couverture des médias, pas des incidents confirmés. Manifestations et émeutes ne sont pas synonymes.

## Fonctionnalités

- Agrégation de 18 flux RSS publics, actualisée à l’ouverture et automatiquement toutes les cinq minutes.
- Recherche, filtres par période et sujet, et tri chronologique des articles.
- Carte Leaflet interactive couvrant les 96 départements métropolitains et le référentiel de 34 746 communes.
- Remplissage spectral des départements mentionnés et repères communaux cliquables qui présentent les articles associés.
- Fil visuel de jusqu’à six articles illustrés par une image fournie dans leur flux RSS.
- Lecteurs vidéo officiels chargés au clic et liens de secours vers les chaînes ou sites des médias.
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

Les flux sont filtrés par mots-clés liés aux manifestations, rassemblements, violences et dégradations. Le Parisien n’inclut pas systématiquement l’heure de publication ; sa date est estimée depuis le permalien et signalée dans l’interface. La durée de rétention dépend des éditeurs et ne forme pas une archive exhaustive.

### Vidéos en direct

Les lecteurs des chaînes suivantes ne sont créés qu’après un clic :

- franceinfo, BFMTV, CNEWS et Euronews français utilisent les lecteurs YouTube officiels ; les directs peuvent varier selon la programmation et les droits.
- France 24 utilise son lecteur officiel `embed.france24.com`.
- LCI propose sur sa chaîne YouTube des directs ponctuels, pas nécessairement une diffusion continue.
- TV5MONDE Info propose une chaîne YouTube d’actualité ; la disponibilité du lecteur et des programmes TV5MONDE peut varier selon le pays.

Les cartes conservent des liens de repli officiels pour chaque média. Ne pas remplacer ces lecteurs par des flux HLS tiers ou des sources qui ne sont pas fournies par les chaînes.

## Technologies et organisation

- Application statique HTML, CSS et JavaScript natifs, sans étape de compilation.
- Cloudflare Pages Functions fournit les routes API.
- `functions/api/veille.js` récupère et analyse les flux RSS côté serveur.
- `functions/api/social.js` expose les statuts des plateformes et, si configuré, les recherches de chaînes Twitch en direct.
- `app.js` gère l’interface, les articles, la carte et les lecteurs.
- `geography.js` rapproche les articles des données géographiques.
- `service-worker.js`, `manifest.webmanifest` et les icônes `icons/` fournissent les fonctions PWA.
- `data/communes.json` et `data/departements.geojson` fournissent les référentiels cartographiques.
- `tests/` contient les tests de l’analyse RSS, des fonctionnalités sociales, de la géographie et du mode PWA hors connexion.
- Les styles et la bibliothèque Leaflet sont chargés depuis des CDN ; ils ne sont pas disponibles hors connexion. Les données cartographiques locales sont mises en cache.

### Icônes et logos

Les icônes Facebook, Instagram, TikTok, Twitch et YouTube dans `icons/` ont été fournies dans le projet. Les logos des chaînes d’information sont des ressources Wikimedia Commons : [franceinfo](https://commons.wikimedia.org/wiki/File:Franceinfo.svg), [France 24](https://commons.wikimedia.org/wiki/File:France_24_logo_(2013).svg), [BFMTV](https://commons.wikimedia.org/wiki/File:BFMTV_2025.svg), [Euronews](https://commons.wikimedia.org/wiki/File:Euronews_Logo_2025.svg), [LCI / TF1 Info](https://commons.wikimedia.org/wiki/File:Tf1_info_lci.png), [TV5MONDE](https://commons.wikimedia.org/wiki/File:Logo_TV5_Monde_-_2021.svg) et [CNEWS](https://commons.wikimedia.org/wiki/File:Canal_News_logo.svg). Les noms et marques restent la propriété de leurs ayants droit ; les logos servent uniquement à identifier les liens et lecteurs officiels.

La carte utilise les tuiles [OpenStreetMap](https://www.openstreetmap.org/copyright). Les limites départementales généralisées à 1 000 m viennent du jeu [Contours administratifs](https://www.data.gouv.fr/datasets/contours-administratifs/), notamment basé sur Admin Express de l’IGN, sous Licence Ouverte Etalab 2.0. Le référentiel des communes vient de l’API Découpage Administratif (`geo.api.gouv.fr`). Les couleurs correspondent aux mentions dans les articles ; elles n’expriment pas l’intensité d’incidents.

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

Les données locales sont dans `data/communes.json` et `data/departements.geojson`. Les limites administratives sont attribuées selon les indications de leur source et affichées pour contextualiser les mentions d’articles, pas pour représenter des événements vérifiés.
