/* Язык интерфейса: 10 языков, как в Firefox-версии.
   В коде строки парами T("по-русски", "in English"). Для остальных языков перевод берётся
   из общего словаря l10n/<код>.sys.mjs по русской строке, чего нет — по-английски.
   {0}, {1} в строке заменяются аргументами: T("Версия {0}", "Version {0}", v).
   Словари грузит setLang() (await); в фоновом service worker без него — русский или английский. */
export const LANGS = [
  ["ru", "Русский"], ["en", "English"], ["uk", "Українська"], ["de", "Deutsch"], ["fr", "Français"],
  ["es", "Español"], ["pt", "Português"], ["pl", "Polski"], ["tr", "Türkçe"], ["zh", "中文"],
];
const CODES = LANGS.map(l => l[0]);

function browserLang() {
  return String(globalThis.chrome?.i18n?.getUILanguage?.() || globalThis.navigator?.language || "en").toLowerCase();
}
export function pickLang(v) {
  v = String(v || "").toLowerCase();
  if (!v || v === "auto") {
    v = browserLang();
    if (/^(be|kk)/.test(v)) v = "ru";
  }
  v = v.slice(0, 2);
  return CODES.includes(v) ? v : "en";
}

let code = "en";
try {
  code = pickLang(localStorage.getItem("hd-lang") || "");
} catch {
  code = pickLang("");
}
let en = {};
let own = {};

const fmt = (s, a) => (a.length ? String(s).replace(/\{(\d)\}/g, (m, i) => (a[i] ?? "") + "") : s);

export const T = (r, e, ...a) => fmt(code === "ru" ? r : code === "en" ? e ?? en[r] ?? r : own[r] ?? e ?? en[r] ?? r, a);
/* для общих приложений (заметки, картинки, CSV): только русская строка-ключ */
export const t = (r, ...a) => fmt(code === "ru" ? r : own[r] ?? en[r] ?? r, a);
export const lang = () => code;
export const isRu = () => code === "ru";

async function load(c) {
  if (c === "ru") {
    en = {};
    own = {};
    return;
  }
  en = (await import("../l10n/en.sys.mjs")).default || {};
  own = c === "en" ? {} : (await import(`../l10n/${c}.sys.mjs`)).default || {};
}

/* "" — как в браузере. Возвращает true, если язык поменялся */
export async function setLang(v) {
  const next = pickLang(v);
  try {
    if (v && v !== "auto") localStorage.setItem("hd-lang", v);
    else localStorage.removeItem("hd-lang");
  } catch {}
  const changed = next !== code;
  if (changed || (next !== "ru" && !Object.keys(en).length)) {
    code = next;
    try {
      await load(next);
    } catch {
      en = {};
      own = {};
    }
  }
  if (globalThis.document) document.documentElement.lang = code;
  return changed;
}
