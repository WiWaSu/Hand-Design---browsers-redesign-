/* Язык интерфейса: ru или en. Установщик кладёт выбор в settings.json → storage (ключ hd.lang),
   до первой загрузки берём язык браузера. T("по-русски", "in English"). */
let ru = true;
try {
  const saved = localStorage.getItem("hd-lang");
  ru = saved ? saved === "ru" : /^ru|^uk|^be|^kk/i.test(navigator.language || "ru");
} catch {
  ru = /^ru/i.test(globalThis.navigator?.language || "ru");
}
export const T = (r, e) => (ru ? r : e);
export const isRu = () => ru;
export function setLang(lang) {
  // "" — как в браузере (язык интерфейса Chrome)
  if (lang !== "ru" && lang !== "en") {
    const ui = (globalThis.chrome?.i18n?.getUILanguage?.() || navigator.language || "ru").toLowerCase();
    lang = /^(ru|uk|be|kk)/.test(ui) ? "ru" : "en";
    try {
      localStorage.removeItem("hd-lang");
    } catch {}
  } else {
    try {
      localStorage.setItem("hd-lang", lang);
    } catch {}
  }
  const changed = ru !== (lang === "ru");
  ru = lang === "ru";
  document.documentElement.lang = lang;
  return changed;
}
