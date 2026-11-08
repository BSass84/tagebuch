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
// --- Wachhalten: Display bleibt an, solange der Cursor in einem Textfeld steht (Diktat) ---
var wakeLock = null;

function istTextfeld(el) {
  if (!el) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT' && ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'image'].indexOf(el.type) === -1) return true;
  return false;
}

async function wachhaltenAn() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', function() { wakeLock = null; });
    }
  } catch (e) { /* nicht unterstützt oder fehlgeschlagen: still ignorieren */ }
}

function wachhaltenAus() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

document.addEventListener('focusin', function(e) {
  if (istTextfeld(e.target)) wachhaltenAn();
});

document.addEventListener('focusout', function(e) {
  if (istTextfeld(e.target)) wachhaltenAus();
});

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && istTextfeld(document.activeElement)) {
    wachhaltenAn();
  } else {
    wachhaltenAus();
  }
});