<div align="center">

<img src="docs/hero.jpg" alt="Hand Design" width="100%">

# Hand Design

**A redesign for Firefox and Chromium browsers on Windows.**<br>
24 themes, a Studio for every detail, a new tab with clock and wallpapers, notes like in Obsidian, PDF, Markdown, CSV and image editors right in the browser.

[![Firefox](https://img.shields.io/badge/Firefox-3.0.0-ff7139?style=for-the-badge)](firefox/CHANGELOG.md)
[![Chromium](https://img.shields.io/badge/Chromium-1.1.0-4285f4?style=for-the-badge)](chrome/CHANGELOG.md)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-2b7cd3?style=for-the-badge)](#install)
[![License](https://img.shields.io/badge/license-MIT-2ea44f?style=for-the-badge)](LICENSE)

### [Download](https://github.com/WiWaSu/Hand-Design---browsers-redesign-/releases) · [What's new: Firefox](firefox/CHANGELOG.md) · [Chromium](chrome/CHANGELOG.md) · [По-русски](#по-русски)

</div>

---

## Two editions

The themes, Studio, new tab, notes and file editors are the same code in both. What differs is how each browser lets a mod in.

| | Firefox edition | Chromium edition |
|---|---|---|
| Browsers | Firefox 156+ (also Developer Edition and Nightly), LibreWolf, Waterfox, Zen, Floorp 12, Mercury | Chrome 140+, Edge, Brave, Vivaldi, Opera, Yandex Browser, Chromium, Thorium |
| How it installs | installer puts a script loader into the browser folder and styles into the profile | installer copies an extension; you press "Load unpacked" once |
| Browser interface | fully restyled: tabs, address bar, menus, animations | tabs and address bar take the theme color; Vivaldi also gets CSS for the whole interface (experimental) |
| Only here | icon packs for the whole browser, password window, live preview in Studio, a loading line per theme, tab hover previews, screen sharing like in Discord, hiding tabs | search history on the new tab, tab switcher with previews (`Alt+Q`) |
| Version | [3.0.0](firefox/CHANGELOG.md) | [1.1.0](chrome/CHANGELOG.md), details in [chrome/README.md](chrome/README.md) |

Chrome gives extensions no access to its own icons, saved passwords or loading line, so those parts stay Firefox-only.

Earlier names of the project: Redesigned Fox, Floorp Modern.

<table>
<tr>
<td width="50%" valign="top">

**24 themes**<br>
iOS Liquid Glass, One UI, Material You, Windows 11, macOS, Nothing, Retro 98 and 17 more. Switch them on the fly.

</td>
<td width="50%" valign="top">

**Theme details**<br>
Take the clock from one theme, the background from another and the window from a third.

</td>
</tr>
<tr>
<td valign="top">

**Studio**<br>
Colors, corners, tabs, address bar, menus, fonts, animations. Everything a theme sets can be set here without it.

</td>
<td valign="top">

**Notes**<br>
Formatted text without markup, `[[links]]`, tags, a graph, daily notes. Plain `.md` files that Obsidian opens too.

</td>
</tr>
<tr>
<td valign="top">

**PDF and Markdown**<br>
Draw and type on PDFs, edit `.md` files and their tables in place, save with `Ctrl+S`.

</td>
<td valign="top">

**Calls and music**<br>
A call bar with mic and camera buttons, and a Now Bar for music playing in other tabs.

</td>
</tr>
<tr>
<td valign="top">

**Icon packs** (Firefox)<br>
Each theme redraws every icon of the browser in its own style: pixel, dot matrix, faceted, on tiles, hand-drawn.

</td>
<td valign="top">

**Passwords** (Firefox)<br>
A compact password window next to the button you pressed, in the colors of the theme.

</td>
</tr>
</table>

## Themes

Some themes copy the look of a phone or an OS, some are made up, and ten are color palettes.

![24 themes](docs/themes.jpg)

<details>
<summary><b>What each theme does</b></summary>

- **One UI**: black background, pill tabs and buttons, thin lock-screen clock
- **iOS (Liquid Glass)**: the wallpaper shows behind the window, glass toolbar, tabs and menus
- **Material You**: colors derived from your accent, stacked clock
- **Windows 11**: square-ish corners, accent underline, Bloom wallpaper
- **macOS**: traffic-light window buttons, blue menus
- **Nothing**: monochrome with one red dot, dot-matrix clock
- **Night Drive**: blurred city lights, as if through a car window at night
- **Aero** (Windows 7), **Retro 98** (grey bevels, no rounding), **Terminal** (green monospace), **Paper** (serif, warm background), **Cyberpunk** (cut corners, yellow neon)
- light palettes: **Arctic, Sakura, Mint, Latte**
- dark palettes: **Midnight, Fjord, Ember, Forest, Ocean, Rosé**
- **Synthwave** and **High Contrast**

</details>

## Theme details

Every theme has its own extras: the selected tab and menus, the new tab clock, the background and the search box. In Studio → Theme details you can take any of them from any other theme, for example the Nothing dot clock and the Night Drive lights on top of iOS. Each option has a preview, and "No extras" turns a part off. In Firefox the page loading line is a theme part too: Retro 98 pixel blocks, Nothing dots, Ember fire, Synthwave neon and others.

![Theme details](docs/feature-details.jpg)

## Quick panel and Studio

The palette button on the toolbar opens the quick panel: theme, light or dark, accent and a switch that removes rounded corners everywhere. Changes show up at once in all windows, on the new tab, on settings pages and in PDFs. In Chromium browsers the panel also opens with `Alt+Shift+D`.

Studio is the full settings page: open it from the quick panel or with `Alt+Shift+S` (in Firefox also from ☰ → Design). Tabs, the address bar and menus are browser parts that only Firefox lets a mod restyle, so those settings are in the Firefox edition only.

<table>
<tr>
<td width="42%"><img src="docs/quick-panel.jpg" alt="Quick panel"></td>
<td width="58%"><img src="docs/studio.jpg" alt="Studio"></td>
</tr>
</table>

What Studio changes, on top of any theme:

- **colors**: accent, window background, fields, menus, text, secondary text, lines, hover and press highlights, toggles, menu transparency and blur
- **shape**: corners of pages, menus and menu items, gaps, shadows, button shape, density
- **tabs** (Firefox): 6 shapes, how the selected tab is marked, size, close button, hover preview in 3 styles; tabs can hide and slide out from the window edge (`Alt+Shift+T`)
- **address bar** (Firefox): height, corners, alignment, border
- **menus** (Firefox): right-click menus in 7 styles with icons, Ctrl+Tab with previews in 4 styles, tiles of the main menu ☰
- **icons** (Firefox): the icon pack of any theme or one of 4 hand-drawn sets
- **font**, UI text size and animation speed
- **new tab**: clock size and position, date, search width, shortcuts, wallpaper blur
- **show or hide**: bookmarks bar, toolbar buttons, Now Bar, call bar, loading line

There are 6 presets, and settings can be saved to a file and loaded back. In Firefox, Studio shows a small live copy of the browser window: hover a theme or a preset and it tries it on without touching the real browser.

## Icon packs and passwords (Firefox)

**Icon packs.** Every one of the 24 themes has its own set that redraws the toolbar, tabs, menus, sidebars, downloads, settings, the password window, notes and the PDF viewer. The packs differ in shape, not only in color: pixel icons with a shadow in Retro 98, a dot matrix in Nothing, faceted in Cyberpunk, tiles in Material, pencil lines in Paper. About 55 main icons (key, lock, gear, star and others) have four different drawings. Four more hand-drawn sets (Sketch, Marker, Doodle, Brush) fit any theme. Studio → Icons, changes apply at once.

**Password window.** The key button or ☰ → Passwords opens a compact window by that button instead of a whole tab: search, passwords for the open site first, copy straight from the list, edit and delete, a button for the full manager. Windows asks for your password before showing or copying one, as before. Studio → Passwords turns it off.

## Notes

`Alt+Shift+N` or ☰ → Notes in Firefox, the Notes button in the quick panel in Chromium browsers. Each note is a plain `.md` file in a folder you pick, so the same folder opens in Obsidian, and an Obsidian vault opens here.

![Notes](docs/feature-notes.jpg)

- only formatted text on screen: `#`, `**` and ` ``` ` stay hidden even under the cursor (Studio can show them on the cursor line, like in Obsidian)
- folder tree, search, pinned notes, drag and drop, right-click menu
- `[[links]]` with suggestions, a Mentions list under each note, links follow renamed notes
- `#tags`, `> [!note]` callouts, properties, footnotes, `%%comments%%`
- pasted and dropped images, `![[image.png]]` from Obsidian vaults
- **graph** of links, quick switcher `Ctrl+O`, daily note, templates
- notes save as you type, deleted notes go to `.trash`
- import from Notion, Evernote, Google Keep and any folder of .md files (Obsidian, Joplin)

## PDF and Markdown

![PDF and Markdown](docs/feature-docs.jpg)

**PDF viewer**

- new toolbar that fits a half-screen window, light or dark interface, paper / sepia / night pages
- drawing, text and highlights, saved into the file
- each PDF reopens on the page where you stopped
- Firefox also has: drawing like in Edge with straight `Shift` lines, page bookmarks with notes (`Ctrl+B`), typing into a "……" gap or empty space, a stroke that goes on to the next page, `Ctrl+V` to paste a picture, a presentation mode with pages only, a redesigned Pages sidebar

**Markdown**

- drag a `.md` file into the window: table of contents, read / side by side / text modes, a formatting toolbar, `Ctrl+S` saves
- tables are edited right in the document: click a cell, `Tab` and `Enter` move between cells
- the Documents page creates and opens `.md` files and keeps a list of recent ones

**CSV tables**

- `.csv` files open as a table instead of downloading: edit cells, sort by a column, search, add and delete rows and columns, paste a block from Excel, `Ctrl+S` saves in the same encoding and delimiter

**Image editor** (off by default, turn it on in Studio → Documents)

- crop, rotate, flip, arrows, boxes, brush, text, blur for emails, faces and card numbers
- opens a picture from disk, from "Edit image" in the right-click menu, or a screenshot pasted with `Ctrl+V`
- "Save as…" writes PNG, JPEG or WebP and shows the file size before saving

![CSV and images](docs/feature-files.jpg)

## Calls, music and the new tab

<table>
<tr>
<td width="50%" valign="top">

**Call bar.** When a call runs in another tab (Telegram, Discord, WhatsApp, Meet), a bar at the top shows the site, a timer and mic and camera buttons. `Alt+Shift+M` mutes the mic from any tab.

<img src="docs/call-bar.jpg" alt="Call bar">

</td>
<td width="50%" valign="top">

**New tab.** 10 built-in wallpapers or your own picture, with a dimming slider. The button is in the bottom left corner.

<img src="docs/wallpapers.jpg" alt="Wallpapers">

</td>
</tr>
</table>

Also:

- **Now Bar**: when music plays in another tab, a bar you can drag shows the cover, progress and controls
- **tab switcher with previews** (Chromium, `Alt+Q`): recent tabs with thumbnails and search
- **search on the new tab** (Chromium) remembers recent queries and suggests sites from history
- **screen sharing** looks like in Discord: tabs for windows, screens and tabs, large cards and a live preview (Firefox)
- **spring animations** like on iPhone; they work even when animations are off in Windows (Firefox)
- a loading line under the toolbar, a theme button for Auto / Light / Dark, small notices for downloads, zoom and muted tabs (Firefox)
- **10 languages**: English, Russian, Ukrainian, German, French, Spanish, Portuguese, Polish, Turkish, Chinese
- **updates**: each start the browser checks `latest.json` here and shows a notice if a new version is out. Nothing is downloaded by itself; the check can be turned off in Studio → Updates

## Shortcuts

| Keys | Firefox | Chromium |
|---|---|---|
| `Alt+Shift+S` | Studio | Studio |
| `Alt+Shift+D` | close duplicate tabs | quick panel |
| `Alt+Shift+M` | mute the mic in a call from any tab | same |
| `Alt+Shift+N` | Notes | — |
| `Alt+Shift+T` | hide or show tabs | — |
| `Alt+Shift+C` | copy the page address | — |
| `Alt+Shift+Z` | focus mode | — |
| `Alt+Q` | — | tab switcher with previews |
| `Ctrl+O` | quick switcher in Notes | same |
| `Ctrl+B` | page bookmarks in PDF | — |
| `Ctrl+S` / `Ctrl+E` | save a `.md` file / switch between reading and text | same |

In Chromium browsers shortcuts can be changed on `chrome://extensions/shortcuts`.

## Install

### Firefox edition

1. Download **`Hand-Design-Setup-v<version>.exe`** from [Releases](https://github.com/WiWaSu/Hand-Design---browsers-redesign-/releases) and run it.
2. Allow administrator rights. They are needed once, to put a small script loader into the browser's program folder.
3. Pick a theme, wallpaper, accent, corners, animations and browsers, press Install.
4. Restart the browser.

> [!NOTE]
> If SmartScreen says "Windows protected your PC", click "More info", then "Run anyway". The file is not signed with a paid certificate.

Without the `.exe`: download `Hand-Design-v<version>.zip`, unzip it and run `Setup.cmd`. From a copy of the whole repository (Code → Download ZIP), the files are in the `firefox` folder. `install.cmd` does the same in the console.

**Update.** Run the new installer and press "Update to v&lt;version&gt;". It updates only the profiles that have Hand Design and keeps the theme, accent, language, wallpaper and other settings. `update.cmd` does the same in the console.

**After a big browser update** the loader in the program folder can disappear. If the toolbar buttons or the PDF features are gone, run `Setup.cmd` again.

**Uninstall.** `Setup.cmd` → "Remove theme", or `uninstall.cmd`. Your own rules in `userChrome.css` / `userContent.css` stay, backups are saved as `*.bak-floorp-modern`.

In the browser settings keep the built-in "System theme — auto": third-party themes repaint the window frame and get in the way.

### Chromium edition

1. Download **`Hand-Design-Chromium-v<version>.zip`** from [Releases](https://github.com/WiWaSu/Hand-Design---browsers-redesign-/releases) and unzip it.
2. Run `Setup.cmd`, pick a language, theme, wallpaper, accent and browsers, press Install.
3. The browser opens its extensions page. Turn on Developer mode, click "Load unpacked", paste the path with `Ctrl+V` and select the folder.
4. Edge, Opera and Yandex only: "Load unpacked" once more, the `frame` folder. Chrome, Brave and Chromium color the tab strip by themselves.

Chrome doesn't let programs install extensions outside the store, so steps 3 and 4 are done by hand, once. To update, run the new installer and press ⟳ on the Hand Design card. More in [chrome/README.md](chrome/README.md).

<details>
<summary><b>How the Firefox edition works</b></summary>

| Where | What |
|---|---|
| Browser folder (`C:\Program Files\…`) | `config.js` and `defaults\pref\config-prefs.js`, the AutoConfig loader |
| `chrome\userChrome.css` in the profile | the browser interface (`FLOORP-MODERN` block) |
| `chrome\userContent.css` in the profile | new tab, settings pages, PDF viewer (`FLOORP-MODERN` and `PDF-TWEAKS` blocks) |
| `chrome\pdf-tweaks\` in the profile | scripts for the window and the PDF viewer, Studio, Notes, wallpapers, themes for switching on the fly |
| `user.js` in the profile | a few prefs (stylesheets, animations) |

The current theme is stored in the `floorp.modern.theme` pref. Inside the CSS files the theme sits between `FM-THEME BEGIN` and `FM-THEME END`, so the browser can replace it without the installer. Studio settings are kept in `floorp.modern.studio` and applied as a live stylesheet. If something breaks, look at `chrome\pdf-tweaks\fm-log.json` and `fm-boot.json`.

The internal names still say "floorp-modern", so that existing settings keep working.

</details>

<details>
<summary><b>Folders and development</b></summary>

| Folder or file | What is inside |
|---|---|
| `firefox/` | The edition for Firefox and its forks: installer, styles, scripts, `CHANGELOG.md`. This folder goes into the release zip. |
| `chrome/` | The edition for Chromium browsers: extension, installer, `CHANGELOG.md`. |
| `shared/` | Code both editions use: Notes, the Markdown, CSV and image editors, icons, translations. `tools/sync.py` copies it into `firefox/` and `chrome/`. |
| `docs/` | Pictures for this README and for release pages. |
| `release-notes/` | Text for each GitHub release, one file per version. |
| `latest.json` | The latest version number. Installed copies read it to show "update available". |

The CSS is generated by the scripts in `firefox/tools/`. Run them from the `firefox` folder:

```sh
python3 tools/gen_chrome.py files                 # base chrome + content CSS
python3 tools/gen_ios.py src/themes               # iOS theme, into src/themes
python3 tools/gen_themes.py src/themes            # the other themes, into src/themes
python3 tools/pack_themes.py                      # src/themes -> files/pdf-tweaks/themes
sh tools/build.sh                                 # release zip
```

`files/pdf-viewer-theme.css` is edited by hand: `tools/gen_css.py` is older and would overwrite it. `src/` is an intermediate folder and is not kept in the repository. `tools/l10n.py` expects translation sources in `src/l10n/`; the built dictionaries are in `files/pdf-tweaks/l10n/`. `firefox/build-exe.bat` builds the `.exe` with the C# compiler that comes with Windows (.NET Framework 4).

</details>

<details>
<summary><b>More screenshots</b></summary>

<table>
<tr><td><img src="docs/theme-oneui.jpg" alt="One UI"><br>One UI</td><td><img src="docs/theme-ios.jpg" alt="iOS"><br>iOS</td></tr>
<tr><td><img src="docs/theme-material.jpg" alt="Material You"><br>Material You</td><td><img src="docs/theme-fluent.jpg" alt="Windows 11"><br>Windows 11</td></tr>
<tr><td><img src="docs/theme-macos.jpg" alt="macOS"><br>macOS</td><td><img src="docs/theme-nothing.jpg" alt="Nothing"><br>Nothing</td></tr>
<tr><td><img src="docs/theme-nightdrive.jpg" alt="Night Drive"><br>Night Drive</td><td><img src="docs/theme-aero.jpg" alt="Aero"><br>Aero</td></tr>
<tr><td><img src="docs/theme-retro.jpg" alt="Retro 98"><br>Retro 98</td><td><img src="docs/theme-terminal.jpg" alt="Terminal"><br>Terminal</td></tr>
<tr><td><img src="docs/theme-paper.jpg" alt="Paper"><br>Paper</td><td><img src="docs/theme-cyber.jpg" alt="Cyberpunk"><br>Cyberpunk</td></tr>
<tr><td><img src="docs/wallpaper-picker.jpg" alt="Wallpaper picker"><br>Wallpaper picker</td><td><img src="docs/studio-menus.jpg" alt="Menu styles in Studio"><br>Menu styles in Studio</td></tr>
</table>

</details>

## License

[MIT](LICENSE). The notes editor is built on [CodeMirror 6](https://codemirror.net) and Lezer (MIT); its source and build script are in `firefox/tools/notes-editor`.

This is an unofficial project, not connected with Mozilla, Google, Microsoft or the makers of the other browsers. It only uses the customization hooks the browsers already have: `userChrome.css`, `userContent.css` and AutoConfig in Firefox, an extension and theme packs in Chromium browsers. Use it at your own risk.

---

<div align="center">

## По-русски

**Редизайн Firefox и Chromium-браузеров для Windows.**<br>
24 темы, Studio для любой мелочи, новая вкладка с часами и обоями, заметки как в Obsidian, редакторы PDF, Markdown, CSV и картинок прямо в браузере.

### [Скачать](https://github.com/WiWaSu/Hand-Design---browsers-redesign-/releases) · [Что нового: Firefox](firefox/CHANGELOG.md) · [Chromium](chrome/CHANGELOG.md)

</div>

### Две версии

Темы, Studio, новая вкладка, заметки и редакторы файлов в обеих версиях общие. Разница в том, что каждый браузер разрешает менять.

| | Firefox | Chromium |
|---|---|---|
| Браузеры | Firefox 156+ (и Developer Edition, и Nightly), LibreWolf, Waterfox, Zen, Floorp 12, Mercury | Chrome 140+, Edge, Brave, Vivaldi, Opera, Яндекс Браузер, Chromium, Thorium |
| Как ставится | установщик кладёт загрузчик в папку браузера и стили в профиль | установщик копирует расширение, один раз нажать «Загрузить распакованное» |
| Интерфейс браузера | меняется весь: вкладки, адресная строка, меню, анимации | вкладки и адресная строка в цвет темы; в Vivaldi ещё CSS для всего интерфейса (опытная функция) |
| Только здесь | паки значков для всего браузера, окно паролей, предпросмотр в Studio, своя полоска загрузки у каждой темы, превью вкладок при наведении, показ экрана как в Discord, скрытие вкладок | история поиска на новой вкладке, вкладки с превью (`Alt+Q`) |
| Версия | [3.0.0](firefox/CHANGELOG.md) | [1.1.0](chrome/CHANGELOG.md), подробно в [chrome/README.md](chrome/README.md) |

Chrome не даёт расширениям менять свои значки, читать сохранённые пароли и полоску загрузки, поэтому эти части есть только в Firefox. Раньше проект назывался Redesigned Fox, а ещё раньше Floorp Modern.

### Темы

24 темы. Часть повторяет вид телефонов и систем: One UI, iOS (Liquid Glass), Material You, Windows 11, macOS, Nothing, Aero, Retro 98. Ещё есть Night Drive, Terminal, Paper, Cyberpunk, Synthwave, High Contrast и десять палитр: Arctic, Sakura, Mint, Latte, Midnight, Fjord, Ember, Forest, Ocean, Rosé.

![24 темы](docs/themes.jpg)

### Детали тем

У каждой темы есть свои особенности: выбранная вкладка и меню, часы на новой вкладке, фон и поиск. В Studio → «Детали тем» любую из них можно взять из другой темы, например точечные часы Nothing и огни Night Drive поверх iOS. У каждого варианта есть картинка, «Без особенностей» выключает деталь. В Firefox деталью темы стала и полоска загрузки страницы: пиксели Retro 98, точки Nothing, огонь Ember, неон Synthwave и другие.

![Детали тем](docs/feature-details.jpg)

### Быстрая панель и Studio

Кнопка с палитрой на панели открывает быструю панель: тема, светлое или тёмное оформление, акцент и переключатель «Без скруглений». Меняется сразу во всех окнах, на новой вкладке, в настройках и в PDF. В Chromium-браузерах панель открывается и по `Alt+Shift+D`.

Studio открывается из быстрой панели или по `Alt+Shift+S` (в Firefox ещё через ☰ → «Дизайн»). В обеих версиях там цвета темы, скругления, шрифт, скорость анимаций, новая вкладка, детали тем, 6 готовых наборов и сохранение в файл. Только в Firefox: форма вкладок и превью при наведении (вкладки можно спрятать, `Alt+Shift+T`), адресная строка, меню правой кнопки (7 стилей, со значками), окно Ctrl+Tab, плитки главного меню, паки значков и предпросмотр: уменьшенное окно браузера примеряет тему или набор при наведении.

### Значки и пароли (Firefox)

**Паки значков.** У каждой из 24 тем свой набор, он перерисовывает панель, вкладки, меню, боковые панели, загрузки, настройки, окно паролей, заметки и PDF. Паки отличаются формой: пиксельные с тенью в Retro 98, точечная матрица в Nothing, граненые в Cyberpunk, на плитках в Material, карандашом в Paper. Около 55 главных значков нарисованы в четырёх вариантах. Ещё четыре набора от руки («Набросок», «Маркер», «Каракули», «Кисть») подходят к любой теме. Studio → «Значки», меняются сразу.

**Окно паролей.** Ключ или ☰ → «Пароли» открывает компактное окно у этой кнопки вместо целой вкладки: поиск, сначала пароли для открытого сайта, копирование прямо из списка, правка и удаление, кнопка полного менеджера. Перед показом или копированием пароля Windows, как и раньше, спрашивает ваш пароль. Выключается в Studio → «Пароли».

### Заметки

В Firefox `Alt+Shift+N` или ☰ → «Заметки», в Chromium-браузерах кнопка «Заметки» в быстрой панели. Каждая заметка — обычный файл `.md` в выбранной папке, эту папку открывает и Obsidian.

![Заметки](docs/feature-notes.jpg)

- на экране только оформленный текст: `#`, `**` и ` ``` ` не видны даже под курсором (в Studio можно показывать их в строке с курсором, как в Obsidian)
- дерево папок, поиск, закреплённые заметки, перетаскивание, своё меню правой кнопки
- `[[ссылки]]` с подсказками, блок «Упоминания», ссылки обновляются при переименовании
- `#теги`, блоки `> [!note]`, свойства, сноски, `%%комментарии%%`
- картинки из буфера и перетаскиванием, `![[картинка.png]]` из папок Obsidian
- граф связей, быстрый переход `Ctrl+O`, заметка дня, шаблоны
- сохраняются сами, удалённые попадают в `.trash`
- импорт из Notion, Evernote, Google Keep и любой папки с файлами .md (Obsidian, Joplin)

### PDF и Markdown

![PDF и Markdown](docs/feature-docs.jpg)

- PDF: светлый или тёмный интерфейс, страницы бумага / сепия / ночь, рисование, надписи и маркер сохраняются в файл, PDF открывается там, где вы остановились
- PDF в Firefox ещё: рисование как в Edge с ровными линиями по `Shift`, закладки страниц (`Ctrl+B`), быстрый текст по «……», штрих через несколько страниц, `Ctrl+V` вставляет картинку, режим презентации, новая панель «Страницы»
- Markdown: перетащите файл `.md` в окно, и он откроется оформленным; три режима, панель кнопок, `Ctrl+S` сохраняет, таблицы правятся прямо в документе
- страница «Документы» создаёт и открывает `.md` и помнит недавние
- таблицы `.csv` открываются в браузере вместо скачивания: правка ячеек, сортировка, поиск, строки и столбцы, вставка из Excel, `Ctrl+S` сохраняет в той же кодировке
- редактор картинок (по умолчанию выключен, включается в Studio → «Документы»): обрезка, поворот, стрелки, рамки, кисть, текст, размытие почты, лиц и номеров карт; сохраняет в PNG, JPEG или WebP и заранее показывает размер файла

![CSV и картинки](docs/feature-files.jpg)

### Ещё

- плашка звонка: если в другой вкладке идёт звонок, сверху видно таймер и кнопки микрофона и камеры, `Alt+Shift+M` выключает микрофон из любой вкладки
- Now Bar: плашка с обложкой и кнопками, когда в другой вкладке играет музыка
- обои новой вкладки: 10 своих или любая картинка
- вкладки с превью (Chromium, `Alt+Q`): недавние вкладки с миниатюрами и поиском
- поиск на новой вкладке (Chromium) помнит недавние запросы и подсказывает сайты из истории
- показ экрана как в Discord: вкладки «Окна», «Экраны», «Вкладки», крупные карточки и живое превью (Firefox)
- анимации-«пружины» как на iPhone, работают даже с выключенными анимациями Windows (Firefox)
- 10 языков интерфейса, язык выбирается в установщике и в Studio
- проверка обновлений при каждом запуске браузера; сама ничего не скачивает, выключается в Studio → «Обновления»

### Горячие клавиши

| Клавиши | Firefox | Chromium |
|---|---|---|
| `Alt+Shift+S` | Studio | Studio |
| `Alt+Shift+D` | закрыть одинаковые вкладки | быстрая панель |
| `Alt+Shift+M` | выключить микрофон в звонке из любой вкладки | то же |
| `Alt+Shift+N` | заметки | — |
| `Alt+Shift+T` | спрятать или показать вкладки | — |
| `Alt+Shift+C` | скопировать адрес страницы | — |
| `Alt+Shift+Z` | режим фокуса | — |
| `Alt+Q` | — | вкладки с превью |
| `Ctrl+O` | быстрый переход в заметках | то же |
| `Ctrl+B` | закладки страниц в PDF | — |
| `Ctrl+S` / `Ctrl+E` | сохранить `.md` / переключить просмотр и текст | то же |

В Chromium-браузерах клавиши меняются на странице `chrome://extensions/shortcuts`.

### Установка: Firefox

1. Скачайте **`Hand-Design-Setup-v<версия>.exe`** со страницы [Releases](https://github.com/WiWaSu/Hand-Design---browsers-redesign-/releases) и запустите.
2. Разрешите права администратора. Они нужны один раз, чтобы положить загрузчик в папку браузера.
3. Выберите тему, обои, акцент, скругления, анимации и браузеры, нажмите «Установить».
4. Перезапустите браузер.

> [!NOTE]
> Если SmartScreen пишет «Система Windows защитила ваш компьютер», нажмите «Подробнее» → «Выполнить в любом случае»: у файла нет платной цифровой подписи.

Без `.exe`: скачайте `Hand-Design-v<версия>.zip`, распакуйте и запустите `Setup.cmd`. Если скачали весь репозиторий (Code → Download ZIP), файлы лежат в папке `firefox`. Консольный вариант: `install.cmd`.

**Обновление.** Запустите новый установщик и нажмите «Обновить до v&lt;версия&gt;». Обновятся только профили, где Hand Design уже стоит; тема, акцент, язык, обои и остальные настройки останутся. В консоли то же делает `update.cmd`.

**После большого обновления браузера** загрузчик в папке программы может пропасть. Если исчезли кнопки на панели или функции PDF, запустите `Setup.cmd` ещё раз.

**Удаление.** `Setup.cmd` → «Удалить оформление» или `uninstall.cmd`. Ваши собственные стили в `userChrome.css` / `userContent.css` остаются.

В настройках браузера оставьте встроенную тему «Системная тема — авто».

### Установка: Chromium

1. Скачайте **`Hand-Design-Chromium-v<версия>.zip`** со страницы [Releases](https://github.com/WiWaSu/Hand-Design---browsers-redesign-/releases) и распакуйте.
2. Запустите `Setup.cmd`, выберите язык, тему, обои, акцент и браузеры, нажмите «Установить».
3. Браузер откроет страницу расширений. Включите «Режим разработчика», нажмите «Загрузить распакованное», вставьте путь (`Ctrl+V`) и выберите папку.
4. Только для Edge, Opera и Яндекса: ещё раз «Загрузить распакованное», папка `frame`. В Chrome, Brave и Chromium вкладки и адресная строка красятся сами.

Chrome не даёт программам ставить расширения в обход магазина, поэтому шаги 3 и 4 делаются руками, один раз. Обновление: запустите новый установщик и нажмите ⟳ на карточке Hand Design. Подробно в [chrome/README.md](chrome/README.md).

Неофициальный проект, с Mozilla, Google, Microsoft и создателями других браузеров не связан. Используйте на свой страх и риск. Лицензия MIT.
