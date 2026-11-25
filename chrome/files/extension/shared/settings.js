/* Настройки Hand Design for Chrome.
   В chrome.storage.local (ключ "hd") лежат только изменённые значения — остальное берётся из DEFAULTS.
   Тот же набор ключей понимает установщик (settings.json рядом с manifest.json). */
import { THEME_IDS } from "./themes.js";
import { WALLS } from "./walls.js";
import { T } from "./i18n.js";

export const KEY = "hd";
export const VERSION = chrome.runtime.getManifest().version;

export const DEFAULTS = {
  theme: "oneui",
  mode: "auto", // auto | light | dark — для тем со светлым и тёмным вариантом
  lang: "",
  sysAccent: "#4C9AFF", // акцент Windows: его записывает установщик
  square: false,
  wall: "theme",
  wallDim: 15,
  wallBlur: 0,
  wallLive: true,
  clockPos: "top",
  showDate: true,
  clockFont: "ui",
  search: true,
  searchWidth: 50,
  tiles: true,
  motion: "apple",
  speed: 1,
  font: "theme",
  fontSize: 14,
  showNowBar: true,
  showCallBar: true,
  switcher: true,
  switcherStyle: "ios",
  pdf: true,
  pdfPage: "auto",
  pdfUi: "auto",
  checkUpdates: true,
  startPage: true,
  searchSuggest: true,
  toolbar: true,
  autoFrame: true,
};

