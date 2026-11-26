/* Новая вкладка Hand Design: данные для страницы и виджетов (главный процесс).
   Принимает запросы только со страницы resource://handdesign/newtab.html. В интернет ходит
   только погода, курсы, RSS и свои виджеты — и только по адресам из настроек виджета. */

export const NEWTAB_URL = "resource://handdesign/newtab.html";
export const PANEL_URL = "resource://handdesign/panel.html";
export const PANEL_CHROME_URL = "chrome://fmstudio/content/panel.html";
export const WIDGETS_PREF = "floorp.modern.widgets";
const MAX_STATE = 400 * 1024;
const MAX_BODY = 2 * 1024 * 1024;

import { setTimeout, clearTimeout } from "resource://gre/modules/Timer.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  NewTabUtils: "resource://gre/modules/NewTabUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  SessionStore: "resource:///modules/sessionstore/SessionStore.sys.mjs",
});

export function readState() {
  try {
    const s = JSON.parse(Services.prefs.getStringPref(WIDGETS_PREF, "{}"));
    return s && typeof s === "object" ? s : {};
  } catch {
    return {};
  }
}

const cache = new Map();
async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) {
    return hit.v;
  }
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

async function getText(url, maxBytes = MAX_BODY) {
  let timer;
  const late = new Promise((res, rej) => (timer = setTimeout(() => rej(new Error("timeout")), 12000)));
  try {
    const r = await Promise.race([fetch(url, { credentials: "omit", cache: "no-store" }), late]);
    const buf = await Promise.race([r.arrayBuffer(), late]);
    if (buf.byteLength > maxBytes) {
      return { ok: false, status: 413, text: "" };
    }
    return { ok: r.ok, status: r.status, text: new TextDecoder().decode(buf), type: r.headers.get("content-type") || "" };
  } finally {
    clearTimeout(timer);
  }
}
const getJSON = async url => {
  const r = await getText(url);
  return r.ok ? JSON.parse(r.text) : null;
};

const isHttps = u => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

/* адрес должен быть в настройках какого-нибудь виджета этого типа */
function itemWith(type, test) {
  return (readState().items || []).find(it => it?.type === type && test(it.o || {}, it));
}

async function weather(o) {
  const city = String(o.city || "").trim().slice(0, 80);
  if (!city || !itemWith("weather", w => String(w.city || "").trim() === city)) {
    return { error: "city" };
  }
  const f = o.units === "f";
  return cached(`w|${city}|${f}`, 30 * 60e3, async () => {
    const geo = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=ru&name=${encodeURIComponent(city)}`);
    const p = geo?.results?.[0];
    if (!p) {
      return { error: "notfound" };
    }
    const q = new URLSearchParams({
      latitude: p.latitude,
      longitude: p.longitude,
      timezone: "auto",
      forecast_days: "7",
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day",
      hourly: "temperature_2m,weather_code,precipitation_probability",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max",
    });
    if (f) {
      q.set("temperature_unit", "fahrenheit");
    }
    const d = await getJSON("https://api.open-meteo.com/v1/forecast?" + q);
    return d ? { place: p.name, country: p.country || "", tz: d.timezone, current: d.current, hourly: d.hourly, daily: d.daily } : { error: "net" };
  });
}

async function rates(o) {
  const base = String(o.base || "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(base) || !itemWith("rates", w => String(w.base || "USD").toUpperCase() === base)) {
    return { error: "base" };
  }
  return cached("r|" + base, 6 * 3600e3, async () => {
    const d = await getJSON(`https://open.er-api.com/v6/latest/${base}`);
    return d?.rates ? { base, rates: d.rates, time: d.time_last_update_unix * 1000 } : { error: "net" };
  });
}

async function rss(o) {
  const url = String(o.url || "").trim();
  if (!isHttps(url) || !itemWith("rss", w => String(w.url || "").trim() === url)) {
    return { error: "url" };
  }
  return cached("f|" + url, 20 * 60e3, async () => {
    const r = await getText(url);
    return r.ok ? { text: r.text } : { error: "net", status: r.status };
  });
}

