# Veille

Veille agrège les flux RSS publics de franceinfo, BFMTV, CNEWS, Le Monde, France 24, Libération et Ouest-France. La fonction `functions/api/veille.js` récupère les flux côté serveur, conserve les articles de moins de sept jours correspondant à des mots-clés de veille et renvoie le média, la date, l’extrait, l’éventuelle vignette fournie par le flux et le lien de l’article original. Le tableau de bord propose une régie visuelle des trois derniers articles, les lecteurs YouTube officiels de franceinfo et BFMTV (chargés à la demande), une carte interactive OpenStreetMap et un fil de cartes attribuées aux éditeurs. Le fil de presse fonctionne sans identifiant ; la recherche Twitch est optionnelle et demande des secrets API configurés côté serveur.

## Développement et publication

Le site est servi à la racine du projet, avec les Pages Functions dans `functions/`.

```sh
npx wrangler pages dev .
npx wrangler pages deploy . --project-name <nom-du-projet>
```

La seconde commande publie la version sur le projet Cloudflare Pages indiqué. Ne la lancer qu’après avoir confirmé que le nom du projet et la cible de publication sont corrects.

## Portée et limites

- La veille est rafraîchie à l’ouverture et toutes les cinq minutes. Le bouton d’actualisation permet aussi une mise à jour manuelle.
- Les mots-clés classent uniquement les articles trouvés dans les flux consultés ; les catégories ne sont ni des constats ni des vérifications indépendantes.
- Les flux RSS et la recherche par mots-clés ne constituent pas une couverture exhaustive de l’actualité.
- Un repère sur la carte n’apparaît que si le titre nomme une ville connue. Il indique une mention dans un titre, jamais une localisation précise d’un événement.
- La carte utilise Leaflet et les tuiles OpenStreetMap, avec attribution affichée. Les marqueurs sont centrés sur des coordonnées de ville et restent approximatifs ; ils ne géolocalisent pas les événements. Les tuiles sont chargées depuis OpenStreetMap lorsque la carte s’affiche.
- Les articles et extraits restent attribués à leur média d’origine et renvoient vers la publication source.
- Les images ne sont montrées que si elles sont fournies dans le flux RSS ; sinon, la carte l’indique. L’application n’héberge ni ne recopie les images ou vidéos.
- Les lecteurs des chaînes ne s’activent qu’après un clic et peuvent être indisponibles lorsque la chaîne n’émet pas de direct intégrable. Leur chargement contacte YouTube.
- Les API sociales officielles n’offrent pas une recherche générale anonyme pour Facebook, Instagram ou TikTok : Facebook demande l’autorisation Meta Page Public Content Access pour lire les pages non gérées ; Instagram exige un compte professionnel lié et des permissions d’accès aux hashtags publics ; TikTok réserve la recherche de vidéos publiques par mots-clés à la Research API approuvée. L’application n’utilise pas de scraping ni de service d’agrégation tiers. Instagram propose un lien direct vers le hashtag correspondant au premier mot de recherche.
- Les directs Twitch sont réellement recherchés via Helix Search Channels quand `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` sont configurés comme secrets Cloudflare Pages. Ces identifiants restent côté serveur et ne doivent pas être ajoutés au dépôt ou au navigateur. Sans eux, Veille affiche explicitement que la source n’est pas configurée. L’entrée de recherche lance la recherche Twitch ; pour Instagram, son premier mot devient un hashtag.

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
