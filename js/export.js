/* Export-Engine: monatsweise Markdown-Backups.
   Alle Daten kommen aus der Speicherschicht (db.js).
   Die letzten drei Exporte bleiben als Historie in der App gespeichert. */

const EXPORT_TYP_NAMEN = {
  tagebuch: "Tagebuch",
  kurznotiz: "Kurznotiz",
  stuhlgang: "Stuhlgang",
  essen: "Essen"
};

// Alle Einträge aller Module (nur für den Export)
async function holeAlleEintraege() {
  const db = await oeffneDB();
  return new Promise((erfuellt, lehntAb) => {
    const anfrage = db.transaction("eintraege", "readonly").objectStore("eintraege").getAll();
    anfrage.onsuccess = () => erfuellt(anfrage.result || []);
    anfrage.onerror = () => lehntAb(anfrage.error);
  });
}

// Alle Einträge eines Monats, älteste zuerst
async function holeMonatsEintraege(jahr, monat) {
  const alle = await holeAlleEintraege();
  return alle
    .filter(e => {
      const d = new Date(e.erstelltAt);
      return d.getFullYear() === jahr && d.getMonth() === monat;
    })
    .sort((a, b) => a.erstelltAt.localeCompare(b.erstelltAt));
}

// Markdown für einen Monat bauen; liefert { md, medienDateien }
async function baueMonatsMarkdown(jahr, monat) {
  const eintraege = await holeMonatsEintraege(jahr, monat);
  const praefix = jahr + "-" + String(monat + 1).padStart(2, "0");
  const titelMonat = new Date(jahr, monat).toLocaleString("de-DE", { month: "long", year: "numeric" });

  let md = "# Tagebuch - " + titelMonat + "\n\n";
  const medienDateien = [];

  if (eintraege.length === 0) {
    md += "_Keine Eintraege in diesem Monat._\n";
    return { md, medienDateien };
  }

  let laufnummer = 0;
  for (const e of eintraege) {
    const name = EXPORT_TYP_NAMEN[e.typ] || e.typ;
    md += "## " + name + " - " + lesebaresDatum(e.erstelltAt) + "\n\n";
    if (e.payload && e.payload.text) {
      md += e.payload.text.trim() + "\n\n";
    }
    const medien = await holeMedien(e.id);
    for (const m of medien) {
      laufnummer++;
      const endung = (m.name && m.name.includes(".")) ? m.name.split(".").pop() : "png";
      const dateiName = praefix + "-bild-" + laufnummer + "." + endung;
      md += "!Anhang\n\n";
      medienDateien.push(new File([m.blob], dateiName, { type: m.mimeType || "image/png" }));
    }
  }
  return { md, medienDateien };
}

// Monate, die seit dem letzten Export Änderungen enthalten
async function monateMitAenderungen() {
  const letzter = (await holeEinstellung("letzterExport")) || "";
  const alle = await holeAlleEintraege();
  const monate = new Map();
  for (const e of alle) {
    const zeit = e.geaendertAt || e.erstelltAt;
    if (zeit > letzter) {
      const d = new Date(e.erstelltAt);
      monate.set(d.getFullYear() + "-" + d.getMonth(), { jahr: d.getFullYear(), monat: d.getMonth() });
    }
  }
  return [...monate.values()];
}

// Export der gegebenen Monate: Markdown bauen, Historie pflegen, Teilen-Menü
async function exportiereMonate(monate) {
  const generation = { erstelltAm: jetztIso(), monate: [] };
  const dateien = [];

  for (const m of monate) {
    const { md, medienDateien } = await baueMonatsMarkdown(m.jahr, m.monat);
    const name = "tagebuch-" + m.jahr + "-" + String(m.monat + 1).padStart(2, "0") + ".md";
    dateien.push(new File([md], name, { type: "text/markdown" }));
    dateien.push(...medienDateien);
    generation.monate.push({
      jahr: m.jahr, monat: m.monat, md,
      medien: medienDateien.map(f => ({ name: f.name, blob: f }))
    });
  }

  // Backup-Historie: vorne anstellen, maximal drei behalten
  const historie = (await holeEinstellung("exportHistorie")) || [];
  historie.unshift(generation);
  while (historie.length > 3) historie.pop();
  await setzeEinstellung("exportHistorie", historie);

  // Teilen-Menü öffnen (iOS verlangt dafür den Fingertipp)
  const ergebnis = await teileDateien(dateien);

  // Nur bei erfolgreichem Teilen gilt der Export als gesichert
  await setzeEinstellung("letzterExport", jetztIso());
  return ergebnis;
}

// Export alles Neuen (für den Button und später das Start-Banner)
async function exportiereNeues() {
  let monate = await monateMitAenderungen();
  if (monate.length === 0) {
    const j = new Date();
    monate = [{ jahr: j.getFullYear(), monat: j.getMonth() }];
  }
  return exportiereMonate(monate);
}

// Share-Sheet öffnen (mit Fallback, falls iOS Dateien nicht erlaubt)
async function teileDateien(dateien) {
  if (navigator.canShare && navigator.canShare({ files: dateien })) {
    await navigator.share({ files: dateien, title: "Tagebuch-Backup" });
    return "geteilt";
  }
  const mdDatei = dateien.find(d => d.name.endsWith(".md"));
  if (mdDatei) {
    const url = URL.createObjectURL(mdDatei);
    const link = document.createElement("a");
    link.href = url;
    link.download = mdDatei.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  return "download";
}

// Historie lesen (für das Einstellungs-Modul)
async function holeExportHistorie() {
  return (await holeEinstellung("exportHistorie")) || [];
}

// Ältere Generation erneut über das Teilen-Menü ausgeben
async function teileHistorie(index) {
  const historie = await holeExportHistorie();
  const gen = historie[index];
  if (!gen) return;
  const dateien = [];
  for (const m of gen.monate) {
    dateien.push(new File([m.md], "tagebuch-" + m.jahr + "-" + String(m.monat + 1).padStart(2, "0") + ".md", { type: "text/markdown" }));
    for (const med of m.medien || []) {
      dateien.push(new File([med.blob], med.name, { type: med.blob.type || "image/png" }));
    }
  }
  await teileDateien(dateien);
}

/* Stiller Tages-Snapshot (ohne Teilen-Menü):
   Sichert seit dem letzten Export geänderte Monate
   (oder den aktuellen Monat) in die Backup-Historie. */
async function erstelleSnapshot() {
  let monate = await monateMitAenderungen();
  if (monate.length === 0) {
    const j = new Date();
    monate = [{ jahr: j.getFullYear(), monat: j.getMonth() }];
  }
  const generation = { erstelltAm: jetztIso(), monate: [] };
  for (const m of monate) {
    const { md, medienDateien } = await baueMonatsMarkdown(m.jahr, m.monat);
    generation.monate.push({
      jahr: m.jahr, monat: m.monat, md,
      medien: medienDateien.map(f => ({ name: f.name, blob: f }))
    });
  }
  const historie = (await holeEinstellung("exportHistorie")) || [];
  historie.unshift(generation);
  while (historie.length > 3) historie.pop();
  await setzeEinstellung("exportHistorie", historie);
}