/* свой виджет: только адреса, которые он объявил и которые человек разрешил при добавлении */
async function customFetch(o) {
  const id = String(o.id || "");
  const url = String(o.url || "");
  const it = itemWith("custom", (w, item) => item.id === id);
  if (!it || !isHttps(url)) {
    return { ok: false, status: 0, text: "", error: "not allowed" };
  }
  const allowed = Array.isArray(it.o.network) ? it.o.network : [];
  const origin = new URL(url).origin;
  if (!allowed.some(a => {
    try {
      return new URL(a).origin === origin;
    } catch {
      return false;
    }
  })) {
    return { ok: false, status: 0, text: "", error: "not allowed" };
  }
  try {
    return await getText(url, 1024 * 1024);
  } catch (e) {
    return { ok: false, status: 0, text: "", error: String(e) };
  }
}

/* свои виджеты и картинки — файлами в профиле: <профиль>\hd-widgets */
const widgetDir = () => PathUtils.join(PathUtils.profileDir, "hd-widgets");
const safeId = id => (/^[a-z0-9-]{4,40}$/.test(String(id)) ? String(id) : null);

async function sites() {
  let links = [];
  try {
    links = await lazy.NewTabUtils.activityStreamLinks.getTopSites({ numItems: 16, includeFavicon: false });
  } catch {}
  const out = [];
  for (const l of links || []) {
    if (!l?.url || !/^https?:/.test(l.url) || out.length >= 8) {
      continue;
    }
    let icon = "";
    try {
      const f = await lazy.PlacesUtils.favicons.getFaviconForPage(Services.io.newURI(l.url));
      icon = f?.dataURI?.spec || "";
    } catch {}
    let host = "";
    try {
      host = new URL(l.url).hostname.replace(/^www\./, "");
    } catch {}
    out.push({ url: l.url, title: l.label || l.title || host, icon, host });
  }
  return out;
}

async function bookmarkFolders() {
  const out = [];
  const walk = async (guid, depth, prefix) => {
    if (depth > 3 || out.length > 200) {
      return;
    }
    let tree;
    try {
      tree = await lazy.PlacesUtils.promiseBookmarksTree(guid, { includeItemIds: false });
    } catch {
      return;
    }
    for (const c of tree?.children || []) {
      if (c.type === lazy.PlacesUtils.TYPE_X_MOZ_PLACE_CONTAINER) {
        out.push({ guid: c.guid, title: prefix + (c.title || "—") });
        await walk(c.guid, depth + 1, prefix + "  ");
      }
    }
  };
  for (const root of [lazy.PlacesUtils.bookmarks.toolbarGuid, lazy.PlacesUtils.bookmarks.menuGuid, lazy.PlacesUtils.bookmarks.unfiledGuid]) {
    await walk(root, 0, "");
  }
  return out;
}

async function bookmarks(guid) {
  if (!/^[\w-]{12}$/.test(String(guid || ""))) {
    guid = lazy.PlacesUtils.bookmarks.toolbarGuid;
  }
  const tree = await lazy.PlacesUtils.promiseBookmarksTree(guid).catch(() => null);
  const out = [];
  for (const c of tree?.children || []) {
    if (c.uri && /^https?:/.test(c.uri) && out.length < 24) {
      let icon = "";
      try {
        icon = (await lazy.PlacesUtils.favicons.getFaviconForPage(Services.io.newURI(c.uri)))?.dataURI?.spec || "";
      } catch {}
      out.push({ url: c.uri, title: c.title || c.uri, icon });
    }
  }
  return { title: tree?.title || "", items: out };
}

function topWin() {
  return Services.wm.getMostRecentWindow("navigator:browser");
}

function closedTabs() {
  const win = topWin();
  if (!win) {
    return [];
  }
  let list = [];
  try {
    list = lazy.SessionStore.getClosedTabDataForWindow(win);
  } catch {
    try {
      list = lazy.SessionStore.getClosedTabData(win);
    } catch {}
  }
  return (list || []).slice(0, 10).map((c, i) => {
    const e = c.state?.entries?.[(c.state.index || 1) - 1] || c.state?.entries?.at(-1) || {};
    return { i, title: c.title || e.title || e.url || "", url: e.url || "", icon: typeof c.image === "string" && /^data:/.test(c.image) ? c.image : "" };
  });
}

