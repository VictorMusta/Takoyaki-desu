/**
 * One memory hook per sign: an image for the shape, tied to the sound.
 * Written for French speakers; meant to help the first days, then fade away.
 */
export const MNEMO: Record<string, string> = {
  あ: "Une pelote emmêlée : une croix, puis une grande boucle qui s'enroule. On s'exclame « Ah ! » devant tant de nœuds.",
  い: "Deux traits côte à côte, comme deux i sans point qui se tiennent compagnie : « ii ».",
  う: "Une oreille de profil, avec un petit trait au-dessus : elle écoute et demande « ouh ? » (う se dit « ou »).",
  え: "Un danseur : le chapeau en haut, puis un zigzag qui part en glissade vers la droite. « Eh ! », lance-t-il.",
  お: "Comme あ, avec une goutte de sueur en haut à droite : « Oh ! », c'est encore plus emmêlé.",
  か: "Un karatéka : le grand trait crochu est son poing, le petit trait à droite le coup sec. « Ka ! »",
  き: "Une clé (« key », ki) : les deux barres sont les dents, la courbe du bas l'anneau.",
  く: "Un bec d'oiseau ouvert qui fait « coucou » : ku.",
  け: "Un stand de kebab : le poteau à gauche, et à droite l'enseigne (la barre) traversée par la broche qui descend. « Ké-bab » : ke.",
  こ: "Deux carpes koï qui nagent l'une au-dessus de l'autre : ko.",
  さ: "Un sabre planté dans un rocher : la garde (la barre), la lame en diagonale, la pierre en bas. « Sa-bre » : sa.",
  し: "Un ski qui descend la pente et remonte au bout : « shi », comme dans « ski » sans le k.",
  す: "Un linge suspendu à une corde, avec un nœud au milieu : « su-spendu ».",
  せ: "Une selle de cheval de profil : l'assise (la barre) et les deux étriers qui pendent. « Se-lle » : se.",
  そ: "Un soda : le zigzag des bulles qui pétillent en haut, puis le jet qui coule en grande courbe. « So-da » : so.",
  た: "Un t (la croix de gauche) collé à こ : t + a, « ta ».",
  ち: "Un chien assis de profil, comme un 5 : la tête en haut, le ventre rond vers la droite. « Chi-en » : chi.",
  つ: "Une vague qui déferle : « tsu-nami ».",
  て: "Un T dont le pied s'incurve vers la gauche : t → « te ».",
  と: "Une toupie : la petite pointe plantée en haut, la toupie qui tourne en bas. « To-upie » : to.",
  な: "Un navire : la croix est le mât, le petit trait une voile, la boucle la coque. « Na-vire » : na.",
  に: "Une aiguille (le trait) à côté de deux fils parallèles (こ) : on tricote « ni… ni… ».",
  ぬ: "Des nouilles enroulées autour des baguettes, avec une boucle en bas : « nou-illes » (ぬ se dit « nou »).",
  ね: "Un chat (« neko ») assis, la queue enroulée en boucle en bas : ne.",
  の: "Un panneau d'interdiction « NO » : un rond barré d'un trait.",
  は: "Quelqu'un qui rit « ha ha » à côté d'un pilier : le pilier à gauche, le rieur plié en deux à droite.",
  ひ: "Un grand sourire en coin : « hi hi hi ».",
  ふ: "Le mont Fuji : le sommet au milieu, entouré de deux petits nuages. « Fu-ji » : fu.",
  へ: "Une colline qu'on monte et qu'on descend : « hé ho ! » (へ se dit « hé »).",
  ほ: "Comme は avec un étage de plus : un hôtel à deux étages à côté de son pilier. « Ho-tel » : ho.",
  ま: "Une maman qui tend les deux bras (les barres), avec un ventre rond en bas : ma.",
  み: "Une note de musique qui s'enroule : le rond de la note et sa queue. La note « mi ».",
  む: "Une vache qui fait « meuh » : les cornes en haut, le corps en boucle, la queue à droite. Mu.",
  め: "め veut dire « œil » en japonais : un œil rond, sans la petite boucle de ぬ. « Mé ».",
  も: "Un hameçon traversé par deux barres, avec une morue au bout : « mo-rue ».",
  や: "Un yak vu de côté : la corne recourbée et ses pattes. « Ya-k » : ya.",
  ゆ: "ゆ, c'est l'eau chaude écrite sur les rideaux des bains : un poisson rond qui barbote. « You ».",
  よ: "Un yo-yo : la ficelle (la croix) et le yo-yo qui pend en bas.",
  ら: "Un rat de profil : la petite oreille en haut, le gros ventre en bas. « Ra-t » : ra.",
  り: "Deux rivières qui coulent côte à côte, la droite plus longue : « ri-vière ».",
  る: "Une rue en lacets qui finit sur un rond-point (la boucle) : « ru-e » (る se dit « rou »).",
  れ: "Un renne qui s'éloigne : la patte droite (le trait vertical) et la queue qui repart vers la droite. « Re-nne ».",
  ろ: "Comme る sans la boucle : la route s'arrête net, sans rond-point. « Ro-ute ».",
  わ: "Comme ね sans la boucle : un chat sans queue, qui s'étonne « wa ! ».",
  を: "Un athlète qui s'élance (la barre et la diagonale), puis retombe sur le dos (la courbe). Se dit « o ».",
  ん: "Un n écrit à la main, tout simplement : « n ».",
};

