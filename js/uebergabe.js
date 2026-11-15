// --- Übergabe: Einträge kopieren, externe Ergänzungen einfügen ---
// Zentral geladen von allen Modulen - kein Modul braucht eigenen Code.

function uebergabeModulName() {
  return document.title || "Eintrag";
}

function uebergabeBaueText(karte) {
  const kopie = karte.cloneNode(true);
  const datum = kopie.querySelector(".datum");
  const datumText = datum ? datum.textContent : "";
  if (datum) datum.remove();
  kopie.querySelectorAll(".uebergabeLeiste").forEach(el => el.remove());
  const inhalt = kopie.textContent.replace(/\n\s*\n/g, "\n").trim();
  return uebergabeModulName() + " - " + datumText + "\n" + inhalt;
}

function uebergabeLeiste(karte) {
  const leiste = document.createElement("div");
  leiste.className = "uebergabeLeiste";
  leiste.style.cssText = "margin-top:8px;display:flex;gap:8px;";

  const kopieren = document.createElement("button");
  kopieren.type = "button";
  kopieren.textContent = "Kopieren";
  kopieren.style.cssText = "width:auto;padding:6px 12px;font-size:13px;background:#444;color:#fff;border:none;border-radius:8px;";
  kopieren.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(uebergabeBaueText(karte));
      kopieren.textContent = "Kopiert ✓";
      setTimeout(() => { kopieren.textContent = "Kopieren"; }, 1500);
    } catch (e) {
      kopieren.textContent = "Nicht möglich";
    }
  });
  leiste.appendChild(kopieren);
  return leiste;
}

function uebergabeRuesteKarte(karte) {
  if (karte.querySelector(".uebergabeLeiste")) return;
  karte.appendChild(uebergabeLeiste(karte));
}

function uebergabeBeobachte() {
  const liste = document.getElementById("liste");
  if (!liste) return;
  liste.querySelectorAll(".eintrag").forEach(uebergabeRuesteKarte);
  const beobachter = new MutationObserver(() => {
    liste.querySelectorAll(".eintrag").forEach(uebergabeRuesteKarte);
  });
  beobachter.observe(liste, { childList: true, subtree: true });
}

function uebergabeEinfuegenKnopf() {
  const form = document.querySelector("form");
  if (!form) return;
  const feld = form.querySelector("textarea");
  if (!feld) return;
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.textContent = "Einfügen";
  knopf.style.cssText = "width:auto;padding:8px 14px;font-size:14px;background:#444;color:#fff;border:none;border-radius:8px;";
  knopf.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      feld.value = (feld.value ? feld.value + "\n\n" : "") + "- Externe Ergänzung -\n" + text;
      feld.dispatchEvent(new Event("input"));
      feld.focus();
    } catch (e) {
      knopf.textContent = "Zwischenablage nicht lesbar";
      setTimeout(() => { knopf.textContent = "Einfügen"; }, 2000);
    }
  });
  form.appendChild(knopf);
}

document.addEventListener("DOMContentLoaded", () => {
  uebergabeBeobachte();
  uebergabeEinfuegenKnopf();
});