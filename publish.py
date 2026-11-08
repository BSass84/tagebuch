# -*- coding: utf-8 -*-
# publish.py - Publishing-Routine fuer die Tagebuch-App
#
#   python3 publish.py        -> veroeffentlichen
#   python3 publish.py test   -> Trockenlauf (nichts wird veraendert, nichts gepusht)
#
# Versionsschema MAJOR.MINOR (vollautomatisch):
#   neues Modul entdeckt -> grosse Version (z. B. 9.4 -> 10.0)
#   sonst                -> kleine Version (z. B. 9.4 -> 9.5)

import json, os, re, sys, io

TROCKEN = len(sys.argv) > 1 and sys.argv[1] in ("test", "trocken")

def abbruch(text):
    print("ABGEBROCHEN: " + text)
    sys.exit(1)

# ---------- 1. Vorpruefungen ----------
if not os.path.isfile("modules.json"):
    abbruch("Falscher Ordner. Fuehre das Skript im tagebuch-Ordner aus (cd tagebuch).")
if not os.path.isfile("sw.js"):
    abbruch("sw.js nicht gefunden.")
if not os.path.isdir("modules"):
    abbruch("Ordner modules/ nicht gefunden.")

# ---------- 2. modules.json aus dem Ordner erzeugen ----------
with io.open("modules.json", "r", encoding="utf-8") as f:
    daten = json.load(f)
alte = {}
for m in daten["modules"]:
    alte[m["id"]] = m

modul_dateien = sorted(f for f in os.listdir("modules") if f.endswith(".html"))
gefundene_ids = [f[:-5] for f in modul_dateien]
neu_ids = [i for i in gefundene_ids if i not in alte]
weg_ids = [i for i in alte if i not in gefundene_ids]

print("")
print("=== MODULE ===")
for i in gefundene_ids:
    if i in alte:
        m = alte[i]
        print("  bleibt:   " + m["icon"] + " " + i + " - " + m["titel"])
    else:
        print("  NEU:      " + i)
for i in weg_ids:
    print("  LOESCHEN: " + i + " (Datei fehlt - Eintrag wuerde entfernt)")

