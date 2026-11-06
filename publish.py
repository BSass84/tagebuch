# -*- coding: utf-8 -*-
# publish.py - Publishing-Routine fuer die Tagebuch-App
#
#   python3 publish.py        -> veroeffentlichen (Module pruefen, Version +1, Push)
#   python3 publish.py test   -> Trockenlauf (nichts wird veraendert, nichts gepusht)

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

dateien = sorted(f for f in os.listdir("modules") if f.endswith(".html"))
gefundene_ids = [f[:-5] for f in dateien]
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

# ---------- 3. Version in sw.js erhoehen ----------
with io.open("sw.js", "r", encoding="utf-8") as f:
    sw_text = f.read()

treffer = re.search(r"(tagebuch-v)(\d+)", sw_text)
if not treffer:
    abbruch("Keine Versionsnummer (tagebuch-vN) in sw.js gefunden.")

alte_version = int(treffer.group(2))
neue_version = alte_version + 1
print("")
print("Version: tagebuch-v" + str(alte_version) + "  ->  tagebuch-v" + str(neue_version))

if TROCKEN:
    print("[Trockenlauf] sw.js wuerde jetzt auf v" + str(neue_version) + " erhoeht.")
else:
    neuer_text = re.sub(r"(tagebuch-v)(\d+)", r"\g<1>" + str(neue_version), sw_text, count=1)
    with io.open("sw.js", "w", encoding="utf-8") as f:
        f.write(neuer_text)

# ---------- 4. Versionsbeschreibung ----------
print("")
beschreibung = ""
while not beschreibung:
    beschreibung = input("Tippe die Versionsbeschreibung fuer Version " + str(neue_version) + ": ").strip()
    if not beschreibung:
        print("Bitte eine Beschreibung eingeben.")

# ---------- 5. Veroeffentlichen ----------
if TROCKEN:
    print("")
    print("[Trockenlauf] Diese Befehle wuerden jetzt ausgefuehrt:")
    print("  lg2 add .")
    print("  lg2 commit -m \"Version " + str(neue_version) + ": " + beschreibung + "\"")
    print("  lg2 push -u origin")
    print("[Trockenlauf] Ende - nichts wurde veraendert.")
    sys.exit(0)

def laufe(befehl):
    try:
        import subprocess
        ergebnis = subprocess.run(befehl, capture_output=True, text=True)
        ausgabe = (ergebnis.stdout or "") + (ergebnis.stderr or "")
        if ausgabe:
            print(ausgabe)
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
if not laufe(["lg2", "commit", "-m", "Version " + str(neue_version) + ": " + beschreibung]):
    abbruch("lg2 commit ist fehlgeschlagen.")

print("lg2 push")
if not laufe(["lg2", "push", "-u", "origin"]):
    abbruch("lg2 push ist fehlgeschlagen (kein Netz? Login?). Die Dateien sind lokal committet - spaeter einfach erneut versuchen.")

print("")
print("Veroeffentlicht: Version " + str(neue_version) + " - \"" + beschreibung + "\"")
print("App auf dem iPhone komplett schliessen und neu oeffnen, um die neue Version zu laden.")