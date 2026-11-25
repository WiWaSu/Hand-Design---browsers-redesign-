/* Floorp PDF tweaks — родительская часть.
 *  1. Сохраняет тему, выбранную в просмотрщике PDF.
 *  2. Запасной загрузчик: подключает floorp-modern.uc.js во все окна браузера
 *     (если основной загрузчик этого не сделал) и пишет журнал fm-boot.json.
 */

const ALLOWED = {
  ui: ["auto", "light", "dark"],
  page: ["auto", "paper", "sepia", "night"],
};

let booted = false;
const bootLog = [];

function logDir() {
  try {
    return PathUtils.join(Services.dirsvc.get("UChrm", Ci.nsIFile).path, "pdf-tweaks");
  } catch (e) {
    return null;
  }
}

function writeLog() {
  const dir = logDir();
  if (dir) {
    IOUtils.writeJSON(PathUtils.join(dir, "fm-boot.json"), bootLog).catch(() => {});
  }
}

function loadInto(win) {
  try {
    if (!win || win.closed || win.location?.href !== "chrome://browser/content/browser.xhtml") {
      return;
    }
    if (win.__floorpModern) {
      bootLog.push({ t: new Date().toISOString(), msg: "окно уже со скриптом (основной загрузчик сработал)" });
      return;
    }
    Services.scriptloader.loadSubScriptWithOptions("resource://pdftweaks/floorp-modern.uc.js", {
      target: win,
      ignoreCache: true,
    });
    bootLog.push({ t: new Date().toISOString(), msg: "скрипт подключён запасным загрузчиком" });
  } catch (e) {
    bootLog.push({ t: new Date().toISOString(), msg: "ОШИБКА: " + e, stack: String(e?.stack || "") });
  }
  writeLog();
}

export function boot() {
  if (booted) {
    return;
  }
  booted = true;
  bootLog.push({ t: new Date().toISOString(), msg: "запасной загрузчик запущен" });
  try {
    for (const win of Services.wm.getEnumerator("navigator:browser")) {
      if (win.gBrowserInit?.delayedStartupFinished) {
        loadInto(win);
      }
    }
    Services.obs.addObserver(subject => loadInto(subject), "browser-delayed-startup-finished");
  } catch (e) {
    bootLog.push({ t: new Date().toISOString(), msg: "ОШИБКА запуска: " + e });
  }
  writeLog();
}

export const STUDIO_URL = "chrome://fmstudio/content/studio.html";
const STUDIO_FALLBACK = "resource://handdesign/studio.html";
function studioRegistered() {
  try {
    Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry)
      .convertChromeURL(Services.io.newURI(STUDIO_URL));
    return true;
  } catch (e) {
    return false;
  }
}
export function openStudio(win) {
  if (!win || !win.gBrowser) {
    return "";
  }
  const gB = win.gBrowser;
  const url = studioRegistered() ? STUDIO_URL : STUDIO_FALLBACK;
  const principal = Services.scriptSecurityManager.getSystemPrincipal();
  // уже открыта и видна — просто переключаемся на неё и обновляем.
  // Вкладку из другого рабочего пространства Floorp (она скрыта) закрываем —
  // переключиться на скрытую вкладку нельзя, из-за этого кнопка «молчала».
  for (const tab of [...gB.tabs]) {
    const spec = tab.linkedBrowser?.currentURI?.spec || "";
    if (spec.startsWith(STUDIO_URL) || spec.startsWith(STUDIO_FALLBACK)) {
      if (tab.hidden || tab.closing) {
        try {
          gB.removeTab(tab, { animate: false });
        } catch (e) {}
        continue;
      }
      gB.selectedTab = tab;
      tab.linkedBrowser.loadURI(Services.io.newURI(url), { triggeringPrincipal: principal });
      return "switched";
    }
  }
  const tab = gB.addTrustedTab(url, { triggeringPrincipal: principal, inBackground: false });
  gB.selectedTab = tab;
  return "opened";
}

export const DOCS_URL = "resource://handdesign/docs.html";
const RECENT_PREF = "floorp.modern.md.recent";
const MD_RE = /\.(md|markdown|mdown|mkd|mkdn)$/i;
const CSV_RE = /\.(csv|tsv)$/i;
export const CSV_URL = "resource://handdesign/csv.html";
const DOC_RE = /\.(md|markdown|mdown|mkd|mkdn|csv|tsv)$/i;

export function openDocs(win) {
  if (!win || !win.gBrowser) {
    return;
  }
  const gB = win.gBrowser;
  const principal = Services.scriptSecurityManager.getSystemPrincipal();
  for (const tab of [...gB.tabs]) {
    if (!tab.hidden && !tab.closing && tab.linkedBrowser?.currentURI?.spec === DOCS_URL) {
      gB.selectedTab = tab;
      return;
    }
  }
  gB.selectedTab = gB.addTrustedTab(DOCS_URL, { triggeringPrincipal: principal, inBackground: false });
}

function readRecent() {
  try {
    const list = JSON.parse(Services.prefs.getStringPref(RECENT_PREF, "[]"));
    return Array.isArray(list) ? list.filter(x => typeof x?.path === "string" && DOC_RE.test(x.path)) : [];
  } catch (e) {
    return [];
  }
}

function remember(path) {
  const list = readRecent().filter(x => x.path.toLowerCase() !== path.toLowerCase());
  list.unshift({ path, time: Date.now() });
  Services.prefs.setStringPref(RECENT_PREF, JSON.stringify(list.slice(0, 12)));
}

/* .csv из адресной строки, проводника или перетаскивания — открывается редактором таблиц */
export function openCsv(browser, path) {
  remember(path);
  browser.loadURI(Services.io.newURI(CSV_URL + "#" + encodeURIComponent(path)), {
    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
  });
}

let cp1251 = null;
function encode1251(text) {
  if (!cp1251) {
    cp1251 = new Map();
    const dec = new TextDecoder("windows-1251");
    for (let b = 0x80; b <= 0xff; b++) {
      cp1251.set(dec.decode(new Uint8Array([b])), b);
    }
  }
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    out[i] = c < 0x80 ? c : cp1251.get(text[i]) ?? 0x3f;
  }
  return out;
}

function forget(path) {
  Services.prefs.setStringPref(RECENT_PREF, JSON.stringify(readRecent().filter(x => x.path !== path)));
}

