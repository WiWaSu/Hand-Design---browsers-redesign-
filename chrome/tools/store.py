#!/usr/bin/env python3
"""Hand Design for Chromium — архив для Chrome Web Store.

python tools/store.py  →  releases/chrome/Hand-Design-Chromium-Store-v<версия>.zip
Внутри только расширение: manifest.json в корне, pdf.js распакован, без settings.json и обоев установщика.
"""
import io
import json
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "files", "extension")
man = json.load(open(os.path.join(EXT, "manifest.json"), encoding="utf-8"))
ver = open(os.path.join(ROOT, "VERSION"), encoding="utf-8").read().strip()
if man["version"] != ver:
    sys.exit(f"версии не совпадают: VERSION {ver}, manifest.json {man['version']}")
if "key" in man or "update_url" in man:
    sys.exit("в manifest.json не должно быть key и update_url: Store их не принимает")

out_dir = os.path.join(os.path.dirname(ROOT), "releases", "chrome")
os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, f"Hand-Design-Chromium-Store-v{ver}.zip")
n = 0
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for d, dirs, files in os.walk(EXT):
        dirs[:] = sorted(x for x in dirs if not x.startswith(".") and x != "__pycache__")
        for f in sorted(files):
            if f == "settings.json" or f.startswith("wallpaper.") or f.startswith("."):
                continue
            full = os.path.join(d, f)
            rel = os.path.relpath(full, EXT).replace("\\", "/")
            if rel == "pdf/lib.zip":
                with zipfile.ZipFile(full) as lib:
                    for info in lib.infolist():
                        if not info.is_dir():
                            z.writestr("pdf/lib/" + info.filename.replace("\\", "/"), lib.read(info))
                            n += 1
                continue
            z.write(full, rel)
            n += 1
print(out, n, "файлов,", os.path.getsize(out) // 1024, "КБ")
