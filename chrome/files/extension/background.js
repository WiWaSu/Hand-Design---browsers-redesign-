/* Hand Design for Chrome — фоновый скрипт.
   1. Настройки из установщика (settings.json) при первом запуске и после переустановки.
   2. Now Bar и плашка звонка: собирает состояние музыки и звонков из вкладок → storage.session.
   3. Переключатель вкладок с превью (Alt+Q): порядок недавних вкладок и миниатюры.
   4. Свой просмотрщик PDF: открывает PDF-файлы в pdf/viewer.html.
   5. Проверка обновлений раз в сутки (latest.json в репозитории релизов). */
import { load, onChange, patch, sanitize, KEY, VERSION } from "./shared/settings.js";
import { THEMES } from "./shared/themes.js";

let S = null;
const ready = load().then(s => (S = s));
onChange(s => {
  S = s;
  paintTopSoon();
  if (!s.checkUpdates) chrome.action.setBadgeText({ text: "" });
});

/* ---------------------------------------------------------------- установка */
chrome.runtime.onInstalled.addListener(async details => {
  await importInstaller(true);
  // 0.1.0 ставил язык из окна установщика (у многих — English при русском Chrome); сбрасываем один раз на «как в браузере»
  const { hdLangReset } = await chrome.storage.local.get("hdLangReset");
  if (!hdLangReset) {
    const got = await chrome.storage.local.get(KEY);
    if (got[KEY] && got[KEY].lang) {
      delete got[KEY].lang;
      await chrome.storage.local.set({ [KEY]: got[KEY] });
    }
    await chrome.storage.local.set({ hdLangReset: true });
  }
  await injectIntoOpenTabs();
  chrome.alarms.create("hd-update", { periodInMinutes: 24 * 60, delayInMinutes: 1 });
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("studio/studio.html#welcome") });
  }
});
chrome.runtime.onStartup.addListener(async () => {
  await importInstaller(false);
  await ready;
  if (S.startPage !== false) openStartPage();
});

/* При запуске браузера стартовая страница (Google, пустая вкладка) — это не новая вкладка, и Hand Design
   на ней не виден. Если в окне одна такая вкладка — заменяем её на новую вкладку Hand Design. */
const START_RE = /^(https?:\/\/(www\.)?google\.[a-z.]+\/?(\?[^#]*)?(#.*)?|about:blank|chrome:\/\/(newtab|new-tab-page)\/?|chrome-search:\/\/local-ntp.*)$/i;
async function openStartPage(attempt = 0) {
  const wins = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] }).catch(() => []);
  if (!wins.length && attempt < 10) return setTimeout(() => openStartPage(attempt + 1), 500);
  for (const w of wins) {
    if (w.incognito || !w.tabs || w.tabs.length !== 1) continue;
    const t = w.tabs[0];
    const url = t.pendingUrl || t.url || "";
    if (START_RE.test(url) && !/[?&]q=/.test(url)) chrome.tabs.update(t.id, { url: "chrome://newtab/" }).catch(() => chrome.tabs.update(t.id, { url: chrome.runtime.getURL("newtab/newtab.html") }).catch(() => {}));
  }
}

/* settings.json пишет установщик. Новая «ревизия» (rev) = пользователь переустановил с другими
   настройками → они важнее сохранённых. */
async function importInstaller() {
  try {
    const res = await fetch(chrome.runtime.getURL("settings.json"), { cache: "no-store" });
    if (!res.ok) return;
    const j = await res.json();
    const { hdInstallerRev } = await chrome.storage.local.get("hdInstallerRev");
    if (!j || !j.rev || j.rev === hdInstallerRev) return;
    const got = await chrome.storage.local.get(KEY);
    // язык установщика — только для окна установщика; расширение говорит на языке браузера, пока его не сменят в Studio
    const fromInstaller = sanitize(j.settings || {});
    delete fromInstaller.lang;
    const merged = { ...(got[KEY] || {}), ...fromInstaller };
    if (j.settings && j.settings.accent === null) delete merged.accent;
    // своя картинка для обоев: установщик кладёт её рядом (wallpaper.jpg / .png / .webp)
    if (j.wallFile && /^wallpaper\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(j.wallFile)) {
      try {
        const blob = await (await fetch(chrome.runtime.getURL(j.wallFile))).blob();
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        await chrome.storage.local.set({ hdWall: `data:${blob.type || "image/jpeg"};base64,${btoa(bin)}` });
        merged.wall = "custom";
      } catch {}
    }
    await chrome.storage.local.set({ [KEY]: sanitize(merged), hdInstallerRev: j.rev, hdInstallDir: j.installDir || "" });
  } catch (e) {
    // settings.json нет — расширение загружено вручную, без установщика
  }
}

