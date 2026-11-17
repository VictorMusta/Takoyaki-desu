/**
 * Vocabulary for the word exercises. Only the 46 base hiragana (no dakuten, no small kana),
 * so every word becomes available as soon as its signs are learnt.
 * [hiragana, romaji (Hepburn), French]
 */
export type Word = [w: string, r: string, fr: string];

export const WORDS: Word[] = [
  ["あめ", "ame", "pluie"], ["あさ", "asa", "matin"], ["あき", "aki", "automne"], ["あし", "ashi", "jambe, pied"], ["あか", "aka", "rouge"], ["あおい", "aoi", "bleu"], ["あに", "ani", "grand frère"], ["あね", "ane", "grande sœur"],
  ["いぬ", "inu", "chien"], ["いえ", "ie", "maison"], ["いす", "isu", "chaise"], ["いけ", "ike", "étang"], ["いし", "ishi", "pierre"], ["いま", "ima", "maintenant"], ["いろ", "iro", "couleur"], ["いち", "ichi", "un"],
  ["うみ", "umi", "mer"], ["うえ", "ue", "dessus"], ["うし", "ushi", "vache"], ["うた", "uta", "chanson"], ["うそ", "uso", "mensonge"], ["うちわ", "uchiwa", "éventail rond"],
  ["えき", "eki", "gare"], ["えん", "en", "yen"],
  ["おか", "oka", "colline"], ["おに", "oni", "démon"], ["おかね", "okane", "argent"], ["おなか", "onaka", "ventre"], ["おもち", "omochi", "gâteau de riz"],
  ["かさ", "kasa", "parapluie"], ["かお", "kao", "visage"], ["かみ", "kami", "papier"], ["かめ", "kame", "tortue"], ["かに", "kani", "crabe"], ["かわ", "kawa", "rivière"], ["からて", "karate", "karaté"],
  ["きく", "kiku", "écouter"], ["きた", "kita", "nord"], ["きのこ", "kinoko", "champignon"], ["きもの", "kimono", "kimono"],
  ["くも", "kumo", "nuage"], ["くに", "kuni", "pays"], ["くるま", "kuruma", "voiture"], ["くすり", "kusuri", "médicament"], ["くつ", "kutsu", "chaussures"], ["くち", "kuchi", "bouche"],
  ["けむり", "kemuri", "fumée"], ["けさ", "kesa", "ce matin"],
  ["こころ", "kokoro", "cœur"], ["ここ", "koko", "ici"], ["こめ", "kome", "riz (cru)"], ["ことり", "kotori", "petit oiseau"], ["こえ", "koe", "voix"],
  ["さかな", "sakana", "poisson"], ["さくら", "sakura", "cerisier"], ["さる", "saru", "singe"], ["さけ", "sake", "saké"], ["さむい", "samui", "froid"], ["さしみ", "sashimi", "sashimi"],
  ["しお", "shio", "sel"], ["しま", "shima", "île"], ["しろ", "shiro", "château"], ["した", "shita", "dessous"], ["しか", "shika", "cerf"],
  ["すし", "sushi", "sushi"], ["すいか", "suika", "pastèque"], ["すな", "suna", "sable"], ["すき", "suki", "aimer"],
  ["せき", "seki", "siège"], ["せなか", "senaka", "dos"], ["せんせい", "sensei", "professeur"],
  ["そら", "sora", "ciel"], ["そと", "soto", "dehors"],
  ["たこ", "tako", "poulpe"], ["たけ", "take", "bambou"], ["たかい", "takai", "haut, cher"], ["たいこ", "taiko", "tambour"], ["たぬき", "tanuki", "tanuki"],
  ["ちかてつ", "chikatetsu", "métro"], ["ちいさい", "chiisai", "petit"], ["ちち", "chichi", "père"],
  ["つき", "tsuki", "lune"], ["つくえ", "tsukue", "bureau"], ["つめたい", "tsumetai", "froid (au toucher)"],
  ["て", "te", "main"], ["てら", "tera", "temple"],
  ["とけい", "tokei", "montre"], ["とり", "tori", "oiseau"],
  ["なつ", "natsu", "été"], ["なまえ", "namae", "prénom"], ["なに", "nani", "quoi"], ["なか", "naka", "dedans"],
  ["にく", "niku", "viande"], ["にし", "nishi", "ouest"], ["にわ", "niwa", "jardin"], ["にほん", "nihon", "Japon"],
  ["ぬの", "nuno", "tissu"],
  ["ねこ", "neko", "chat"], ["ねつ", "netsu", "fièvre"],
  ["のり", "nori", "algue nori"], ["のみもの", "nomimono", "boisson"],
  ["はな", "hana", "fleur"], ["はし", "hashi", "baguettes"], ["はる", "haru", "printemps"], ["はこ", "hako", "boîte"],
  ["ひと", "hito", "personne"], ["ひる", "hiru", "midi"], ["ひかり", "hikari", "lumière"], ["ひこうき", "hikōki", "avion"],
  ["ふね", "fune", "bateau"], ["ふゆ", "fuyu", "hiver"], ["ふく", "fuku", "vêtement"], ["ふたつ", "futatsu", "deux (objets)"],
  ["へや", "heya", "chambre"], ["へた", "heta", "maladroit"],
  ["ほし", "hoshi", "étoile"], ["ほん", "hon", "livre"], ["ほね", "hone", "os"],
  ["まつり", "matsuri", "fête traditionnelle"], ["まち", "machi", "ville"], ["まえ", "mae", "devant"],
  ["みみ", "mimi", "oreille"], ["みせ", "mise", "magasin"], ["みなみ", "minami", "sud"], ["みち", "michi", "chemin"], ["みそ", "miso", "miso"], ["みかん", "mikan", "mandarine"],
  ["むし", "mushi", "insecte"], ["むね", "mune", "poitrine"],
  ["め", "me", "œil"],
  ["もも", "momo", "pêche (fruit)"], ["もり", "mori", "forêt"], ["もの", "mono", "chose"],
  ["やま", "yama", "montagne"], ["やさい", "yasai", "légume"], ["やすみ", "yasumi", "repos, fermé"], ["やきとり", "yakitori", "brochettes de poulet"],
  ["ゆき", "yuki", "neige"], ["ゆめ", "yume", "rêve"], ["ゆかた", "yukata", "yukata"],
  ["よる", "yoru", "nuit"], ["よこ", "yoko", "côté"], ["よん", "yon", "quatre"],
  ["りす", "risu", "écureuil"],
  ["るす", "rusu", "absent (de chez soi)"],
  ["れきし", "rekishi", "histoire"],
  ["ろく", "roku", "six"],
  ["わたし", "watashi", "je, moi"], ["わに", "wani", "crocodile"],
];

