/** A confirmation window in the charte (no browser dialog): resolves true on « ok ». cancel: "" for a single button. */
export function confirmModal(o: { title: string; body: string; ok: string; cancel?: string }): Promise<boolean> {
  return new Promise((resolve) => {
    const prev = document.activeElement as HTMLElement | null;
    const box = document.createElement("div");
    box.className = "modal";
    box.innerHTML = `<div class="modal-card card" role="dialog" aria-modal="true" aria-labelledby="mdt">
      <h2 id="mdt">${o.title}</h2>${o.body}
      <div class="row"><button class="btn primary" data-a="ok">${o.ok}</button>${o.cancel === "" ? "" : `<button class="btn" data-a="no">${o.cancel ?? "Annuler"}</button>`}</div></div>`;
    const close = (v: boolean) => {
      box.remove();
      document.removeEventListener("keydown", key);
      prev?.focus();
      resolve(v);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    box.onclick = (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-a]")?.dataset.a;
      if (a) close(a === "ok");
      else if (e.target === box) close(false);
    };
    document.addEventListener("keydown", key);
    document.body.appendChild(box);
    // Focus without scrolling: a long window must open at its title, not at its buttons.
    (box.querySelector<HTMLButtonElement>('[data-a="no"]') ?? box.querySelector<HTMLButtonElement>('[data-a="ok"]'))!.focus({ preventScroll: true });
  });
}
