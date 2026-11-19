/**
 * Travel phrases: what you actually say in Japan. Unlike words, they open at once (the
 * reading is shown under every block of signs not known yet), since they are needed now.
 * Blocks are separated by « | », in the kana and in the reading alike: they are the tiles of
 * the « compose the sentence » game. Particles: は reads « wa », を « o », へ « e ».
 */
export interface Phrase {
  w: string;
  r: string;
  fr: string;
}

export const PHRASES: Phrase[] = [
  { w: "トイレは|どこ|ですか", r: "toire wa|doko|desu ka", fr: "Où sont les toilettes ?" },
  { w: "ふたり|です", r: "futari|desu", fr: "Nous sommes deux." },
  { w: "にほんごが|はなせません", r: "nihongo ga|hanasemasen", fr: "Je ne parle pas japonais." },
  { w: "だいじょうぶ|です", r: "daijōbu|desu", fr: "Ça va, pas de problème." },
  { w: "ありがとう|ございます", r: "arigatō|gozaimasu", fr: "Merci (poli)." },
  { w: "どうも|ありがとう|ございます", r: "dōmo|arigatō|gozaimasu", fr: "Merci beaucoup." },
  { w: "おはよう|ございます", r: "ohayō|gozaimasu", fr: "Bonjour (le matin, poli)." },
  { w: "おやすみ|なさい", r: "oyasumi|nasai", fr: "Bonne nuit." },
  { w: "いい|いちにちを", r: "ii|ichinichi o", fr: "Bonne journée !" },
  { w: "えきは|どこ|ですか", r: "eki wa|doko|desu ka", fr: "Où est la gare ?" },
  { w: "これを|ください", r: "kore o|kudasai", fr: "Je voudrais ceci." },
  { w: "みずを|ください", r: "mizu o|kudasai", fr: "De l'eau, s'il vous plaît." },
  { w: "おかいけい|おねがいします", r: "okaikei|onegaishimasu", fr: "L'addition, s'il vous plaît." },
  { w: "いくら|ですか", r: "ikura|desu ka", fr: "Combien ça coûte ?" },
  { w: "カードで|いいですか", r: "kādo de|ii desu ka", fr: "Je peux payer par carte ?" },
  { w: "ふくろは|いりません", r: "fukuro wa|irimasen", fr: "Pas besoin de sac." },
  { w: "おすすめは|なんですか", r: "osusume wa|nan desu ka", fr: "Que me conseillez-vous ?" },
  { w: "とても|おいしい|です", r: "totemo|oishii|desu", fr: "C'est très bon." },
  { w: "ごちそうさま|でした", r: "gochisōsama|deshita", fr: "Merci pour le repas." },
  { w: "よやくして|います", r: "yoyaku shite|imasu", fr: "J'ai réservé." },
  { w: "つぎの|でんしゃは|なんじ|ですか", r: "tsugi no|densha wa|nanji|desu ka", fr: "À quelle heure est le prochain train ?" },
  { w: "この|でんしゃは|きょうとに|いきますか", r: "kono|densha wa|kyōto ni|ikimasu ka", fr: "Ce train va-t-il à Kyoto ?" },
  { w: "しゃしんを|とっても|いいですか", r: "shashin o|tottemo|ii desu ka", fr: "Je peux prendre une photo ?" },
  { w: "えいごが|はなせますか", r: "eigo ga|hanasemasu ka", fr: "Vous parlez anglais ?" },
  { w: "もう|いちど|おねがいします", r: "mō|ichido|onegaishimasu", fr: "Encore une fois, s'il vous plaît." },
  { w: "ゆっくり|おねがいします", r: "yukkuri|onegaishimasu", fr: "Plus lentement, s'il vous plaît." },
  { w: "ちょっと|まって|ください", r: "chotto|matte|kudasai", fr: "Un instant, s'il vous plaît." },
  { w: "フランスから|きました", r: "furansu kara|kimashita", fr: "Je viens de France." },
  { w: "よろしく|おねがいします", r: "yoroshiku|onegaishimasu", fr: "Ravi de vous rencontrer (merci d'avance)." },
  { w: "すこし|わかります", r: "sukoshi|wakarimasu", fr: "Je comprends un peu." },
];

export const isPhrase = (k: string) => k.includes("|");
export const phraseOf = (k: string) => PHRASES.find((p) => p.w === k);
export const tilesOf = (p: Phrase) => p.w.split("|");
export const readingsOf = (p: Phrase) => p.r.split("|");
/** As shown: blocks separated by a space, like the sentences. */
export const shown = (s: string) => s.replace(/\|/g, " ");
/** As spoken: no separators. */
export const spoken = (s: string) => s.replace(/[|\s]/g, "");
