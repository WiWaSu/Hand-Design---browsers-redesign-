#!/usr/bin/env python3
"""Копирует общий код из shared/ в папки версий для Firefox и Chromium.

  python tools/sync.py          — скопировать
  python tools/sync.py --check  — только проверить, что копии совпадают (для CI)

Править общие файлы нужно в shared/, копии в firefox/ и chrome/ перезаписываются.
"""
import filecmp
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = "firefox/files/pdf-tweaks"
CR = "chrome/files/extension"
MAP = [
    ("shared/apps", [FF, CR + "/apps"]),
    ("shared/l10n", [FF + "/l10n", CR + "/l10n"]),
    ("shared/details", [FF + "/details", CR + "/details"]),
]


def main():
    check = "--check" in sys.argv
    stale = []
    for src, targets in MAP:
        files = sorted(os.listdir(os.path.join(ROOT, src)))
        for dst in targets:
            os.makedirs(os.path.join(ROOT, dst), exist_ok=True)
            for name in files:
                a = os.path.join(ROOT, src, name)
                b = os.path.join(ROOT, dst, name)
                if os.path.isfile(b) and filecmp.cmp(a, b, shallow=False):
                    continue
                stale.append(f"{dst}/{name}")
                if not check:
                    shutil.copyfile(a, b)
    if check and stale:
        print("Копии устарели, запустите python tools/sync.py:\n  " + "\n  ".join(stale))
        sys.exit(1)
    print(("обновлено: " + str(len(stale))) if stale and not check else "ok")


main()
