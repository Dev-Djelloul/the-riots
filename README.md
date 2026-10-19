# Veille

Veille agrège les flux RSS publics de franceinfo, BFMTV, CNEWS, Le Monde, France 24, Libération et Ouest-France. La fonction `functions/api/veille.js` récupère les flux côté serveur, conserve les articles de moins de sept jours correspondant à des mots-clés de veille et renvoie le média, la date, l’extrait disponible et le lien de l’article original. Le titre, l’extrait et le média sont visibles directement sur chaque carte du tableau de bord ; le lien mène à l’article complet chez son éditeur. Aucun compte, secret ou service tiers n’est requis.

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
- Les articles et extraits restent attribués à leur média d’origine et renvoient vers la publication source.

## Tests

```sh
node --test tests/veille.test.mjs
```