/* контент-скрипты не попадают в уже открытые вкладки — добавляем сами */
async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const tab of tabs) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["content/page-hook.js"], world: "MAIN" });
      await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["content/bridge.js"] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/island.js"] });
    } catch {}
  }
}

// плашки в обычных вкладках читают storage.session напрямую
chrome.storage.session.setAccessLevel?.({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" }).catch(() => {});

/* ---------------------------------------------------------------- Now Bar и звонки */
// tabId → { media: {frameId: report}, call: {frameId: report}, callStart, callSeen }
let tabsState = {};
const stateReady = chrome.storage.session.get("hdTabs").then(r => {
  tabsState = r.hdTabs || {};
});
let saveTimer = 0;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(publish, 120);
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function publish() {
  const now = Date.now();
  let media = null;
  let call = null;
  for (const [id, st] of Object.entries(tabsState)) {
    const tabId = Number(id);
    // музыка: последний игравший звук; на паузе — ещё 20 минут, чтобы можно было продолжить
    for (const r of Object.values(st.media || {})) {
      // плеер пропал или сайт ничего не играл по-настоящему — не показываем
      if (!r || r.gone || (!r.playing && (!r.title || now - r.t > 20 * 60e3))) continue;
      const score = (r.playing ? 1e13 : 0) + r.t;
      if (!media || score > media.score) media = { ...r, tabId, score, site: st.host || "", favicon: st.favicon || "" };
    }
    // звонок: есть живой микрофон или камера; после пропажи ждём 30 с (смена устройства)
    let mic = "none";
    let cam = "none";
    for (const r of Object.values(st.call || {})) {
      if (!r) continue;
      if (r.mic === "on" || (r.mic === "off" && mic === "none")) mic = r.mic;
      if (r.cam === "on" || (r.cam === "off" && cam === "none")) cam = r.cam;
    }
    const live = mic !== "none" || cam !== "none";
    if (live) {
      st.callSeen = now;
      if (!st.callStart) st.callStart = now;
    } else if (st.callStart && now - (st.callSeen || 0) > 30e3) {
      st.callStart = 0;
    }
    if (st.callStart && (!call || st.callStart < call.start)) {
      call = { tabId, start: st.callStart, mic, cam, site: st.host || "", favicon: st.favicon || "", title: st.title || "" };
    }
    if (st.callStart && !live) setTimeout(publish, 31e3);
  }
  if (media) delete media.score;
  await chrome.storage.session.set({ hdTabs: tabsState, hdLive: { media, call, t: now } });
}

async function remember(tab, kind, frameId, data) {
  await stateReady;
  const st = (tabsState[tab.id] ||= {});
  st.host = hostOf(tab.url);
  st.title = tab.title || "";
  st.favicon = tab.favIconUrl || "";
  (st[kind] ||= {})[frameId] = { ...data, t: Date.now() };
  persist();
}

chrome.tabs.onRemoved.addListener(async id => {
  await stateReady;
  if (tabsState[id]) {
    delete tabsState[id];
    persist();
  }
  mruRemove(id);
  chrome.storage.session.remove("thumb:" + id);
});
chrome.tabs.onUpdated.addListener(async (id, info, tab) => {
  await stateReady;
  // ушли со страницы — её плееры и звонок закончились
  if (info.status === "loading" && info.url && tabsState[id]) {
    tabsState[id].media = {};
    tabsState[id].call = {};
    persist();
  }
  if (info.status === "complete" && tab.active) thumbSoon(tab.windowId);
  if (info.status === "loading" && tab.url && /^file:/i.test(tab.url)) ready.then(() => S.pdf && maybeLocalPdf(tab));
});

function sendCmd(tabId, cmd) {
  return chrome.tabs.sendMessage(tabId, { type: "hd:cmd", ...cmd }).catch(() => {});
}

/* ---------------------------------------------------------------- сообщения */
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || typeof msg.type !== "string" || !msg.type.startsWith("hd:")) return;
  const tab = sender.tab;
  switch (msg.type) {
    case "hd:media":
      if (tab) remember(tab, "media", sender.frameId || 0, sanitizeMedia(msg.data));
      return;
    case "hd:call":
      if (tab) remember(tab, "call", sender.frameId || 0, sanitizeCall(msg.data));
      return;
    case "hd:call-hint":
      // сайт отпустил камеру/микрофон, а своей кнопки не нашлось — открываем вкладку звонка
      if (tab) focusTab(tab.id);
      return;
    case "hd:whoami":
      reply({ tabId: tab ? tab.id : null });
      return;
    case "hd:media-cmd": // от плашки: play | pause | toggle | next | prev
      sendCmd(msg.tabId, { what: "media", action: msg.action });
      return;
    case "hd:call-cmd": // kind: mic | cam, want: on | off
      sendCmd(msg.tabId, { what: "call", kind: msg.kind, want: msg.want });
      return;
    case "hd:focus-tab":
      focusTab(msg.tabId);
      return;
    case "hd:switcher-data":
      switcherData(msg.win).then(reply);
      return true;
    case "hd:switcher-pick":
      pickTab(msg.tabId, msg.switcherWin);
      return;
    case "hd:switcher-close-tab":
      chrome.tabs.remove(msg.tabId).catch(() => {});
      return;
    case "hd:check-update":
      checkUpdate(true).then(reply);
      return true;
    case "hd:open-studio":
      chrome.runtime.openOptionsPage();
      return;
  }
});