function pickFile(bc, mode, title, name, csv = false) {
  return new Promise(resolve => {
    const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(bc, title, mode);
    if (mode === Ci.nsIFilePicker.modeOpen) {
      fp.appendFilter("Markdown, CSV", "*.md; *.markdown; *.csv; *.tsv");
    }
    if (csv) {
      fp.appendFilter("CSV", "*.csv; *.tsv");
    } else {
      fp.appendFilter("Markdown", "*.md; *.markdown");
    }
    fp.appendFilters(Ci.nsIFilePicker.filterAll);
    if (name) {
      fp.defaultString = name;
      fp.defaultExtension = csv ? "csv" : "md";
    }
    fp.open(r => resolve(r === Ci.nsIFilePicker.returnCancel ? null : fp.file));
  });
}

export const IMAGE_URL = "resource://handdesign/image.html";
export const EDIT_IMG_RE = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;
const IMG_RECENT_PREF = "floorp.modern.img.recent";
const webImages = new Map();

export function imageEditorEnabled() {
  try {
    return JSON.parse(Services.prefs.getStringPref("floorp.modern.studio", "{}"))?.imgEditor === true;
  } catch (e) {
    return false;
  }
}

const imgRecent = () => {
  try {
    const list = JSON.parse(Services.prefs.getStringPref(IMG_RECENT_PREF, "[]"));
    return Array.isArray(list) ? list.filter(x => typeof x === "string") : [];
  } catch (e) {
    return [];
  }
};
function rememberImage(path) {
  const list = imgRecent().filter(x => x.toLowerCase() !== path.toLowerCase());
  list.unshift(path);
  Services.prefs.setStringPref(IMG_RECENT_PREF, JSON.stringify(list.slice(0, 40)));
}

export function openImage(browser, path) {
  rememberImage(path);
  browser.loadURI(Services.io.newURI(IMAGE_URL + "#" + encodeURIComponent(path)), {
    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
  });
}

/* картинка со страницы: из меню правой кнопки, открывается в новой вкладке рядом */
export function openImageUrl(win, url) {
  const gB = win?.gBrowser;
  if (!gB || !url) {
    return;
  }
  let target = IMAGE_URL;
  try {
    const uri = Services.io.newURI(url);
    if (uri.schemeIs("file")) {
      const path = uri.QueryInterface(Ci.nsIFileURL).file.path;
      rememberImage(path);
      target += "#" + encodeURIComponent(path);
    } else {
      const id = Services.uuid.generateUUID().toString().slice(1, 9);
      const { PrivateBrowsingUtils } = ChromeUtils.importESModule("resource://gre/modules/PrivateBrowsingUtils.sys.mjs");
      webImages.set(id, { url, private: PrivateBrowsingUtils.isWindowPrivate(win) });
      target += "#u:" + id;
    }
  } catch (e) {
    return;
  }
  gB.selectedTab = gB.addTrustedTab(target, {
    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    relatedToCurrent: true,
    inBackground: false,
  });
}

function pickImage(bc, mode, title, name, ext) {
  return new Promise(resolve => {
    const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(bc, title, mode);
    if (mode === Ci.nsIFilePicker.modeOpen) {
      fp.appendFilters(Ci.nsIFilePicker.filterImages);
    } else {
      fp.appendFilter(ext.toUpperCase(), ext === "jpg" ? "*.jpg; *.jpeg" : "*." + ext);
      fp.defaultString = name + "." + ext;
      fp.defaultExtension = ext;
    }
    fp.appendFilters(Ci.nsIFilePicker.filterAll);
    fp.open(r => resolve(r === Ci.nsIFilePicker.returnCancel ? null : fp.file));
  });
}

/* запись .md: переводы строк и BOM как были в файле */
async function writeMd(path, text, mtime) {
  const stamp = async () => (await IOUtils.stat(path)).lastModified;
  const old = await IOUtils.readUTF8(path).catch(() => null);
  if (mtime && old !== null && (await stamp()) !== mtime) {
    return { ok: false, conflict: true };
  }
  let out = old?.includes("\r\n") ? text.replace(/\r?\n/g, "\r\n") : text;
  const head = await IOUtils.read(path, { maxBytes: 3 }).catch(() => null);
  if (head?.length === 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
    out = "﻿" + out;
  }
  await IOUtils.writeUTF8(path, out, { tmpPath: path + ".hd-tmp" });
  return { ok: true, mtime: await stamp() };
}

/* менеджер паролей: окно браузера может показать его своей панелью (win.hdPasswords) вместо вкладки */
export function routePasswords() {
  const { LoginHelper } = ChromeUtils.importESModule("resource://gre/modules/LoginHelper.sys.mjs");
  if (LoginHelper.hdOpenTab) {
    return;
  }
  LoginHelper.hdOpenTab = LoginHelper.openPasswordManager;
  LoginHelper.openPasswordManager = (window, opts) => {
    const top = Services.wm.getMostRecentWindow("navigator:browser");
    if (!top?.hdPasswords?.(opts || {})) {
      LoginHelper.hdOpenTab(window, opts);
    }
  };
}

export const NOTES_URL = "resource://handdesign/notes.html";
const NOTES_DIR_PREF = "floorp.modern.notes.dir";
const NOTES_PIN_PREF = "floorp.modern.notes.pinned";

export function notesEnabled() {
  return Services.prefs.getBoolPref("floorp.modern.notes", true);
}

export function openNotes(win) {
  if (!win || !win.gBrowser || !notesEnabled()) {
    return;
  }
  const gB = win.gBrowser;
  for (const tab of [...gB.tabs]) {
    if (!tab.hidden && !tab.closing && tab.linkedBrowser?.currentURI?.spec === NOTES_URL) {
      gB.selectedTab = tab;
      return;
    }
  }
  gB.selectedTab = gB.addTrustedTab(NOTES_URL, {
    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    inBackground: false,
  });
}

const notesDir = () => Services.prefs.getStringPref(NOTES_DIR_PREF, "");
const readPinned = () => {
  try {
    const list = JSON.parse(Services.prefs.getStringPref(NOTES_PIN_PREF, "[]"));
    return Array.isArray(list) ? list.filter(x => typeof x === "string") : [];
  } catch {
    return [];
  }
};
const writePinned = list => Services.prefs.setStringPref(NOTES_PIN_PREF, JSON.stringify([...new Set(list)]));

