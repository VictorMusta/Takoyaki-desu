# たこ焼きです · Takoyaki desu

Apprendre les hiragana en les **écrivant de mémoire**, puis en se comparant au modèle, avec répétition espacée. Appli web installable sur le téléphone, qui marche hors ligne et se met à jour toute seule : la nouvelle version est cherchée au lancement et au retour dans l'appli, puis installée aussitôt, ou à la fin de la séance en cours pour ne rien perdre.

## Principe

1. **Découverte** d'un nouveau signe : le signe seul, puis l'ordre des traits animé (une couleur et un numéro par trait), puis un pochoir, un pochoir estompé et enfin la page blanche.
2. **Révision** : on écrit le signe de mémoire, on compare son tracé (recoloré dans l'ordre où on l'a fait) au modèle, on répond à une checklist (nombre de traits, ordre, proportions), puis on se note Raté / Bof / Bien.
3. **Planification** : SM-2 simplifié. Un ordre faux plafonne la note à « Bof ». La ligne suivante du tableau s'ouvre quand 80 % de la ligne en cours tient au moins 3 jours.
4. **Examen strict et calibration** : compare le taux de « Bien » en séance au taux de réussite en examen, pour repérer une auto-évaluation trop généreuse.

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
