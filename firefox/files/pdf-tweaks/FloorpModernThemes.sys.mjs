/* Hand Design — смена темы прямо в браузере.
 *
 * Как это работает:
 *  - выбранная тема хранится в pref "floorp.modern.theme";
 *  - каждое окно и каждая страница браузера получают атрибут fm-theme="<id>"
 *    (окно — из floorp-modern.uc.js, страницы — из актора);
 *  - тема, вписанная в userChrome.css / userContent.css, работает, только пока
 *    fm-theme совпадает с ней (или атрибута ещё нет) — поэтому старая тема
 *    отключается сразу;
 *  - новая тема подключается «на лету» файлом themes/<id>-live.css;
 *  - заодно тема переписывается в userChrome.css / userContent.css, чтобы после
 *    перезапуска всё было как обычно и без мигания.
 */

export const PREF = "floorp.modern.theme";

/* группы для фильтра тем */
export const GROUPS = [
  ["all", "Все"], ["dark", "Тёмные"], ["light", "Светлые"], ["glass", "Стекло"], ["bright", "Яркие"], ["strict", "Строгие"], ["retro", "Ретро"],
];
/* id, название, цвета плитки: фон окна, панель, акцент, текст; группы */
export const THEMES = [
  ["oneui", "One UI", ["#0f1012", "#1c1d21", "#3e91ff", "#f2f3f5"], "dark"],
  ["ios", "iOS Liquid Glass", ["#05060b", "#1c1c1e", "#0a84ff", "#ffffff"], "glass light dark"],
  ["material", "Material You", ["#131418", "#1d2027", "#a8c7fa", "#e4e2e6"], "light dark"],
  ["fluent", "Windows 11", ["#202020", "#2b2b2b", "#4cc2ff", "#ffffff"], "light dark strict"],
  ["macos", "macOS", ["#1f1e23", "#2a292f", "#0a84ff", "#f5f5f7"], "light dark"],
  ["nothing", "Nothing", ["#000000", "#111111", "#d71921", "#ffffff"], "dark strict"],
  ["nightdrive", "Night Drive", ["#07080d", "#151822", "#ffb25b", "#eef0f6"], "dark glass"],
  ["aero", "Aero", ["#14223a", "#1e3255", "#2b7cd3", "#eaf2ff"], "glass retro"],
  ["retro", "Retro 98", ["#008080", "#c0c0c0", "#000080", "#000000"], "retro light"],
  ["terminal", "Terminal", ["#030603", "#081108", "#33ff66", "#5cff85"], "retro dark"],
  ["paper", "Paper", ["#efe9de", "#f8f4ec", "#b4532a", "#2b2622"], "light"],
  ["cyber", "Cyberpunk", ["#0b0912", "#15111f", "#fcee0a", "#f3f0ff"], "bright dark"],
  ["arctic", "Arctic", ["#eef3f9", "#ffffff", "#2f7df6", "#14202e"], "light"],
  ["sakura", "Sakura", ["#fbf0f3", "#fffafb", "#e0567f", "#3a1d27"], "light bright"],
  ["mint", "Mint", ["#eef7f3", "#fbfffd", "#16a37a", "#12302a"], "light"],
  ["latte", "Latte", ["#f2ebe3", "#fbf7f2", "#8b5e3c", "#33261c"], "light"],
  ["midnight", "Midnight", ["#0b1020", "#141a2e", "#6c8cff", "#e6eaff"], "dark glass"],
  ["fjord", "Fjord", ["#242b37", "#2e3644", "#88c0d0", "#e5e9f0"], "dark strict"],
  ["ember", "Ember", ["#1d1a17", "#282420", "#fe8019", "#ebdbb2"], "dark retro"],
  ["forest", "Forest", ["#0f1a13", "#17241b", "#7bc47f", "#e2efe3"], "dark"],
  ["ocean", "Ocean", ["#06161d", "#0d222b", "#22c3e6", "#dff6fb"], "dark glass"],
  ["rose", "Rosé", ["#191724", "#1f1d2e", "#ebbcba", "#e0def4"], "dark"],
  ["synthwave", "Synthwave", ["#140a24", "#1f1033", "#ff4fd8", "#fbeaff"], "bright dark retro"],
  ["contrast", "High Contrast", ["#000000", "#000000", "#ffe600", "#ffffff"], "dark strict bright"],
];
const IDS = THEMES.map(t => t[0]);