function mediaTabs() {
  const out = [];
  for (const win of Services.wm.getEnumerator("navigator:browser")) {
    for (const tab of win.gBrowser?.tabs || []) {
      const mc = tab.linkedBrowser?.browsingContext?.mediaController;
      if (!mc || !mc.isActive) {
        continue;
      }
      let meta = {};
      try {
        meta = mc.getMetadata() || {};
      } catch {}
      out.push({
        key: tab.linkedBrowser.browsingContext.id,
        playing: !!mc.isPlaying,
        title: meta.title || tab.label || "",
        artist: meta.artist || "",
        art: (meta.artwork || []).map(a => a.src).find(s => /^https:/.test(s)) || "",
        site: tab.linkedBrowser.currentURI?.host || "",
        keys: [...(mc.supportedKeys || [])],
      });
    }
  }
  return out.sort((a, b) => b.playing - a.playing);
}

function mediaAction(key, act) {
  for (const win of Services.wm.getEnumerator("navigator:browser")) {
    for (const tab of win.gBrowser?.tabs || []) {
      const bc = tab.linkedBrowser?.browsingContext;
      if (bc?.id !== key) {
        continue;
      }
      const mc = bc.mediaController;
      if (act === "focus") {
        win.gBrowser.selectedTab = tab;
        win.focus();
      } else if (act === "toggle") {
        mc.isPlaying ? mc.pause() : mc.play();
      } else if (act === "next") {
        mc.nextTrack();
      } else if (act === "prev") {
        mc.prevTrack();
      }
      return true;
    }
  }
  return false;
}

/* заметки: список, чтение и отметка задачи — только внутри папки заметок */
const NOTES_DIR_PREF = "floorp.modern.notes.dir";
const notesDir = () => Services.prefs.getStringPref(NOTES_DIR_PREF, "");
function notePath(rel) {
  const dir = notesDir();
  rel = String(rel || "");
  const parts = rel.split("/");
  if (!dir || !/\.md$/i.test(rel) || parts.some(p => !p || p === "." || p === ".." || p.startsWith(".")) || /^[A-Za-z]:|\\/.test(rel)) {
    return null;
  }
  return PathUtils.join(dir, ...parts);
}
async function noteList() {
  const dir = notesDir();
  if (!dir) {
    return { dir: false, items: [] };
  }
  const items = [];
  const walk = async (path, rel, depth) => {
    if (depth > 4 || items.length > 400) {
      return;
    }
    let kids = [];
    try {
      kids = await IOUtils.getChildren(path);
    } catch {
      return;
    }
    for (const k of kids) {
      const name = PathUtils.filename(k);
      if (name.startsWith(".")) {
        continue;
      }
      const r = rel ? rel + "/" + name : name;
      const st = await IOUtils.stat(k).catch(() => null);
      if (st?.type === "directory") {
        await walk(k, r, depth + 1);
      } else if (/\.md$/i.test(name)) {
        items.push({ rel: r, title: name.replace(/\.md$/i, ""), mtime: st?.lastModified || 0 });
      }
    }
  };
  await walk(dir, "", 0);
  items.sort((a, b) => b.mtime - a.mtime);
  return { dir: true, items };
}

function openUrl(url, bg = false) {
  const win = topWin();
  if (!win || !/^https?:\/\//.test(String(url))) {
    return false;
  }
  win.openWebLinkIn(String(url), "tab", { inBackground: bg });
  return true;
}

