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
