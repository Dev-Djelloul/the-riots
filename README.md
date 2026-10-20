# Veille

Veille agrège douze flux RSS publics : franceinfo, BFMTV, CNEWS, Le Monde, France 24, Libération, Ouest-France, 20 Minutes, La Croix, L’Humanité, La Dépêche du Midi et Le Parisien. La sélection combine audiovisuel, presse nationale et presse régionale. La fonction `functions/api/veille.js` récupère les articles encore exposés par ces flux et correspondant aux mots-clés suivis, puis renvoie leur média, date, extrait, vignette éventuelle et lien original. Pour Le Parisien, dont le flux omet la date de publication, la date est estimée depuis le permalien et identifiée comme telle dans l’interface. Le tableau de bord propose une régie visuelle des trois derniers articles, les lecteurs de chaînes, une carte interactive OpenStreetMap et un fil de cartes attribuées aux éditeurs. Le fil de presse fonctionne sans identifiant ; la recherche Twitch est optionnelle et demande des secrets API configurés côté serveur.

## Développement et publication

Le site est servi à la racine du projet, avec les Pages Functions dans `functions/`. La carte utilise les tuiles OpenStreetMap sans clé, assombries dans l’interface ; les lecteurs sociaux acceptent les liens publics compatibles collés par l’utilisateur. Les directs franceinfo et BFMTV utilisent les lecteurs YouTube des chaînes officielles. CNEWS utilise également son lecteur de chaîne YouTube ; il n’affichera un direct que lorsqu’un flux est effectivement en cours.

```sh
npx wrangler pages dev .
npx wrangler pages deploy . --project-name <nom-du-projet>
```

La seconde commande publie la version sur le projet Cloudflare Pages indiqué. Ne la lancer qu’après avoir confirmé que le nom du projet et la cible de publication sont corrects.

## Portée et limites

- La veille est rafraîchie à l’ouverture et toutes les cinq minutes. Le bouton d’actualisation permet aussi une mise à jour manuelle.
- Les mots-clés classent uniquement les articles trouvés dans les flux consultés ; les catégories ne sont ni des constats ni des vérifications indépendantes.
- La sélection actuelle couvre douze flux éditoriaux, pas l’ensemble de la presse ni des sources primaires. Les médias sans flux RSS public, les réseaux sociaux et certains événements ne sont pas couverts ; les flux peuvent omettre des articles ou limiter leur historique.
- Le filtre « Historique disponible » affiche les articles conservés dans les flux RSS au moment de la collecte (jusqu’à 50 articles pertinents par source). La durée de rétention dépend de chaque média ; il n’existe pas d’archive exhaustive ni de garantie de couvrir le début des événements.
- « Aujourd’hui » utilise la journée locale de l’appareil ; « 7 derniers jours » couvre une fenêtre glissante de sept fois 24 heures.
- Un repère sur la carte n’apparaît que si le titre nomme une ville connue. Il indique une mention dans un titre, jamais une localisation précise d’un événement.
- La carte utilise Leaflet et les tuiles OpenStreetMap, assombries côté interface et avec attribution visible. Les cercles rouges sont des zones indicatives centrées sur les villes citées ; ils ne représentent pas les limites administratives ni la localisation vérifiée d’un événement.
- Les articles et extraits restent attribués à leur média d’origine et renvoient vers la publication source.
- Les images ne sont montrées que si elles sont fournies dans le flux RSS ; sinon, la carte l’indique. L’application n’héberge ni ne recopie les images ou vidéos.
- Le lecteur franceinfo ne s’active qu’après un clic et peut être indisponible lorsque la chaîne n’émet pas de direct intégrable. BFMTV et CNEWS s’ouvrent sur leur site officiel, qui ne permet pas l’intégration de leur player dans cette page. Le chargement du lecteur franceinfo contacte YouTube.
- Les API sociales officielles n’offrent pas une recherche générale anonyme pour Facebook, Instagram ou TikTok : Facebook demande l’autorisation Meta Page Public Content Access pour lire les pages non gérées ; Instagram exige un compte professionnel lié et des permissions d’accès aux hashtags publics ; TikTok réserve la recherche de vidéos publiques par mots-clés à la Research API approuvée. L’application n’utilise pas de scraping ni de service d’agrégation tiers. L’interface ouvre le hashtag Instagram correspondant au premier mot de recherche et peut intégrer un aperçu officiel à partir d’un lien public collé par l’utilisateur (Facebook, Instagram, TikTok, Twitch).
- Les directs Twitch sont réellement recherchés via Helix Search Channels quand `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` sont configurés comme secrets Cloudflare Pages ; leurs vignettes renvoient vers la chaîne. Ces identifiants restent côté serveur. Sans eux, Veille indique que la source n’est pas configurée. Les lecteurs YouTube des chaînes officielles disposent aussi d’un lien de repli vers la chaîne si aucun direct n’est intégrable.
- Le panneau d’articles récents a une hauteur plafonnée sur grand écran et défile indépendamment ; la liste complète n’allonge plus toute la page.

## Tests

```sh
node --test tests/veille.test.mjs
node --test tests/social.test.mjs
```

Pour activer la recherche de directs Twitch sur Cloudflare Pages, saisir les deux commandes (Wrangler demandera chaque valeur de façon interactive) :

```sh
npx wrangler pages secret put TWITCH_CLIENT_ID --project-name <nom-du-projet>
npx wrangler pages secret put TWITCH_CLIENT_SECRET --project-name <nom-du-projet>
```

En local, placer ces valeurs dans `.dev.vars` (fichier ignoré par Git) pour `wrangler pages dev`. Ne jamais enregistrer les identifiants dans le code, un fichier suivi par Git ou le navigateur. L’accès Facebook, Instagram ou TikTok nécessite les permissions et approbations propres à chaque plateforme décrites ci-dessus.
