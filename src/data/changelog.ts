/**
 * What changed, in plain words, newest first. Shown once after an update (« Nouveautés »),
 * and any time from Réglages. Add an entry with each release and bump package.json's version.
 */
export interface Release {
  v: string;
  date: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    v: "0.18.0",
    date: "2026-11-19",
    items: ["Séance finie : plus de ligne de zéros. L'accueil dit « Le minimum du jour est fait » et montre d'abord le bilan du jour.", "On peut faire défiler la page en posant le doigt sur un tracé affiché (corrections, comparaisons) : seules les feuilles où l'on écrit bloquent le doigt.", "Nouveau « Reliez » : signes en haut, syllabes en bas, un signe toujours sélectionné. Touchez sa syllabe pour tracer le lien ; on peut corriger, « Effacer » retire le dernier lien, et la vérification se fait à la fin."],
  },
  {
    v: "0.17.2",
    date: "2026-11-19",
    items: ["Sauvegarde : si le téléphone refuse la pièce jointe, elle part en texte dans le menu de partage plutôt que d'être téléchargée."],
  },
  {
    v: "0.17.1",
    date: "2026-11-19",
    items: ["« M'envoyer ma sauvegarde » ouvre enfin le menu de partage (mail, Drive…) au lieu de télécharger le fichier.", "« Écrivez ce mot à la main » vérifie maintenant les traits de chaque signe (une petite note sous chaque signe), et les boutons s'appellent « Raté » et « Juste »."],
  },
  {
    v: "0.17.0",
    date: "2026-11-19",
    items: ["Glissez le doigt vers la gauche ou la droite pour passer d'un onglet à l'autre (hors séance)."],
  },
  {
    v: "0.16.1",
    date: "2026-11-19",
    items: ["Rideau d'entrée (noren) : la fente du tissu ne coupe plus le texte.", "iPhone : l'écriture marche enfin. Le doigt était pris pour la paume et ignoré, et un trait pouvait bloquer les suivants."],
  },
  {
    v: "0.16.0",
    date: "2026-11-19",
    items: [
      "Interface allégée : Progrès ne montre plus les lignes pas encore ouvertes (repliées en « lignes à venir »), et Réglages range les options rares dans « Réglages fins ».",
      "Écran d'un nouveau signe plus court : polices, mots d'exemple et pièges sont dans « Le signe et des exemples ».",
      "Petites bulles d'aide, une seule fois, au bon moment (premier signe, première note, Progrès…). Réglages › « Revoir les bulles d'aide » pour les revoir.",
    ],
  },
  {
    v: "0.15.1",
    date: "2026-11-19",
    items: ["Plus jamais deux fois le même jeu sur le même exemple dans une série : s'il n'y a plus d'exemple neuf, l'appli passe à un autre jeu."],
  },
  {
    v: "0.15.0",
    date: "2026-11-19",
    items: [
      "Clavier kana plus compact : une colonne par ligne (あいうえお de haut en bas), seulement les lignes déjà vues, et un onglet あ / ア quand il faut les deux.",
      "« Vérifier » est maintenant au-dessus du clavier, et vous pouvez aussi taper avec le clavier japonais de votre téléphone.",
      "Sans son : dans le train, cochez « Sans son pour l'instant » (ou touchez « Pas de son ici » pendant un jeu d'écoute). Plus aucun jeu d'écoute ni son automatique. Réglages › « Jamais de son » pour toujours.",
      "Casque branché en cours de route ? Touchez « Écouter » : le son revient (sauf si « Jamais de son » est coché).",
    ],
  },
  {
    v: "0.14.0",
    date: "2026-11-19",
    items: [
      "Progrès › Partager ma progression : une story à poster (signes maîtrisés, série, temps de pratique, calendrier).",
      "Se comparer : envoyez votre lien, ouvrez celui de l'autre, et voyez vos progressions côte à côte.",
      "L'appli compte maintenant votre temps de pratique réel et vos ratés de chaque jour ; l'historique s'exporte en tableur.",
    ],
  },
  {
    v: "0.13.1",
    date: "2026-11-19",
    items: ["L'entraînement choisit au hasard, mais les signes fragiles ou ratés récemment (même bien maîtrisés) ont plus de chances de revenir."],
  },
  {
    v: "0.13.0",
    date: "2026-11-19",
    items: [
      "Nouvel onglet « S'entraîner » (練) : Écrire, Jouer (10 jeux au hasard), un jeu précis, et l'examen. L'onglet Examen y est rangé.",
      "Après un raté, un « Bof » ou un signe regardé : un deuxième essai tout de suite pour corriger. Il ne change pas la note, mais une réussite fait un peu progresser le signe. « Passer à la suite » pour laisser tomber.",
    ],
  },
  {
    v: "0.12.0",
    date: "2026-11-19",
    items: [
      "Nouveau rythme « Sans limite » (Réglages › Rythme) : des lots de 5 signes, autant que vous voulez par jour, et la ligne suivante s'ouvre d'elle-même.",
      "Les durées annoncées pour chaque rythme sont plus honnêtes, surtout pour les premiers jours.",
    ],
  },
  {
    v: "0.11.0",
    date: "2026-11-19",
    items: [
      "Un nouveau signe revient dans la séance : il faut l'écrire de mémoire deux fois pour qu'il compte comme appris.",
      "Deuxième chance le jour même : un signe réussi revient 4 h plus tard, et le réussir encore le fait déjà avancer. L'accueil vous dit quand revenir.",
      "L'entraînement libre compte un peu : jusqu'à +18 % par jour sur un signe, affichés en clair et confirmés à sa prochaine révision. Au-delà : « Assez vu pour aujourd'hui ».",
    ],
  },
  {
    v: "0.10.2",
    date: "2026-11-19",
    items: ["Un nouveau signe se trace tout de suite : l'ordre des traits s'anime seul et on dessine directement par-dessus, sans bouton « Apprendre ». 3 étapes au lieu de 4."],
  },
  {
    v: "0.10.1",
    date: "2026-11-19",
    items: ["Testeurs japonais : une invitation plus précise (ce qu'on attend d'eux, critiques bienvenues), un profil de test où tout est ouvert, et un parcours qui fait essayer chaque type d'écran."],
  },
  {
    v: "0.10.0",
    date: "2026-11-19",
    items: [
      "L'appli parle aussi japonais : Réglages › Apparence › 日本語, et retour au français au même endroit.",
      "« Faire tester en japonais » (Réglages › Un avis ?) : un écran d'invitation en japonais, avec un code à scanner pour l'ouvrir sur un autre téléphone.",
      "Bouton « Remarque » : noter ce qui cloche sur n'importe quel écran, puis tout envoyer d'un coup.",
    ],
  },
  {
    v: "0.9.2",
    date: "2026-11-19",
    items: ["Pinceau plus organique : le trait suit des courbes douces au lieu de segments droits, sans encoches quand la main accélère."],
  },
  {
    v: "0.9.1",
    date: "2026-11-19",
    items: ["Pinceau plus naturel : l'encre déjà posée ne change plus d'épaisseur quand vous accélérez ou ralentissez."],
  },
  {
    v: "0.9.0",
    date: "2026-11-19",
    items: [
      "Votre trait a maintenant l'allure d'un coup de pinceau. Vous préférez un trait simple et régulier ? Réglages › Apparence.",
      "Le téléphone vibre légèrement quand le pinceau touche la feuille, et pour une bonne ou une mauvaise réponse. Ça se coupe dans les réglages.",
      "Un calendrier de vos jours d'entraînement dans Progrès, et sur l'accueil ce que vous avez fait aujourd'hui.",
      "La journée change à 4 h du matin : vos soirées tardives comptent pour le bon jour.",
      "Les sauvegardes portent leur date, et l'appli vous la montre avant de restaurer.",
      "Les polices sont livrées avec l'appli : plus rapide, parfaite hors connexion, et plus rien n'est demandé à Google.",
      "Corrigé : on ne pouvait pas effacer une lettre dans « Comment ça se lit ? ».",
    ],
  },
  {
    v: "0.8.0",
    date: "2026-11-18",
    items: [
      "Les katakana sont là, après les hiragana : 151 signes en tout.",
      "262 mots utiles, du quotidien et du voyage. Les lettres latines s'effacent quand vous connaissez bien les signes.",
      "L'appli vérifie elle-même le nombre, l'ordre et le sens de vos traits. Vous gardez le dernier mot.",
      "« M'envoyer ma sauvegarde » : votre progression part dans votre boîte mail, en pièce jointe.",
    ],
  },
];
