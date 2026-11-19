import qrcode from "qrcode-generator";
import { addProfile, deleteProfile, profile, save, setActive, state } from "../core/store";
import { setupTester, TESTER } from "../core/tester";
import { today } from "../core/scheduler";
import { isJa, setLang } from "../i18n";
import { el, view } from "../ui/dom";

/**
 * The invitation for Japanese testers, written in Japanese for them. The author shows it on his
 * phone: the person tries on this phone (a « テスター » profile, interface in Japanese), or scans
 * the code to open the app on her own phone, already in Japanese, on this same page.
 * Their notes go through the « Remarque » button (ui/notes.ts), written in Japanese.
 */

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
    <p>はじめまして。フランス人のヴィクトルです。日本を旅行しながら、フランス語を話す人がひらがなとカタカナを<b>見ないで書けるようになる</b>ためのアプリを作りました。日本語が母語の方の目で、厳しくチェックしていただけないでしょうか。</p>
    <h3>テストの流れ（10分ほど）</h3>
    <ol>
      <li>「この端末で試す」を押すと、テスト用のデータで始まります。最初の3文字だけでなく、すべての練習を試せます。</li>
      <li>ホームの「テストの手順」に沿って、レッスン・4種類の練習・テスト・文字カードを1回ずつ試してください。</li>
      <li>気になったことは、その画面で右側の<b>「意見を書く」</b>から、日本語でそのまま書いてください。</li>
    </ol>
    <h3>特に教えてほしいこと</h3>
    <ul>
      <li>お手本の字形や書き順に、間違いや「学校で習ったのと違う」ところはありますか？（どの文字か）</li>
      <li>正しく書いたのに「問題あり」と言われた、または間違えたのに通った文字はありますか？</li>
      <li>単語の読み・意味（フランス語の横の日本語表記）、文や看板の文章におかしなところは？</li>
      <li>不自然な日本語や、意味がわからない表示は？</li>
      <li>何をすればいいか迷った画面は？</li>
      <li>日本語を学ぶ外国人のために、足りないもの・あったらいいものは？</li>
    </ul>
    <p><b>褒め言葉よりも、間違い・違和感・使いにくさを教えていただけるとうれしいです。</b>小さなことでも大歓迎です。私が翻訳して、すべて読みます。</p>
    <p class="small muted" style="margin:0">アカウントは不要で、データはこの端末から外に出ません。意見は「全部送る」を押したときだけ送られます。</p>
    <div class="row"><button class="btn primary big" id="try">この端末で試す</button></div>
    <details id="qr-box" open><summary>自分のスマホで開く</summary>
      <div class="qr" role="img" aria-label="アプリを日本語で開くQRコード">${qrSVG(inviteLink())}</div>
      <p class="small muted" style="margin:0;word-break:break-all">${inviteLink()}</p>
    </details>
  </section>`);
  v.appendChild(card);
  (card.querySelector("#try") as HTMLButtonElement).onclick = () => {
    setLang("ja");
    // A fresh tester profile each time (the next tester doesn't inherit the last one's progress);
    // on the author's phone his own profiles stay untouched. Notes are kept apart, never reset.
    if (TESTER in state.profiles) deleteProfile(TESTER);
    addProfile(TESTER);
    setActive(TESTER);
    setupTester(profile(), today());
    save();
    location.hash = "seance";
    location.reload();
  };
}