/* ---------- derived signs: the rule is the hook ---------- */
const VOICED: Record<string, string> = { k: "g", s: "z", t: "d", h: "b" };
for (let c = 0x304c; c <= 0x307d; c++) {
  const ch = String.fromCharCode(c);
  if (MNEMO[ch]) continue;
  const b1 = String.fromCharCode(c - 1), b2 = String.fromCharCode(c - 2);
  if ("ぱぴぷぺぽ".includes(ch)) {
    MNEMO[ch] = `C'est ${b2} avec un petit rond (« maru ») en haut à droite : comme une bulle qui fait éclater le son, h devient p.`;
  } else if ("がぎぐげござじずぜぞだぢづでどばびぶべぼ".includes(ch)) {
    const line = "かきくけこ".includes(b1) ? "k" : "さしすせそ".includes(b1) ? "s" : "たちつてと".includes(b1) ? "t" : "h";
    MNEMO[ch] = `C'est ${b1} avec deux petits traits (« ten-ten ») en haut à droite : comme deux gouttes qui alourdissent le son, ${line} devient ${VOICED[line]}.`;
  }
}
MNEMO["ゃ"] = "Un や en miniature, accroupi en bas du signe d'avant : il se fond dans son son. き + ゃ = « kya ».";
MNEMO["ゅ"] = "Un ゆ en miniature, accroupi en bas du signe d'avant : き + ゅ = « kyu ».";
MNEMO["ょ"] = "Un よ en miniature, accroupi en bas du signe d'avant : き + ょ = « kyo ».";
MNEMO["っ"] = "Un つ en miniature : une petite vague qui retient son souffle avant la consonne suivante. きって = « kit-te ».";