/* описание настроек для Studio (тип, границы, подписи) */
export function schema() {
  return [
    { group: "colors", title: T("Цвета", "Colors"), items: [
      { key: "lang", type: "select", label: "Язык / Language", hint: T("«Как в браузере» — язык интерфейса Chrome", "“Browser” follows the Chrome interface language"), options: [["", T("Как в браузере", "Browser")], ["ru", "Русский"], ["en", "English"]] },
      { key: "autoFrame", type: "bool", label: T("Красить верх браузера", "Paint the browser frame"), hint: T("Вкладки и адресная строка Chrome, Brave, Chromium — в цвет темы, сами при каждой смене. Из-за этого в меню браузера написано «Управляется вашей организацией»: это только цвет, браузером никто не управляет. Выключите — надпись пропадёт", "Chrome, Brave, Chromium tabs and address bar follow the theme automatically. Because of this the browser menu says “Managed by your organization” — it is only the color. Turn off to remove it") },
      { key: "accent", type: "color", label: T("Акцент", "Accent"), hint: T("Кнопки, выделение, ползунки — на новой вкладке, в панелях, PDF", "Buttons, selection, sliders — new tab, panels, PDF") },
      { key: "frame", type: "color", label: T("Фон страниц", "Page background"), hint: T("Studio, PDF, окно переключения вкладок", "Studio, PDF, tab switcher") },
      { key: "bar", type: "color", label: T("Карточки и поля", "Cards and fields") },
      { key: "ink", type: "color", label: T("Текст", "Text") },
    ] },
    { group: "mode", title: T("Светлая или тёмная", "Light or dark"), items: [
      { key: "mode", type: "select", label: T("Оформление", "Appearance"), hint: T("Для тем, у которых есть оба варианта (One UI, iOS, Material, Windows 11, macOS…)", "For themes with both variants (One UI, iOS, Material, Windows 11, macOS…)"),
        options: [["auto", T("Как в Windows", "Like Windows")], ["light", T("Светлая", "Light")], ["dark", T("Тёмная", "Dark")]] },
    ] },
    { group: "shape", title: T("Форма", "Shape"), items: [
      { key: "radius", type: "range", label: T("Скругление карточек", "Card rounding"), min: 0, max: 36, step: 1, unit: "px" },
      { key: "rItem", type: "range", label: T("Скругление кнопок и пунктов", "Button rounding"), min: 0, max: 24, step: 1, unit: "px" },
    ] },
    { group: "newtab", title: T("Новая вкладка", "New tab"), items: [
      { key: "wallDim", type: "range", label: T("Затемнение обоев", "Wallpaper dimming"), min: 0, max: 70, step: 5, unit: "%" },
      { key: "wallBlur", type: "range", label: T("Размытие обоев", "Wallpaper blur"), min: 0, max: 40, step: 2, unit: "px" },
      { key: "wallLive", type: "bool", label: T("Живые обои", "Animated wallpaper"), hint: T("Медленное движение фона (если тема это умеет)", "Slow background motion (if the theme supports it)") },
      { key: "clockPos", type: "select", label: T("Где часы", "Clock"), options: [["top", T("Сверху", "Top")], ["center", T("По центру", "Center")], ["corner", T("В углу", "Corner")], ["hidden", T("Скрыть", "Hide")]] },
      { key: "clockSize", type: "range", label: T("Размер часов", "Clock size"), min: 40, max: 240, step: 4, unit: "px" },
      { key: "clockWeight", type: "range", label: T("Толщина цифр", "Digit weight"), min: 100, max: 900, step: 100 },
      { key: "clockFont", type: "select", label: T("Шрифт часов", "Clock font"), options: [["ui", T("Как в теме", "Theme")], ["serif", T("С засечками", "Serif")], ["mono", T("Моноширинный", "Mono")], ["rounded", T("Округлый", "Rounded")]] },
      { key: "showDate", type: "bool", label: T("Дата у часов", "Show date") },
      { key: "search", type: "bool", label: T("Строка поиска", "Search box"), hint: T("Ищет поисковиком, выбранным в браузере", "Uses the browser's search engine") },
      { key: "searchSuggest", type: "bool", label: T("Подсказки поисковика", "Search suggestions"), hint: T("Кроме истории поиска — подсказки Google по мере ввода", "Besides search history — Google suggestions as you type") },
      { key: "searchWidth", type: "range", label: T("Ширина поиска", "Search width"), min: 30, max: 90, step: 5, unit: "%" },
      { key: "tiles", type: "bool", label: T("Ярлыки сайтов", "Site shortcuts"), hint: T("Самые посещаемые сайты", "Most visited sites") },
      { key: "toolbar", type: "bool", label: T("Панель Gmail и инструментов", "Gmail and tools bar"), hint: T("Сверху справа: Gmail, Картинки, приложения Google, история, загрузки, закладки, настройки Chrome", "Top right: Gmail, Images, Google apps, Chrome history, downloads, bookmarks, settings") },
      { key: "startPage", type: "bool", label: T("Открывать при запуске браузера", "Open on browser start"), hint: T("Стартовая страница Google при запуске заменяется на новую вкладку Hand Design", "The Google start page at launch is replaced with the Hand Design new tab") },
    ] },
    { group: "ctrltab", title: T("Переключатель вкладок", "Tab switcher"), items: [
      { key: "switcher", type: "bool", label: T("Окно с превью вкладок", "Tab preview window"), hint: T("Alt+Q — по недавно открытым вкладкам, с миниатюрами. Клавиши меняются на странице chrome://extensions/shortcuts", "Alt+Q — recent tabs with thumbnails. Change keys at chrome://extensions/shortcuts") },
      { key: "switcherStyle", type: "cards", label: T("Стиль", "Style"), options: [
        ["ios", "iOS", T("Большие карточки на размытом фоне", "Big cards on blur")],
        ["windows", "Windows 11", T("Как Alt+Tab: акрил и рамка", "Like Alt+Tab: acrylic and frame")],
        ["list", T("Список", "List"), T("Только названия, без миниатюр", "Titles only")],
        ["neon", T("Неон", "Neon"), T("Тёмный, выбранная светится", "Dark, selected glows")],
      ] },
    ] },
    { group: "font", title: T("Шрифт", "Font"), items: [
      { key: "font", type: "select", label: T("Шрифт страниц", "Page font"), options: [["theme", T("Как в теме", "Theme")], ["segoe", "Segoe UI"], ["inter", "Inter"], ["roboto", "Roboto"], ["system", T("Системный", "System")], ["mono", T("Моноширинный", "Mono")], ["custom", T("Свой…", "Custom…")]] },
      { key: "fontCustom", type: "text", label: T("Свой шрифт", "Custom font"), hint: T("Название шрифта, установленного в Windows", "Name of a font installed in Windows") },
      { key: "fontSize", type: "range", label: T("Размер текста", "Text size"), min: 11, max: 18, step: 0.5, unit: "px" },
    ] },
    { group: "motion", title: T("Анимации", "Motion"), items: [
      { key: "motion", type: "select", label: T("Характер", "Style"), options: [["apple", T("Как в iOS", "Like iOS")], ["smooth", T("Плавные", "Smooth")], ["system", T("Как в Windows", "Like Windows")], ["off", T("Выключены", "Off")]] },
      { key: "speed", type: "range", label: T("Длительность", "Duration"), min: 0.3, max: 2, step: 0.1, unit: "×" },
    ] },
    { group: "islands", title: T("Плашки", "Islands"), items: [
      { key: "showNowBar", type: "bool", label: "Now Bar", hint: T("Музыка и видео из другой вкладки: пауза, следующий трек, перейти", "Media from another tab: pause, next, jump to tab") },
      { key: "showCallBar", type: "bool", label: T("Плашка звонка", "Call bar"), hint: T("Звонок в другой вкладке: таймер, микрофон и камера. Alt+Shift+M — микрофон", "Call in another tab: timer, mic and camera. Alt+Shift+M — mic") },
    ] },
    { group: "pdf", title: "PDF", items: [
      { key: "pdf", type: "bool", label: T("Свой просмотрщик PDF", "Hand Design PDF viewer"), hint: T("Темы, рисование, надписи, выделение и сохранение. Для файлов с компьютера включите «Разрешить доступ к URL файлов» в карточке расширения", "Themes, drawing, text, highlights and saving. For local files enable “Allow access to file URLs” on the extension card") },
      { key: "pdfPage", type: "select", label: T("Тон страниц", "Page tone"), options: [["auto", T("Как в теме", "Theme")], ["paper", T("Бумага", "Paper")], ["sepia", T("Сепия", "Sepia")], ["night", T("Ночь", "Night")]] },
      { key: "pdfUi", type: "select", label: T("Интерфейс просмотрщика", "Viewer interface"), options: [["auto", T("Как в теме", "Theme")], ["light", T("Светлый", "Light")], ["dark", T("Тёмный", "Dark")]] },
    ] },
    { group: "update", title: T("Обновления", "Updates"), items: [
      { key: "checkUpdates", type: "bool", label: T("Проверять обновления", "Check for updates"), hint: T("Раз в сутки смотрит latest.json на github.com/WiWaSu/Hand-Design---browsers-redesign-. Ничего не скачивает", "Checks latest.json on github.com/WiWaSu/Hand-Design---browsers-redesign- once a day. Downloads nothing") },
    ] },
  ];
}