const str = (v, n = 300) => (typeof v === "string" ? v.slice(0, n) : "");
function sanitizeMedia(d = {}) {
  return {
    playing: !!d.playing, title: str(d.title), artist: str(d.artist), album: str(d.album),
    artwork: /^(https?:|data:image\/)/.test(d.artwork || "") ? str(d.artwork, 2000) : "",
    hasNext: !!d.hasNext, hasPrev: !!d.hasPrev, video: !!d.video, gone: !!d.gone,
  };
}
function sanitizeCall(d = {}) {
  const ok = v => (["on", "off", "none"].includes(v) ? v : "none");
  return { mic: ok(d.mic), cam: ok(d.cam) };
}

async function focusTab(tabId) {
  try {
    const tab = await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } catch {}
}

/* ---------------------------------------------------------------- горячие клавиши */
chrome.commands.onCommand.addListener(async cmd => {
  await ready;
  if (cmd === "switcher") return openSwitcher();
  if (cmd === "open-studio") return chrome.runtime.openOptionsPage();
  const { hdLive } = await chrome.storage.session.get("hdLive");
  if ((cmd === "toggle-mic" || cmd === "toggle-cam") && hdLive?.call) {
    const kind = cmd === "toggle-mic" ? "mic" : "cam";
    sendCmd(hdLive.call.tabId, { what: "call", kind, want: hdLive.call[kind] === "on" ? "off" : "on" });
  }
  if (cmd === "media-toggle" && hdLive?.media) {
    sendCmd(hdLive.media.tabId, { what: "media", action: "toggle" });
  }
});

/* ---------------------------------------------------------------- переключатель вкладок */
// порядок недавних вкладок по окнам: windowId → [tabId, …] (первая — текущая)
let mru = {};
const mruReady = chrome.storage.session.get("hdMru").then(r => (mru = r.hdMru || {}));
let switcherWin = null;

function mruSave() {
  chrome.storage.session.set({ hdMru: mru });
}
function mruRemove(id) {
  for (const w of Object.keys(mru)) mru[w] = mru[w].filter(x => x !== id);
  mruSave();
}
chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  await mruReady;
  if (windowId === switcherWin) return;
  const list = (mru[windowId] || []).filter(x => x !== tabId);
  list.unshift(tabId);
  mru[windowId] = list.slice(0, 60);
  mruSave();
  thumbSoon(windowId);
});
chrome.windows.onRemoved.addListener(id => {
  if (id === switcherWin) switcherWin = null;
  delete mru[id];
  mruSave();
});

