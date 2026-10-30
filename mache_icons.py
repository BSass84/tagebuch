import zlib, struct

def png_schreiben(pfad, n, hintergrund, seite):
    rand = n // 8
    x1, x2 = rand, n - rand
    y1, y2 = rand, n - rand
    zeilen = []
    for y in range(n):
        zeile = bytearray()
        for x in range(n):
            if x1 <= x <= x2 and y1 <= y <= y2:
                r, g, b = seite
            else:
                r, g, b = hintergrund
            zeile += bytes((r, g, b))
        zeilen.append(zeile)
    roh = b"".join(b"\x00" + z for z in zeilen)

    def block(typ, daten):
        c = struct.pack(">I", len(daten)) + typ + daten
        return c + struct.pack(">I", zlib.crc32(typ + daten) & 0xffffffff)

    with open(pfad, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(block(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 2, 0, 0, 0)))
        f.write(block(b"IDAT", zlib.compress(roh)))
        f.write(block(b"IEND", b""))

blau = (10, 132, 255)
weiss = (255, 255, 255)
png_schreiben("icons/icon-192.png", 192, blau, weiss)
png_schreiben("icons/icon-512.png", 512, blau, weiss)
print("Fertig: beide Icons liegen im Ordner icons/")