/* ---------- katakana: angular cousins, often a piece of a kanji ---------- */
Object.assign(MNEMO, {
  ア: "Une hache (« axe ») : le manche plié en haut, la lame qui descend. « A ».",
  イ: "Un piquet planté, avec un fanion incliné : comme un i qui se penche. « I ».",
  ウ: "Comme う, coiffé d'une toiture : le petit trait, puis le toit en U renversé. « Ou ».",
  エ: "Un établi vu de face, en forme de I couché : « Eh, un établi ! »",
  オ: "Un oiseau posé sur une croix, qui chante « Oh ! » : la barre, la verticale, puis la patte en diagonale.",
  カ: "Comme か sans son petit trait : un poing de karatéka plus anguleux. « Ka ».",
  キ: "Une clé (« key ») encore plus simple que き : deux dents et la tige. « Ki ».",
  ク: "Un coucou dans son nid : le petit bec, puis le dos qui se courbe. « Ku ».",
  ケ: "Un kebab : la broche penchée à gauche, puis l'enseigne et le pied qui descend. « Ke ».",
  コ: "Un coin de mur, deux côtés d'un carré : la koï n'a plus de place. « Ko ».",
  サ: "Un sabre : la garde (la barre), deux lames qui tombent. Proche de さ. « Sa ».",
  シ: "Un sourire « she-she » : deux gouttes en haut, puis le trait qui MONTE de bas en haut. Trois traits presque à plat.",
  ス: "Une silhouette suspendue à un fil : le bras qui ploie, la jambe qui part. « Su ».",
  セ: "Comme せ, en plus anguleux : la selle, l'étrier replié. « Se ».",
  ソ: "Une goutte de soda et le jet qui jaillit vers le bas. Deux traits plutôt debout, le long DESCEND de haut en bas. « So ».",
  タ: "Un tableau (タ = ク + un trait) : le coucou a avalé une barre. « Ta ».",
  チ: "Un chignon : le petit trait penché, la barre, puis la grande pique qui descend. « Chi ».",
  ツ: "Un tsunami : deux gouttes d'écume en haut, puis la vague qui DESCEND de haut en bas. Trois traits plutôt debout.",
  テ: "Une table : le plateau, la barre et le pied qui part à gauche. « Te ».",
  ト: "Un totem : un poteau, une petite branche à droite. « To ».",
  ナ: "Un couteau de chef : la lame (la barre) et le manche qui descend. « Na » comme « na-vaja ».",
  ニ: "Deux traits, comme le kanji 二 (deux) : « ni ».",
  ヌ: "Une nouille qu'on attrape aux baguettes : le grand trait plié, puis la petite croix. « Nu ».",
  ネ: "Un nez de profil coiffé d'un chapeau : le petit point, le toit, puis le pied et sa branche. « Ne ».",
  ノ: "Un seul trait qui balaie : « No ! », non, pas plus.",
  ハ: "Deux traits qui s'écartent comme un toit vu de loin : « Ha ha », le rire qui s'ouvre.",
  ヒ: "Un hibou de profil : le bec tourné à gauche, le corps en L. « Hi ».",
  フ: "Un fouet replié : la barre, puis le coup qui part en bas à gauche. Comme le haut de ふ. « Fu ».",
  ヘ: "Une colline, exactement comme へ : « He ».",
  ホ: "Une croix sacrée flanquée de deux flammes : « Ho ! », s'écrient les pèlerins.",
  マ: "Une mâchoire : la barre, puis le petit trait qui la ferme. « Ma » comme « mâcher ».",
  ミ: "Trois traits obliques, comme trois mi-mi-mines de crayon : « mi ».",
  ム: "Un museau de vache qui fait « Meuh » : le grand trait plié, puis la petite corne. « Mu ».",
  メ: "Une croix penchée, comme une marque sur la carte : « Me ».",
  モ: "Comme も, en plus raide : deux barres traversées par l'hameçon. « Mo ».",
  ヤ: "Comme や, raccourci : la barre qui revient en crochet, puis le trait qui la coupe. « Ya ».",
  ユ: "Un U carré posé sur le sol : « Yu ».",
  ヨ: "Une fourchette à trois dents tournée vers la gauche : « Yo ».",
  ラ: "Comme ら, en anguleux : le petit chapeau, puis le crochet. « Ra ».",
  リ: "Comme り : deux traits, le droit plus long. « Ri ».",
  ル: "Deux racines qui partent : la gauche tombe, la droite remonte d'un coup sec. « Ru ».",
  レ: "Un L penché qui remonte : « Re ».",
  ロ: "Une bouche carrée, comme le kanji 口 : « Ro ».",
  ワ: "Un « wagon » vu du dessus : le petit pied, puis le toit qui tourne. « Wa ».",
  ヲ: "Comme ヨ avec une jambe qui s'élance : ne sert presque jamais, se dit « o ».",
  ン: "Un n qui dort : un point et un trait qui MONTE de bas en haut, plutôt à plat. Ne pas confondre avec ソ.",
});
const KVOICED = "ガギグゲゴザジズゼゾダヂヅデドバビブベボ";
for (const ch of KVOICED + "パピプペポ") {
  const c = ch.codePointAt(0)!;
  const base = String.fromCodePoint("パピプペポ".includes(ch) ? c - 2 : c - 1);
  const hira = String.fromCodePoint(c - 0x60);
  MNEMO[ch] = "パピプペポ".includes(ch)
    ? `C'est ${base} avec le petit rond (« maru ») : même règle que ${hira}, h devient p.`
    : `C'est ${base} avec les deux petits traits (« ten-ten ») : même règle que ${hira}, le son devient sonore.`;
}
MNEMO["ャ"] = "Un ヤ en miniature, collé au signe d'avant : キ + ャ = « kya ».";
MNEMO["ュ"] = "Un ユ en miniature : キ + ュ = « kyu ».";
MNEMO["ョ"] = "Un ヨ en miniature : キ + ョ = « kyo ».";
MNEMO["ッ"] = "Un ツ en miniature : une pause qui double la consonne suivante. ベッド = « bed-do ».";
MNEMO["ー"] = "Une simple barre : elle prolonge la voyelle d'avant, comme un trait d'union qui tire le son. ケーキ = « kēki ».";