let thumbTimer = 0;
function thumbSoon(windowId) {
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(() => snapshot(windowId), 450);
}
async function snapshot(windowId) {
  await ready;
  if (!S.switcher || windowId === switcherWin) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (!tab || !/^(https?|file|chrome-extension):/.test(tab.url || "")) return;
    const url = await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 70 });
    const small = await shrink(url, 520);
    await chrome.storage.session.set({ ["thumb:" + tab.id]: small });
  } catch {
    // окно свёрнуто, страница браузера или нет прав — без миниатюры
  }
}
async function shrink(dataUrl, width) {
  const blob = await (await fetch(dataUrl)).blob();
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, width / bmp.width);
  const cv = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
  cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
  const out = await cv.convertToBlob({ type: "image/jpeg", quality: 0.72 });
  const buf = new Uint8Array(await out.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return "data:image/jpeg;base64," + btoa(bin);
}

async function openSwitcher() {
  if (!S?.switcher) {
    // окно выключено в Studio — просто предыдущая вкладка
    const w = await chrome.windows.getLastFocused();
    await mruReady;
    const prev = (mru[w.id] || [])[1];
    if (prev) focusTab(prev);
    return;
  }
  if (switcherWin !== null) {
    chrome.runtime.sendMessage({ type: "hd:switcher-next" }).catch(() => {});
    return;
  }
  const w = await chrome.windows.getLastFocused();
  const list = S.switcherStyle === "list";
  const width = Math.min(list ? 640 : 1120, Math.max(420, (w.width || 1200) - 80));
  const height = list ? 520 : 440;
  const left = Math.round((w.left || 0) + ((w.width || width) - width) / 2);
  const top = Math.round((w.top || 0) + ((w.height || height) - height) / 2.4);
  switcherWin = -1; // открывается
  try {
    const win = await chrome.windows.create({
      url: chrome.runtime.getURL(`switcher/switcher.html?win=${w.id}`), type: "popup", focused: true, width, height, left, top,
    });
    switcherWin = win.id;
  } catch (e) {
    switcherWin = null;
  }
}

async function switcherData(win) {
  await mruReady;
  const tabs = await chrome.tabs.query({ windowId: Number(win) });
  const order = mru[win] || [];
  const pos = id => {
    const i = order.indexOf(id);
    return i < 0 ? 1000 + id : i;
  };
  tabs.sort((a, b) => pos(a.id) - pos(b.id));
  const keys = tabs.map(t => "thumb:" + t.id);
  const thumbs = await chrome.storage.session.get(keys);
  return {
    style: S.switcherStyle,
    tabs: tabs.map(t => ({ id: t.id, title: t.title, url: t.url, favicon: t.favIconUrl || "", thumb: thumbs["thumb:" + t.id] || "", audible: t.audible })),
  };
}

async function pickTab(tabId, sw) {
  if (tabId) await focusTab(tabId);
  if (sw) chrome.windows.remove(sw).catch(() => {});
  switcherWin = null;
}

/* ---------------------------------------------------------------- PDF */
const VIEWER = chrome.runtime.getURL("pdf/viewer.html");
chrome.webRequest.onHeadersReceived.addListener(
  d => {
    if (d.tabId < 0 || d.method !== "GET" || d.url.includes("#hd-native")) return;
    const h = name => (d.responseHeaders || []).find(x => x.name.toLowerCase() === name)?.value || "";
    const type = h("content-type").toLowerCase();
    const disp = h("content-disposition").toLowerCase();
    if (disp.startsWith("attachment")) return; // сайт просит скачать — не мешаем
    const isPdf = type.startsWith("application/pdf") || (type.startsWith("application/octet-stream") && /\.pdf($|[?#])/i.test(d.url));
    if (!isPdf || d.statusCode < 200 || d.statusCode >= 300) return;
    // фоновый скрипт мог только что проснуться от этого запроса — настройки читаем асинхронно
    ready.then(() => S.pdf && chrome.tabs.update(d.tabId, { url: `${VIEWER}?file=${encodeURIComponent(d.url)}` }).catch(() => {}));
  },
  { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] },
  ["responseHeaders"]
);
async function maybeLocalPdf(tab) {
  if (!/^file:\/\/.+\.pdf$/i.test(tab.url)) return;
  if (!(await chrome.extension.isAllowedFileSchemeAccess())) return;
  chrome.tabs.update(tab.id, { url: `${VIEWER}?file=${encodeURIComponent(tab.url)}` }).catch(() => {});
}

/* ---------------------------------------------------------------- обновления */
const RELEASES = "WiWaSu/Hand-Design---browsers-redesign-";
function newer(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}
async function checkUpdate(force = false) {
  await ready;
  if (!S.checkUpdates && !force) return null;
  for (const branch of ["main", "master"]) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${RELEASES}/${branch}/latest.json`, { cache: "no-store" });
      if (!res.ok) continue;
      const j = await res.json();
      // строка Chromium в latest.json: "chrome": "0.2.0" или { "version": "0.2.0", "url": "…" }
      const c = j.chrome || j.chromium || null;
      const latest = typeof c === "string" ? c : c?.version;
      const info = {
        latest: latest || null, checked: Date.now(),
        url: (c && c.url) || `https://github.com/${RELEASES}`,
        available: !!latest && newer(latest, VERSION),
      };
      await chrome.storage.local.set({ hdUpdate: info });
      chrome.action.setBadgeText({ text: info.available ? "↑" : "" });
      chrome.action.setBadgeBackgroundColor({ color: "#4C9AFF" });
      return info;
    } catch {}
  }
  return { latest: null, checked: Date.now(), error: true };
}
chrome.alarms.onAlarm.addListener(a => a.name === "hd-update" && checkUpdate());
chrome.alarms.get("hd-update").then(a => a || chrome.alarms.create("hd-update", { periodInMinutes: 24 * 60, delayInMinutes: 1 }));


