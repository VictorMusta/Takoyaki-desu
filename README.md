# たこ焼きです · Takoyaki desu

Apprendre les hiragana en les **écrivant de mémoire**, puis en se comparant au modèle, avec répétition espacée. Appli web installable sur le téléphone, qui marche hors ligne et se met à jour toute seule : la nouvelle version est cherchée au lancement et au retour dans l'appli, puis installée aussitôt, ou à la fin de la séance en cours pour ne rien perdre.

## Principe

1. **Découverte** d'un nouveau signe : le signe seul, puis l'ordre des traits animé (une couleur et un numéro par trait), puis un pochoir, un pochoir estompé et enfin la page blanche.
2. **Révision** : on écrit le signe de mémoire, on compare son tracé (recoloré dans l'ordre où on l'a fait) au modèle, on répond à une checklist (nombre de traits, ordre, proportions), puis on se note Raté / Bof / Bien.
3. **Planification** : SM-2 simplifié. Un ordre faux plafonne la note à « Bof ». La ligne suivante du tableau s'ouvre quand 80 % de la ligne en cours tient au moins 3 jours.
4. **Examen strict et calibration** : compare le taux de « Bien » en séance au taux de réussite en examen, pour repérer une auto-évaluation trop généreuse.

**Hiragana complets** : les 46 signes de base, puis les signes sonores (ten-ten ゛ : が, ざ, だ, ば ; maru ゜ : ぱ), puis les petits signes ゃ ゅ ょ っ (combinaisons きゃ, しゅ… et consonnes doublées). 75 signes, chacun avec ses traits, son astuce et des mots d'exemple.

**Vérification automatique des traits** : après chaque tracé, l'appli compare votre dessin au modèle sans tenir compte de la taille ni de la position. Elle vérifie le nombre de traits, leur ordre, leur sens et grossièrement leur forme, accepte les variantes courantes (き en 3 traits, さ en 2, り en 1) et entoure le trait fautif. Elle ne note jamais à votre place : elle bloque seulement « Bien » quand elle trouve une vraie erreur. Bouton « Je pense que c'est juste » pour passer outre et envoyer le tracé à l'auteur.

**Rythme et « Continuer »** : à la création du profil, on choisit 5, 10 ou 15 nouveaux signes par jour (modifiable dans Réglages). Une fois la séance du jour faite, on peut continuer : réviser encore (sans limite, sans toucher aux dates de révision), apprendre 5 signes de plus si les révisions du jour sont faites, ou ouvrir la ligne suivante. Pendant un rappel, « Je ne m'en souviens pas : voir le signe » affiche le pochoir : le signe revient plus tard dans la séance puis dès le lendemain. Une séance coupée ou fermée reprend exactement où elle s'était arrêtée.

**Vocabulaire** : un mot s'ouvre quand tous ses signes sont vus (3 nouveaux mots par jour, réglable). Découverte (son, lecture, sens, signes), puis révisions espacées : lire le mot et l'épeler en lettres latines puis choisir son sens, ou retrouver le mot à partir de son sens avec des signes à sélectionner. Progrès compte les mots sus (sens retrouvé et tenu au moins un jour).

**S'entraîner autrement** (accueil) : choisir le signe, écouter, lire, relier, sosies, lire des mots, textes à trous, dictée au clavier (clavier hiragana intégré, seulement les signes appris) ou dessinée, phrases et proverbes, et textes vus au Japon en 3 écritures (panneaux, menus, stèles, noren) à deviner puis corriger. Quelques exercices sont aussi glissés dans la séance du jour. Ils ne repoussent jamais une révision ; un raté la rapproche.

**Je parle déjà japonais** (Réglages → Niveau) : ouvre tout, considère les 46 signes comme connus et propose un examen général sur les 46 ; un signe raté à l'examen revient le lendemain. Réversible : « J'ai menti » rétablit la progression d'avant.

**Astuces** : rares (une par jour au plus, puis 60 jours d'attente pour la même), sur l'écran de comparaison : pièges propres à certains signes, conseils généraux et « faux Bien » dessinés. Chacune peut être masquée.

**Profils** : n'importe qui peut installer l'appli. Au premier lancement, on crée son profil ; on peut en ajouter, renommer ou supprimer d'autres dans Réglages, et changer de profil depuis le menu en haut. Chaque profil a sa propre progression, qui reste sur l'appareil.

Chaque signe a une fiche : le caractère dans 5 polices (manuscrit, mincho, gothique, arrondi, pinceau), deux mots d'exemple et les particularités de lecture.

## Développement

```bash
npm install
npm run dev        # serveur local
npm test           # tests du planificateur
npm run build      # vérification des types + build dans dist/
```

Organisation :

| Dossier | Contenu |
| --- | --- |
| `src/data` | Tracés des kana (`kana.json`, généré depuis KanjiVG) et mots d'exemple |
| `src/core` | Planificateur (pur, testé), types, stockage local |
| `src/ui` | Canevas d'écriture, rendu des modèles SVG, fiche, synthèse vocale |
| `src/views` | Écrans : séance, comparaison, progrès, examen, réglages |
| `scripts` | `extract_kana.py` régénère `kana.json` à partir des SVG KanjiVG |

La progression est enregistrée dans le navigateur (`localStorage`). Réglages → Sauvegarde permet de la copier et de la réimporter.

## Déploiement

Chaque push sur `main` lance les tests, construit l'appli et la publie sur GitHub Pages (`.github/workflows/deploy.yml`). Il faut une seule fois : *Settings → Pages → Source : GitHub Actions*.

## Licences

- Code : MIT (voir `LICENSE`).
- Tracés et ordre des traits : [KanjiVG](http://kanjivg.tagaini.net), © Ulrich Apel, sous licence [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Le fichier `src/data/kana.json` en est dérivé et reste sous cette licence.
