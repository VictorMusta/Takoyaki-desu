/**
 * Signe maîtrisé : le sceau 極 se tamponne, puis la lampe dorée clignote deux fois.
 * La seule animation spectaculaire de l'appli. Un toucher la passe.
 */
export function celebrate(k: string, done: () => void): void {
  const box = document.createElement("div");
  box.className = "celebrate";
  box.setAttribute("role", "status");
  box.innerHTML = `<div class="kana"><span class="glow"></span>${k}<span class="stamp" aria-hidden="true">極</span></div><p>Signe maîtrisé</p>`;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    box.remove();
    done();
  };
  box.onclick = close;
  document.body.appendChild(box);
  setTimeout(close, 3600);
}
