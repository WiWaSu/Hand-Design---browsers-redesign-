#!/usr/bin/env python3
"""Hand Design for Chromium — архив релиза.

python tools/build.py  →  Hand-Design-Chromium-v<версия>.zip рядом с папкой chrome
Внутри: Setup.cmd, uninstall.cmd, VERSION, README.md, CHANGELOG.md, files/ (без build-exe.bat и tools/).
Перед сборкой проверяет, что версия одинакова в VERSION, manifest.json и installer.ps1.
"""
import json
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver = open(os.path.join(ROOT, "VERSION"), encoding="utf-8").read().strip()
man = json.load(open(os.path.join(ROOT, "files", "extension", "manifest.json"), encoding="utf-8"))["version"]
inst = re.search(r'\$Version = "([\d.]+)"', open(os.path.join(ROOT, "files", "installer.ps1"), encoding="utf-8-sig").read()).group(1)
if not (ver == man == inst):
    sys.exit(f"версии не совпадают: VERSION {ver}, manifest.json {man}, installer.ps1 {inst}")

out = os.path.join(os.path.dirname(ROOT), f"Hand-Design-Chromium-v{ver}.zip")
skip_top = {"build-exe.bat", "tools"}
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name in sorted(os.listdir(ROOT)):
        if name in skip_top or name.endswith((".zip", ".exe")):
            continue
        path = os.path.join(ROOT, name)
        if os.path.isdir(path):
            for d, _, files in os.walk(path):
                for f in sorted(files):
                    if f == "settings.json" or f.startswith("wallpaper."):
                        continue  # их пишет установщик
                    full = os.path.join(d, f)
                    z.write(full, os.path.relpath(full, ROOT))
        else:
            z.write(path, name)
print(out, os.path.getsize(out) // 1024, "КБ")