export function nameOf(id) {
  return (THEMES.find(t => t[0] === id) || THEMES[0])[1];
}

function chromeDir() {
  return Services.dirsvc.get("UChrm", Ci.nsIFile).path;
}
function themesDir() {
  return PathUtils.join(chromeDir(), "pdf-tweaks", "themes");
}
function sss() {
  return Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
}

/* тема, которая была вписана в файлы при запуске браузера */
let baked = null;
let liveSheet = null;
let liveId = "";
let started = false;
const log = [];

function readBakedSync() {
  try {
    const f = Services.dirsvc.get("UChrm", Ci.nsIFile);
    f.append("floorp-modern-theme.txt");
    if (!f.exists()) {
      return "oneui";
    }
    const stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
    stream.init(f, -1, 0, 0);
    const conv = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
    conv.init(stream, "UTF-8", 0, 0);
    const str = {};
    let text = "";
    while (conv.readString(4096, str)) {
      text += str.value;
    }
    conv.close();
    const id = text.replace(/^\uFEFF/, "").trim();
    return IDS.includes(id) ? id : "oneui";
  } catch (e) {
    return "oneui";
  }
}

export function current() {
  let id = "";
  try {
    id = Services.prefs.getStringPref(PREF, "");
  } catch (e) {}
  if (!IDS.includes(id)) {
    id = baked || readBakedSync();
  }
  return id;
}

async function applyLive() {
  const id = current();
  if (id === liveId) {
    return;
  }
  const s = sss();
  if (liveSheet && s.sheetRegistered(liveSheet, s.USER_SHEET)) {
    s.unregisterSheet(liveSheet, s.USER_SHEET);
  }
  liveSheet = null;
  liveId = id;
  // тема из файлов уже работает — ничего подключать не нужно
  if (id === baked) {
    return;
  }
  try {
    const css = await IOUtils.readUTF8(PathUtils.join(themesDir(), `${id}-live.css`));
    if (liveId !== id) {
      return;
    }
    liveSheet = Services.io.newURI("data:text/css;charset=utf-8," + encodeURIComponent(css));
    s.loadAndRegisterSheet(liveSheet, s.USER_SHEET);
  } catch (e) {
    log.push("live: " + e);
    console.error("[redesigned-fox] theme live:", e);
  }
}

/* --------- замена темы в userChrome.css / userContent.css ---------
   Новые установки: между метками FM-THEME BEGIN/END.
   Старые (до 1.15): блок «/* ---- Название темы ---- *\/» до блока настроек. */
const HEADER = /\/\* -{16} (?!Настройки из установщика)[^\n]*? -{16} \*\//;
const SETTINGS = "/* ---------------- Настройки из установщика";

function replaceIn(section, part, overlay) {
  const marked = new RegExp(`/\\* FM-THEME BEGIN [a-z]+ ${part} \\*/[\\s\\S]*?/\\* FM-THEME END ${part} \\*/\\n?`);
  if (marked.test(section)) {
    return section.replace(marked, () => overlay);
  }
  const endRx = part === "pdf" ? /\/\* =+ PDF-TWEAKS END/ : /\/\* =+ FLOORP-MODERN END/;
  const end = section.search(endRx);
  if (end < 0) {
    return null;
  }
  let stop = section.indexOf(SETTINGS);
  if (stop < 0 || stop > end) {
    stop = end;
  }
  const head = section.slice(0, stop).search(HEADER);
  const from = head >= 0 ? head : stop;
  return section.slice(0, from) + overlay + "\n" + section.slice(stop);
}

