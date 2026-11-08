# Mon Kit 72h

Un parcours simple en quatre étapes pour préparer un kit d'urgence de 72 heures, en s'appuyant sur les recommandations officielles françaises.

Projet en cours de développement.

## Tests de non-régression

Prérequis : Node.js 24 et Python 3 (serveur statique de test).

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

Pour utiliser Chromium déjà installé : `CHROMIUM_PATH=/usr/bin/chromium npm test`.
Les scénarios Playwright tournent avec deux tailles de fenêtre (1280 × 800 et
390 × 844), en Chromium. Ils couvrent FR/EN sur les quatre étapes, les cases à
cocher, la progression, la navigation, les quantités et la copie des courses,
les liens Amazon, le rechargement et la réinitialisation confirmée ou annulée.
La CI les exécute sur chaque pull request et sur les changements de `main`.

Voir [l’audit de stabilisation](STABILITY.md) pour les risques et limites.
