# Security and permissions

Hand Design changes how the browser looks and adds features (Studio, Now Bar, notes, PDF and Markdown tools). To do that, the Firefox edition loads its own scripts into the browser with full browser privileges, and the Chromium edition is an extension with broad permissions. This file lists every privileged thing the project does, where in the code it happens, and how to undo it. Every claim can be checked in the source: all of it is plain text in this repository.

If you check the project with an AI assistant, give it this file together with the code it points to.

[По-русски](#по-русски)

## Firefox edition

### Why the installer asks for administrator rights

Only to copy two files into the browser's program folder, because Firefox reads AutoConfig only from there:

- `config.js` → `<browser folder>\config.js`
- `config-prefs.js` → `<browser folder>\defaults\pref\config-prefs.js`

See `Install-Loader` in [firefox/files/installer.ps1](firefox/files/installer.ps1). Everything else goes into your user profile and needs no admin rights. If the folder already has someone else's `config.js`, the loader is appended between `FLOORP-MODERN LOADER BEGIN/END` markers instead of replacing the file, and only that block is removed on uninstall (`Remove-Loader`).

### What the loader does

[firefox/files/config.js](firefox/files/config.js), about 50 lines:

1. Maps `resource://pdftweaks/` and `resource://handdesign/` to `<profile>\chrome\pdf-tweaks\`.
2. Registers window actors for the PDF viewer, Markdown, notes and the new tab.
3. Loads `floorp-modern.uc.js` into each browser window.

It downloads nothing and runs only files the installer put into your profile. `config-prefs.js` turns off the AutoConfig sandbox (`general.config.sandbox_enabled = false`), which these APIs require. The consequence: files in `<profile>\chrome\pdf-tweaks\` run with full browser privileges. This is the same trust model as any `userChrome.js` setup. A program that can already write to your profile could place code there, so the folder is as safe as your user account.

### Network

| When | Where | What is sent |
|---|---|---|
| Once per browser start, if Studio → System → "Check at startup" is on (default on) | `raw.githubusercontent.com/WiWaSu/Hand-Design---browsers-redesign-/…/latest.json`, then `api.github.com/repos/WiWaSu/Hand-Design---browsers-redesign-/releases` | A plain GET without cookies (`credentials: "omit"`). The answer only shows a "new version" notice. Nothing is downloaded or run. [FloorpModernUpdate.sys.mjs](firefox/files/pdf-tweaks/FloorpModernUpdate.sys.mjs) |
| You choose "Edit image" on a picture on a web page | The URL of that picture | The same request the page already made for it. [FloorpPdfTweaksParent.sys.mjs](firefox/files/pdf-tweaks/FloorpPdfTweaksParent.sys.mjs), `#image` |
| A weather widget is on the Hand Design new tab | `geocoding-api.open-meteo.com`, `api.open-meteo.com` | The city you typed, then its coordinates. At most once per 30 minutes per city. |
| An exchange rates widget is on the new tab | `open.er-api.com` | The base currency. At most once per 6 hours. |
| An RSS widget is on the new tab | The feed address you typed (https only) | A plain GET. At most once per 20 minutes. |
| A custom widget calls `hd.fetch` | Only the https addresses the widget declared, shown to you before you add it | A plain GET without cookies, up to 1 MB. |

All widget requests are made by the browser process in [HandDesignNewtabParent.sys.mjs](firefox/files/pdf-tweaks/HandDesignNewtabParent.sys.mjs). It checks that the address belongs to a widget you added. There is no telemetry, analytics or crash reporting, and no other host is contacted. Links to GitHub open in a tab only when you click them.

### Custom widgets

A custom widget is an `.html` file you paste or open on the Hand Design new tab. It runs in an `<iframe sandbox="allow-scripts">` with an opaque origin and a Content Security Policy that blocks all network access (`connect-src` and `default-src 'none'`). So it cannot touch the page, the browser, cookies, other sites' data or your files, and cannot go online by itself. It talks to Hand Design only through `postMessage`, and only four calls exist: read its own settings, keep up to 64 KB of its own data, fetch from the addresses it declared, open a web link in a new tab. See `srcdoc()` and the `message` handler in [HandDesignNewtab.sys.mjs](firefox/files/pdf-tweaks/HandDesignNewtab.sys.mjs). The code is stored in `<profile>\hd-widgets\` and is deleted together with the widget.

### Files

- In the profile `chrome\` folder:
  - our blocks inside `userChrome.css` and `userContent.css`, between markers, with a `.bak-floorp-modern` backup of the original;
  - the `pdf-tweaks\` folder;
  - three small text files (version, theme, installer settings);
  - our prefs inside `user.js`, between markers.
- The Markdown, CSV and image editors read and write only files you opened yourself: through a file dialog, a double-click on a file, or dragging it into the window. The parent actor accepts a path only if it is in that "opened by you" list (`#csv`, `#image`, `#docs` in [FloorpPdfTweaksParent.sys.mjs](firefox/files/pdf-tweaks/FloorpPdfTweaksParent.sys.mjs)).
- Notes live only in the folder you pick. A deleted note goes to `.trash` inside that folder.
- The Hand Design new tab keeps its layout in the `floorp.modern.widgets` pref, and custom widgets and pictures in `<profile>\hd-widgets\`. The note widget can read notes and tick tasks only inside your notes folder.

### Registry

Only the optional "Open .md, .csv and .pdf with the browser" entries (`Set-FileTypes` in the installer):

- `HKCU\Software\Classes\HandDesign.md|csv|pdf`
- `OpenWithProgids` values for those extensions
- `HKCU\Software\HandDesign\Capabilities`
- one value in `HKCU\Software\RegisteredApplications`

This does not change your default apps. You choose them yourself in Windows Settings. Uninstall removes every entry (`Remove-FileTypes`). Nothing is written to `HKLM`.

### Passwords

The compact password window reads Firefox's own password storage (`Services.logins`). Before it shows or copies a password it asks for the same Windows sign-in Firefox asks for (`LoginHelper.requestReauth` in [floorp-modern.uc.js](firefox/files/pdf-tweaks/floorp-modern.uc.js)). The optional primary password is Firefox's own (NSS). Passwords are never written anywhere else and never leave the browser.

### Scripts inside web pages

On a short list of sites (Telegram, VK, OK, Yandex Music, Zvuk, SoundCloud, Discord, WhatsApp) Hand Design wraps `HTMLMediaElement.prototype.play`. This lets Now Bar find players created with `new Audio()` and pause them (`#trackMedia` in [FloorpPdfTweaksChild.sys.mjs](firefox/files/pdf-tweaks/FloorpPdfTweaksChild.sys.mjs)). It does not read page content and sends nothing anywhere.

### Uninstall

Run the installer and choose "Remove theme", or run `uninstall.cmd`. This removes the loader files, our CSS blocks, our prefs and the registry entries.

## Chromium edition

A Manifest V3 extension ([chrome/files/extension/manifest.json](chrome/files/extension/manifest.json)). Permissions and what each is used for:

| Permission | Used for |
|---|---|
| `<all_urls>` and content scripts | Now Bar and the call bar have to see players and `getUserMedia` tracks in any tab. `content/page-hook.js` runs in the page and talks only to the extension through `postMessage`. |
| `webRequest` | Reads response headers of top-level pages to open PDFs in its viewer. It does not block or change requests. |
| `downloads` | Opens a `.csv` you are downloading in the table editor instead of saving it. |
| `history`, `topSites`, `search`, `favicon` | New tab suggestions and tiles. History is deleted only when you remove a suggestion yourself. |
| `nativeMessaging` | Optional helper ([chrome/files/host/hd-host.ps1](chrome/files/host/hd-host.ps1)). It sets the `BrowserThemeColor` policy in `HKCU` so the browser's top bar takes the theme color. The `clear` command removes it. |
| `scripting` | Adds the same content scripts to tabs that were already open at install time. |
| `storage`, `unlimitedStorage`, `alarms`, `contextMenus`, `tabs` | Settings, notes, a daily update check against GitHub, menu items, tab switching. |

## Checking it yourself

- Every network call: search the code for `fetch(`.
- The installer is a readable PowerShell script. The `.exe` is the same files packed by `firefox/build-exe.bat` and `firefox/tools/setup-exe.cs`. If you would rather not run an unsigned `.exe`, download the `.zip` and run `Setup.cmd`.
- The Windows SmartScreen warning appears because the `.exe` is not signed with a paid certificate, not because of anything it does.

## Reporting a problem

Open an issue on GitHub. For anything sensitive, write in the issue that you have a security report and how to reach you.

---

## По-русски

Hand Design меняет вид браузера и добавляет функции. Для этого версия для Firefox загружает в браузер свои скрипты с полными правами браузера, а версия для Chromium — это расширение с широкими разрешениями. Ниже всё, что проект делает с этими правами, где это в коде и как убрать. Весь код открыт и лежит в этом репозитории. Если проверяете проект нейросетью, дайте ей этот файл вместе с кодом.

**Права администратора** нужны только чтобы положить два файла в папку браузера: `config.js` и `defaults\pref\config-prefs.js`. Только оттуда Firefox читает AutoConfig. Остальное ставится в профиль без прав администратора. Чужой `config.js` не перезаписывается: наш загрузчик дописывается между метками и при удалении убирается только он.

**Загрузчик** (`config.js`, около 50 строк) подключает папку `<профиль>\chrome\pdf-tweaks\` и загружает скрипты из неё в окна браузера. Сам он ничего не скачивает. Песочница AutoConfig выключена, без этого нужные функции браузера недоступны. Поэтому всё в этой папке работает с полными правами браузера, как в любой сборке с `userChrome.js`.

**Сеть:**
- Раз за запуск, если в Studio включено «Проверять при запуске», браузер смотрит на GitHub (`raw.githubusercontent.com` и `api.github.com`), есть ли новая версия. Запрос идёт без cookies, в ответ показывается только уведомление. Ничего не скачивается и не запускается.
- Когда вы выбираете «Редактировать картинку», браузер ещё раз загружает эту картинку.

- Виджеты новой вкладки Hand Design, только если вы их добавили:
  - погода — Open-Meteo (город, потом его координаты), не чаще раза в 30 минут;
  - курсы — open.er-api.com, не чаще раза в 6 часов;
  - RSS — адрес ленты, который вы ввели.

Больше никуда запросов нет: ни телеметрии, ни статистики.

**Свои виджеты.** Свой виджет работает в изолированной рамке (`sandbox`). Сам ходить в интернет ему запрещено правилами безопасности рамки. До страницы, браузера, cookies и файлов он не дотягивается. Hand Design даёт ему только четыре вещи: его настройки, хранилище до 64 КБ, запросы к адресам, которые он объявил (вы видите их до добавления), и открытие ссылки на сайт в новой вкладке. Код хранится в `<профиль>\hd-widgets\` и удаляется вместе с виджетом.

**Файлы.** В папку `chrome` профиля пишутся:
- наши блоки в `userChrome.css` и `userContent.css` с резервной копией;
- папка `pdf-tweaks`;
- наши настройки в `user.js`.

Редакторы Markdown, CSV и картинок открывают только файлы, которые вы открыли сами. Заметки лежат только в выбранной вами папке.

**Реестр.** Только необязательный пункт «Открывать .md, .csv и .pdf в браузере», и только в `HKCU`. Приложения по умолчанию он не меняет: их вы выбираете сами в Параметрах Windows. При удалении записи убираются. В `HKLM` не пишется ничего.

**Пароли.** Окно паролей берёт их из хранилища самого Firefox. Перед показом или копированием, как и Firefox, просит вход Windows. Основной пароль — это пароль самого Firefox. Пароли никуда не записываются и из браузера не уходят.

**Скрипты на сайтах.** На Telegram, VK, OK, Яндекс Музыке, Звуке, SoundCloud, Discord и WhatsApp Hand Design перехватывает запуск плееров, чтобы Now Bar мог их ставить на паузу. Содержимое страниц не читается и никуда не отправляется.

**Версия для Chromium.** Зачем расширению каждое разрешение, сказано в таблице выше.

**Удаление.** Установщик → «Удалить оформление» или `uninstall.cmd`. Убираются загрузчик, наши стили, настройки и записи в реестре.

**Проверить самому.** Все сетевые запросы находятся поиском `fetch(` по коду. Установщик — обычный скрипт PowerShell. Предупреждение SmartScreen появляется потому, что у `.exe` нет платной подписи. Если не хотите запускать `.exe`, скачайте `.zip` и запустите `Setup.cmd`.
