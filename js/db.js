/* Speicherschicht: IndexedDB "tagebuch"
   Alle Module lesen und schreiben AUSSCHLIESSLICH über diese Datei.
   Hier dockt später (Phase 4) der verschlüsselte Sync an. */

let dbVerbindung = null;

// Datenbank öffnen (beim ersten Aufruf werden die drei Bereiche angelegt)
function oeffneDB() {
  return new Promise((erfuellt, lehntAb) => {
    if (dbVerbindung) { erfuellt(dbVerbindung); return; }
    const anfrage = indexedDB.open("tagebuch", 1);

    // Einrichtung beim allerersten Öffnen
    anfrage.onupgradeneeded = (ereignis) => {
      const db = ereignis.target.result;
      if (!db.objectStoreNames.contains("eintraege")) {
        const eintraege = db.createObjectStore("eintraege", { keyPath: "id", autoIncrement: true });
        eintraege.createIndex("typ", "typ");
      }
      if (!db.objectStoreNames.contains("medien")) {
        const medien = db.createObjectStore("medien", { keyPath: "id", autoIncrement: true });
        medien.createIndex("eintragId", "eintragId");
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "schluessel" });
      }
    };

    anfrage.onsuccess = (ereignis) => {
      dbVerbindung = ereignis.target.result;
      erfuellt(dbVerbindung);
    };
    anfrage.onerror = (ereignis) => lehntAb(ereignis.target.error);
  });
}

/* EINTRÄGE ----------------------------------------------------------- */

// Eintrag anlegen oder aktualisieren – die Livespeicherung.
// Ohne id: neuer Eintrag, Datum+Uhrzeit werden automatisch gesetzt.
// Mit id: bestehender Eintrag wird aktualisiert (kein Speicher-Button nötig).
async function speichereEintrag(typ, payload, id) {
  const db = await oeffneDB();
  return new Promise((erfuellt, lehntAb) => {
    const speicher = db.transaction("eintraege", "readwrite").objectStore("eintraege");

    if (id) {
      const hole = speicher.get(id);
      hole.onsuccess = () => {
        const jetzt = new Date().toISOString();
        const eintrag = hole.result
          ? { ...hole.result, payload, geaendertAt: jetzt }
          : { typ, payload, datum: jetzt, erstelltAt: jetzt };
        const schreibe = speicher.put(eintrag);
        schreibe.onsuccess = () => erfuellt(schreibe.result);
        schreibe.onerror = () => lehntAb(schreibe.error);
      };
      hole.onerror = () => lehntAb(hole.error);
    } else {
      const jetzt = new Date().toISOString();
      const schreibe = speicher.put({ typ, payload, datum: jetzt, erstelltAt: jetzt });
      schreibe.onsuccess = () => erfuellt(schreibe.result);
      schreibe.onerror = () => lehntAb(schreibe.error);
    }
  });
}

// Alle Einträge eines Typs, neueste zuerst
async function holeEintraege(typ) {
  const db = await oeffneDB();
  return new Promise((erfuellt, lehntAb) => {
    const anfrage = db.transaction("eintraege", "readonly").objectStore("eintraege").index("typ").getAll(typ);
    anfrage.onsuccess = () => {
      erfuellt(anfrage.result.sort((a, b) => b.erstelltAt.localeCompare(a.erstelltAt)));
    };
    anfrage.onerror = () => lehntAb(anfrage.error);
  });
}

// Einzelnen Eintrag holen (z. B. den Entwurf beim Wiederöffnen)
async function holeEintrag(id) {
  const db = await oeffneDB();
  return new Promise((erfuellt, lehntAb) => {
    const anfrage = db.transaction("eintraege", "readonly").objectStore("eintraege").get(id);
    anfrage.onsuccess = () => erfuellt(anfrage.result);
    anfrage.onerror = () => lehntAb(anfrage.error);
  });
}

// Eintrag löschen
async function loescheEintrag(id) {
  const db = await oeffneDB();
  return new Promise((erfuellt, lehntAb) => {
    const schreibe = db.transaction("eintraege", "readwrite").objectStore("eintraege").delete(id);
    schreibe.onsuccess = () => erfuellt(true);
    schreibe.onerror = () => lehntAb(schreibe.error);
  });
}

/* MEDIEN (Bilder & Dateien) ------------------------------------------- */

// Bild/Datei an einen Eintrag anhängen (wird als Binärdaten gespeichert)
async function speichereMedium(eintragId, datei) {
  const db = await oeffneDB();
  return new Promise((erfuellt, lehntAb) => {
    const jetzt = new Date().toISOString();
    const schreibe = db.transaction("medien", "readwrite").objectStore("medien")
      .put({ eintragId, name: datei.name, mimeType: datei.type, blob: datei, erstelltAt: jetzt });
    schreibe.onsuccess = () => erfuellt(schreibe.result);
    schreibe.onerror = () => lehntAb(schreibe.error);
  });
}

// Alle Bilder/Dateien eines Eintrags
async function holeMedien(eintragId) {
  const db = await oeffneDB();
  return new Promise((erfuellt, lehntAb) => {
    const anfrage = db.transaction("medien", "readonly").objectStore("medien")
      .index("eintragId").getAll(eintragId);
    anfrage.onsuccess = () => erfuellt(anfrage.result);
    anfrage.onerror = () => lehntAb(anfrage.error);
  });
}

/* EINSTELLUNGEN ------------------------------------------------------- */

// Einstellung lesen (z. B. "moduleEinstellungen" für die Startseite)
async function holeEinstellung(schluessel) {
  const db = await oeffneDB();
  return new Promise((erfuellt, lehntAb) => {
    const anfrage = db.transaction("meta", "readonly").objectStore("meta").get(schluessel);
    anfrage.onsuccess = () => erfuellt(anfrage.result ? anfrage.result.wert : null);
    anfrage.onerror = () => lehntAb(anfrage.error);
  });
}

// Einstellung speichern
async function setzeEinstellung(schluessel, wert) {
  const db = await oeffneDB();
  return new Promise((erfuellt, lehntAb) => {
    const schreibe = db.transaction("meta", "readwrite").objectStore("meta")
      .put({ schluessel, wert });
    schreibe.onsuccess = () => erfuellt(true);
    schreibe.onerror = () => lehntAb(schreibe.error);
  });
}
