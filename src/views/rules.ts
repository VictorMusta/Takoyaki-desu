import { el, view } from "../ui/dom";

/**
 * « Règles de lecture » : the five rules that change how kana read, each said plainly, with
 * its Japanese name and examples to touch (they open « Comment ça se lit ? »).
 */
const ex = (w: string, r: string, fr: string) =>
  `<li><span class="kana-l" data-read="${w}">${w.replace(/\|/g, " ")}</span> <span class="romaji">${r}</span> <span class="small muted">${fr}</span></li>`;

export function viewRules(): void {
  const v = view();
  v.innerHTML = "";
  v.appendChild(
    el(`<section class="card rules" data-noi18n>
    <h2>Règles de lecture</h2>
    <p>Un kana se lit presque toujours tout seul : か, c'est « ka », partout. Seules cinq règles changent la lecture. Ce n'est pas de la grammaire, plutôt de l'orthographe, comme nos accents. Touchez un exemple pour le voir son par son.</p>

    <h3>1. Ten-ten et maru : la consonne change</h3>
    <p>Deux petits traits (<b>゛</b>, « ten-ten », en japonais <i>dakuten</i>) ou un petit rond (<b>゜</b>, « maru », <i>handakuten</i>) en haut à droite d'un signe changent sa consonne. La voyelle ne bouge pas.</p>
    <ul class="rule-pairs"><li>か ka → が <b>g</b>a</li><li>さ sa → ざ <b>z</b>a</li><li>た ta → だ <b>d</b>a</li><li>は ha → ば <b>b</b>a</li><li>は ha → ぱ <b>p</b>a (avec le rond)</li></ul>
    <ul class="rule-ex">${ex("かぎ", "kagi", "clé")}${ex("ぱん", "pan", "pain")}</ul>

    <h3>2. Petits ya, yu, yo : deux signes, un seul son</h3>
    <p>Quand <b>ゃ</b>, <b>ゅ</b> ou <b>ょ</b> sont écrits <b>en petit</b>, ils ne se lisent pas à part : ils se collent au signe d'avant, qui perd son « i ». Deux signes, mais un seul temps. Leur nom : <i>yōon</i> (« sons contractés »), ou « petit ya, petit yu, petit yo ».</p>
    <p><b>Avec quels signes ?</b> Seulement après un signe en « i » : き し ち に ひ み り, et leurs versions à ten-ten ぎ じ び ぴ. Jamais après い, ni après un signe en a, u, e ou o.</p>
    <ul class="rule-pairs"><li>き ki + ゃ → <b>kya</b></li><li>し shi + ゅ → <b>shu</b></li><li>ち chi + ょ → <b>cho</b></li><li>じ ji + ゃ → <b>ja</b></li></ul>
    <p>La taille compte : <span class="kana-l" data-read="びよういん">びよういん</span> (bi-yō-in, salon de coiffure) et <span class="kana-l" data-read="びょういん">びょういん</span> (byō-in, hôpital) ne sont pas le même mot.</p>
    <ul class="rule-ex">${ex("しゃしん", "shashin", "photo")}${ex("きょう", "kyō", "aujourd'hui")}</ul>

    <h3>3. Petit tsu : la consonne suivante double</h3>
    <p>Un <b>っ</b> écrit en petit ne se prononce pas. Il marque une petite pause, et la consonne du signe <b>suivant</b> s'écrit deux fois en romaji. Son nom : <i>sokuon</i>, ou « petit tsu ». On le trouve surtout devant k, s, t et p, jamais devant une voyelle ni devant ん.</p>
    <ul class="rule-pairs"><li>き ki + っ + て te → <b>kitte</b></li><li>っ + ち chi → <b>tchi</b></li></ul>
    <p>Lui aussi change le sens : <span class="kana-l" data-read="きて">きて</span> (kite, viens) et <span class="kana-l" data-read="きって">きって</span> (kitte, timbre).</p>
    <ul class="rule-ex">${ex("ちょっと", "chotto", "un peu")}${ex("いらっしゃいませ", "irasshaimase", "bienvenue")}</ul>

    <h3>4. Voyelles longues : un son qui dure deux temps</h3>
    <p>Une voyelle peut durer deux fois plus longtemps, et ça change le mot. En hiragana, on l'écrit en ajoutant une voyelle : <b>あ</b> après un son en a, <b>い</b> après i, <b>う</b> après u ou <b>o</b>, <b>い</b> après e. En katakana, on met un trait : <b>ー</b>.</p>
    <ul class="rule-pairs"><li>おばさん obasan, tante</li><li>おばあさん obaasan, grand-mère</li></ul>
    <p>Pièges : <b>おう</b> se dit « ō » (un o long, pas « o-ou ») et <b>えい</b> se dit souvent « ē ».</p>
    <ul class="rule-ex">${ex("ありがとう", "arigatō", "merci")}${ex("せんせい", "sensē", "professeur")}${ex("コーヒー", "kōhī", "café")}</ul>

    <h3>5. Particules : は, を, へ se lisent autrement</h3>
    <p>Trois petits mots de liaison gardent une vieille orthographe. Quand <b>は</b> sert de particule (« quant à »), il se lit <b>wa</b>. <b>を</b> (le complément) se lit <b>o</b>. <b>へ</b> (« vers ») se lit <b>e</b>. Dans un mot ordinaire, は reste « ha » : はし, hashi, baguettes.</p>
    <ul class="rule-ex">${ex("トイレは|どこ|ですか", "toire wa doko desu ka", "où sont les toilettes ?")}${ex("みずを|ください", "mizu o kudasai", "de l'eau, s'il vous plaît")}${ex("こんにちは", "konnichiwa", "bonjour")}</ul>

    <h3>En plus, en katakana : les petites voyelles</h3>
    <p>Pour les mots étrangers, le katakana a aussi des petites voyelles <b>ァ ィ ゥ ェ ォ</b>. Elles remplacent la voyelle du signe d'avant, pour faire des sons qui n'existent pas en japonais.</p>
    <ul class="rule-pairs"><li>フ fu + ァ → <b>fa</b></li><li>テ te + ィ → <b>ti</b></li></ul>
    <ul class="rule-ex">${ex("パーティー", "pātī", "fête")}${ex("ファン", "fan", "fan")}</ul>
  </section>`),
  );
}
