# Audit de stabilisation

## Causes et corrections

- Une flèche JavaScript contenant directement `if` rendait le script de langue
  invalide. Le navigateur n’exécutait ni la création du sélecteur ni la traduction.
- Les titres numérotés et certains prix n’étaient pas traduits ; le texte du pied
  de page ne correspondait pas à la clé de traduction à cause de sa ponctuation.
- Le cache WeakMap gardait le premier texte d’un nœud même après une modification
  par le rendu. Il distingue désormais le dernier texte traduit d’une nouvelle
  valeur produite par le rendu. Les scripts/styles et les composants qui gèrent
  déjà leurs traductions sont exclus du parcours des textes.
- Le MutationObserver sur tout le corps pouvait relancer des traductions après
  les reconstructions de courses et les ajouts de liens. Il ne surveillait pas
  `characterData`, donc ne garantissait pas non plus la traduction des simples
  changements de texte. Il est supprimé : le changement de langue appelle le
  rendu complet, dans l’ordre checklist → traduction → courses/progression →
  liens. Les microtâches de rendu concurrentes sont supprimées.
- La progression incluant les courses n’était recalculée que sur l’étape 2.
  Elle est maintenant recalculée sur toutes les étapes. Les anciennes cases
  `1-*` restent stockées mais ne sont pas comptées en double avec les courses.
  Les identifiants inconnus ne gonflent pas la progression.
- Le retour asynchrone de copie pouvait viser un bouton remplacé lors d’une
  navigation ou d’un changement de langue. Il ne modifie désormais que le bouton
  d’origine s’il est encore connecté.

## Compatibilité et risques restants

Les clés `mon-kit-72h-v1`, `mon-kit-72h-groceries-v1` et
`mon-kit-72h-language`, les identifiants de cases, le nombre de personnes et
le tag public `monkit72h-21` sont conservés. Aucun effacement ni migration au
chargement. La réinitialisation explicite conserve le nombre de personnes et
la langue, conformément au comportement existant.

Les scripts restent ordonnés et enveloppent une fonction `render` commune :
une réorganisation future doit conserver cet ordre ou adopter un point d’entrée
unique. Toute nouvelle interaction qui modifie les données devra appeler le
rendu approprié explicitement. La traduction par texte exact reste sensible aux
changements éditoriaux ; les tests des textes d’étapes signalent les omissions.
Les reconstructions DOM restent celles de l’interface existante et peuvent
perdre le focus sur une case après son activation.

## Vérification et limites

Suite automatisée : cinq scénarios, chacun sur ordinateur et mobile, soit dix
exécutions. Les données existantes sont injectées avant ouverture ; les tests
vérifient leur conservation lors des changements de langue, le rechargement,
les confirmations de reset, les bornes de quantités, l’action clavier, la copie
et une résolution tardive de copie après navigation. Les liens affiliés sont
vérifiés par leur URL, leur tag, leur libellé, leurs attributs et leur visibilité.

Les tests utilisent Chromium avec une fenêtre mobile simulée, pas un appareil
physique. Firefox, Safari et les lecteurs d’écran ne sont pas vérifiés. Le
presse-papiers est simulé pour vérifier le contenu et le retour asynchrone ; les
permissions système et le repli `execCommand` ne sont pas validés. Les pages
Amazon, prix, stocks et l’attribution effective des commissions ne sont pas
vérifiés ; aucune commande ni achat n’est effectué. Aucun déploiement de
production n’est réalisé par cette correction.
