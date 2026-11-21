// --- Durchlauf: Module nacheinander abarbeiten ---
// Zentral geladen von der Startseite und allen Eintrags-Modulen.

const DURCHLAUF_KEY = "durchlaufStand";
let durchlaufInventar = null;

function durchlaufLade() {
  try { return JSON.parse(localStorage.getItem(DURCHLAUF_KEY)); }
  catch (e) { return null; }
}

function durchlaufSpeiche(stand) {
  if (stand) localStorage.setItem(DURCHLAUF_KEY, JSON.stringify(stand));
  else localStorage.removeItem(DURCHLAUF_KEY);
}

function durchlaufHeuteKurz() {
  const d = new Date();
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}

function durchlaufUhrzeit() {
  const d = new Date();
  return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}

// null = Startseite, sonst Modul-Id (aus dem Dateinamen)
function durchlaufAktuelleId() {
  const teil = (location.pathname.split("/").pop() || "").toLowerCase();
  if (!teil || teil === "index.html") return null;
  return teil.replace(".html", "");
}

async function durchlaufDateiFuer(id) {
  try {
    const antwort = await fetch(durchlaufAktuelleId() ? "../modules.json" : "modules.json");
    durchlaufInventar = await antwort.json();
  } catch (e) { return null; }
  const m = (durchlaufInventar.modules || []).find(x => x.id === id);
  if (!m) return null;
  return (durchlaufAktuelleId() ? "../" : "") + m.datei;
}

function durchlaufTitelFuer(id) {
  if (durchlaufInventar && durchlaufInventar.modules) {
    const m = durchlaufInventar.modules.find(x => x.id === id);
    if (m && m.titel) return m.titel;
  }
  return id;
}

// ---------- Startseite ----------

async function durchlaufStart() {
  let inventar;
  let einstellungen = {};
  try {
    const antwort = await fetch("modules.json");
    inventar = await antwort.json();
    einstellungen = (await holeEinstellung("moduleEinstellungen")) || {};
  } catch (e) {
    alert("Durchlauf konnte nicht gestartet werden: " + e.message);
    return;
  }

  const module = (inventar.modules || [])
    .map((m, i) => ({ ...m, platz: (einstellungen[m.id] && einstellungen[m.id].reihenfolge != null) ? einstellungen[m.id].reihenfolge : i }))
    .sort((a, b) => a.platz - b.platz)
    .filter(m => einstellungen[m.id] && einstellungen[m.id].durchlauf === true && einstellungen[m.id].aktiv !== false);

  if (module.length === 0) {
    alert("Kein Modul ist im Durchlauf enthalten.\n\nIn den Einstellungen bei einem Modul den Haken 'im Durchlauf enthalten' setzen.");
    return;
  }

  const alt = durchlaufLade();
  if (alt && alt.aktiv && alt.liste && alt.liste.length > 0) {
    const fortsetzen = confirm("Letzten Durchlauf fortsetzen?\n\nOK = fortsetzen\nAbbrechen = neu starten");
    if (fortsetzen) {
      const datei = await durchlaufDateiFuer(alt.liste[Math.min(alt.index, alt.liste.length - 1)]);
      if (datei) { location.href = datei; return; }
    } else {
      localStorage.setItem("durchlaufAbbruch", JSON.stringify({ tag: durchlaufHeuteKurz(), um: durchlaufUhrzeit() }));
    }
  }

  durchlaufSpeiche({ aktiv: true, liste: module.map(m => m.id), index: 0 });
  location.href = module[0].datei;
}

function durchlaufBaueStartKnopf() {
  const liste = document.getElementById("moduleListe");
  if (!liste) return;
  const knopf = document.createElement("a");
  knopf.className = "modulKnopf";
  knopf.href = "#";
  knopf.innerHTML = '<span class="icon">▶</span><span>Durchlauf</span>';
  knopf.addEventListener("click", (e) => { e.preventDefault(); durchlaufStart(); });
  liste.insertBefore(knopf, liste.firstChild);
}

// ---------- Modul-Seiten ----------

