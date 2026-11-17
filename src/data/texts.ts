/**
 * Texts to understand: real-life Japanese as seen in Japan, in the three scripts
 * (hiragana, katakana, kanji). The learner guesses from the hiragana they know,
 * writes or says what they understood, then reads the correction.
 * `look` draws the text as the object it is found on.
 */
export type Look = "noren" | "panneau" | "menu" | "stele" | "quai" | "sol" | "ema" | "papier";

export interface Part {
  t: string; // as written
  r: string; // reading
  fr: string; // meaning
}

export interface Text {
  id: string;
  look: Look;
  where: string; // where you would see it
  parts: Part[];
  fr: string; // whole meaning
}

const p = (t: string, r: string, fr: string): Part => ({ t, r, fr });

export const TEXTS: Text[] = [
  { id: "yu", look: "noren", where: "Sur le rideau d'entrée d'un bain public", parts: [p("ゆ", "yu", "eau chaude")], fr: "Bain chaud (onsen, sentō)." },
  { id: "tomare", look: "sol", where: "Peint sur la route, avant un carrefour", parts: [p("とまれ", "tomare", "arrêtez-vous")], fr: "Stop." },
  { id: "sushi", look: "noren", where: "Sur le rideau d'un restaurant", parts: [p("すし", "sushi", "sushi")], fr: "Sushis." },
  { id: "yasumi", look: "panneau", where: "Accroché à la porte d'une boutique", parts: [p("本日", "honjitsu", "aujourd'hui"), p("は", "wa", "(thème)"), p("やすみ", "yasumi", "repos, fermé"), p("です", "desu", "(c'est)")], fr: "Fermé aujourd'hui." },
  { id: "hakata", look: "quai", where: "Panneau de quai, dans une gare", parts: [p("はかた", "hakata", "Hakata (Fukuoka)")], fr: "Gare de Hakata." },
  { id: "menu", look: "menu", where: "Ardoise devant un izakaya", parts: [p("やきとり", "yakitori", "brochettes de poulet"), p("3本", "san-bon", "3 pièces"), p("450円", "yonhyaku-gojū en", "450 yens")], fr: "Yakitori : 3 brochettes pour 450 yens." },
  { id: "ramen", look: "menu", where: "Menu d'un restaurant de nouilles", parts: [p("ラーメン", "rāmen", "ramen"), p("一杯", "ippai", "un bol"), p("800円", "happyaku en", "800 yens")], fr: "Ramen : 800 yens le bol." },
  { id: "toire", look: "panneau", where: "Panneau dans un restaurant", parts: [p("トイレ", "toire", "toilettes"), p("は", "wa", "(thème)"), p("あちら", "achira", "là-bas"), p("です", "desu", "(c'est)")], fr: "Les toilettes sont par là." },
  { id: "kaikei", look: "panneau", where: "Au-dessus de la caisse", parts: [p("お会計", "okaikei", "l'addition, la caisse"), p("は", "wa", "(thème)"), p("こちら", "kochira", "ici"), p("です", "desu", "(c'est)")], fr: "La caisse, c'est ici." },
  { id: "kippu", look: "panneau", where: "Dans une gare", parts: [p("きっぷ", "kippu", "billet"), p("売り場", "uriba", "point de vente")], fr: "Guichet des billets." },
  { id: "kinen", look: "panneau", where: "À l'entrée d'un café", parts: [p("ここ", "koko", "ici"), p("は", "wa", "(thème)"), p("禁煙", "kin'en", "non-fumeur"), p("です", "desu", "(c'est)")], fr: "Ici, il est interdit de fumer." },
  { id: "densha", look: "quai", where: "Annonce sur le quai", parts: [p("まもなく", "mamonaku", "bientôt"), p("電車", "densha", "le train"), p("が", "ga", "(sujet)"), p("まいります", "mairimasu", "arrive")], fr: "Le train va bientôt arriver." },
  { id: "irasshai", look: "noren", where: "Lancé par le personnel quand on entre", parts: [p("いらっしゃいませ", "irasshaimase", "bienvenue")], fr: "Bienvenue (dans notre boutique)." },
  { id: "sakura", look: "papier", where: "Dans une conversation", parts: [p("さくら", "sakura", "les cerisiers"), p("が", "ga", "(sujet)"), p("きれい", "kirei", "beau"), p("です", "desu", "(c'est)"), p("ね", "ne", "n'est-ce pas")], fr: "Les cerisiers sont beaux, n'est-ce pas ?" },
  { id: "mainichi", look: "ema", where: "Écrit sur une plaque de vœux (ema) dans un sanctuaire", parts: [p("毎日", "mainichi", "chaque jour"), p("すこしずつ", "sukoshi zutsu", "un peu à la fois")], fr: "Un peu chaque jour." },
  { id: "senri", look: "stele", where: "Gravé sur une stèle de temple", parts: [p("千里", "senri", "mille lieues"), p("の", "no", "de"), p("道", "michi", "chemin"), p("も", "mo", "même"), p("一歩", "ippo", "un pas"), p("から", "kara", "à partir de")], fr: "Même un chemin de mille lieues commence par un pas." },
  { id: "koban", look: "stele", where: "Proverbe", parts: [p("ねこ", "neko", "chat"), p("に", "ni", "à"), p("小判", "koban", "pièce d'or")], fr: "Une pièce d'or à un chat : offrir à quelqu'un ce qu'il ne peut pas apprécier." },
  { id: "oishii", look: "papier", where: "Dit en mangeant", parts: [p("おいしい", "oishii", "délicieux"), p("！", "", "")], fr: "C'est délicieux !" },
];

/** The text as one string. */
export const textOf = (t: Text) => t.parts.map((x) => x.t).join("");

const HIRA = /[ぁ-ゖ]/;
export const isHira = (c: string) => HIRA.test(c);
