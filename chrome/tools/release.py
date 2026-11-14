#!/usr/bin/env python3
"""Hand Design for Chromium — выпуск версии (учёт версий как у Firefox-версии).

Запуск из любой папки:  python chrome/tools/release.py
Берёт номер из chrome/VERSION и раздел «## X — дата» из chrome/CHANGELOG.md и раскладывает:

  archive/versions/chrome/vX.Y.Z/                          — снимок папки chrome целиком
  archive/versions/chrome/Hand-Design-Chromium-vX.Y.Z.zip  — тот же снимок архивом
  releases/chrome/Hand-Design-Chromium-vX.Y.Z.zip          — архив для загрузки на GitHub (без build-exe.bat и tools)
  release-notes/chrome/vX.Y.Z.md                           — текст для страницы релиза
  latest.json                                              — поле "chrome"

Тег в git: chrome-vX.Y.Z (не путается с тегами Firefox-версии v*).
"""
import json
import os
import re
import shutil
import sys
import zipfile

CHROME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HD = os.path.dirname(CHROME)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ver = open(os.path.join(CHROME, "VERSION"), encoding="utf-8").read().strip()
log = open(os.path.join(CHROME, "CHANGELOG.md"), encoding="utf-8").read()
m = re.search(rf"^## {re.escape(ver)} — (\d{{4}}-\d{{2}}-\d{{2}})\n(.*?)(?=^## |\Z)", log, re.S | re.M)
if not m:
    sys.exit(f"в chrome/CHANGELOG.md нет раздела «## {ver} — ГГГГ-ММ-ДД»")
date, body = m.group(1), m.group(2).strip()

SHOTS = [("chrome-newtab.jpg", "Новая вкладка / New tab"), ("chrome-search.jpg", "История поиска / Search history"), ("chrome-panel.jpg", "Быстрая панель / Quick panel"),
         ("chrome-nowbar.jpg", "Now Bar"), ("chrome-pdf.jpg", "PDF"), ("chrome-studio.jpg", "Studio")]


def w(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def notes(img_prefix, zip_link, back_link):
    pics = [s for s in SHOTS if os.path.exists(os.path.join(HD, "docs", s[0]))]
    rows = ""
    for i in range(0, len(pics), 2):
        pair = pics[i:i + 2]
        cells = [f"![{t}]({img_prefix}{n})" for n, t in pair] + ([""] if len(pair) == 1 else [])
        rows += "| " + " | ".join(cells) + " |\n"
    shots = f"## Скриншоты / Screenshots\n\n| | |\n|---|---|\n{rows}\n" if rows else ""
    return f"""<div align="center">

# Hand Design for Chromium {ver}

**A redesign for Chrome, Edge, Brave, Vivaldi, Opera and Yandex Browser** · {date}

</div>

## Что нового / What's new

{body}

{shots}## Установка / Install

1. Скачайте {zip_link} и распакуйте. / Download {zip_link} and unzip.
2. Запустите **Setup.cmd**, выберите тему и браузеры, нажмите «Установить». / Run **Setup.cmd**, pick a theme and browsers, press Install.
3. В браузере один раз: страница расширений → «Режим разработчика» → «Загрузить распакованное» → Ctrl+V. Потом так же папку `frame` (рамка). / Once in the browser: extensions page → Developer mode → Load unpacked → Ctrl+V, then the `frame` folder.

Уже стоит — просто установите поверх и перезапустите браузер, настройки сохранятся. / Already installed — install over it and restart the browser, settings are kept.

{back_link}
"""


def release_zip(dest):
    skip_top = {"build-exe.bat", "tools"}
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name in sorted(os.listdir(CHROME)):
            if name in skip_top or name.endswith((".zip", ".exe")):
                continue
            p = os.path.join(CHROME, name)
            if os.path.isdir(p):
                for d, _, files in os.walk(p):
                    for f in sorted(files):
                        if f == "settings.json" or f.startswith("wallpaper.") or "__pycache__" in d:
                            continue
                        z.write(os.path.join(d, f), os.path.relpath(os.path.join(d, f), CHROME))
            else:
                z.write(p, name)


def snapshot_zip(src, dest):
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for d, _, files in os.walk(src):
            for f in sorted(files):
                z.write(os.path.join(d, f), os.path.relpath(os.path.join(d, f), src))


# 1. архив версий
arch = os.path.join(HD, "archive", "versions", "chrome")
snap = os.path.join(arch, "v" + ver)
if os.path.exists(snap):
    shutil.rmtree(snap)
shutil.copytree(CHROME, snap, ignore=shutil.ignore_patterns("*.exe", "*.zip", "__pycache__", "settings.json"))
# pdf.js лежит архивом и в снимке — копируем отдельно (ignore выше отбросил *.zip)
shutil.copy2(os.path.join(CHROME, "files", "extension", "pdf", "lib.zip"), os.path.join(snap, "files", "extension", "pdf", "lib.zip"))
snapshot_zip(snap, os.path.join(arch, f"Hand-Design-Chromium-v{ver}.zip"))

# 2. архив для скачивания и текст релиза
REPO = "WiWaSu/Hand-Design---browsers-redesign-"
zip_path = os.path.join(HD, "releases", "chrome", f"Hand-Design-Chromium-v{ver}.zip")
os.makedirs(os.path.dirname(zip_path), exist_ok=True)
release_zip(zip_path)
notes_path = os.path.join(HD, "release-notes", "chrome", f"v{ver}.md")
w(notes_path, notes(f"https://raw.githubusercontent.com/{REPO}/main/docs/", f"**Hand-Design-Chromium-v{ver}.zip**",
                    f"[Все изменения / Full changelog](https://github.com/{REPO}/blob/main/chrome/CHANGELOG.md)"))

# 3. поле "chrome" в latest.json: его читает проверка обновлений в расширении
root_lj = os.path.join(HD, "latest.json")
if os.path.exists(root_lj):
    rj = json.load(open(root_lj, encoding="utf-8"))
    rj["chrome"] = {"version": ver, "date": date, "url": f"https://github.com/{REPO}/releases/tag/chrome-v{ver}"}
    w(root_lj, json.dumps(rj, ensure_ascii=False, indent=2) + "\n")

print(f"Hand Design for Chromium {ver} ({date}) разложен:")
for p in [snap, os.path.join(arch, f"Hand-Design-Chromium-v{ver}.zip"), zip_path, notes_path, root_lj]:
    print("  ", os.path.relpath(p, HD))
print(f"Тег: git tag chrome-v{ver}")
