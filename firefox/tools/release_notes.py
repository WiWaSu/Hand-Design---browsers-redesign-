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

1. Скачайте **Hand-Design-Setup-v{ver}.exe** ниже и запустите. / Download **Hand-Design-Setup-v{ver}.exe** below and run it.
2. Выберите тему и браузеры, нажмите «Установить». / Pick a theme and browsers, press Install.
3. Перезапустите браузер. / Restart the browser.

Если SmartScreen пишет «Система Windows защитила ваш компьютер», нажмите «Подробнее» → «Выполнить в любом случае»: у файла нет платной подписи. / If SmartScreen says "Windows protected your PC", click "More info" → "Run anyway": the file is not signed with a paid certificate.

Уже стоит более старая версия — запустите установщик и нажмите «Обновить», настройки сохранятся. / Already installed — run the installer and press Update, your settings are kept.

Без .exe: **Hand-Design-v{ver}.zip** — распакуйте и запустите **Setup.cmd**. / Without the .exe: unzip **Hand-Design-v{ver}.zip** and run **Setup.cmd**.

[Все изменения / Full changelog](https://github.com/{REPO}/blob/main/firefox/CHANGELOG.md)
"""
out = firefox.parent / "release-notes" / "firefox" / f"v{ver}.md"
out.write_text(text, encoding="utf-8", newline="\n")
print(out.relative_to(firefox.parent).as_posix())
