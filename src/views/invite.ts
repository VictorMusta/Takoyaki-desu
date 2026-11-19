import qrcode from "qrcode-generator";
import { addProfile, hasProfile, setActive, state } from "../core/store";
import { isJa, setLang } from "../i18n";
import { el, view } from "../ui/dom";

/**
 * The invitation for Japanese testers, written in Japanese for them. The author shows it on his
 * phone: the person tries on this phone (a « テスター » profile, interface in Japanese), or scans
 * the code to open the app on her own phone, already in Japanese, on this same page.
 * Their notes go through the « Remarque » button (ui/notes.ts), written in Japanese.
 */

const TESTER = "テスター";

export function inviteLink(): string {
  return `${location.origin}${location.pathname}?lang=ja#invite`;
}

function qrSVG(text: string): string {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
}

export function viewInvite(): void {
  const v = view();
  v.innerHTML = "";
  const card = el(`<section class="card invite" data-noi18n lang="ja">
    ${isJa() ? "" : `<p class="small muted" lang="fr" style="margin:0">Écran à montrer à une personne japonaise : elle peut essayer sur ce téléphone, ou scanner le code avec le sien. L'appli passera en japonais pour elle.</p>`}
    <h2>アプリのテストにご協力ください</h2>
    <p>はじめまして。フランス人のヴィクトルです。日本を旅行しながら、フランス語を話す人がひらがなとカタカナを<b>見ないで書けるようになる</b>ためのアプリを作りました。</p>
    <p>日本語が母語の方の目で、ぜひ試していただけないでしょうか。特に見ていただきたいのは：</p>
    <ul>
      <li>お手本の字形と書き順は正しく、自然ですか</li>
      <li>自分で字を書いたとき、チェック（画数・書き順・向き）の判定は正しいですか</li>
      <li>単語・読み・意味（フランス語の横に日本語の表記を出しています）、文や看板の文章に間違いはありませんか</li>
      <li>わかりにくいところ、使いにくいところ、不自然な日本語</li>
    </ul>
    <p>気づいたことは、どの画面でも右下の<b>「意見を書く」</b>ボタンから、日本語でそのまま書いてください。私が翻訳して、すべて読みます。どんな小さなことでも助かります。</p>
    <p class="small muted" style="margin:0">所要時間は5〜15分ほど。アカウントは不要で、データはこの端末から外に出ません。</p>
    <div class="row"><button class="btn primary big" id="try">${hasProfile() ? "この端末で試す" : "試してみる"}</button></div>
    <details id="qr-box"><summary>自分のスマホで開く</summary>
      <div class="qr" role="img" aria-label="アプリを日本語で開くQRコード">${qrSVG(inviteLink())}</div>
      <p class="small muted" style="margin:0;word-break:break-all">${inviteLink()}</p>
    </details>
  </section>`);
  v.appendChild(card);
  (card.querySelector("#try") as HTMLButtonElement).onclick = () => {
    setLang("ja");
    // On the author's phone: a separate tester profile, so his own progress stays untouched.
    if (hasProfile()) {
      if (!(TESTER in state.profiles)) addProfile(TESTER);
      setActive(TESTER);
    }
    location.hash = "seance";
    location.reload();
  };
}