/* Готовые наборы: меняют сразу много настроек */
export function presets() {
  return [
    ["clean", T("Чистый", "Clean"), { radius: 14, rItem: 8, motion: "smooth", wallLive: false, switcherStyle: "windows" }],
    ["bubble", T("Пузыри", "Bubbles"), { radius: 30, rItem: 18, motion: "apple", speed: 1.1 }],
    ["glass", T("Стекло", "Glass"), { radius: 26, rItem: 14, motion: "apple", switcherStyle: "ios", wallBlur: 0 }],
    ["sharp", T("Острый", "Sharp"), { radius: 0, rItem: 0, motion: "system", speed: 0.7, switcherStyle: "list" }],
    ["neon", T("Неон", "Neon"), { accent: "#00E5FF", frame: "#05060A", bar: "#0B0D14", switcherStyle: "neon" }],
    ["focus", T("Тишина", "Focus"), { tiles: false, showDate: false, clockPos: "center", wallDim: 35, wallLive: false }],
  ];
}

const COLOR = /^#[0-9a-fA-F]{6}$/;
const FONT_TEXT = /^[\p{L}\p{N} ._-]{1,60}$/u;
const ALLOWED = {
  theme: v => THEME_IDS.includes(v),
  mode: v => ["auto", "light", "dark"].includes(v),
  lang: v => ["", "ru", "en"].includes(v),
  sysAccent: v => COLOR.test(v),
  square: v => typeof v === "boolean",
  wall: v => v === "theme" || v === "custom" || WALLS.some(w => w[0] === v),
};

/* оставить только известные ключи с правильными значениями */
export function sanitize(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") {
    return out;
  }
  for (const [k, test] of Object.entries(ALLOWED)) {
    if (raw[k] !== undefined && test(raw[k])) {
      out[k] = k === "sysAccent" ? raw[k].toUpperCase() : raw[k];
    }
  }
  for (const g of schema()) {
    for (const it of g.items) {
      const v = raw[it.key];
      if (v === null || v === undefined || v === "") {
        continue;
      }
      if (it.type === "color" && typeof v === "string" && COLOR.test(v)) {
        out[it.key] = v.toUpperCase();
      } else if (it.type === "range" && typeof v === "number" && isFinite(v)) {
        out[it.key] = Math.min(it.max, Math.max(it.min, v));
      } else if ((it.type === "select" || it.type === "cards") && it.options.some(o => o[0] === v)) {
        out[it.key] = v;
      } else if (it.type === "bool" && typeof v === "boolean") {
        out[it.key] = v;
      } else if (it.type === "text" && typeof v === "string" && FONT_TEXT.test(v.trim())) {
        out[it.key] = v.trim();
      }
    }
  }
  return out;
}

export async function loadRaw() {
  try {
    const got = await chrome.storage.local.get(KEY);
    return sanitize(got[KEY] || {});
  } catch {
    return {};
  }
}
export async function load() {
  return { ...DEFAULTS, ...(await loadRaw()) };
}
export async function saveRaw(raw) {
  await chrome.storage.local.set({ [KEY]: sanitize(raw) });
}
/* поменять несколько ключей; null — вернуть значение по умолчанию */
export async function patch(changes) {
  const raw = await loadRaw();
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === undefined) {
      delete raw[k];
    } else {
      raw[k] = v;
    }
  }
  await saveRaw(raw);
  return { ...DEFAULTS, ...sanitize(raw) };
}
export function onChange(cb) {
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === "local" && ch[KEY]) {
      cb({ ...DEFAULTS, ...sanitize(ch[KEY].newValue || {}) });
    }
  });
}

/* своя картинка для обоев: data:-адрес в storage (разрешение unlimitedStorage) */
export async function customWall() {
  try {
    const got = await chrome.storage.local.get("hdWall");
    return got.hdWall || null;
  } catch {
    return null;
  }
}