/**
 * Short sentences and proverbs, words separated by spaces.
 * Particles: は reads « wa », へ « e », を « o ».
 */
export interface Sentence {
  w: string;
  r: string;
  fr: string;
  proverb?: boolean;
}

export const SENTENCES: Sentence[] = [
  { w: "わたしの なまえは たろう", r: "watashi no namae wa tarō", fr: "Je m'appelle Tarō." },
  { w: "ねこは ここに いる", r: "neko wa koko ni iru", fr: "Le chat est ici." },
  { w: "えきへ いく", r: "eki e iku", fr: "Je vais à la gare." },
  { w: "うみへ いきたい", r: "umi e ikitai", fr: "Je veux aller à la mer." },
  { w: "みそしるを のむ", r: "misoshiru o nomu", fr: "Je bois une soupe miso." },
  { w: "あしたは あめ", r: "ashita wa ame", fr: "Demain, il pleut." },
  { w: "はるは さくらの きせつ", r: "haru wa sakura no kisetsu", fr: "Le printemps est la saison des cerisiers." },
  { w: "そらの ほし", r: "sora no hoshi", fr: "Les étoiles du ciel." },
  { w: "やまの うえに ゆき", r: "yama no ue ni yuki", fr: "De la neige en haut de la montagne." },
  { w: "さるも きから おちる", r: "saru mo ki kara ochiru", fr: "Même les singes tombent des arbres : tout le monde se trompe.", proverb: true },
  { w: "いしの うえにも さんねん", r: "ishi no ue ni mo sannen", fr: "Trois ans, même sur une pierre : la persévérance finit par payer.", proverb: true },
  { w: "かえるの こは かえる", r: "kaeru no ko wa kaeru", fr: "L'enfant d'une grenouille est une grenouille : tel père, tel fils.", proverb: true },
];

/** Signs the learner must know to meet this text (spaces ignored). */
export const signsOf = (s: string): string[] => [...new Set([...s.replace(/\s/g, "")])];
