/* Hand Design — языки.
 *
 *  - язык хранится в pref "floorp.modern.lang" (auto | ru | en | uk | de | fr | es | pt | pl | tr | zh),
 *    его ставит установщик и меняет Studio;
 *  - исходные строки в коде — русские, они же ключи словаря: t("Тема") → "Theme";
 *  - словари лежат в l10n/<код>.sys.mjs (export default { "русская строка": "перевод" });
 *    чего нет в словаре — берётся из английского, потом остаётся по-русски;
 *  - {0}, {1} … в строке заменяются аргументами: t("Стр. {0} в закладках", 5).
 */

export const LANG_PREF = "floorp.modern.lang";
export const LANGS = [
  ["ru", "Русский"], ["en", "English"], ["uk", "Українська"], ["de", "Deutsch"], ["fr", "Français"],
  ["es", "Español"], ["pt", "Português"], ["pl", "Polski"], ["tr", "Türkçe"], ["zh", "中文"],
];
const CODES = LANGS.map(l => l[0]);

function systemLang() {
  try {
    return String(Services.locale.appLocaleAsBCP47 || "");
  } catch {}
  try {
    return String(globalThis.navigator?.language || "");
  } catch {}
  return "en";
}

/* "auto" или код → код из списка (по умолчанию английский) */
export function pickLang(v) {
  v = String(v || "auto").toLowerCase();
  if (v === "auto") {
    v = systemLang().toLowerCase();
    if (v.startsWith("be")) v = "ru";
  }
  v = v.slice(0, 2);
  return CODES.includes(v) ? v : "en";
}

let forced = "";
/* значение pref как есть: auto или код */
export function langSetting() {
  try {
    return Services.prefs.getStringPref(LANG_PREF, "auto") || "auto";
  } catch {
    return "auto";
  }
}
export function currentLang() {
  return forced || pickLang(langSetting());
}
export function setLang(v) {
  v = String(v || "auto");
  if (v !== "auto" && !CODES.includes(v)) return;
  Services.prefs.setStringPref(LANG_PREF, v);
}

const cache = new Map();
function loadDict(code) {
  if (code === "ru") return {};
  if (cache.has(code)) return cache.get(code);
  let d = {};
  try {
    d = ChromeUtils.importESModule(`resource://pdftweaks/l10n/${code}.sys.mjs`).default || {};
  } catch {
    d = {};
  }
  cache.set(code, d);
  return d;
}

let lang = "";
let dict = null;
function ensure() {
  const l = currentLang();
  if (l !== lang || !dict) {
    lang = l;
    if (l === "ru") {
      dict = {};
    } else if (l === "en") {
      dict = loadDict("en");
    } else {
      dict = { ...loadDict("en"), ...loadDict(l) };
    }
  }
}

/* для страниц без прав браузера (Studio как resource://): язык и словари передаются явно */
export function useDicts(code, en, own) {
  forced = CODES.includes(code) ? code : "en";
  lang = forced;
  dict = forced === "ru" ? {} : { ...(en || {}), ...(forced === "en" ? {} : own || {}) };
}

export function t(s, ...args) {
  s = String(s);
  try {
    ensure();
  } catch {
    dict = dict || {};
  }
  let r = (dict && dict[s]) || s;
  if (args.length) r = r.replace(/\{(\d)\}/g, (m, i) => (args[i] ?? "") + "");
  return r;
}