/* боковая панель: заметки с первой строкой, закреплённые, поиск по тексту, «Входящие» */
const NOTES_PIN_PREF = "floorp.modern.notes.pinned";
const firstLine = text =>
  String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .split("\n")
    .map(l => l.replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/, "").replace(/[*_`~]|\[\[([^\]|]*)[^\]]*\]\]|\[([^\]]*)\]\([^)]*\)/g, "$1$2").trim())
    .filter(l => l && !/^[-=|: ]+$/.test(l))
    .slice(1, 3)
    .join(" · ")
    .slice(0, 140);
async function withPreview(items) {
  const out = [];
  for (const n of items) {
    const p = notePath(n.rel);
    let text = "";
    try {
      text = p ? await IOUtils.readUTF8(p) : "";
    } catch {}
    out.push({ ...n, preview: firstLine(text), tasks: (text.match(/^\s*[-*+]\s+\[[ xX]\]/gm) || []).length, done: (text.match(/^\s*[-*+]\s+\[[xX]\]/gm) || []).length });
  }
  return out;
}
async function panelNotes() {
  const r = await noteList();
  if (!r.dir) {
    return r;
  }
  let pins = [];
  try {
    pins = JSON.parse(Services.prefs.getStringPref(NOTES_PIN_PREF, "[]"));
  } catch {}
  pins = Array.isArray(pins) ? pins : [];
  const pinned = r.items.filter(n => pins.includes(n.rel));
  const recent = r.items.filter(n => !pins.includes(n.rel)).slice(0, 25);
  return { dir: true, pinned: await withPreview(pinned), recent: await withPreview(recent), all: r.items.map(n => ({ rel: n.rel, title: n.title, mtime: n.mtime })) };
}
async function notesSearch(q) {
  q = String(q || "").trim().toLowerCase().replace(/ё/g, "е");
  const r = await noteList();
  if (q.length < 2 || !r.dir) {
    return [];
  }
  const hits = [];
  for (const n of r.items) {
    if (hits.length >= 30) {
      break;
    }
    const p = notePath(n.rel);
    let text = "";
    try {
      text = await IOUtils.readUTF8(p);
    } catch {
      continue;
    }
    const at = text.toLowerCase().replace(/ё/g, "е").indexOf(q);
    if (at < 0) {
      continue;
    }
    const from = Math.max(0, at - 40);
    hits.push({ rel: n.rel, title: n.title, snippet: (from ? "…" : "") + text.slice(from, at + q.length + 70).replace(/\s+/g, " ").trim() + "…" });
  }
  return hits;
}
async function inboxAdd(text, name) {
  const dir = notesDir();
  text = String(text || "").trim().slice(0, 4000);
  if (!dir || !text) {
    return { ok: false };
  }
  const file = String(name || "Входящие").replace(/[\\/:*?"<>|]/g, " ").trim() || "Входящие";
  const path = PathUtils.join(dir, file + ".md");
  let body = "";
  try {
    body = await IOUtils.readUTF8(path);
  } catch {
    body = `# ${file}\n`;
  }
  const d = new Date();
  const stamp = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const line = `- ${stamp} — ${text.replace(/\r?\n/g, "\n  ")}`;
  await IOUtils.writeUTF8(path, body.replace(/\s*$/, "\n") + line + "\n", { tmpPath: path + ".hd-tmp" });
  return { ok: true, rel: file + ".md" };
}

