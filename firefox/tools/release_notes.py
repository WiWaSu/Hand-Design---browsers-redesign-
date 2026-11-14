#!/usr/bin/env python3
"""Текст для страницы релиза на GitHub: release-notes/firefox/v<версия>.md.

Берёт раздел версии из firefox/CHANGELOG.md и добавляет заголовок, картинки и
шаги установки. Файл готов к вставке в описание релиза.

    python firefox/tools/release_notes.py 1.22.1
"""
import re, sys, pathlib

firefox = pathlib.Path(__file__).resolve().parents[1]
REPO = "WiWaSu/Hand-Design---browsers-redesign-"
ver = sys.argv[1]
log = (firefox / "CHANGELOG.md").read_text(encoding="utf-8")
m = re.search(r"(?ms)^## " + re.escape(ver) + r"(?: — (\S+))?\n(.*?)(?=^## |\Z)", log)
if not m:
    sys.exit(f"нет раздела {ver} в firefox/CHANGELOG.md")
date, body = m.group(1) or "", m.group(2).strip()
IMG = f"https://raw.githubusercontent.com/{REPO}/main/docs/"
body = body.replace("](../docs/", "](" + IMG)
text = f"""<div align="center">

# Hand Design {ver}

**A redesign for Floorp, Firefox and Firefox forks** · {date}

![Hand Design]({IMG}hero.jpg)

</div>

## Что нового / What's new

{body}

## Скриншоты / Screenshots

| | |
|---|---|
| ![One UI]({IMG}theme-oneui.jpg) | ![iOS]({IMG}theme-ios.jpg) |
| ![Night Drive]({IMG}theme-nightdrive.jpg) | ![Cyberpunk]({IMG}theme-cyber.jpg) |
| ![Wallpapers]({IMG}wallpaper-picker.jpg) | ![Studio]({IMG}studio-menus.jpg) |

## Установка / Install

1. Скачайте **Hand-Design-v{ver}.zip** ниже и распакуйте. / Download **Hand-Design-v{ver}.zip** below and unzip.
2. Запустите **Setup.cmd**, выберите тему и браузеры, нажмите «Установить». / Run **Setup.cmd**, pick a theme and browsers, press Install.
3. Перезапустите браузер. / Restart the browser.

Уже стоит более старая версия — запустите **Setup.cmd** и нажмите «Обновить», настройки сохранятся. / Already installed — run **Setup.cmd** and press Update, your settings are kept.

[Все изменения / Full changelog](https://github.com/{REPO}/blob/main/firefox/CHANGELOG.md)
"""
out = firefox.parent / "release-notes" / "firefox" / f"v{ver}.md"
out.write_text(text, encoding="utf-8", newline="\n")
print(out.relative_to(firefox.parent).as_posix())
