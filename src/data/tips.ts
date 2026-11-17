/**
 * Astuces. Generic ones apply to every sign; « pièges » belong to one sign or a pair of look-alikes.
 * Facts about strokes follow the KanjiVG data used by the app (stroke counts and order).
 */
export type Illus = "small" | "reverse" | "order";

export interface Tip {
  id: string;
  text: string;
  /** A « faux Bien » drawn from the current sign, crossed out. */
  illus?: Illus;
}

export const GENERIC: Tip[] = [
  { id: "g-croix", text: "La croix en pointillés coupe la case en quatre. Avant d'écrire, repérez dans quel quart chaque trait commence et dans lequel il finit." },
  { id: "g-taille", text: "Un signe juste mais tout petit, ou collé dans un coin, n'est pas encore « Bien » : il doit occuper la case autour de la croix, comme le modèle.", illus: "small" },
  { id: "g-sens", text: "Les traits horizontaux vont de gauche à droite, les verticaux de haut en bas. Un trait bien placé mais tracé à l'envers n'est pas « Bien ».", illus: "reverse" },
  { id: "g-ordre", text: "En général : de haut en bas, puis de gauche à droite. Un signe qui ressemble au modèle mais écrit dans le désordre n'est pas « Bien » : l'ordre donne la bonne forme quand on écrit vite.", illus: "order" },
  { id: "g-nombre", text: "Comptez les traits du modèle. Deux traits reliés en un seul, ou un trait coupé en deux, changent le signe." },
  { id: "g-fin", text: "Regardez comment chaque trait se termine : arrêt net, petit crochet, ou trait qui s'affine. Ce détail distingue souvent deux signes proches." },
  { id: "g-voir", text: "Si vous devez regarder le modèle, touchez « Voir le signe » : c'est plus juste qu'un « Bof », et le signe reviendra au bon moment." },
  { id: "g-bof", text: "« Bof », c'est juste mais avec une hésitation ou une petite erreur. Le choisir honnêtement fait revenir le signe plus tôt : c'est fait pour ça." },
  { id: "g-voix", text: "Touchez « Écouter » et dites le son à voix haute en écrivant : relier le son au geste aide à retenir." },
];

const TRAP_LIST: { id: string; k: string; text: string }[] = [
  { id: "t-a-o", k: "あお", text: "あ et お se ressemblent : お a un petit trait isolé en haut à droite, あ n'en a pas." },
  { id: "t-i-ri", k: "いり", text: "い et り : deux traits séparés, jamais reliés. Dans い, le trait de gauche est le plus long ; dans り, c'est celui de droite." },
  { id: "t-ki-sa", k: "きさ", text: "き a deux barres horizontales (4 traits), さ n'en a qu'une (3 traits)." },
  { id: "t-sa-chi", k: "さち", text: "さ et ち sont en miroir : le bas de さ s'ouvre vers la droite, comme un c ; le bas de ち s'ouvre vers la gauche, comme le bas d'un 5." },
  { id: "t-shi-tsu", k: "しつ", text: "し et つ s'écrivent d'un seul trait. し est debout : il descend puis remonte vers la droite, jamais en partant du bas. つ est couché : il va vers la droite puis redescend." },
  { id: "t-so", k: "そ", text: "そ s'écrit ici d'un seul trait : un zigzag en haut, puis une grande courbe vers le bas." },
  { id: "t-nu-me", k: "ぬめ", text: "ぬ finit par une petite boucle en bas à droite ; め s'arrête sans boucle." },
  { id: "t-ne-re-wa", k: "ねれわ", text: "ね, れ et わ commencent pareil, par un trait vertical. Seule la fin change : ね finit par une boucle, れ par un trait qui repart vers le bas à droite, わ par une grande courbe arrondie." },
  { id: "t-ha-ho", k: "はほ", text: "ほ a deux barres à droite, et son trait vertical part de la barre du haut sans dépasser au-dessus. は n'a qu'une barre, que le trait vertical traverse." },
  { id: "t-mo", k: "も", text: "Piège d'ordre : dans も, le trait vertical courbé se trace en premier, avant les deux barres." },
  { id: "t-fu", k: "ふ", text: "ふ a 4 traits, dans cet ordre : le petit trait du haut, la courbe du milieu, puis le point de gauche et enfin celui de droite." },
  { id: "t-ru-ro", k: "るろ", text: "る finit par une petite boucle en bas ; ろ s'arrête sans boucle." },
  { id: "t-ko", k: "こ", text: "こ : deux traits séparés. Celui du haut finit par un petit crochet vers le bas, celui du bas est plus long." },
];

/** Traps by sign (a look-alike pair shares one trap). */
export const TRAPS: Record<string, Tip> = {};
TRAP_LIST.forEach((t) => [...t.k].forEach((k) => (TRAPS[k] = { id: t.id, text: t.text })));