function durchlaufModulSeite() {
  const id = durchlaufAktuelleId();
  const stand = durchlaufLade();
  if (!id || !stand || !stand.aktiv) return;
  if (stand.liste[stand.index] !== id) return;
  const knopf = document.getElementById("neu");
  if (knopf) knopf.textContent = "Weiter →";
}

async function durchlaufWeiter() {
  const stand = durchlaufLade();
  if (!stand || !stand.aktiv) return;
  stand.index += 1;
  if (stand.index >= stand.liste.length) {
    await durchlaufAbschluss(stand);
    return;
  }
  durchlaufSpeiche(stand);
  const datei = await durchlaufDateiFuer(stand.liste[stand.index]);
  location.href = datei ? datei : "../index.html";
}

function durchlaufIstHeute(e) {
  const heute = durchlaufHeuteKurz();
  if (e.payload && e.payload.tag) return e.payload.tag === heute;
  if (!e.erstelltAt) return false;
  const d = new Date(e.erstelltAt);
  return (d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2)) === heute;
}

function durchlaufFormatiere(id, e) {
  const p = e.payload || {};
  const kopf = durchlaufTitelFuer(id) + " - " + lesebaresDatum(e.erstelltAt);
  if (id === "gassigaenge") {
    const zeiten = ["morgens", "mittags", "nachmittags", "abends"]
      .filter(k => p[k]).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    return kopf + "\n" + zeiten.join("\n") + (p.auffaelligkeiten ? "\nAuffälligkeiten:\n" + p.auffaelligkeiten : "");
  }
  if (id === "kindersdienst") {
    const vonNamen = { kita: "von der Kita", verabredung: "von einer Verabredung", event: "abends von einem Event", sonstiges: "Sonstiges" };
    const dienste = [];
    if (p.gebracht) dienste.push("Gebracht");
    if (p.abgeholt) dienste.push("Abgeholt" + (p.abgeholtVon ? " (" + (vonNamen[p.abgeholtVon] || "") + ")" : ""));
    if (p.nachmittags) dienste.push("Nachmittags");
    return kopf + "\n" + dienste.join("\n") + (p.notiz ? "\nNotiz:\n" + p.notiz : "");
  }
  return kopf + "\n" + (p.text || "");
}

function durchlaufAbbruchHeute() {
  try {
    const a = JSON.parse(localStorage.getItem("durchlaufAbbruch"));
    if (a && a.tag === durchlaufHeuteKurz()) return a.um;
  } catch (e) {}
  return null;
}

async function durchlaufAbschluss(stand) {
  try {
    const antwort = await fetch("../modules.json");
    durchlaufInventar = await antwort.json();
  } catch (e) {}
  const teile = [];
  for (const id of stand.liste) {
    let eintraege = [];
    try { eintraege = await holeEintraege(id); } catch (e) {}
    for (const e of eintraege) {
      if (durchlaufIstHeute(e)) teile.push(durchlaufFormatiere(id, e));
    }
  }
  const abbruch = durchlaufAbbruchHeute();
  const text = (abbruch ? "Vorheriger Durchlauf abgebrochen (" + abbruch + ")\n\n" : "") + teile.join("\n\n");
  try { await navigator.clipboard.writeText(text); } catch (e) {}
  durchlaufSpeiche(null);
  alert("Durchlauf beendet!\n\nAlles liegt in der Zwischenablage zum Weiterverarbeiten.");
  location.href = "../index.html";
}

// Der Speichern-Knopf wird im Durchlauf zum "Weiter →": zuerst sichern, dann springen
document.addEventListener("click", async (e) => {
  const id = durchlaufAktuelleId();
  if (!id) return;
  const stand = durchlaufLade();
  if (!stand || !stand.aktiv || stand.liste[stand.index] !== id) return;
  const knopf = document.getElementById("neu");
  if (!knopf || !knopf.contains(e.target)) return;
  e.stopPropagation();
  e.preventDefault();
  if (typeof sichere === "function") { try { await sichere(); } catch (err) {} }
  await new Promise(r => setTimeout(r, 400));
  await durchlaufWeiter();
}, true);

document.addEventListener("DOMContentLoaded", () => {
  if (durchlaufAktuelleId() === null) durchlaufBaueStartKnopf();
  else durchlaufModulSeite();
});