export async function handleNewtab(actor, op, data, helpers) {
  const page = actor.manager.documentURI?.spec;
  if (page !== NEWTAB_URL && page !== PANEL_URL && page !== PANEL_CHROME_URL) {
    return null;
  }
  data = data || {};
  try {
    switch (op) {
      case "sites":
        return await sites();
      case "search": {
        const win = topWin();
        if (win?.gURLBar) {
          const text = String(data.text || "").slice(0, 200);
          if (text) {
            win.gURLBar.search(text);
          } else {
            win.gURLBar.focus();
            win.gURLBar.select();
          }
        }
        return null;
      }
      case "state-get": {
        let theme = "";
        try {
          theme = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernThemes.sys.mjs").current();
        } catch {}
        let square = false;
        try {
          square = JSON.parse(Services.prefs.getStringPref("floorp.modern.studio", "{}")).square === true;
        } catch {}
        return { ...readState(), theme, square };
      }
      case "state-set": {
        const text = JSON.stringify(data.state || {});
        if (text.length > MAX_STATE) {
          return { ok: false, error: "too big" };
        }
        Services.prefs.setStringPref(WIDGETS_PREF, text);
        return { ok: true };
      }
      case "weather":
        return await weather(data);
      case "rates":
        return await rates(data);
      case "rss":
        return await rss(data);
      case "fetch":
        return await customFetch(data);
      case "open":
        return openUrl(data.url, !!data.bg);
      case "closed":
        return closedTabs();
      case "reopen": {
        const win = topWin();
        if (win && Number.isInteger(data.i)) {
          lazy.SessionStore.undoCloseTab(win, data.i);
        }
        return null;
      }
      case "folders":
        return await bookmarkFolders();
      case "bookmarks":
        return await bookmarks(data.guid);
      case "media":
        return mediaTabs();
      case "media-act":
        return mediaAction(data.key, String(data.act || ""));
      case "notes":
        return await noteList();
      case "note-read": {
        const p = notePath(data.rel);
        return p ? { text: await IOUtils.readUTF8(p).catch(() => null) } : { text: null };
      }
      case "note-write": {
        const p = notePath(data.rel);
        const text = String(data.text ?? "");
        if (!p || text.length > MAX_BODY || !(await IOUtils.exists(p))) {
          return { ok: false };
        }
        await IOUtils.writeUTF8(p, text, { tmpPath: p + ".hd-tmp" });
        return { ok: true };
      }
      case "note-open":
        if (!data.rel || notePath(data.rel)) {
          helpers.openNote?.(String(data.rel || ""));
        }
        return null;
      case "open-docs":
        helpers.openDocs?.();
        return null;
      case "docs":
        return await helpers.docsList();
      case "doc-open":
        return await helpers.openDoc(String(data.path || ""));
      case "file-save": {
        const id = safeId(data.id);
        const kind = data.kind === "code" ? "html" : /^(png|jpg|webp|gif)$/.test(data.kind) ? data.kind : null;
        if (!id || !kind) {
          return { ok: false };
        }
        await IOUtils.makeDirectory(widgetDir(), { ignoreExisting: true });
        const path = PathUtils.join(widgetDir(), `${id}.${kind}`);
        if (kind === "html") {
          const text = String(data.text || "");
          if (text.length > MAX_BODY) {
            return { ok: false, error: "too big" };
          }
          await IOUtils.writeUTF8(path, text);
        } else {
          const bytes = Uint8Array.fromBase64(String(data.b64 || ""));
          if (bytes.length > 15 * 1024 * 1024) {
            return { ok: false, error: "too big" };
          }
          await IOUtils.write(path, bytes);
        }
        return { ok: true };
      }
      case "file-read": {
        const id = safeId(data.id);
        const kind = data.kind === "code" ? "html" : /^(png|jpg|webp|gif)$/.test(data.kind) ? data.kind : null;
        if (!id || !kind) {
          return null;
        }
        const path = PathUtils.join(widgetDir(), `${id}.${kind}`);
        if (!(await IOUtils.exists(path))) {
          return null;
        }
        if (kind === "html") {
          return { text: await IOUtils.readUTF8(path) };
        }
        const mime = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" }[kind];
        return { url: `data:${mime};base64,${(await IOUtils.read(path)).toBase64()}` };
      }
      case "file-delete": {
        const id = safeId(data.id);
        if (id) {
          for (const ext of ["html", "png", "jpg", "webp", "gif"]) {
            await IOUtils.remove(PathUtils.join(widgetDir(), `${id}.${ext}`), { ignoreAbsent: true });
          }
        }
        return null;
      }
      case "studio":
        helpers.openStudio?.();
        return null;
      case "panel-notes":
        return await panelNotes();
      case "notes-search":
        return await notesSearch(data.q);
      case "inbox-add":
        return await inboxAdd(data.text, data.name);
      case "page": {
        const win = actor.browsingContext.topChromeWindow || topWin();
        const b = win?.gBrowser?.selectedBrowser;
        const url = b?.currentURI?.spec || "";
        return /^https?:/.test(url) ? { url, title: b.contentTitle || url } : null;
      }
    }
  } catch (e) {
    return { error: String(e?.message || e) };
  }
  return null;
}