/* в userContent.css два наших блока: страницы браузера и PDF */
function replaceContent(text, contentOverlay, pdfOverlay) {
  let out = text;
  const pdfStart = out.search(/\/\* =+ PDF-TWEAKS BEGIN/);
  if (pdfStart >= 0) {
    const r = replaceIn(out.slice(pdfStart), "pdf", pdfOverlay);
    if (r !== null) {
      out = out.slice(0, pdfStart) + r;
    }
  }
  const fmStart = out.search(/\/\* =+ FLOORP-MODERN BEGIN/);
  const fmEnd = out.search(/\/\* =+ FLOORP-MODERN END/);
  if (fmStart >= 0 && fmEnd > fmStart) {
    const endLine = out.indexOf("\n", fmEnd);
    const stop = endLine < 0 ? out.length : endLine;
    const r = replaceIn(out.slice(fmStart, stop), "content", contentOverlay);
    if (r !== null) {
      out = out.slice(0, fmStart) + r + out.slice(stop);
    }
  }
  return out;
}

let writing = Promise.resolve();
async function rewriteFiles(id) {
  const dir = chromeDir();
  const t = part => IOUtils.readUTF8(PathUtils.join(themesDir(), `${id}-${part}.css`));
  const [cO, tO, pO] = await Promise.all([t("chrome"), t("content"), t("pdf")]);
  const chromeFile = PathUtils.join(dir, "userChrome.css");
  const contentFile = PathUtils.join(dir, "userContent.css");
  let done = 0;
  try {
    const text = await IOUtils.readUTF8(chromeFile);
    const fmStart = text.search(/\/\* =+ FLOORP-MODERN BEGIN/);
    if (fmStart >= 0) {
      const r = replaceIn(text.slice(fmStart), "chrome", cO);
      if (r !== null) {
        await IOUtils.writeUTF8(chromeFile, text.slice(0, fmStart) + r);
        done++;
      }
    }
  } catch (e) {
    log.push("userChrome: " + e);
  }
  try {
    const text = await IOUtils.readUTF8(contentFile);
    const out = replaceContent(text, tO, pO);
    if (out !== text) {
      await IOUtils.writeUTF8(contentFile, out);
    }
    done++;
  } catch (e) {
    log.push("userContent: " + e);
  }
  await IOUtils.writeUTF8(PathUtils.join(dir, "floorp-modern-theme.txt"), id);
  return done === 2;
}

/* сменить тему. Возвращает true, если файлы тоже обновлены. */
export async function setTheme(id) {
  if (!IDS.includes(id)) {
    throw new Error("unknown theme " + id);
  }
  Services.prefs.setStringPref(PREF, id);
  // свои цвета из Studio (фон окна, поля, меню, текст, акцент) перекрывают любую тему —
  // при смене темы сбрасываем их, иначе все темы выглядят одинаково
  try {
    const studio = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernStudio.sys.mjs");
    const cfg = studio.readConfig();
    let changed = false;
    for (const k of studio.THEME_COLOR_KEYS) {
      if (k in cfg) {
        delete cfg[k];
        changed = true;
      }
    }
    if (changed) {
      studio.save(cfg);
    }
  } catch (e) {
    log.push("studio colors: " + e);
  }
  const job = writing.then(() => rewriteFiles(id));
  writing = job.catch(() => false);
  return job;
}

export function lastErrors() {
  return log.slice(-5);
}

export function init() {
  if (started) {
    return;
  }
  started = true;
  baked = readBakedSync();
  // поправки, которые действуют сразу, без переустановки (боковая панель, вертикальные вкладки)
  try {
    const s = sss();
    const uri = Services.io.newURI("resource://pdftweaks/fixes.css");
    if (!s.sheetRegistered(uri, s.USER_SHEET)) {
      s.loadAndRegisterSheet(uri, s.USER_SHEET);
    }
  } catch (e) {
    log.push("fixes: " + e);
  }
  try {
    if (!IDS.includes(Services.prefs.getStringPref(PREF, ""))) {
      Services.prefs.setStringPref(PREF, baked);
    }
  } catch (e) {}
  applyLive();
  Services.prefs.addObserver(PREF, () => applyLive());
}
