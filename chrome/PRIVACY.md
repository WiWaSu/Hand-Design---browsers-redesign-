# Hand Design for Chromium: privacy policy

Updated 2026-11-25.

Hand Design is a browser extension. It has no server and no account. The developer receives no data from it.

## What stays on your computer

- Settings, the chosen theme and a custom wallpaper are kept in the extension's local storage (`chrome.storage.local`).
- Notes and documents are files in folders you pick yourself. The extension reads and writes them through the browser's file access dialogs and nowhere else.
- Browsing history and top sites are read only to show tiles and suggestions on the new tab page. They are not copied or sent anywhere.
- Media and call state (what is playing, whether the microphone is on) is read from open tabs to show Now Bar and the call bar, and is kept only while the browser runs.

## What goes over the network

- When you type in the search box on the new tab page, the text goes to Google's suggestion service (`suggestqueries.google.com`) to show suggestions, as the browser's own address bar does. Pressing Enter searches with your default search engine.
- At each browser start and once a day the extension downloads `latest.json` from GitHub to check for a new version. It sends nothing about you.
- PDF files, images and CSV files you open are downloaded from the site you opened them on, as the browser would do.

## Optional Windows helper

The Hand Design installer for Windows can add a small helper. It sets the browser frame color through the `BrowserThemeColor` policy for the current Windows user and passes the settings you chose in the installer to the extension. It does not use the network.

## Contact

Questions and bug reports: https://github.com/WiWaSu/Hand-Design---browsers-redesign-/issues

---

# Политика конфиденциальности

Hand Design — расширение браузера без сервера и без аккаунта. Разработчик не получает от него никаких данных.

- Настройки, тема и свои обои хранятся в локальном хранилище расширения.
- Заметки и документы лежат в папках, которые вы выбрали сами.
- История и часто посещаемые сайты читаются только для плиток и подсказок на новой вкладке и никуда не отправляются.
- Состояние музыки и звонка читается из открытых вкладок для Now Bar и плашки звонка и живёт, пока открыт браузер.
- Текст из строки поиска на новой вкладке уходит в сервис подсказок Google (`suggestqueries.google.com`), как из адресной строки браузера.
- При запуске браузера и раз в сутки расширение скачивает с GitHub файл `latest.json`, чтобы проверить новую версию. О вас оно ничего не отправляет.
- Помощник для Windows из установщика красит рамку браузера политикой `BrowserThemeColor` и передаёт расширению настройки из установщика. В сеть он не ходит.

Вопросы и ошибки: https://github.com/WiWaSu/Hand-Design---browsers-redesign-/issues
