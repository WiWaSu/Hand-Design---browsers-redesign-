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
const STUDIO_FALLBACK = "resource://pdftweaks/studio.html";
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

export const DOCS_URL = "resource://pdftweaks/docs.html";
const RECENT_PREF = "floorp.modern.md.recent";
const MD_RE = /\.(md|markdown|mdown|mkd|mkdn)$/i;

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
    return Array.isArray(list) ? list.filter(x => typeof x?.path === "string" && MD_RE.test(x.path)) : [];
  } catch (e) {
    return [];
  }
}

function remember(path) {
  const list = readRecent().filter(x => x.path.toLowerCase() !== path.toLowerCase());
  list.unshift({ path, time: Date.now() });
  Services.prefs.setStringPref(RECENT_PREF, JSON.stringify(list.slice(0, 12)));
}

function forget(path) {
  Services.prefs.setStringPref(RECENT_PREF, JSON.stringify(readRecent().filter(x => x.path !== path)));
}

function pickFile(bc, mode, title, name) {
  return new Promise(resolve => {
    const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(bc, title, mode);
    fp.appendFilter("Markdown", "*.md; *.markdown");
    fp.appendFilters(Ci.nsIFilePicker.filterAll);
    if (name) {
      fp.defaultString = name;
      fp.defaultExtension = "md";
    }
    fp.open(r => resolve(r === Ci.nsIFilePicker.returnCancel ? null : fp.file));
  });
}

const WALL_IDS = ["theme", "custom", "aurora", "iris", "sunset", "ocean", "forest", "night", "rose", "graphite", "bloom", "dune"];
const WALL_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/bmp"];

export class FloorpPdfTweaksParent extends JSWindowActorParent {
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
      if (data?.mtime && old !== null && (await mtime()) !== data.mtime) {
        return { ok: false, conflict: true };
      }
      const text = String(data?.text ?? "");
      let out = old?.includes("\r\n") ? text.replace(/\r?\n/g, "\r\n") : text;
      const head = await IOUtils.read(path, { maxBytes: 3 }).catch(() => null);
      if (head?.length === 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
        out = "\uFEFF" + out;
      }
      await IOUtils.writeUTF8(path, out, { tmpPath: path + ".hd-tmp" });
      return { ok: true, mtime: await mtime() };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  #openFile(path) {
    remember(path);
    this.browsingContext.top.loadURI(Services.io.newURI(PathUtils.toFileURI(path)), {
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    });
  }

  /* страница «Документы» и кнопка в редакторе; выбор файла — только через системное окно */
  async #docs(op, data) {
    const spec = this.manager.documentURI?.spec || "";
    const fromDocs = spec === DOCS_URL;
    const fromEditor = this.manager.documentURI?.schemeIs("file") && MD_RE.test(spec);
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
      if (op === "list") {
        const out = [];
        for (const x of readRecent()) {
          out.push({ path: x.path, time: x.time, exists: await IOUtils.exists(x.path) });
        }
        return out;
      }
      if (op === "open") {
        const file = await pickFile(this.browsingContext, Ci.nsIFilePicker.modeOpen, t("Открыть документ Markdown"));
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
    if (msg.name === "PdfTweaks:studio-save") {
      // принимаем только со страницы Studio
      const spec = this.manager.documentURI?.spec || "";
      if (!/^(resource:\/\/pdftweaks\/|chrome:\/\/fmstudio\/content\/)studio\.html/.test(spec)) {
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
      if (!/^(resource:\/\/pdftweaks\/|chrome:\/\/fmstudio\/content\/)studio\.html/.test(spec)) {
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
      if (!/^(resource:\/\/pdftweaks\/|chrome:\/\/fmstudio\/content\/)studio\.html/.test(spec)) {
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