if neu_ids or weg_ids:
    neue_eintraege = []
    for i in neu_ids:
        print("")
        print("Neues Modul gefunden: modules/" + i + ".html")
        titel = input("Titel des Moduls: ").strip()
        icon = input("Icon des Moduls (z. B. ein Emoji): ").strip()
        if not titel:
            titel = i
        neue_eintraege.append({
            "id": i,
            "titel": titel,
            "icon": icon,
            "datei": "modules/" + i + ".html",
            "beschreibung": titel
        })

    print("")
    print("=== PLAN ===")
    for e in neue_eintraege:
        print("  WIRD ANGELEGT:  " + e["icon"] + " " + e["id"] + " - " + e["titel"])
    for i in weg_ids:
        print("  WIRD GELOESCHT: " + i)
    antwort = input("modules.json so neu schreiben? (j/n): ").strip().lower()
    if antwort not in ("j", "ja", "y", "yes"):
        abbruch("Die gefundenen Module stimmen nicht - nichts veraendert, kein Push.")

    if TROCKEN:
        print("[Trockenlauf] modules.json wuerde jetzt neu geschrieben.")
    else:
        neue_liste = []
        for i in gefundene_ids:
            if i in alte:
                neue_liste.append(alte[i])
            else:
                for e in neue_eintraege:
                    if e["id"] == i:
                        neue_liste.append(e)
        with io.open("modules.json", "w", encoding="utf-8") as f:
            json.dump({"modules": neue_liste}, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("modules.json aktualisiert.")
else:
    print("Keine Modul-Aenderungen noetig.")

# ---------- 3. DATEIEN-Liste in sw.js automatisch erzeugen ----------
def sammle_app_dateien():
    eintraege = ["index.html", "modules.json", "style.css", "manifest.webmanifest"]
    if os.path.isdir("js"):
        for f in sorted(os.listdir("js")):
            if f.endswith(".js"):
                eintraege.append("js/" + f)
    if os.path.isdir("modules"):
        for f in sorted(os.listdir("modules")):
            if f.endswith(".html"):
                eintraege.append("modules/" + f)
    if os.path.isdir("icons"):
        for f in sorted(os.listdir("icons")):
            if f.endswith(".png"):
                eintraege.append("icons/" + f)
    return eintraege

with io.open("sw.js", "r", encoding="utf-8") as f:
    sw_text = f.read()

liste_treffer = re.search(r"const DATEIEN\s*=\s*\[[^\]]*\];", sw_text)
if not liste_treffer:
    abbruch("DATEIEN-Liste in sw.js nicht gefunden.")

alte_dateiliste = re.findall(r'"([^"]+)"', liste_treffer.group(0))
neue_dateiliste = sammle_app_dateien()
dazu = [e for e in neue_dateiliste if e not in alte_dateiliste]
raus = [e for e in alte_dateiliste if e not in neue_dateiliste]

print("")
print("=== SW.JS-DATEILISTE ===")
if dazu or raus:
    for e in dazu:
        print("  + " + e)
    for e in raus:
        print("  - " + e + " (wird entfernt)")
else:
    print("Keine Aenderungen noetig (" + str(len(neue_dateiliste)) + " Dateien).")

if dazu or raus:
    if TROCKEN:
        print("[Trockenlauf] DATEIEN-Liste wuerde jetzt neu geschrieben.")
    else:
        block = "const DATEIEN = [\n"
        for e in neue_dateiliste:
            block += '  "' + e + '",\n'
        block += "];"
        sw_text = sw_text[:liste_treffer.start()] + block + sw_text[liste_treffer.end():]
        print("DATEIEN-Liste aktualisiert (" + str(len(neue_dateiliste)) + " Dateien).")

# ---------- 4. Version erhoehen (MAJOR.MINOR, vollautomatisch) ----------
version_treffer = re.search(r"(tagebuch-v)(\d+)(?:\.(\d+))?", sw_text)
if not version_treffer:
    abbruch("Keine Versionsnummer (tagebuch-vN) in sw.js gefunden.")

alte_major = int(version_treffer.group(2))
alte_minor = int(version_treffer.group(3)) if version_treffer.group(3) else 0
alte_anzeige = version_treffer.group(0)

if neu_ids:
    neue_major = alte_major + 1
    neue_minor = 0
    art = "grosse Erweiterung (neues Modul)"
else:
    neue_major = alte_major
    neue_minor = alte_minor + 1
    art = "kleine Aenderung"

version_text = str(neue_major) + "." + str(neue_minor)
print("")
print("Version: " + alte_anzeige + "  ->  tagebuch-v" + version_text + "  (" + art + ")")

if not TROCKEN:
    neuer_text = re.sub(r"(tagebuch-v)(\d+)(?:\.(\d+))?", r"\g<1>" + version_text, sw_text, count=1)
    with io.open("sw.js", "w", encoding="utf-8") as f:
        f.write(neuer_text)

# ---------- 5. Versionsbeschreibung ----------
print("")
beschreibung = ""
while not beschreibung:
    beschreibung = input("Tippe die Versionsbeschreibung fuer Version " + version_text + ": ").strip()
    if not beschreibung:
        print("Bitte eine Beschreibung eingeben.")

# ---------- 6. Veroeffentlichen ----------
if TROCKEN:
    print("")
    print("[Trockenlauf] Diese Befehle wuerden jetzt ausgefuehrt:")
    print("  lg2 add .")
    print('  lg2 commit -m "Version ' + version_text + ": " + beschreibung + '"')
    print("  lg2 push -u origin")
    print("[Trockenlauf] Ende - nichts wurde veraendert.")
    sys.exit(0)

def laufe(befehl, erfolg_text=None):
    try:
        import subprocess
        ergebnis = subprocess.run(befehl, capture_output=True, text=True)
        ausgabe = (ergebnis.stdout or "") + (ergebnis.stderr or "")
        if ausgabe:
            print(ausgabe)
        if erfolg_text and erfolg_text in ausgabe:
            return True
        return ergebnis.returncode == 0
    except Exception as fehler:
        print("FEHLER: Befehl konnte nicht gestartet werden: " + str(fehler))
        return False

print("")
print("lg2 add .")
if not laufe(["lg2", "add", "."]):
    print("Falls noetig von Hand: lg2 add .")
    abbruch("lg2 add . ist fehlgeschlagen.")

print("lg2 commit")
if not laufe(["lg2", "commit", "-m", "Version " + version_text + ": " + beschreibung]):
    abbruch("lg2 commit ist fehlgeschlagen.")

print("lg2 push")
if not laufe(["lg2", "push", "-u", "origin"], "pushed"):
    abbruch("lg2 push ist fehlgeschlagen (kein Netz? Login?). Die Dateien sind lokal committet - spaeter einfach erneut versuchen.")

print("")
print("Veroeffentlicht: Version " + version_text + " - \"" + beschreibung + "\"")
print("App auf dem iPhone komplett schliessen und neu oeffnen, um die neue Version zu laden.")