/* ---------------------------------------------------------------- верх браузера в цвет темы
   У Chrome нет API для цвета рамки. Помощник Hand Design (native messaging, ставит установщик) пишет
   политику BrowserThemeColor в HKCU — Chrome, Brave и Chromium красят вкладки и адресную строку
   оттенками этого цвета сразу, без перезапуска. Выключено в Studio — помощник убирает политику. */
const HOST = "com.handdesign.host";
function browserKey() {
  const brands = (navigator.userAgentData?.brands || []).map(b => b.brand).join(" ");
  const ua = navigator.userAgent;
  if (/Brave/i.test(brands)) return "brave";
  if (/Edge/i.test(brands) || /Edg\//.test(ua)) return "edge";
  if (/Opera|OPR/i.test(brands) || /OPR\//.test(ua)) return "opera";
  if (/Yandex|YaBrowser/i.test(brands) || /YaBrowser/.test(ua)) return "yandex";
  if (/Vivaldi/i.test(ua)) return "vivaldi";
  if (/Google Chrome/i.test(brands)) return "chrome";
  if (/Chromium/i.test(brands)) return "chromium";
  return "other";
}
function seedColor(s) {
  if (s.accent && /^#[0-9a-f]{6}$/i.test(s.accent)) return s.accent.toUpperCase();
  const t = THEMES.find(x => x.id === s.theme) || THEMES[0];
  const usesSys = /--hd-sys-accent/.test(t.vars?.accent || "");
  const c = usesSys ? s.sysAccent || t.accentDefault : t.accentDefault;
  return (/^#[0-9a-f]{6}$/i.test(c || "") ? c : "#4C9AFF").toUpperCase();
}
function hostSend(msg) {
  return new Promise(res => {
    try {
      chrome.runtime.sendNativeMessage(HOST, msg, r => {
        const err = chrome.runtime.lastError;
        res(err ? { ok: false, reason: "no-host", error: err.message } : r || { ok: false, reason: "empty" });
      });
    } catch (e) {
      res({ ok: false, reason: "no-host", error: String(e) });
    }
  });
}
let topTimer = 0;
function paintTopSoon(force = false) {
  clearTimeout(topTimer);
  topTimer = setTimeout(() => paintTop(force), 400);
}
async function paintTop(force = false) {
  await ready;
  const browser = browserKey();
  const msg = S.autoFrame === false ? { cmd: "clear", browser } : { cmd: "color", browser, color: seedColor(S) };
  const sig = JSON.stringify(msg);
  const { hdTop } = await chrome.storage.local.get("hdTop");
  if (!force && hdTop && hdTop.sig === sig && hdTop.ok) return;
  const r = await hostSend(msg);
  await chrome.storage.local.set({ hdTop: { sig, ok: !!r.ok, on: msg.cmd === "color" && !!r.ok, reason: r.reason || "", browser, at: Date.now() } });
}
chrome.runtime.onStartup.addListener(() => paintTopSoon(true));
chrome.runtime.onInstalled.addListener(() => paintTopSoon(true));
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m && m.hd === "paint-top") {
    paintTop(true).then(() => chrome.storage.local.get("hdTop")).then(x => reply(x.hdTop));
    return true;
  }
});
