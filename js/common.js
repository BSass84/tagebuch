/* Gemeinsame Basis für alle Modul-Seiten:
   Kopfzeile mit Zurück-Button und Helfer für Datum/Uhrzeit */

// Baut die Kopfzeile mit Zurück-Link und Titel.
// Wird von jeder Modul-Seite aufgerufen: baueKopf("Tagebuch", "📖")
function baueKopf(titel, icon) {
  const kopf = document.createElement("header");
  kopf.className = "kopf";
  kopf.innerHTML =
    '<a class="zurueck" href="../index.html">‹ Startseite</a>' +
    "<h1>" + (icon ? icon + " " : "") + titel + "</h1>";
  document.body.prepend(kopf);
}

// Aktuellen Zeitpunkt als ISO-Text speichern, z. B. "2026-10-26T21:45:00.000Z"
function jetztIso() {
  return new Date().toISOString();
}

// ISO-Zeit lesbar machen, z. B. "Mo., 26. Okt. 2026, 21:45"
function lesebaresDatum(iso) {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Heutiges Datum für Datums-Eingabefelder, z. B. "2026-10-26"
function heutigesDatumFeld() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + t;
}