function relPath(dir, rel, md) {
  rel = String(rel ?? "");
  if (!dir || (md && !MD_RE.test(rel))) {
    return null;
  }
  if (!rel) {
    return md ? null : dir;
  }
  const parts = rel.split("/");
  if (/^[A-Za-z]:|^[\\/]|\\/.test(rel) || parts.some(p => !p || p === "." || p === ".." || p.startsWith("."))) {
    return null;
  }
  return PathUtils.join(dir, ...parts);
}

const cleanName = s => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "").slice(0, 120);

async function freePath(dir, base, ext = ".md") {
  for (let n = 1; ; n++) {
    const path = PathUtils.join(dir, (n === 1 ? base : `${base} ${n}`) + ext);
    if (!(await IOUtils.exists(path))) {
      return path;
    }
  }
}

function preview(text) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .replace(/%%[\s\S]*?%%/g, "")
    .replace(/^>\s*\[![\w-]+\][+-]?/gm, "")
    .replace(/!\[\[[^\]\n]*\]\]|!\[[^\]\n]*\]\([^)\n]*\)/g, "")
    .split("\n")
    .map(l => l.replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/, "").replace(/[*_`~]|!?\[([^\]]*)\]\([^)]*\)/g, "$1").trim())
    .filter(l => l && !/^[-=|: ]+$/.test(l) && !l.startsWith("|"))
    .join(" ")
    .slice(0, 160);
}

const IMG_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const IMG_MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", svg: "image/svg+xml" };

async function findFile(dir, name) {
  const want = name.toLowerCase();
  let hit = null;
  const visit = async (abs, depth) => {
    let kids = [];
    try {
      kids = await IOUtils.getChildren(abs);
    } catch {
      return;
    }
    for (const child of kids) {
      if (hit) {
        return;
      }
      const n = PathUtils.filename(child);
      if (n.startsWith(".")) {
        continue;
      }
      if (n.toLowerCase() === want) {
        hit = child;
        return;
      }
      if (depth < 6 && (await IOUtils.stat(child).catch(() => null))?.type === "directory") {
        await visit(child, depth + 1);
      }
    }
  };
  await visit(dir, 0);
  return hit;
}

function toBase64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(out);
}

/* [[ссылки]] на заметку name: [[name]], [[папка/name]], [[name#заголовок]], [[name|подпись]] */
const linkRe = name => new RegExp(`(!?\\[\\[)((?:[^\\]|#\\n]*/)?)(${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(\\.md)?((?:#[^\\]|\\n]*)?(?:\\|[^\\]\\n]*)?\\]\\])`, "gi");

function noteTags(text) {
  const tags = new Map();
  const put = t => {
    t = t.trim().replace(/^#/, "");
    if (t && !tags.has(t.toLowerCase())) tags.set(t.toLowerCase(), t);
  };
  const fm = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    const m = fm[1].match(/^(?:tags?|теги):[ \t]*(.*)((?:\r?\n[ \t]+-.*)*)/im);
    if (m) {
      for (const t of m[1].replace(/^\[|\]$/g, "").split(",")) put(t.replace(/^["']|["']$/g, ""));
      for (const t of m[2].matchAll(/-[ \t]*(.+)/g)) put(t[1].replace(/^["']|["']$/g, ""));
    }
  }
  const body = (fm ? text.slice(fm[0].length) : text).replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g, " ");
  for (const m of body.matchAll(/(^|[\s(])#([\p{L}\p{N}_\/-]*[\p{L}_\/-][\p{L}\p{N}_\/-]*)/gu)) put(m[2]);
  return [...tags.values()];
}

async function walkNotes(dir) {
  const notes = [];
  const folders = [];
  const visit = async (abs, rel, depth) => {
    let kids = [];
    try {
      kids = await IOUtils.getChildren(abs);
    } catch {
      return;
    }
    for (const child of kids) {
      const name = PathUtils.filename(child);
      if (name.startsWith(".")) {
        continue;
      }
      const r = rel ? `${rel}/${name}` : name;
      const info = await IOUtils.stat(child).catch(() => null);
      if (!info) {
        continue;
      }
      if (info.type === "directory") {
        folders.push(r);
        if (depth < 6) {
          await visit(child, r, depth + 1);
        }
      } else if (MD_RE.test(name) && notes.length < 3000) {
        notes.push({ rel: r, path: child, mtime: info.lastModified, ctime: info.creationTime || info.lastModified, size: info.size });
      }
    }
  };
  await visit(dir, "", 0);
  return { notes, folders };
}

const WALL_IDS = ["theme", "custom", "aurora", "iris", "sunset", "ocean", "forest", "night", "rose", "graphite", "bloom", "dune"];
const WALL_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/bmp"];

export class FloorpPdfTweaksParent extends JSWindowActorParent {
  #notesObs = null;
  #imgPath = "";

  didDestroy() {
    if (this.#notesObs) {
      Services.prefs.removeObserver("floorp.modern.studio", this.#notesObs);
    }
  }

  // обои разрешено менять только со страницы новой вкладки
  #fromNewtab() {
    try {
      const spec = this.manager.documentURI?.spec || "";
      return /^(about:(newtab|home)|chrome:\/\/noraneko-newtab\/)/.test(spec);
    } catch (e) {
      return false;
    }
  }

  async #wallpaper(msg) {
    if (!this.#fromNewtab()) {
      return null;
    }
    const dir = logDir();
    if (!dir) {
      return null;
    }
    const file = PathUtils.join(dir, "fm-wallpaper.img");
    if (msg.name === "PdfTweaks:wall-get") {
      try {
        const bytes = await IOUtils.read(file);
        const type = Services.prefs.getStringPref("floorp.modern.wallpaper.type", "image/jpeg");
        return { type: WALL_TYPES.includes(type) ? type : "image/jpeg", bytes };
      } catch (e) {
        return null;
      }
    }
    const d = msg.data || {};
    if (typeof d.dim === "number" && d.dim >= 0 && d.dim <= 70) {
      Services.prefs.setIntPref("floorp.modern.wallpaper.dim", Math.round(d.dim));
    }
    if (d.id === "custom") {
      const bytes = d.bytes;
      if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 15 * 1024 * 1024) {
        return null;
      }
      await IOUtils.write(file, bytes);
      Services.prefs.setStringPref("floorp.modern.wallpaper.type", WALL_TYPES.includes(d.type) ? d.type : "image/jpeg");
      Services.prefs.setIntPref("floorp.modern.wallpaper.rev", Services.prefs.getIntPref("floorp.modern.wallpaper.rev", 0) + 1);
      Services.prefs.setStringPref("floorp.modern.wallpaper", "custom");
    } else if (WALL_IDS.includes(d.id)) {
      Services.prefs.setStringPref("floorp.modern.wallpaper", d.id);
    }
    return null;
  }

  /* файл берётся из адреса страницы, а не из сообщения: записать можно только открытый .md */
  async #markdown(op, data) {
    let path = "";
    try {
      const uri = this.manager.documentURI;
      if (!this.browsingContext.parent && uri?.schemeIs("file")) {
        path = uri.QueryInterface(Ci.nsIFileURL).file.path;
      }
    } catch {}
    if (!/\.(md|markdown|mdown|mkd|mkdn)$/i.test(path)) {
      return { ok: false, error: "not a markdown file" };
    }
    if (op === "read") {
      try {
        if (JSON.parse(Services.prefs.getStringPref("floorp.modern.studio", "{}"))?.mdEditor === false) {
          return { ok: false, off: true };
        }
      } catch (e) {}
    }
    const mtime = async () => (await IOUtils.stat(path)).lastModified;
    try {
      if (op === "stat") {
        return { ok: true, mtime: await mtime() };
      }
      const old = await IOUtils.readUTF8(path).catch(() => null);
      if (op === "read") {
        if (old !== null) {
          remember(path);
        }
        return old === null ? { ok: false, error: "read failed" } : { ok: true, text: old.replace(/^\uFEFF/, ""), mtime: await mtime() };
      }
      return await writeMd(path, String(data?.text ?? ""), data?.mtime);
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  /* страница «Заметки»: только файлы .md и папки внутри выбранной папки */
  async #notes(op, data) {
    if ((this.manager.documentURI?.spec || "") !== NOTES_URL || !notesEnabled()) {
      return null;
    }
    const t = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernL10n.sys.mjs").t;
    const state = () => {
      let suggested = "";
      try {
        suggested = PathUtils.join(Services.dirsvc.get("Docs", Ci.nsIFile).path, "Hand Design Notes");
      } catch {}
      return { dir: notesDir(), suggested };
    };
    try {
      if (op === "state") {
        if (!this.#notesObs) {
          this.#notesObs = { observe: () => this.sendAsyncMessage("HDNotes:changed") };
          Services.prefs.addObserver("floorp.modern.studio", this.#notesObs);
        }
        return state();
      }
      if (op === "settings") {
        try {
          const all = JSON.parse(Services.prefs.getStringPref("floorp.modern.studio", "{}"));
          return Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith("notes")));
        } catch {
          return {};
        }
      }
      if (op === "useDefault") {
        const dir = state().suggested;
        await IOUtils.makeDirectory(dir, { ignoreExisting: true });
        Services.prefs.setStringPref(NOTES_DIR_PREF, dir);
        return state();
      }
      if (op === "pick") {
        const dir = await new Promise(resolve => {
          const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
          fp.init(this.browsingContext, t("Папка для заметок"), Ci.nsIFilePicker.modeGetFolder);
          fp.open(r => resolve(r === Ci.nsIFilePicker.returnOK ? fp.file.path : null));
        });
        if (dir) {
          Services.prefs.setStringPref(NOTES_DIR_PREF, dir);
        }
        return state();
      }
      const dir = notesDir();
      if (!dir || !(await IOUtils.exists(dir))) {
        return { ok: false, error: "no folder" };
      }
      if (op === "list") {
        const pinned = readPinned();
        const q = String(data?.q || "").trim().toLowerCase();
        const { notes, folders } = await walkNotes(dir);
        const out = [];
        for (const n of notes) {
          const text = n.size < 2_000_000 ? await IOUtils.readUTF8(n.path).catch(() => "") : "";
          const name = n.rel.split("/").pop().replace(MD_RE, "");
          const tags = noteTags(text);
          if (q.startsWith("#") && q.length > 1) {
            const tag = q.slice(1);
            if (!tags.some(t => t.toLowerCase() === tag || t.toLowerCase().startsWith(tag + "/"))) {
              continue;
            }
          } else if (q && !name.toLowerCase().includes(q) && !text.toLowerCase().includes(q)) {
            continue;
          }
          out.push({ rel: n.rel, name, mtime: n.mtime, ctime: n.ctime, preview: preview(text), pinned: pinned.includes(n.rel), tags });
        }
        return { ok: true, dir, notes: out, folders };
      }
      const folder = relPath(dir, data?.folder ?? "", false);
      if (op === "reveal") {
        const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
        f.initWithPath(folder || dir);
        f.launch();
        return { ok: true };
      }
      if (op === "new" || op === "mkdir") {
        if (!folder) {
          return { ok: false, error: "bad path" };
        }
        const base = cleanName(data?.name) || cleanName(t(op === "new" ? "Без названия" : "Новая папка")) || "Note";
        await IOUtils.makeDirectory(folder, { ignoreExisting: true });
        const path = await freePath(folder, base, op === "new" ? ".md" : "");
        if (op === "new") {
          await IOUtils.writeUTF8(path, String(data?.text ?? ""));
        } else {
          await IOUtils.makeDirectory(path);
        }
        const rel = (data?.folder ? data.folder + "/" : "") + PathUtils.filename(path);
        return { ok: true, rel };
      }
      if (op === "attach") {
        const name = cleanName(data?.name);
        const ext = (name.match(IMG_RE) || [])[1];
        const b64 = String(data?.b64 || "");
        if (!ext || !b64 || b64.length > 40_000_000) {
          return { ok: false, error: "bad image" };
        }
        let near = false;
        try {
          near = JSON.parse(Services.prefs.getStringPref("floorp.modern.studio", "{}")).notesAttach === "near";
        } catch {}
        const noteDir = relPath(dir, String(data?.note || "").replace(/(^|\/)[^/]*$/, ""), false) || dir;
        const target = near ? noteDir : PathUtils.join(dir, "attachments");
        await IOUtils.makeDirectory(target, { ignoreExisting: true });
        const path = await freePath(target, name.slice(0, -ext.length - 1), "." + ext.toLowerCase());
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        await IOUtils.write(path, bytes);
        return { ok: true, name: PathUtils.filename(path) };
      }
      if (op === "importPick") {
        const folderMode = data?.mode === "folder";
        const file = await new Promise(resolve => {
          const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
          fp.init(this.browsingContext, t("Импорт заметок"), folderMode ? Ci.nsIFilePicker.modeGetFolder : Ci.nsIFilePicker.modeOpen);
          if (!folderMode) {
            for (const [label, mask] of data?.filters || []) {
              fp.appendFilter(String(label), String(mask));
            }
          }
          fp.open(r => resolve(r === Ci.nsIFilePicker.returnOK ? fp.file.path : null));
        });
        if (!file) {
          return { ok: false, cancel: true };
        }
        const LIMIT = 400 * 1024 * 1024;
        if (!folderMode) {
          const info = await IOUtils.stat(file);
          if (info.size > LIMIT) {
            return { ok: false, error: t("Файл слишком большой") };
          }
          return { ok: true, name: PathUtils.filename(file), b64: toBase64(await IOUtils.read(file)) };
        }
        const files = [];
        let total = 0;
        const visit = async (abs, rel, depth) => {
          for (const child of await IOUtils.getChildren(abs).catch(() => [])) {
            const name = PathUtils.filename(child);
            if (name.startsWith(".") || name === "node_modules") {
              continue;
            }
            const info = await IOUtils.stat(child).catch(() => null);
            const r = rel ? `${rel}/${name}` : name;
            if (info?.type === "directory") {
              if (depth < 8) {
                await visit(child, r, depth + 1);
              }
            } else if (info && files.length < 5000 && total + info.size <= LIMIT) {
              total += info.size;
              files.push({ rel: r, b64: toBase64(await IOUtils.read(child)) });
            }
          }
        };
        await visit(file, "", 0);
        return { ok: true, name: PathUtils.filename(file), files };
      }
      if (op === "importBegin") {
        const root = PathUtils.join(dir, cleanName(t("Импорт")) || "Import");
        await IOUtils.makeDirectory(root, { ignoreExisting: true });
        const target = await freePath(root, cleanName(data?.name) || "Import", "");
        await IOUtils.makeDirectory(target);
        return { ok: true, folder: `${PathUtils.filename(root)}/${PathUtils.filename(target)}` };
      }
      if (op === "importWrite") {
        const base = relPath(dir, String(data?.folder || ""), false);
        if (!base || base === dir) {
          return { ok: false, error: "bad path" };
        }
        let written = 0;
        for (const it of data?.items || []) {
          const parts = String(it?.rel || "").split("/").map(p => cleanName(p).replace(/[. ]+$/, ""));
          if (!parts.length || parts.some(p => !p)) {
            continue;
          }
          const parent = PathUtils.join(base, ...parts.slice(0, -1));
          await IOUtils.makeDirectory(parent, { ignoreExisting: true });
          const last = parts.at(-1);
          const ext = (last.match(/\.[^.]+$/) || [""])[0];
          const path = await freePath(parent, last.slice(0, last.length - ext.length), ext);
          if (typeof it.text === "string") {
            await IOUtils.writeUTF8(path, it.text);
          } else {
            const bin = atob(String(it.b64 || ""));
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) {
              bytes[i] = bin.charCodeAt(i);
            }
            await IOUtils.write(path, bytes);
          }
          written++;
        }
        return { ok: true, written };
      }
      if (op === "asset") {
        const src = decodeURIComponent(String(data?.src || "")).replace(/\\/g, "/").replace(/^\.\//, "");
        if (!IMG_RE.test(src) || /^[a-z]+:/i.test(src)) {
          return { ok: false };
        }
        const noteFolder = String(data?.note || "").replace(/(^|\/)[^/]*$/, "");
        let path = null;
        for (const rel of [noteFolder ? `${noteFolder}/${src}` : src, src]) {
          const p = relPath(dir, rel.split("/").reduce((a, part) => (part === ".." ? a.slice(0, -1) : [...a, part]), []).join("/"), false);
          if (p && (await IOUtils.exists(p))) {
            path = p;
            break;
          }
        }
        path ||= await findFile(dir, src.split("/").pop());
        if (!path) {
          return { ok: false };
        }
        const info = await IOUtils.stat(path);
        if (info.size > 30_000_000) {
          return { ok: false };
        }
        const mime = IMG_MIME[path.match(IMG_RE)[1].toLowerCase()];
        return { ok: true, url: `data:${mime};base64,${toBase64(await IOUtils.read(path))}` };
      }
      if (op === "graph") {
        const list = (await walkNotes(dir)).notes;
        const index = new Map();
        list.forEach((n, i) => {
          const full = n.rel.replace(MD_RE, "").toLowerCase();
          index.set(full, i);
          const leaf = full.split("/").pop();
          if (!index.has(leaf)) index.set(leaf, i);
        });
        const edges = new Set();
        for (let i = 0; i < list.length; i++) {
          if (list[i].size > 2_000_000) continue;
          const text = await IOUtils.readUTF8(list[i].path).catch(() => "");
          for (const m of text.matchAll(/(?<!!)\[\[([^\]|#\n]+)/g)) {
            const want = m[1].trim().toLowerCase().replace(/\.md$/, "");
            const j = index.get(want) ?? index.get(want.split("/").pop());
            if (j !== undefined && j !== i) edges.add(i < j ? `${i}:${j}` : `${j}:${i}`);
          }
        }
        return {
          ok: true,
          nodes: list.map(n => ({ rel: n.rel, name: n.rel.split("/").pop().replace(MD_RE, "") })),
          edges: [...edges].map(e => e.split(":").map(Number)),
        };
      }
      if (op === "backlinks") {
        const self = String(data?.rel || "");
        const name = self.split("/").pop().replace(MD_RE, "");
        if (!name) {
          return { ok: false };
        }
        const out = [];
        for (const n of (await walkNotes(dir)).notes) {
          if (n.rel === self || n.size > 2_000_000) {
            continue;
          }
          const text = await IOUtils.readUTF8(n.path).catch(() => "");
          const re = linkRe(name);
          const line = text.split("\n").find(l => (re.lastIndex = 0, re.test(l)));
          if (line !== undefined) {
            out.push({ rel: n.rel, name: n.rel.split("/").pop().replace(MD_RE, ""), line: line.trim().slice(0, 200) });
          }
          if (out.length >= 100) {
            break;
          }
        }
        return { ok: true, links: out };
      }
      const isFolder = !!data?.isFolder;
      const rel = String(data?.rel ?? "");
      const path = relPath(dir, rel, !isFolder);
      if (!path || path === dir) {
        return { ok: false, error: "bad path" };
      }
      if (op === "read") {
        const text = await IOUtils.readUTF8(path);
        return { ok: true, text: text.replace(/^\uFEFF/, ""), mtime: (await IOUtils.stat(path)).lastModified };
      }
      if (op === "stat") {
        return { ok: true, mtime: (await IOUtils.stat(path)).lastModified };
      }
      if (op === "save") {
        return await writeMd(path, String(data?.text ?? ""), data?.mtime);
      }
      const repin = (from, to) => writePinned(readPinned().flatMap(x => {
        if (x === from || x.startsWith(from + "/")) {
          return to ? [to + x.slice(from.length)] : [];
        }
        return [x];
      }));
      if (op === "pin") {
        writePinned(data?.on ? [...readPinned(), rel] : readPinned().filter(x => x !== rel));
        return { ok: true };
      }
      const moveTo = async (next, nextRel) => {
        if (next.toLowerCase() !== path.toLowerCase() && (await IOUtils.exists(next))) {
          return { ok: false, error: t(isFolder ? "Папка с таким названием уже есть" : "Заметка с таким названием уже есть") };
        }
        await IOUtils.move(path, next);
        repin(rel, nextRel);
        return { ok: true, rel: nextRel, name: nextRel.split("/").pop().replace(MD_RE, "") };
      };
      if (op === "rename") {
        const base = cleanName(data?.name);
        if (!base) {
          return { ok: false, error: t("Пустое название") };
        }
        const file = base + (isFolder ? "" : ".md");
        const res = await moveTo(PathUtils.join(PathUtils.parent(path), file), rel.replace(/[^/]+$/, file));
        if (res.ok && !isFolder) {
          const oldName = rel.split("/").pop().replace(MD_RE, "");
          res.updated = 0;
          for (const n of (await walkNotes(dir)).notes) {
            const text = await IOUtils.readUTF8(n.path).catch(() => null);
            if (text === null || !text.includes("[[")) {
              continue;
            }
            const next = text.replace(linkRe(oldName), (m, open, folderPart, _name, ext, rest) => open + folderPart + base + (ext || "") + rest);
            if (next !== text) {
              await writeMd(n.path, next.replace(/^\uFEFF/, ""), 0);
              res.updated++;
            }
          }
        }
        return res;
      }
      if (op === "move") {
        if (!folder || (isFolder && (data.folder === rel || String(data.folder).startsWith(rel + "/")))) {
          return { ok: false, error: "bad path" };
        }
        const file = rel.split("/").pop();
        return await moveTo(PathUtils.join(folder, file), (data.folder ? data.folder + "/" : "") + file);
      }
      if (op === "delete") {
        const trash = PathUtils.join(dir, ".trash");
        await IOUtils.makeDirectory(trash, { ignoreExisting: true });
        const file = PathUtils.filename(path);
        await IOUtils.move(path, await freePath(trash, isFolder ? file : file.replace(MD_RE, ""), isFolder ? "" : ".md"));
        repin(rel, null);
        return { ok: true };
      }
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
    return null;
  }

  /* редактор таблиц: файл — из адреса страницы, и только из списка недавних */
  async #csv(op, data) {
    const uri = this.manager.documentURI;
    if (!uri?.spec.startsWith(CSV_URL + "#")) {
      return null;
    }
    const path = decodeURIComponent(uri.ref || "");
    if (!CSV_RE.test(path) || !readRecent().some(x => x.path.toLowerCase() === path.toLowerCase())) {
      return { ok: false, error: "not allowed" };
    }
    const stamp = async () => (await IOUtils.stat(path)).lastModified;
    try {
      if (op === "stat") {
        return { ok: true, mtime: await stamp() };
      }
      if (op === "read") {
        const bytes = await IOUtils.read(path);
        const bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
        let text;
        let encoding = "utf-8";
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(bom ? bytes.subarray(3) : bytes);
        } catch {
          encoding = "windows-1251";
          text = new TextDecoder("windows-1251").decode(bytes);
        }
        return { ok: true, text, encoding, bom, mtime: await stamp(), name: PathUtils.filename(path), folder: PathUtils.parent(path) };
      }
      if (op === "save") {
        if (data?.mtime && (await stamp()) !== data.mtime) {
          return { ok: false, conflict: true };
        }
        const text = String(data?.text ?? "");
        let bytes;
        if (data?.encoding === "windows-1251") {
          bytes = encode1251(text);
        } else {
          const body = new TextEncoder().encode(text);
          bytes = data?.bom ? new Uint8Array([0xef, 0xbb, 0xbf, ...body]) : body;
        }
        await IOUtils.write(path, bytes, { tmpPath: path + ".hd-tmp" });
        return { ok: true, mtime: await stamp() };
      }
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
    return null;
  }

  /* редактор картинок: файл — из адреса страницы (только из списка открытых) или из «Сохранить как» */
  async #image(op, data) {
    const uri = this.manager.documentURI;
    if (!uri?.spec.startsWith(IMAGE_URL)) {
      return null;
    }
    const t = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernL10n.sys.mjs").t;
    const ref = decodeURIComponent(uri.ref || "");
    const web = ref.startsWith("u:") ? webImages.get(ref.slice(2)) : null;
    let path = this.#imgPath;
    if (!path && ref && !web && EDIT_IMG_RE.test(ref) && imgRecent().some(x => x.toLowerCase() === ref.toLowerCase())) {
      path = ref;
    }
    const stamp = async () => (await IOUtils.stat(path)).lastModified;
    const write = async (target, b64) => {
      const bytes = Uint8Array.fromBase64(String(b64 || ""));
      await IOUtils.write(target, bytes, { tmpPath: target + ".hd-tmp" });
    };
    try {
      if (op === "read") {
        if (path) {
          if ((await IOUtils.stat(path)).size > 80 * 1024 * 1024) {
            return { ok: false, error: t("Файл слишком большой") };
          }
          const ext = path.match(EDIT_IMG_RE)[1].toLowerCase();
          return {
            ok: true,
            data: (await IOUtils.read(path)).toBase64(),
            mime: IMG_MIME[ext],
            name: PathUtils.filename(path),
            folder: PathUtils.parent(path),
            path,
            mtime: await stamp(),
          };
        }
        if (web) {
          const r = await fetch(web.url, { credentials: web.private ? "omit" : "include" });
          if (!r.ok) {
            return { ok: false, error: "HTTP " + r.status };
          }
          const mime = (r.headers.get("content-type") || "").split(";")[0].trim();
          const src = new URL(web.url);
          const http = /^https?:$/.test(src.protocol);
          let name = "";
          try {
            name = http ? decodeURIComponent(src.pathname.split("/").pop() || "") : "";
          } catch (e) {}
          name = cleanName(name) || t("Картинка");
          if (!/\.[a-z0-9]{2,5}$/i.test(name)) {
            name += "." + ((mime.split("/")[1] || "png").replace("jpeg", "jpg").replace(/\+.*/, ""));
          }
          return { ok: true, data: new Uint8Array(await r.arrayBuffer()).toBase64(), mime, name, folder: http ? src.host : "", path: "", mtime: 0 };
        }
        return ref ? { ok: false, error: t("Картинка больше недоступна, откройте её заново") } : { ok: false, empty: true };
      }
      if (op === "save") {
        if (!path) {
          return { ok: false, error: "no file" };
        }
        if (data?.mtime && (await stamp()) !== data.mtime) {
          return { ok: false, conflict: true };
        }
        await write(path, data?.data);
        return { ok: true, mtime: await stamp() };
      }
      if (op === "saveAs") {
        const ext = ["png", "jpg", "webp"].includes(data?.ext) ? data.ext : "png";
        const file = await pickImage(this.browsingContext, Ci.nsIFilePicker.modeSave, t("Сохранить как…"), cleanName(data?.name || "") || t("Картинка"), ext);
        if (!file) {
          return { ok: false, cancel: true };
        }
        let target = file.path;
        if (!EDIT_IMG_RE.test(target)) {
          target += "." + ext;
        }
        await write(target, data?.data);
        rememberImage(target);
        this.#imgPath = path = target;
        return { ok: true, path, name: PathUtils.filename(path), folder: PathUtils.parent(path), mtime: await stamp() };
      }
      if (op === "copy") {
        const bytes = Uint8Array.fromBase64(String(data?.data || ""));
        const imgTools = Cc["@mozilla.org/image/tools;1"].getService(Ci.imgITools);
        const img = imgTools.decodeImageFromArrayBuffer(bytes.buffer, "image/png");
        const trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
        trans.init(null);
        trans.addDataFlavor("image/png");
        trans.setTransferData("image/png", img);
        Services.clipboard.setData(trans, null, Ci.nsIClipboard.kGlobalClipboard);
        return { ok: true };
      }
      if (op === "open") {
        const file = await pickImage(this.browsingContext, Ci.nsIFilePicker.modeOpen, t("Открыть картинку"));
        if (file && EDIT_IMG_RE.test(file.path)) {
          rememberImage(file.path);
          this.browsingContext.top.loadURI(Services.io.newURI(IMAGE_URL + "#" + encodeURIComponent(file.path)), {
            triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
          });
        }
        return null;
      }
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
    return null;
  }

  #openFile(path) {
    remember(path);
    const url = CSV_RE.test(path) ? CSV_URL + "#" + encodeURIComponent(path) : PathUtils.toFileURI(path);
    this.browsingContext.top.loadURI(Services.io.newURI(url), {
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    });
  }

  /* страница «Документы» и кнопка в редакторе; выбор файла — только через системное окно */
  async #docs(op, data) {
    const spec = this.manager.documentURI?.spec || "";
    const fromDocs = spec === DOCS_URL;
    const fromEditor = (this.manager.documentURI?.schemeIs("file") && MD_RE.test(spec)) || spec.startsWith(CSV_URL + "#") || spec.startsWith(IMAGE_URL);
    if (!fromDocs && !(fromEditor && op === "home")) {
      return null;
    }
    const t = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernL10n.sys.mjs").t;
    try {
      if (op === "home") {
        this.browsingContext.top.loadURI(Services.io.newURI(DOCS_URL), {
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
        return null;
      }
      if (op === "options") {
        return { image: imageEditorEnabled() };
      }
      if (op === "image") {
        this.browsingContext.top.loadURI(Services.io.newURI(IMAGE_URL), {
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
        return null;
      }
      if (op === "list") {
        const out = [];
        for (const x of readRecent()) {
          out.push({ path: x.path, time: x.time, exists: await IOUtils.exists(x.path) });
        }
        return out;
      }
      if (op === "open") {
        const file = await pickFile(this.browsingContext, Ci.nsIFilePicker.modeOpen, t("Открыть документ"));
        if (file) {
          this.#openFile(file.path);
        }
        return null;
      }
      if (op === "new") {
        const file = await pickFile(this.browsingContext, Ci.nsIFilePicker.modeSave, t("Новый документ Markdown"), t("Без названия") + ".md");
        if (!file) {
          return null;
        }
        let path = file.path;
        if (!MD_RE.test(path)) {
          path += ".md";
        }
        if (!(await IOUtils.exists(path))) {
          const title = PathUtils.filename(path).replace(MD_RE, "");
          await IOUtils.writeUTF8(path, `# ${title}\n\n`);
        }
        this.#openFile(path);
        return null;
      }
      if (op === "newCsv") {
        const file = await pickFile(this.browsingContext, Ci.nsIFilePicker.modeSave, t("Новая таблица"), t("Таблица") + ".csv", true);
        if (!file) {
          return null;
        }
        let path = file.path;
        if (!CSV_RE.test(path)) {
          path += ".csv";
        }
        if (!(await IOUtils.exists(path))) {
          const c = t("Столбец");
          await IOUtils.writeUTF8(path, `\uFEFF${c} 1;${c} 2;${c} 3\r\n;;\r\n`);
        }
        this.#openFile(path);
        return null;
      }
      const path = String(data?.path || "");
      if (!readRecent().some(x => x.path === path)) {
        return null;
      }
      if (op === "recent") {
        if (await IOUtils.exists(path)) {
          this.#openFile(path);
          return { ok: true };
        }
        return { ok: false };
      }
      if (op === "forget") {
        forget(path);
      }
    } catch (e) {
      bootLog.push({ t: new Date().toISOString(), msg: "документы: ОШИБКА " + e });
      writeLog();
    }
    return null;
  }

  receiveMessage(msg) {
    if (msg.name === "PdfTweaks:boot") {
      boot();
      return;
    }
    if (msg.name.startsWith("HDMd:")) {
      return this.#markdown(msg.name.slice(5), msg.data);
    }
    if (msg.name.startsWith("HDDocs:")) {
      return this.#docs(msg.name.slice(7), msg.data);
    }
    if (msg.name.startsWith("HDCsv:")) {
      return this.#csv(msg.name.slice(6), msg.data);
    }
    if (msg.name.startsWith("HDImg:")) {
      return this.#image(msg.name.slice(6), msg.data);
    }
    if (msg.name.startsWith("HDNotes:")) {
      return this.#notes(msg.name.slice(8), msg.data);
    }
    if (msg.name === "PdfTweaks:studio-save") {
      // принимаем только со страницы Studio
      const spec = this.manager.documentURI?.spec || "";
      if (!/^(resource:\/\/handdesign\/|chrome:\/\/fmstudio\/content\/)studio\.html/.test(spec)) {
        return null;
      }
      try {
        const studio = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernStudio.sys.mjs");
        studio.save(JSON.parse(String(msg.data || "{}")));
      } catch (e) {
        bootLog.push({ t: new Date().toISOString(), msg: "Studio: ОШИБКА " + e });
        writeLog();
      }
      return null;
    }
    if (msg.name === "PdfTweaks:studio-lang") {
      const spec = this.manager.documentURI?.spec || "";
      if (!/^(resource:\/\/handdesign\/|chrome:\/\/fmstudio\/content\/)studio\.html/.test(spec)) {
        return null;
      }
      try {
        ChromeUtils.importESModule("resource://pdftweaks/FloorpModernL10n.sys.mjs").setLang(String(msg.data || "auto"));
      } catch (e) {
        bootLog.push({ t: new Date().toISOString(), msg: "язык: ОШИБКА " + e });
        writeLog();
      }
      return null;
    }
    if (msg.name === "PdfTweaks:theme-set") {
      const spec = this.manager.documentURI?.spec || "";
      if (!/^(resource:\/\/handdesign\/|chrome:\/\/fmstudio\/content\/)studio\.html/.test(spec)) {
        return null;
      }
      try {
        const themes = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernThemes.sys.mjs");
        themes.setTheme(String(msg.data || "")).catch(e => {
          bootLog.push({ t: new Date().toISOString(), msg: "тема: ОШИБКА " + e });
          writeLog();
        });
      } catch (e) {
        bootLog.push({ t: new Date().toISOString(), msg: "тема: ОШИБКА " + e });
        writeLog();
      }
      return null;
    }
    if (msg.name === "PdfTweaks:studio-open") {
      if (this.#fromNewtab()) {
        openStudio(this.browsingContext.topChromeWindow);
      }
      return null;
    }
    if (msg.name === "PdfTweaks:wall-get" || msg.name === "PdfTweaks:wall-set") {
      return this.#wallpaper(msg);
    }
    if (msg.name === "PdfTweaks:dom") {
      // разметка элементов просмотрщика — чтобы точно подогнать стили под эту версию PDF.js
      const dir = logDir();
      if (dir) {
        IOUtils.writeUTF8(PathUtils.join(dir, "fm-pdf-dom.txt"), String(msg.data || "").slice(0, 60000)).catch(() => {});
      }
      return;
    }
    if (msg.name === "PdfTweaks:note") {
      // короткие заметки от страниц (например, «часы на новой вкладке поставлены»)
      const text = String(msg.data || "").slice(0, 200);
      if (text && bootLog.length < 60) {
        bootLog.push({ t: new Date().toISOString(), msg: text });
        writeLog();
      }
      return;
    }
    if (msg.name === "PdfTweaks:bookmarks") {
      // закладки страниц: { url: [{p, note, t}] }, не больше 150 файлов и 300 закладок в файле
      const { url, list } = msg.data || {};
      if (typeof url !== "string" || !url || url.length > 2000 || !Array.isArray(list)) {
        return;
      }
      let map = {};
      try {
        map = JSON.parse(Services.prefs.getStringPref("floorp.pdftweaks.bookmarks", "{}")) || {};
      } catch (e) {}
      const clean = list
        .filter(b => b && Number(b.p) > 0)
        .slice(0, 300)
        .map(b => ({ p: Math.floor(Number(b.p)), note: String(b.note || "").slice(0, 80), t: Number(b.t) || Date.now() }));
      if (clean.length) {
        map[url] = clean;
      } else {
        delete map[url];
      }
      const keys = Object.keys(map);
      if (keys.length > 150) {
        const last = k => Math.max(0, ...map[k].map(b => b.t || 0));
        keys.sort((a, b) => last(a) - last(b));
        for (const k of keys.slice(0, keys.length - 150)) {
          delete map[k];
        }
      }
      Services.prefs.setStringPref("floorp.pdftweaks.bookmarks", JSON.stringify(map));
      return;
    }
    if (msg.name === "PdfTweaks:page") {
      // запоминаем страницу для файла (последние 150 файлов)
      const { url, page } = msg.data || {};
      if (typeof url !== "string" || !url || url.length > 2000 || !(page > 0)) {
        return;
      }
      let map = {};
      try {
        map = JSON.parse(Services.prefs.getStringPref("floorp.pdftweaks.pages", "{}")) || {};
      } catch (e) {}
      map[url] = { p: Math.floor(page), t: Date.now() };
      const keys = Object.keys(map);
      if (keys.length > 150) {
        keys.sort((a, b) => (map[a].t || 0) - (map[b].t || 0));
        for (const k of keys.slice(0, keys.length - 150)) {
          delete map[k];
        }
      }
      Services.prefs.setStringPref("floorp.pdftweaks.pages", JSON.stringify(map));
      return;
    }
    if (msg.name !== "PdfTweaks:save") {
      return;
    }
    const { ui, page } = msg.data || {};
    if (ALLOWED.ui.includes(ui)) {
      Services.prefs.setStringPref("floorp.pdftweaks.ui", ui);
    }
    if (ALLOWED.page.includes(page)) {
      Services.prefs.setStringPref("floorp.pdftweaks.page", page);
    }
  }
}

export class FloorpModernNTParent extends FloorpPdfTweaksParent {}
