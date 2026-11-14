/* Рамка браузера (вкладки, адресная строка) красится тема-пакетом — у Chrome нет API, чтобы
   расширение меняло её само. Установщик кладёт 31 пакет в папку themes; тут — путь к нужному. */
import { themeById, schemeOf } from "./apply.js";
import { T } from "./i18n.js";

export function packId(s) {
  const t = themeById(s.theme);
  const light = t.scheme === "both" && schemeOf(t, s) === "light";
  return t.id + (light ? "-light" : "");
}

/* показать шаги в элементе box; вернуть путь (или null) */
export async function paintFrame(s, box, mk) {
  const id = packId(s);
  const { hdInstallDir } = await chrome.storage.local.get("hdInstallDir");
  box.hidden = false;
  box.replaceChildren();
  // Chrome, Brave, Chromium: красит помощник Hand Design сам (политика цвета) — ничего загружать не нужно
  if (s.autoFrame !== false) {
    const top = await chrome.runtime.sendMessage({ hd: "paint-top" }).catch(() => null);
    if (top && top.ok && top.on) {
      box.append(mk("div", "", T("Верх браузера красится сам — уже в цвете темы. Если цвет не сменился, подождите пару секунд.",
        "The browser frame is painted automatically and already matches the theme. If it hasn't changed, wait a couple of seconds.")));
      return null;
    }
  }
  if (hdInstallDir) {
    const path = `${hdInstallDir}\\themes\\${id}`;
    try {
      await navigator.clipboard.writeText(path);
    } catch {}
    box.append(
      mk("div", "", T("Путь к теме скопирован:", "Theme path copied:")),
      mk("code", "", path),
      mk("div", "", T("Сейчас откроется страница расширений: «Загрузить распакованное» → Ctrl+V → «Выбрать папку». Прежняя тема рамки заменится сама.",
        "The extensions page will open: “Load unpacked” → Ctrl+V → “Select folder”. The previous frame theme is replaced automatically."))
    );
    setTimeout(() => chrome.tabs.create({ url: "chrome://extensions/" }), 1400);
    return path;
  }
  box.append(
    mk("div", "", T("Запустите Setup.cmd из папки Hand Design for Chrome и выберите тему — установщик подготовит рамку. Или загрузите вручную папку:",
      "Run Setup.cmd from the Hand Design for Chrome folder and pick the theme — the installer prepares the frame. Or load this folder manually:")),
    mk("code", "", `files\\themes\\${id}`)
  );
  return null;
}
