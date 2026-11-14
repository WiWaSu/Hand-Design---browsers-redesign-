/* Floorp PDF tweaks — runs inside the built-in PDF viewer (PDF.js).
 *  1. Theme button: interface light / dark / auto + page tone.
 *  2. Ink: each separate drawing becomes its own annotation, so its
 *     selection box hugs the drawing and you can keep drawing next to it.
 */

import { t, langSetting } from "resource://pdftweaks/FloorpModernL10n.sys.mjs";

// Пауза после штриха, после которой рисунок считается законченным (мс)
const IDLE_MS = 900;
// Если новый штрих начат дальше этого расстояния от рисунка (px) — это новый рисунок
const GAP_PX = 28;
// один «рисунок» — примерно одно слово: дальше этого размера начинается новый
const MAX_W = 260;
const MAX_H = 140;
// Насколько близко к линии рисунка нужно навести, чтобы его можно было схватить (px)
const GRAB_PX = 5;

/* Настройки просмотрщика из Hand Design Studio (раздел «Просмотрщик PDF» и
   «PDF: карандаш и тайминги»). Не задано — значения по умолчанию ниже. */
const PDF_DEF = {
  pdfInkGroup: true, pdfInkIdle: IDLE_MS, pdfInkGap: GAP_PX, pdfInkMaxW: MAX_W, pdfInkMaxH: MAX_H, pdfGrab: GRAB_PX,
  pdfInkSelect: false, pdfShiftLine: true, pdfShiftStep: "45", pdfHoldSpeed: 70, pdfHoldDelay: 380,
  pdfAutoParams: false, pdfSteppers: true, pdfColors: true, pdfClear: true, pdfBookmarks: true,
  pdfThemeButton: true, pdfQuickText: true, pdfResume: true, pdfAnim: true,
};
let pdfCfgCache = null;
function pdfCfg() {
  if (!pdfCfgCache) {
    let raw = {};
    try {
      raw = JSON.parse(Services.prefs.getStringPref("floorp.modern.studio", "{}")) || {};
    } catch {}
    pdfCfgCache = { ...PDF_DEF };
    for (const k of Object.keys(PDF_DEF)) {
      if (raw[k] !== undefined && raw[k] !== null && typeof raw[k] === typeof PDF_DEF[k]) {
        pdfCfgCache[k] = raw[k];
      }
    }
  }
  return pdfCfgCache;
}
try {
  Services.prefs.addObserver("floorp.modern.studio", () => (pdfCfgCache = null));
} catch {}

const PREF_UI = "floorp.pdftweaks.ui"; // auto | light | dark
const PREF_PAGE = "floorp.pdftweaks.page"; // auto | paper | sepia | night
const UI_VALUES = ["auto", "light", "dark"];
const PAGE_VALUES = ["auto", "paper", "sepia", "night"];

function readPref(name, allowed) {
  try {
    const v = Services.prefs.getStringPref(name, allowed[0]);
    return allowed.includes(v) ? v : allowed[0];
  } catch {
    return allowed[0];
  }
}

let bootSent = false;

/* Обои новой вкладки. Те же ключи понимает установщик (параметр -Wall). */
const PREF_WALL = "floorp.modern.wallpaper"; // theme | <ключ ниже> | custom
const PREF_WALL_DIM = "floorp.modern.wallpaper.dim"; // затемнение 0…70 %
const WALLS = [
  ["aurora", "Аврора", "radial-gradient(40% 50% at 22% 28%, rgb(107 77 255 / .9), transparent 70%), radial-gradient(36% 44% at 78% 22%, rgb(180 77 255 / .7), transparent 70%), radial-gradient(42% 52% at 62% 82%, rgb(0 180 255 / .55), transparent 70%), radial-gradient(30% 36% at 18% 86%, rgb(255 80 170 / .4), transparent 70%), #05060c"],
  ["iris", "Ирис", "radial-gradient(60% 55% at 18% 18%, #409cff, transparent 62%), radial-gradient(55% 60% at 85% 30%, #7a3cc8, transparent 65%), radial-gradient(60% 55% at 55% 95%, #ff5c8c, transparent 65%), #0a0b2a"],
  ["sunset", "Закат", "radial-gradient(70% 60% at 50% 100%, #ffb36b, transparent 70%), linear-gradient(170deg, #2b1055 0%, #7a2a7a 45%, #ff7e5f 80%, #feb47b 100%)"],
  ["ocean", "Океан", "radial-gradient(60% 50% at 30% 20%, rgb(0 198 255 / .85), transparent 65%), linear-gradient(180deg, #0072ff 0%, #023a7a 55%, #021b3a 100%)"],
  ["forest", "Лес", "radial-gradient(55% 50% at 75% 15%, rgb(168 224 99 / .55), transparent 65%), linear-gradient(160deg, #2f8f5b 0%, #145a3c 45%, #0b2e22 100%)"],
  ["night", "Ночь", "radial-gradient(50% 40% at 70% 20%, rgb(120 160 255 / .25), transparent 70%), linear-gradient(180deg, #0f2027, #203a43 55%, #2c5364)"],
  ["rose", "Пудра", "radial-gradient(60% 60% at 20% 20%, #fbd3e0, transparent 70%), linear-gradient(135deg, #f9c5d1 0%, #c7b5f0 55%, #9795ef 100%)"],
  ["graphite", "Графит", "radial-gradient(70% 60% at 50% 0%, #4a4d55, transparent 70%), linear-gradient(180deg, #2a2c31, #141518)"],
  ["bloom", "Bloom", "radial-gradient(45% 55% at 52% 60%, rgb(120 170 255 / .95), transparent 62%), radial-gradient(35% 40% at 40% 50%, rgb(40 100 230 / .95), transparent 70%), #0b1a3a"],
  ["dune", "Дюна", "radial-gradient(60% 45% at 70% 25%, rgb(255 214 150 / .8), transparent 70%), linear-gradient(170deg, #c07a3a 0%, #6b3f22 55%, #2a1810 100%)"],
];

export class FloorpPdfTweaksChild extends JSWindowActorChild {
  #ac = null;
  #ui = "auto";
  #page = "auto";
  #menu = null;
  #buttons = [];
  #session = null;
  #timer = 0;
  #prefObserver = null;

  /* Плашка звонка: сайт сам выключил камеру/микрофон — нажимаем его собственную кнопку.
     Ищем кнопку по подписи (aria-label, title, подсказка, текст): «Включить камеру»,
     «Turn on camera», «Выключить микрофон», «Unmute»… want: on | off. */
  #callButton({ kind, want }) {
    const doc = this.document;
    if (!doc || !doc.body) {
      return null;
    }
    const DEV = kind === "cam"
      ? /(камер|camera|видео|video|webcam)/i
      : /(микрофон|microphone|\bmic\b|звук|mute|unmute)/i;
    const NOT = kind === "cam"
      ? /(экран|screen|демонстрац|share|фон|background|эффект|effect|настрой|setting|качеств|quality|layout|раскладк)/i
      : /(динамик|speaker|громкост|volume|настрой|setting|субтитр|caption|все|everyone|участник)/i;
    const ON = /(включ|turn on|start|enable|unmute|show|вкл\b)/i;
    const OFF = /(выключ|отключ|turn off|stop|disable|\bmute\b|hide|выкл\b)/i;
    const label = el => [el.getAttribute("aria-label"), el.getAttribute("title"), el.getAttribute("data-tooltip"),
      el.getAttribute("data-tooltip-text"), el.getAttribute("aria-description"), el.textContent]
      .filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 140);
    const visible = el => {
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && doc.defaultView.getComputedStyle(el).visibility !== "hidden";
    };
    let best = null;
    for (const el of doc.querySelectorAll("button, [role='button'], [role='switch'], [role='checkbox']")) {
      if (el.disabled || el.getAttribute("aria-disabled") === "true" || !visible(el)) {
        continue;
      }
      const text = label(el);
      if (!text || !DEV.test(text) || NOT.test(text)) {
        continue;
      }
      let score = 1;
      if (want === "on" && ON.test(text) && !/выключ|отключ|turn off/i.test(text)) score += 3;
      if (want === "off" && OFF.test(text)) score += 3;
      // кнопка-переключатель: aria-pressed / aria-checked говорят, включено ли устройство
      const pressed = el.getAttribute("aria-pressed") ?? el.getAttribute("aria-checked");
      if (pressed !== null) {
        score += 1;
      }
      if (text.length < 40) score += 1;
      if (!best || score > best.score) {
        best = { el, score, text };
      }
    }
    if (!best) {
      return null;
    }
    try {
      best.el.click();
    } catch (e) {
      return null;
    }
    return { clicked: true, label: best.text };
  }

  /* Плашка Now Bar в окне спрашивает страницу о плеере:
     info — название трека, pause/play — пауза для <audio>/<video>, seek — перемотка. */
  receiveMessage(msg) {
    if (msg.name === "FM:pdf-refresh") {
      return this.#refreshPages();
    }
    if (msg.name === "FM:callbtn") {
      return this.#callButton(msg.data || {});
    }
    if (msg.name !== "FM:media") {
      return null;
    }
    const doc = this.document;
    const win = this.contentWindow;
    if (!doc || !win) {
      return null;
    }
    const { action, delta } = msg.data || {};
    // звуки на странице + «невидимые» плееры, которых нет в разметке (Telegram создаёт new Audio())
    const media = [...doc.querySelectorAll("audio, video")];
    try {
      const list = win.wrappedJSObject.__fmMediaList;
      if (list) {
        for (const ref of [...list]) {
          const m = ref.deref();
          if (!m) {
            list.delete(ref);
          } else if (!media.includes(m)) {
            media.push(m);
          }
        }
      }
    } catch {}
    const text = sel => {
      for (const s of sel) {
        const t = doc.querySelector(s)?.textContent?.trim();
        if (t) {
          return t;
        }
      }
      return "";
    };
    try {
      if (action === "info") {
        let title = "", artist = "";
        try {
          const md = win.navigator.mediaSession?.metadata;
          title = md?.title || "";
          artist = md?.artist || "";
        } catch {}
        if (!title) {
          // плееры Telegram (Web K и Web A) и общие варианты
          title = text([".pinned-audio-title", ".pinned-container .audio-title", ".AudioPlayer-content .title",
            ".audio-player .title", "[class*='AudioPlayer'] [class*='title']"]);
          artist = text([".pinned-audio-subtitle", ".pinned-container .audio-subtitle", ".AudioPlayer-content .subtitle",
            ".audio-player .subtitle", "[class*='AudioPlayer'] [class*='subtitle']"]);
        }
        let artwork = "";
        try {
          const list = [...(win.navigator.mediaSession?.metadata?.artwork || [])];
          artwork = list.length ? String(list[list.length - 1].src || "") : "";
        } catch {}
        // позиция: первый играющий (или поставленный нами на паузу) звук с длительностью
        const m = media.find(x => (!x.paused || x.hasAttribute("data-fm-paused")) && isFinite(x.duration) && x.duration > 0);
        return {
          title: title.slice(0, 120),
          artist: artist.slice(0, 80),
          artwork: artwork.slice(0, 2000),
          playing: media.some(x => !x.paused && !x.ended && !x.muted && x.volume > 0 && x.readyState > 2),
          position: m ? m.currentTime : 0,
          duration: m ? m.duration : 0,
        };
      }
      if (action === "pause") {
        let count = 0;
        for (const m of media) {
          // слышимый звук: играет, не заглушён и громкость не ноль
          if (!m.paused && !m.ended) {
            m.setAttribute("data-fm-paused", "1");
            m.pause();
            count++;
          }
        }
        return { count };
      }
      if (action === "play") {
        let count = 0;
        for (const m of media) {
          if (m.hasAttribute("data-fm-paused")) {
            m.removeAttribute("data-fm-paused");
            m.play()?.catch?.(() => {});
            count++;
          }
        }
        return { count };
      }
      if (action === "seek") {
        let count = 0;
        for (const m of media) {
          if (!m.paused || m.hasAttribute("data-fm-paused")) {
            m.currentTime = Math.max(0, m.currentTime + (Number(delta) || 0));
            count++;
          }
        }
        return { count };
      }
    } catch (e) {
      return { error: String(e) };
    }
    return null;
  }

  handleEvent(event) {
    // один раз на процесс: разбудить запасной загрузчик функций окна
    if (!bootSent) {
      bootSent = true;
      try {
        this.sendAsyncMessage("PdfTweaks:boot");
      } catch (e) {}
    }
    if (event.type !== "DOMContentLoaded" || this.#ac) {
      return;
    }
    const doc = this.document;
    if (!doc || event.target !== doc) {
      return;
    }
    // сайты, где звук играет из плееров вне разметки — запоминаем их, чтобы Now Bar мог поставить паузу
    try {
      this.#trackMedia();
    } catch (e) {
      console.error("[pdf-tweaks] media track:", e);
    }
    // атрибут fm-theme: по нему включается выбранная в браузере тема (без перезапуска)
    try {
      this.markTheme();
    } catch (e) {
      console.error("[pdf-tweaks] theme mark:", e);
    }
    // страница Floorp Modern Studio: отдаём ей настройки и принимаем изменения
    try {
      if (/^(resource:\/\/pdftweaks\/|chrome:\/\/fmstudio\/content\/)studio\.html/.test(String(this.contentWindow?.location?.href || ""))) {
        this.#setupStudio();
        return;
      }
    } catch (e) {
      console.error("[pdf-tweaks] studio:", e);
    }
    try {
      if (doc.documentURI === "resource://pdftweaks/docs.html") {
        this.#setupDocs();
        return;
      }
      if (this.#isMarkdown(doc)) {
        this.#setupMarkdown().catch(e => console.error("[pdf-tweaks] markdown:", e));
        return;
      }
    } catch (e) {
      console.error("[pdf-tweaks] markdown:", e);
    }
    // новая вкладка Firefox (и других форков без своей страницы): часы как в Floorp
    try {
      const href = String(this.contentWindow?.location?.href || "");
      const floorpNewtab = href.startsWith("chrome://noraneko-newtab/");
      if ((/^about:(newtab|home)\b/.test(href) && doc.getElementById("root")) || floorpNewtab) {
        this.#setupNewtabClock();
        try {
          this.#setupNewtabWallpaper();
        } catch (e) {
          console.error("[pdf-tweaks] newtab wallpaper:", e);
          this.#note("обои: ОШИБКА " + e);
        }
        return;
      }
    } catch (e) {
      console.error("[pdf-tweaks] newtab clock:", e);
      this.#note("новая вкладка: ОШИБКА " + e);
    }
    let isViewer = false;
    try {
      isViewer = doc.nodePrincipal.originNoSuffix === "resource://pdf.js";
    } catch {}
    if (!isViewer || !doc.getElementById("viewerContainer")) {
      return;
    }
    // установщик может выключить новый просмотрщик PDF
    try {
      if (!Services.prefs.getBoolPref("floorp.pdftweaks.enabled", true)) {
        return;
      }
    } catch {}
    this.#ac = new AbortController();
    try {
      this.#setupTheme();
    } catch (e) {
      console.error("[pdf-tweaks] theme:", e);
    }
    try {
      this.#setupInk();
    } catch (e) {
      console.error("[pdf-tweaks] ink:", e);
    }
    try {
      this.#setupColorPicker();
    } catch (e) {
      console.error("[pdf-tweaks] colors:", e);
    }
    try {
      this.#setupClear();
    } catch (e) {
      console.error("[pdf-tweaks] clear:", e);
    }
    try {
      this.#setupShiftLine();
    } catch (e) {
      console.error("[pdf-tweaks] shift line:", e);
    }
    try {
      this.#setupPdfFlags();
    } catch (e) {
      console.error("[pdf-tweaks] flags:", e);
    }
    try {
      this.#setupToolChevrons();
    } catch (e) {
      console.error("[pdf-tweaks] chevrons:", e);
    }
    try {
      this.#setupParams();
    } catch (e) {
      console.error("[pdf-tweaks] params:", e);
    }
    try {
      this.#setupResume();
    } catch (e) {
      console.error("[pdf-tweaks] resume:", e);
    }
    try {
      this.#setupBookmarks();
    } catch (e) {
      console.error("[pdf-tweaks] bookmarks:", e);
    }
    try {
      this.#setupRenderKick();
    } catch (e) {
      console.error("[pdf-tweaks] render kick:", e);
    }
    try {
      this.#setupQuickText();
    } catch (e) {
      console.error("[pdf-tweaks] quick text:", e);
    }
  }

  #clearTimer() {
    try {
      this.contentWindow?.clearTimeout(this.#timer);
    } catch {}
    this.#timer = 0;
  }

  /* Плееры вне разметки (new Audio() в Telegram, VK и т. п.) не видны через querySelectorAll.
     На таких сайтах подменяем HTMLMediaElement.prototype.play: каждый запущенный звук
     попадает в список (слабые ссылки), и Now Bar может его остановить. */
  #trackMedia() {
    const win = this.contentWindow;
    let host = "";
    try {
      host = win.location.hostname;
    } catch {}
    if (!/(^|\.)(telegram\.org|t\.me|vk\.com|vk\.ru|ok\.ru|music\.yandex\.(ru|com|by|kz)|zvuk\.com|soundcloud\.com|discord\.com|whatsapp\.com)$/.test(host)) {
      return;
    }
    const w = win.wrappedJSObject;
    if (!w || w.__fmMediaList) {
      return;
    }
    const sb = Cu.Sandbox(win, { sandboxPrototype: win, wantXrays: false, sameZoneAs: win });
    Cu.evalInSandbox(`(function () {
      const P = HTMLMediaElement.prototype, orig = P.play, list = new Set();
      Object.defineProperty(window, "__fmMediaList", { value: list });
      P.play = function play() {
        try {
          for (const r of list) { if (r.deref() === this) { return orig.apply(this, arguments); } }
          if (list.size > 200) { list.clear(); }
          list.add(new WeakRef(this));
        } catch (e) {}
        return orig.apply(this, arguments);
      };
    })();`, sb);
  }

  /* Тема Redesigned Fox для страниц браузера и PDF: fm-theme="<id>" на <html> */
  #themeObserver = null;
  markTheme() {
    const doc = this.document;
    const root = doc?.documentElement;
    if (!root || this.#themeObserver) {
      return;
    }
    let href = "";
    try {
      href = String(this.contentWindow?.location?.href || "");
    } catch {}
    let ours = /^(about:(?!blank|srcdoc)|chrome:\/\/|resource:\/\/)/.test(href);
    if (!ours) {
      try {
        ours = doc.nodePrincipal.originNoSuffix === "resource://pdf.js" || doc.nodePrincipal.isSystemPrincipal;
      } catch {}
    }
    if (!ours) {
      return;
    }
    const sync = () => {
      let id = "";
      try {
        id = Services.prefs.getStringPref("floorp.modern.theme", "");
      } catch {}
      if (/^[a-z]{2,16}$/.test(id)) {
        root.setAttribute("fm-theme", id);
      }
    };
    this.#themeObserver = { observe: sync };
    Services.prefs.addObserver("floorp.modern.theme", this.#themeObserver);
    sync();
  }

  didDestroy() {
    if (this.#themeObserver) {
      try {
        Services.prefs.removeObserver("floorp.modern.theme", this.#themeObserver);
      } catch {}
      this.#themeObserver = null;
    }
    this.#ac?.abort();
    this.#clearTimer();
    if (this.#prefObserver) {
      try {
        Services.prefs.removeObserver("floorp.pdftweaks.", this.#prefObserver);
      } catch {}
    }
  }

  /* ------------------------------ theme ------------------------------ */

  #isMarkdown(doc) {
    if (this.browsingContext?.parent || doc.location?.protocol !== "file:") {
      return false;
    }
    if (!/\.(md|markdown|mdown|mkd|mkdn)$/i.test(doc.location.pathname)) {
      return false;
    }
    if (!["text/plain", "text/markdown", "text/x-markdown", "text/html"].includes(doc.contentType)) {
      return false;
    }
    try {
      return JSON.parse(Services.prefs.getStringPref("floorp.modern.studio", "{}"))?.mdEditor !== false;
    } catch {
      return true;
    }
  }

  #setupDocs() {
    const win = this.contentWindow;
    win.windowUtils.loadSheetUsingURIString("resource://pdftweaks/markdown.css", win.windowUtils.AUTHOR_SHEET);
    const { mountDocs } = ChromeUtils.importESModule("resource://pdftweaks/HandDesignDocs.sys.mjs");
    mountDocs(win, this.document, {
      t,
      list: () => this.sendQuery("HDDocs:list"),
      create: () => this.sendQuery("HDDocs:new"),
      open: () => this.sendQuery("HDDocs:open"),
      openRecent: path => this.sendQuery("HDDocs:recent", { path }),
      forget: path => this.sendQuery("HDDocs:forget", { path }),
    });
  }

  async #setupMarkdown() {
    const doc = this.document;
    const win = this.contentWindow;
    let text = doc.body?.textContent ?? "";
    let mtime = 0;
    try {
      const r = await this.sendQuery("HDMd:read");
      if (r?.ok && typeof r.text === "string") {
        text = r.text;
        mtime = r.mtime;
      }
    } catch {}
    const path = decodeURIComponent(doc.location.pathname).replace(/^\/([A-Za-z]:)/, "$1");
    const cut = path.lastIndexOf("/");
    const winPath = /^[A-Za-z]:/.test(path);
    const folder = path.slice(0, cut).replace(/\//g, winPath ? "\\" : "/") || "/";
    win.windowUtils.loadSheetUsingURIString("resource://pdftweaks/markdown.css", win.windowUtils.AUTHOR_SHEET);
    const { mount } = ChromeUtils.importESModule("resource://pdftweaks/HandDesignMarkdown.sys.mjs");
    mount(win, doc, {
      text,
      mtime,
      name: path.slice(cut + 1),
      folder,
      t,
      save: (value, opts) => this.sendQuery("HDMd:save", { text: value, mtime: opts?.mtime || 0 }),
      stat: () => this.sendQuery("HDMd:stat"),
      read: () => this.sendQuery("HDMd:read"),
      home: () => this.sendQuery("HDDocs:home"),
    });
  }

  /* Часы на новой вкладке Firefox / LibreWolf / Waterfox и т. д.
     Разметка повторяет часы Floorp (те же классы), поэтому оформление
     каждой темы (часы Galaxy, стеклянные iOS, столбиком Pixel…) применяется само. */
  #note(text) {
    try {
      this.sendAsyncMessage("PdfTweaks:note", text);
    } catch {}
  }

  #setupNewtabClock() {
    const doc = this.document;
    const win = this.contentWindow;
    // страница рисуется React-ом уже после загрузки — ждём, пока станет ясно,
    // что это новая вкладка Firefox (.outer-wrapper), а не Floorp (у него свои часы)
    // Важно: Firefox заранее грузит новую вкладку в скрытом виде, и React
    // рисует её только когда вкладку откроют (может пройти сколько угодно времени).
    // Поэтому не ограничиваемся таймером, а следим за изменениями страницы.
    let mo = null;
    const check = () => {
      if (doc.getElementById("fm-clock") || doc.querySelector(".absolute.top-4.right-4")) {
        mo?.disconnect();
        return true;
      }
      if (!doc.querySelector(".outer-wrapper")) {
        return false;
      }
      mo?.disconnect();
      this.#buildNewtabClock();
      this.#note("новая вкладка: часы поставлены");
      return true;
    };
    this.#note("новая вкладка: жду отрисовку");
    if (check()) {
      return;
    }
    mo = new win.MutationObserver(() => {
      try {
        check();
      } catch (e) {
        mo.disconnect();
        console.error("[pdf-tweaks] newtab clock:", e);
        this.#note("новая вкладка: ОШИБКА " + e);
      }
    });
    mo.observe(doc.documentElement, { childList: true, subtree: true });
    win.addEventListener("pagehide", () => mo.disconnect(), { once: true });
  }

  #setupStudio() {
    const win = this.contentWindow;
    const send = () => {
      let config = {};
      let version = "";
      try {
        config = JSON.parse(Services.prefs.getStringPref("floorp.modern.studio", "{}"));
      } catch {}
      try {
        version = Services.prefs.getStringPref("floorp.modern.version", "");
      } catch {}
      let theme = "";
      try {
        theme = Services.prefs.getStringPref("floorp.modern.theme", "");
      } catch {}
      win.dispatchEvent(new win.CustomEvent("fm-studio-config", { detail: JSON.stringify({ config, version, theme, lang: langSetting() }) }));
    };
    win.addEventListener("fm-theme-set", e => {
      const id = String(e.detail || "");
      if (/^[a-z]{2,16}$/.test(id)) {
        this.sendAsyncMessage("PdfTweaks:theme-set", id);
      }
    });
    win.addEventListener("fm-studio-lang", e => {
      const v = String(e.detail || "");
      if (/^(auto|[a-z]{2})$/.test(v)) {
        this.sendAsyncMessage("PdfTweaks:studio-lang", v);
      }
    });
    win.addEventListener("fm-studio-save", e => {
      const text = String(e.detail || "");
      if (text.length < 20000) {
        this.sendAsyncMessage("PdfTweaks:studio-save", text);
      }
    });
    send();
  }

  /* Обои новой вкладки: кнопка слева внизу, набор готовых обоев,
     своя картинка с компьютера и затемнение. Выбор хранится в настройках
     браузера, своя картинка — файлом chrome\pdf-tweaks\fm-wallpaper.img. */
  #wallUrl = null;
  #wallRev = -1;

  async #customWallUrl() {
    const rev = Services.prefs.getIntPref(PREF_WALL + ".rev", 0);
    if (this.#wallUrl && this.#wallRev === rev) {
      return this.#wallUrl;
    }
    const r = await this.sendQuery("PdfTweaks:wall-get");
    if (!r || !r.bytes || !r.bytes.length) {
      return null;
    }
    const bytes = r.bytes;
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    this.#wallUrl = `data:${r.type || "image/jpeg"};base64,${btoa(bin)}`;
    this.#wallRev = rev;
    return this.#wallUrl;
  }

  #setupNewtabWallpaper() {
    const doc = this.document;
    const win = this.contentWindow;
    if (doc.getElementById("fm-wall-btn")) {
      return;
    }
    const body = doc.body || doc.documentElement;
    const mk = (tag, id, cls, text) => {
      const e = doc.createElement(tag);
      if (id) {
        e.id = id;
      }
      if (cls) {
        e.className = cls;
      }
      if (text) {
        e.textContent = text;
      }
      return e;
    };
    // слой с обоями под страницей
    const layer = mk("div", "fm-wall");
    const shade = mk("div", "fm-wall-shade");
    layer.append(shade);
    body.prepend(layer);

    // кнопка и всплывающее меню
    const btn = mk("div", "fm-wall-btn");
    btn.setAttribute("role", "button");
    btn.tabIndex = 0;
    btn.title = t("Обои");
    const pop = mk("div", "fm-wall-pop");
    pop.hidden = true;
    pop.append(mk("div", "", "fm-wall-title", t("Обои")));
    const grid = mk("div", "", "fm-wall-grid");
    const items = new Map();
    const addItem = (id, label, bg) => {
      label = t(label);
      const it = mk("div", "", "fm-wall-sw");
      it.setAttribute("role", "button");
      it.tabIndex = 0;
      it.title = label;
      it.dataset.id = id;
      if (bg) {
        it.style.setProperty("background", bg);
      }
      const cap = mk("span", "", "fm-wall-cap", label);
      it.append(cap);
      grid.append(it);
      items.set(id, it);
      return it;
    };
    addItem("theme", "Тема", null).classList.add("fm-wall-theme");
    for (const [id, label, css] of WALLS) {
      addItem(id, label, css);
    }
    const own = addItem("custom", "Своя…", null);
    own.classList.add("fm-wall-own");
    pop.append(grid);
    const dimRow = mk("label", "", "fm-wall-dim");
    dimRow.append(mk("span", "", "", t("Затемнение")));
    const dim = mk("input");
    dim.type = "range";
    dim.min = "0";
    dim.max = "70";
    dim.step = "5";
    dimRow.append(dim);
    pop.append(dimRow);
    const more = mk("div", "", "fm-wall-more", t("Настроить весь дизайн…"));
    more.setAttribute("role", "button");
    more.tabIndex = 0;
    more.addEventListener("click", () => {
      try {
        this.sendAsyncMessage("PdfTweaks:studio-open");
      } catch {}
    });
    pop.append(more);
    body.append(btn, pop);

    const apply = async () => {
      let id = "theme";
      let d = 15;
      try {
        id = Services.prefs.getStringPref(PREF_WALL, "theme");
        d = Services.prefs.getIntPref(PREF_WALL_DIM, 15);
      } catch {}
      const root = doc.documentElement;
      let bg = null;
      if (id === "custom") {
        const url = await this.#customWallUrl().catch(() => null);
        if (url) {
          bg = `center / cover no-repeat url("${url}")`;
        } else {
          id = "theme";
        }
      } else {
        const w = WALLS.find(x => x[0] === id);
        if (w) {
          bg = w[2];
        } else {
          id = "theme";
        }
      }
      if (bg) {
        layer.style.setProperty("background", bg);
        root.setAttribute("fm-wall", id);
      } else {
        layer.style.removeProperty("background");
        root.removeAttribute("fm-wall");
      }
      shade.style.setProperty("opacity", String(Math.max(0, Math.min(70, d)) / 100));
      dim.value = String(d);
      for (const [k, el] of items) {
        el.toggleAttribute("selected", k === id);
      }
      if (id === "custom" && this.#wallUrl) {
        own.style.setProperty("background", `center / cover no-repeat url("${this.#wallUrl}")`);
      }
    };

    const send = data => {
      try {
        this.sendAsyncMessage("PdfTweaks:wall-set", data);
      } catch {}
    };
    const open = v => {
      pop.hidden = !v;
      btn.toggleAttribute("open", v);
    };
    const pickFile = () => {
      const input = doc.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("change", async () => {
        const file = input.files && input.files[0];
        if (!file) {
          return;
        }
        own.setAttribute("busy", "");
        try {
          let buf = null;
          let type = "image/jpeg";
          // уменьшаем до 3200 px по длинной стороне — обои грузятся мгновенно
          try {
            const url = win.URL.createObjectURL(file);
            const img = new win.Image();
            img.src = url;
            await img.decode();
            const k = Math.min(1, 3200 / Math.max(img.naturalWidth, img.naturalHeight));
            const c = doc.createElement("canvas");
            c.width = Math.round(img.naturalWidth * k);
            c.height = Math.round(img.naturalHeight * k);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            win.URL.revokeObjectURL(url);
            const blob = await new Promise(res => c.toBlob(b => res(b), "image/jpeg", 0.9));
            buf = await blob.arrayBuffer();
          } catch {
            buf = await file.arrayBuffer();
            type = file.type || "image/jpeg";
          }
          if (buf.byteLength > 15 * 1024 * 1024) {
            this.#note("обои: картинка больше 15 МБ");
            return;
          }
          let bytes;
          try {
            bytes = new Uint8Array(buf);
          } catch {
            bytes = new Uint8Array(Cu.waiveXrays(buf));
          }
          send({ id: "custom", type, bytes });
        } finally {
          own.removeAttribute("busy");
        }
      });
      input.click();
    };

    const onPick = e => {
      const it = e.target.closest?.(".fm-wall-sw");
      if (!it) {
        return;
      }
      const id = it.dataset.id;
      if (id === "custom") {
        pickFile();
      } else {
        send({ id });
      }
    };
    grid.addEventListener("click", onPick);
    grid.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPick(e);
      }
    });
    dim.addEventListener("change", () => send({ dim: Number(dim.value) }));
    dim.addEventListener("input", () => shade.style.setProperty("opacity", String(Number(dim.value) / 100)));
    btn.addEventListener("click", e => {
      e.stopPropagation();
      open(pop.hidden);
    });
    btn.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(pop.hidden);
      }
    });
    pop.addEventListener("click", e => e.stopPropagation());
    doc.addEventListener("click", () => open(false));
    doc.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        open(false);
      }
    });

    // выбор меняется сразу во всех открытых новых вкладках
    const obs = { observe: () => apply() };
    Services.prefs.addObserver(PREF_WALL, obs);
    win.addEventListener("pagehide", () => Services.prefs.removeObserver(PREF_WALL, obs), { once: true });
    apply();
  }

  #buildNewtabClock() {
    const doc = this.document;
    const win = this.contentWindow;
    const el = (tag, cls, text) => {
      const e = doc.createElement(tag);
      if (cls) {
        e.className = cls;
      }
      if (text) {
        e.textContent = text;
      }
      return e;
    };
    const outer = el("div", "absolute top-4 right-4");
    outer.id = "fm-clock";
    const card = el("div", "fm-clock-card");
    const row = el("div", "flex items-center gap-3");
    const time = el("div", "tabular-nums");
    const hh = doc.createTextNode("");
    const colon = el("span", "animate-pulse", ":");
    const mm = doc.createTextNode("");
    time.append(hh, colon, mm);
    const dates = el("div", "flex flex-col text-right");
    const day = el("div", "");
    const date = el("div", "");
    dates.append(day, date);
    row.append(time, dates);
    card.append(row);
    outer.append(card);
    (doc.body || doc.documentElement).append(outer);

    const fmt = opts => {
      try {
        return new win.Intl.DateTimeFormat(win.navigator.language || undefined, opts);
      } catch {
        return new win.Intl.DateTimeFormat(undefined, opts);
      }
    };
    const fmtDay = fmt({ weekday: "short" });
    const fmtDate = fmt({ day: "2-digit", month: "2-digit" });
    const tick = () => {
      const d = new win.Date();
      hh.data = String(d.getHours()).padStart(2, "0");
      mm.data = String(d.getMinutes()).padStart(2, "0");
      const wd = fmtDay.format(d);
      day.textContent = wd.charAt(0).toUpperCase() + wd.slice(1);
      date.textContent = fmtDate.format(d);
    };
    tick();
    const timer = win.setInterval(tick, 1000);
    win.addEventListener("pagehide", () => win.clearInterval(timer), { once: true });
  }

  #setupTheme() {
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    this.#ui = readPref(PREF_UI, UI_VALUES);
    this.#page = readPref(PREF_PAGE, PAGE_VALUES);

    const right = doc.getElementById("toolbarViewerRight");
    if (right && !doc.getElementById("xThemeWrap")) {
      const wrap = doc.createElement("div");
      wrap.id = "xThemeWrap";
      wrap.className = "toolbarHorizontalGroup";

      const btn = doc.createElement("button");
      btn.id = "xThemeButton";
      btn.className = "toolbarButton";
      btn.type = "button";
      btn.title = t("Тема");
      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-expanded", "false");
      const label = doc.createElement("span");
      label.textContent = t("Тема");
      btn.append(label);

      const menu = doc.createElement("div");
      menu.id = "xThemeMenu";
      menu.hidden = true;
      menu.setAttribute("role", "dialog");
      menu.setAttribute("aria-label", t("Тема просмотрщика"));

      const section = (title, cls, items, key) => {
        const h = doc.createElement("div");
        h.className = "x-h";
        h.textContent = t(title);
        const seg = doc.createElement("div");
        seg.className = "x-seg " + cls;
        for (const [value, text, swatch] of items) {
          const b = doc.createElement("button");
          b.type = "button";
          b.dataset.key = key;
          b.dataset.value = value;
          if (swatch) {
            const sw = doc.createElement("span");
            sw.className = "x-sw";
            sw.style.background = swatch;
            b.append(sw);
          }
          b.append(doc.createTextNode(t(text)));
          b.addEventListener("click", () => this.#set(key, value), { signal });
          this.#buttons.push(b);
          seg.append(b);
        }
        menu.append(h, seg);
      };
      section("Интерфейс", "", [
        ["auto", "Авто"],
        ["light", "Светлая"],
        ["dark", "Тёмная"],
      ], "ui");
      section("Страницы", "x-4", [
        ["auto", "Авто", "linear-gradient(90deg,#fff 50%,#2a2d33 50%)"],
        ["paper", "Бумага", "#ffffff"],
        ["sepia", "Сепия", "#efe2c6"],
        ["night", "Ночь", "#2a2d33"],
      ], "page");

      wrap.append(btn, menu);
      const toggle = doc.getElementById("secondaryToolbarToggle");
      if (toggle && toggle.parentNode === right) {
        right.insertBefore(wrap, toggle);
      } else {
        right.append(wrap);
      }
      this.#menu = menu;

      const setOpen = open => {
        menu.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
      };
      btn.addEventListener("click", e => {
        e.stopPropagation();
        setOpen(menu.hidden);
      }, { signal });
      doc.addEventListener("pointerdown", e => {
        if (!menu.hidden && !wrap.contains(e.target)) {
          setOpen(false);
        }
      }, { capture: true, signal });
      doc.addEventListener("keydown", e => {
        if (e.key === "Escape" && !menu.hidden) {
          setOpen(false);
          btn.focus();
        }
      }, { capture: true, signal });
    }

    win.matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change", () => this.#apply(), { signal });

    this.#prefObserver = {
      observe: () => {
        this.#ui = readPref(PREF_UI, UI_VALUES);
        this.#page = readPref(PREF_PAGE, PAGE_VALUES);
        this.#apply();
      },
    };
    Services.prefs.addObserver("floorp.pdftweaks.", this.#prefObserver);
    this.#apply();
  }

  #set(key, value) {
    if (key === "ui" && UI_VALUES.includes(value)) {
      this.#ui = value;
    } else if (key === "page" && PAGE_VALUES.includes(value)) {
      this.#page = value;
    } else {
      return;
    }
    this.#apply();
    try {
      this.sendAsyncMessage("PdfTweaks:save", { ui: this.#ui, page: this.#page });
    } catch {}
  }

  #apply() {
    const doc = this.document;
    const win = this.contentWindow;
    if (!doc || !win) {
      return;
    }
    const root = doc.documentElement;
    root.setAttribute("data-x-ui", this.#ui);
    if (this.#ui === "auto") {
      root.style.removeProperty("color-scheme");
    } else {
      root.style.setProperty("color-scheme", this.#ui, "important");
    }
    const dark = this.#ui === "dark" ||
      (this.#ui === "auto" && win.matchMedia("(prefers-color-scheme: dark)").matches);
    const page = this.#page === "auto" ? (dark ? "night" : "paper") : this.#page;
    root.setAttribute("data-x-page", page);
    for (const b of this.#buttons) {
      const current = b.dataset.key === "ui" ? this.#ui : this.#page;
      b.setAttribute("aria-pressed", String(b.dataset.value === current));
    }
  }

  /* ------------------------------- ink ------------------------------- */

  /* Открывать документ там, где остановился.
     Номер страницы запоминается для каждого файла (последние 150 файлов). */
  #setupResume() {
    if (!pdfCfg().pdfResume) {
      return;
    }
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    const key = String(win.location.href).split("#")[0];
    if (!key || /#page=|#nameddest=/.test(win.location.href)) {
      return;
    }
    let saved = 0;
    try {
      const map = JSON.parse(Services.prefs.getStringPref("floorp.pdftweaks.pages", "{}"));
      saved = Number(map[key]?.p) || 0;
    } catch {}
    const input = () => doc.getElementById("pageNumber");
    const total = () => Number(input()?.max) || 0;
    let last = 0;
    let restored = saved < 2;
    const timer = win.setInterval(() => {
      const el = input();
      if (!el || !total()) {
        return; // документ ещё грузится
      }
      const now = Number(el.value) || 0;
      if (!restored) {
        restored = true;
        if (now <= 1 && saved > 1 && saved <= total()) {
          el.value = String(saved);
          el.dispatchEvent(new win.Event("change", { bubbles: true }));
          this.#notice(t("Открыто на стр. {0} — там, где вы остановились", saved), t("С начала"), () => {
            el.value = "1";
            el.dispatchEvent(new win.Event("change", { bubbles: true }));
          });
          last = saved;
          return;
        }
      }
      if (now && now !== last) {
        last = now;
        try {
          this.sendAsyncMessage("PdfTweaks:page", { url: key, page: now });
        } catch {}
      }
    }, 1500);
    signal.addEventListener("abort", () => win.clearInterval(timer));
  }

  /* Закладки страниц: кнопка-ленточка на панели, список закладок файла,
     Ctrl+B — добавить или убрать закладку на текущей странице.
     На страницах с закладкой в углу видна ленточка. Хранятся для каждого файла. */
  #setupBookmarks() {
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    const key = String(win.location.href).split("#")[0];
    const right = doc.getElementById("toolbarViewerRight");
    if (!key || !right || doc.getElementById("xBookWrap")) {
      return;
    }
    const load = () => {
      try {
        const all = JSON.parse(Services.prefs.getStringPref("floorp.pdftweaks.bookmarks", "{}"));
        return Array.isArray(all[key]) ? all[key].filter(b => b && b.p > 0) : [];
      } catch {
        return [];
      }
    };
    let list = load();
    const save = () => {
      try {
        this.sendAsyncMessage("PdfTweaks:bookmarks", { url: key, list });
      } catch {}
    };
    const pageInput = () => doc.getElementById("pageNumber");
    const current = () => Number(pageInput()?.value) || 0;
    const goTo = n => {
      const el = pageInput();
      if (!el) {
        return;
      }
      el.value = String(n);
      el.dispatchEvent(new win.Event("change", { bubbles: true }));
    };
    const noteFor = n => {
      // начало текста страницы — чтобы в списке было понятно, что там
      const spans = doc.querySelectorAll(`.page[data-page-number="${n}"] .textLayer span`);
      let t = "";
      for (const sp of spans) {
        t += (sp.textContent || "") + " ";
        if (t.length > 80) {
          break;
        }
      }
      return t.replace(/\s+/g, " ").trim().slice(0, 70);
    };

    const wrap = doc.createElement("div");
    wrap.id = "xBookWrap";
    wrap.className = "toolbarHorizontalGroup";
    const btn = doc.createElement("button");
    btn.id = "xBookButton";
    btn.className = "toolbarButton";
    btn.type = "button";
    btn.title = t("Закладки (Ctrl+B — закладка на этой странице)");
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    const label = doc.createElement("span");
    label.textContent = t("Закладки");
    btn.append(label);
    const menu = doc.createElement("div");
    menu.id = "xBookMenu";
    menu.hidden = true;
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", t("Закладки"));
    wrap.append(btn, menu);
    const themeWrap = doc.getElementById("xThemeWrap");
    if (themeWrap && themeWrap.parentNode === right) {
      right.insertBefore(wrap, themeWrap);
    } else {
      right.append(wrap);
    }

    const has = n => list.some(b => b.p === n);
    const toggle = n => {
      if (!n) {
        return;
      }
      if (has(n)) {
        list = list.filter(b => b.p !== n);
        this.#notice(t("Закладка со стр. {0} убрана", n));
      } else {
        list.push({ p: n, note: noteFor(n), t: Date.now() });
        list.sort((a, b) => a.p - b.p);
        this.#notice(t("Стр. {0} в закладках", n));
      }
      save();
      sync();
      render();
    };
    // элементы меню — div с ролью кнопки: правила PDF.js для <button> их не ломают
    const act = (cls, text, fn) => {
      const el = doc.createElement("div");
      el.className = cls;
      el.setAttribute("role", "button");
      el.tabIndex = 0;
      if (text) {
        el.textContent = text;
      }
      el.addEventListener("click", fn, { signal });
      el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fn(e);
        }
      }, { signal });
      return el;
    };
    const render = () => {
      if (menu.hidden) {
        return;
      }
      menu.textContent = "";
      const now = current();
      const head = doc.createElement("div");
      head.className = "x-head";
      const title = doc.createElement("span");
      title.className = "x-title";
      title.textContent = t("Закладки");
      const add = act("x-add", has(now) ? t("Убрать стр. {0}", now) : "+ " + t("Стр. {0}", now || 1), () => toggle(now || 1));
      if (has(now)) {
        add.setAttribute("data-on", "");
      }
      head.append(title, add);
      menu.append(head);
      if (!list.length) {
        const empty = doc.createElement("div");
        empty.className = "x-empty";
        empty.textContent = t("Пока пусто. Нажмите «+», чтобы запомнить страницу, или Ctrl+B в любой момент.");
        menu.append(empty);
        return;
      }
      for (const b of list) {
        const row = doc.createElement("div");
        row.className = "x-item";
        if (b.p === now) {
          row.setAttribute("data-current", "");
        }
        const go = act("x-go", "", () => {
          goTo(b.p);
          setOpen(false);
        });
        const num = doc.createElement("span");
        num.className = "x-num";
        num.textContent = String(b.p);
        const note = doc.createElement("span");
        note.className = "x-note";
        note.textContent = b.note || t("Страница {0}", b.p);
        go.append(num, note);
        go.title = t("Перейти на стр. {0}", b.p);
        const del = act("x-del", "×", e => {
          e.stopPropagation();
          toggle(b.p);
        });
        del.title = t("Убрать закладку");
        row.append(go, del);
        menu.append(row);
      }
    };
    // ленточки на страницах и состояние кнопки
    const pages = doc.getElementsByClassName("page");
    let drawn = "";
    const sync = () => {
      const set = new Set(list.map(b => b.p));
      const sig = [...set].join(",") + "|" + pages.length;
      if (sig !== drawn) {
        drawn = sig;
        for (const page of doc.querySelectorAll(".pdfViewer .page[data-page-number]")) {
          page.classList.toggle("x-bookmarked", set.has(Number(page.getAttribute("data-page-number"))));
        }
      }
      btn.toggleAttribute("data-on", set.has(current()));
    };
    const setOpen = open => {
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) {
        render();
        // не даём списку вылезти за край окна
        menu.style.setProperty("translate", "0 0");
        const r = menu.getBoundingClientRect();
        const dx = r.right > win.innerWidth - 8 ? win.innerWidth - 8 - r.right : (r.left < 8 ? 8 - r.left : 0);
        menu.style.setProperty("translate", `${Math.round(dx)}px 0`);
      }
    };
    btn.addEventListener("click", e => {
      e.stopPropagation();
      setOpen(menu.hidden);
    }, { signal });
    doc.addEventListener("pointerdown", e => {
      if (!menu.hidden && !wrap.contains(e.target)) {
        setOpen(false);
      }
    }, { capture: true, signal });
    doc.addEventListener("keydown", e => {
      if (e.key === "Escape" && !menu.hidden) {
        setOpen(false);
        btn.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.code === "KeyB") && pdfCfg().pdfBookmarks) {
        if (e.target?.closest?.("input, textarea, [contenteditable='true'], .freeTextEditor")) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        toggle(current());
      }
    }, { capture: true, signal });
    const timer = win.setInterval(sync, 1500);
    signal.addEventListener("abort", () => win.clearInterval(timer));
    sync();
  }

  /* Перерисовать все страницы PDF. Нужно после переключения видеокарты
     (встроенная ↔ дискретная): Windows сбрасывает графику, и уже нарисованные
     страницы становятся пустыми, а PDF.js об этом не знает. */
  #refreshPages() {
    const doc = this.document;
    const win = this.contentWindow;
    try {
      if (!doc || doc.nodePrincipal.originNoSuffix !== "resource://pdf.js") {
        return false;
      }
      const viewer = win.wrappedJSObject?.PDFViewerApplication?.pdfViewer;
      if (!viewer) {
        return false;
      }
      if (typeof viewer.refresh === "function") {
        viewer.refresh();
      } else {
        // старые версии PDF.js: меняем масштаб туда и обратно
        const scale = viewer.currentScaleValue;
        viewer.currentScaleValue = scale === "page-fit" ? "page-width" : "page-fit";
        viewer.currentScaleValue = scale;
      }
      return true;
    } catch (e) {
      console.error("[pdf-tweaks] refresh:", e);
      return false;
    }
  }

  /* Иногда (после быстрого перехода по страницам) PDF.js не начинает рисовать
     видимую страницу, и она остаётся пустой, пока не прокрутишь. Следим за этим:
     если видимая страница не нарисована дольше 2 с — слегка «шевелим» прокрутку,
     и PDF.js дорисовывает её сам. */
  #setupRenderKick() {
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    // ручная кнопка в меню «Тема» — на случай, если страницы пропали
    const menu = doc.getElementById("xThemeMenu");
    if (menu && !doc.getElementById("xRefreshPages")) {
      const b = doc.createElement("button");
      b.type = "button";
      b.id = "xRefreshPages";
      b.className = "x-refresh";
      b.textContent = "↻ " + t("Перерисовать страницы");
      b.addEventListener("click", () => {
        this.#refreshPages();
        menu.hidden = true;
        doc.getElementById("xThemeButton")?.setAttribute("aria-expanded", "false");
      }, { signal });
      menu.append(b);
    }
    const waiting = new Map(); // номер страницы → когда заметили пустой
    const onScreen = new Set();
    const io = new win.IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting) {
          onScreen.add(en.target);
        } else {
          onScreen.delete(en.target);
          waiting.delete(en.target.getAttribute("data-page-number"));
        }
      }
    });
    const pages = doc.getElementsByClassName("page");
    let observed = 0;
    const timer = win.setInterval(() => {
      const box = doc.getElementById("viewerContainer");
      if (!box || doc.hidden) {
        return;
      }
      if (pages.length !== observed) {
        io.disconnect();
        onScreen.clear();
        for (const page of pages) {
          io.observe(page);
        }
        observed = pages.length;
      }
      const now = Date.now();
      let stuck = false;
      for (const page of onScreen) {
        const n = page.getAttribute("data-page-number");
        if (!page.isConnected || !n) {
          continue;
        }
        if (page.hasAttribute("data-loaded")) {
          waiting.delete(n);
          continue;
        }
        if (!waiting.has(n)) {
          waiting.set(n, now);
        } else if (now - waiting.get(n) > 2000) {
          stuck = true;
          waiting.set(n, now);
        }
      }
      if (stuck) {
        const y = box.scrollTop;
        box.scrollTop = y + 1;
        win.requestAnimationFrame(() => {
          box.scrollTop = y;
          box.dispatchEvent(new win.Event("scroll"));
        });
      }
    }, 1000);
    signal.addEventListener("abort", () => {
      win.clearInterval(timer);
      io.disconnect();
    });
  }

  /* Короткое уведомление внизу просмотрщика с кнопкой действия. */
  #notice(text, actionLabel, action) {
    const doc = this.document;
    const win = this.contentWindow;
    doc.getElementById("xNotice")?.remove();
    const box = doc.createElement("div");
    box.id = "xNotice";
    const span = doc.createElement("span");
    span.textContent = text;
    box.append(span);
    if (actionLabel) {
      const b = doc.createElement("button");
      b.type = "button";
      b.textContent = actionLabel;
      b.addEventListener("click", () => {
        box.remove();
        action?.();
      });
      box.append(b);
    }
    doc.body.append(box);
    win.setTimeout(() => box.classList.add("x-out"), 5000);
    win.setTimeout(() => box.remove(), 5400);
  }

  /* Быстрый текст: клик по пропуску «……» в тексте или двойной клик по пустому
     месту страницы — сразу появляется поле, можно печатать. Когда закончил
     и кликнул мимо, инструмент «Текст» сам выключается. */
  #setupQuickText() {
    if (!pdfCfg().pdfQuickText) {
      return;
    }
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    const toolBtn = () => doc.getElementById("editorFreeTextButton");
    const modeOn = () => {
      const b = toolBtn();
      return !!b && (b.getAttribute("aria-pressed") === "true" || b.classList.contains("toggled"));
    };
    const anyMode = () => !!doc.querySelector("#editorModeButtons [aria-pressed='true'], #editorModeButtons .toggled");
    const GAP = /[.…_]{3,}|…{2,}/;
    let ours = false;

    const create = (page, x, y) => {
      const btn = toolBtn();
      if (!btn || btn.disabled) {
        return;
      }
      if (!modeOn()) {
        btn.click();
      }
      let tries = 0;
      const go = () => {
        const layer = page.querySelector(".annotationEditorLayer");
        if (!layer || layer.hidden || layer.classList.contains("disabled") || !modeOn()) {
          if (++tries < 20) {
            win.setTimeout(go, 50);
          }
          return;
        }
        ours = true;
        const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1, pointerId: 1, isPrimary: true, pointerType: "mouse" };
        layer.dispatchEvent(new win.PointerEvent("pointerdown", opts));
        layer.dispatchEvent(new win.PointerEvent("pointerup", { ...opts, buttons: 0 }));
      };
      win.setTimeout(go, 60);
    };

    // клик по пропуску с точками
    doc.addEventListener("click", e => {
      if (e.button !== 0 || anyMode()) {
        return;
      }
      const span = e.target?.closest?.(".textLayer span");
      if (!span || !GAP.test(span.textContent || "")) {
        return;
      }
      const sel = win.getSelection();
      if (sel && !sel.isCollapsed) {
        return; // человек выделял текст
      }
      const page = span.closest(".page");
      if (page) {
        create(page, e.clientX, e.clientY);
      }
    }, { signal });

    // двойной клик по месту без текста (подходит и для сканов)
    doc.addEventListener("dblclick", e => {
      if (e.button !== 0 || anyMode()) {
        return;
      }
      const t = e.target;
      const word = t?.closest?.(".textLayer span");
      if (word && (word.textContent || "").trim() && !GAP.test(word.textContent)) {
        return; // по слову — обычное выделение слова
      }
      const page = t?.closest?.(".page");
      if (!page) {
        return;
      }
      win.getSelection()?.removeAllRanges();
      create(page, e.clientX, e.clientY);
    }, { signal });

    // закончил печатать и ушёл из поля — выключаем инструмент «Текст»
    doc.addEventListener("focusout", e => {
      if (!ours || !e.target?.closest?.(".freeTextEditor")) {
        return;
      }
      win.setTimeout(() => {
        if (doc.activeElement?.closest?.(".freeTextEditor, #editorFreeTextParamsToolbar")) {
          return;
        }
        ours = false;
        if (modeOn()) {
          toolBtn()?.click();
        }
      }, 250);
    }, { signal });
  }

  /* Своя палитра вместо системного окна Windows «Цвет» (оно из 90-х).
     Ловим клик по <input type="color"> в панели рисования/текста и
     показываем всплывающую палитру: готовые цвета + свой цвет
     (поле оттенка/яркости, полоса цветов, HEX). Системное окно не открывается никогда. */
  /* Кнопка «Очистить» рядом с инструментами: убрать только рисунки (надписи остаются)
     или убрать всё, что добавлено. Удаляет сам просмотрщик — Ctrl+Z возвращает. */
  #setupClear() {
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    const group = doc.getElementById("editorModeButtons");
    if (!group || doc.getElementById("xClearWrap")) {
      return;
    }
    const uiManager = () => {
      const app = win.wrappedJSObject.PDFViewerApplication;
      const v = app?.pdfViewer;
      try {
        const m = v?._layerProperties?.annotationEditorUIManager;
        if (m) return m;
      } catch {}
      // запасной путь: менеджер есть у любого добавленного объекта
      const n = v?.pagesCount || 0;
      for (let i = 0; i < n; i++) {
        const layer = v.getPageView(i)?.annotationEditorLayer?.annotationEditorLayer;
        const any = layer && (layer.editors?.values?.().next().value);
        if (any?._uiManager) return any._uiManager;
      }
      return null;
    };
    const editors = m => {
      const app = win.wrappedJSObject.PDFViewerApplication;
      const n = app?.pdfViewer?.pagesCount || 0;
      const out = [];
      for (let i = 0; i < n; i++) {
        try {
          for (const ed of m.getEditors(i) || []) out.push(ed);
        } catch {}
      }
      return out;
    };
    const typeOf = ed => {
      try {
        return String(ed.editorType || ed.constructor?._type || ed.name || "").toLowerCase();
      } catch {
        return "";
      }
    };
    const clear = onlyInk => {
      this.#finish();
      const m = uiManager();
      if (!m) {
        this.#notice(t("Нечего убирать"));
        return;
      }
      const all = editors(m).filter(ed => !ed.isEmpty?.());
      const list = onlyInk ? all.filter(ed => /ink|draw/.test(typeOf(ed)) && !/highlight/.test(typeOf(ed))) : all;
      if (!list.length) {
        this.#notice(t(onlyInk ? "Рисунков нет" : "Нечего убирать"));
        return;
      }
      try {
        m.unselectAll?.();
        for (const ed of list) {
          m.addToSelection ? m.addToSelection(ed) : m.setSelected?.(ed);
        }
        m.delete();
      } catch (e) {
        // старые версии просмотрщика: удаляем по одному
        for (const ed of list) {
          try { ed.remove(); } catch {}
        }
      }
      this.#notice(t(onlyInk ? "Рисунки убраны ({0}) — Ctrl+Z вернёт" : "Всё убрано ({0}) — Ctrl+Z вернёт", list.length));
    };

    const wrap = doc.createElement("div");
    wrap.id = "xClearWrap";
    const btn = doc.createElement("button");
    btn.id = "xClearButton";
    btn.className = "toolbarButton";
    btn.type = "button";
    btn.title = t("Очистить: убрать рисунки или всё добавленное");
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    const label = doc.createElement("span");
    label.textContent = t("Очистить");
    btn.append(label);
    const menu = doc.createElement("div");
    menu.id = "xClearMenu";
    menu.hidden = true;
    const item = (cls, title, sub, fn) => {
      const el = doc.createElement("div");
      el.className = "x-item " + cls;
      el.setAttribute("role", "button");
      el.tabIndex = 0;
      const a = doc.createElement("div");
      a.className = "x-t";
      a.textContent = t(title);
      const b = doc.createElement("div");
      b.className = "x-s";
      b.textContent = t(sub);
      el.append(a, b);
      const go = e => {
        e.preventDefault();
        e.stopPropagation();
        hide();
        fn();
      };
      el.addEventListener("click", go, { signal });
      el.addEventListener("keydown", e => (e.key === "Enter" || e.key === " ") && go(e), { signal });
      return el;
    };
    menu.append(
      item("x-ink", "Убрать все рисунки", "Только линии от руки — текст и выделения остаются", () => clear(true)),
      item("x-all", "Убрать всё", "Рисунки, надписи, выделения, картинки", () => clear(false)),
    );
    const hint = doc.createElement("div");
    hint.className = "x-hint";
    hint.textContent = t("Передумали — Ctrl+Z");
    menu.append(hint);
    wrap.append(btn, menu);
    group.append(wrap);
    const show = () => { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); };
    const hide = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", e => {
      e.stopPropagation();
      menu.hidden ? show() : hide();
    }, { signal });
    doc.addEventListener("pointerdown", e => {
      if (!menu.hidden && !wrap.contains(e.target)) hide();
    }, { capture: true, signal });
    doc.addEventListener("keydown", e => {
      if (e.key === "Escape" && !menu.hidden) hide();
    }, { capture: true, signal });
  }

  /* Как в Paint: зажать Shift при рисовании — ровная линия (по горизонтали, вертикали
     или под 45°). Пока тянешь — видна линия-подсказка; при отпускании просмотрщик
     получает только начало и конец, поэтому линия получается идеально прямой. */
  #setupShiftLine() {
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    let st = null;
    const inkColor = () => doc.getElementById("editorInkColor")?.value || "#000";
    const inkWidth = () => Number(doc.getElementById("editorInkThickness")?.value) || 2;
    const scale = () => {
      try {
        return win.wrappedJSObject.PDFViewerApplication.pdfViewer.currentScale || 1;
      } catch {
        return 1;
      }
    };
    const snap = (x0, y0, x, y) => {
      const dx = x - x0, dy = y - y0;
      const len = Math.hypot(dx, dy);
      const step = (Number(pdfCfg().pdfShiftStep) || 45) * Math.PI / 180;
      const ang = Math.round(Math.atan2(dy, dx) / step) * step;
      return [x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len];
    };
    const preview = (layer) => {
      const NS = "http://www.w3.org/2000/svg";
      const svg = doc.createElementNS(NS, "svg");
      svg.setAttribute("class", "x-shiftline");
      svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:100000;overflow:visible";
      const line = doc.createElementNS(NS, "line");
      line.setAttribute("stroke", inkColor());
      line.setAttribute("stroke-width", String(inkWidth() * scale()));
      line.setAttribute("stroke-linecap", "round");
      svg.append(line);
      layer.append(svg);
      return { svg, line };
    };
    win.addEventListener("pointerdown", e => {
      st = null;
      if (!e.isTrusted || e.button !== 0) return;
      const layer = e.target?.closest?.(".annotationEditorLayer");
      if (!layer || !layer.classList.contains("inkEditing") || !pdfCfg().pdfShiftLine) return;
      st = { layer, x0: e.clientX, y0: e.clientY, end: null, used: false, view: null, pid: e.pointerId, ptype: e.pointerType, target: e.target };
    }, { capture: true, signal });
    win.addEventListener("pointermove", e => {
      if (!st || !e.isTrusted || !(e.buttons & 1)) return;
      if (!e.shiftKey) {
        if (st.view) { st.view.svg.remove(); st.view = null; }
        return;
      }
      // Shift: просмотрщику ничего не отдаём, только рисуем подсказку
      e.stopImmediatePropagation();
      e.preventDefault();
      st.used = true;
      const [x, y] = snap(st.x0, st.y0, e.clientX, e.clientY);
      st.end = [x, y];
      if (!st.view) st.view = preview(st.layer);
      const r = st.layer.getBoundingClientRect();
      const l = st.view.line;
      l.setAttribute("x1", st.x0 - r.left); l.setAttribute("y1", st.y0 - r.top);
      l.setAttribute("x2", x - r.left); l.setAttribute("y2", y - r.top);
    }, { capture: true, signal });
    const finish = e => {
      if (!st) return;
      const s = st;
      st = null;
      s.view?.svg.remove();
      if (!e.isTrusted || !s.used || !s.end) return;
      // одна точка — конец линии; дальше браузер сам передаст отпускание кнопки
      const ev = new win.PointerEvent("pointermove", {
        bubbles: true, cancelable: true, composed: true,
        clientX: s.end[0], clientY: s.end[1], screenX: e.screenX + (s.end[0] - e.clientX), screenY: e.screenY + (s.end[1] - e.clientY),
        buttons: 1, pointerId: s.pid, pointerType: s.ptype || "mouse", isPrimary: true, shiftKey: false,
      });
      (s.target?.isConnected ? s.target : s.layer).dispatchEvent(ev);
    };
    win.addEventListener("pointerup", finish, { capture: true, signal });
    win.addEventListener("pointercancel", () => { st?.view?.svg.remove(); st = null; }, { capture: true, signal });
  }

  /* Включить / выключить части просмотрщика по настройкам Studio — сразу, без перезагрузки. */
  #setupPdfFlags() {
    const root = this.document.documentElement;
    // отладка: один раз записать разметку панельки у рисунка и панели параметров (fm-pdf-dom.txt)
    const win = this.contentWindow;
    const doc = this.document;
    let dumped = false;
    const dump = () => {
      const tb = doc.querySelector(".editToolbar");
      if (!tb || dumped) return;
      dumped = true;
      const describe = el => {
        const cs = win.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} ${Math.round(r.width)}x${Math.round(r.height)} disp=${cs.display} pad=${cs.padding} marg=${cs.margin} flex=${cs.flex} app=${cs.appearance} bg=${cs.backgroundColor}`;
      };
      const lines = ["PDF.js " + (win.wrappedJSObject.pdfjsLib?.version || "?"), "", tb.outerHTML.slice(0, 20000), ""];
      for (const el of [tb, ...tb.querySelectorAll("*")]) lines.push(describe(el));
      const params = doc.querySelector(".editorParamsToolbar");
      if (params) lines.push("", params.outerHTML.slice(0, 15000));
      try {
        this.sendAsyncMessage("PdfTweaks:dom", lines.join("\n"));
      } catch {}
    };
    // только для отладки: about:config → floorp.modern.debug.pdfdom = true
    let debugDom = false;
    try {
      debugDom = Services.prefs.getBoolPref("floorp.modern.debug.pdfdom", false);
    } catch {}
    if (debugDom) {
      const domObs = new win.MutationObserver(() => {
        if (!dumped && doc.querySelector(".editToolbar")) win.setTimeout(dump, 300);
        if (dumped) domObs.disconnect();
      });
      domObs.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
      this.#ac.signal.addEventListener("abort", () => domObs.disconnect());
    }
    const apply = () => {
      pdfCfgCache = null;
      const c = pdfCfg();
      root.toggleAttribute("x-no-clear", !c.pdfClear);
      root.toggleAttribute("x-no-books", !c.pdfBookmarks);
      root.toggleAttribute("x-no-themebtn", !c.pdfThemeButton);
      root.toggleAttribute("x-no-steppers", !c.pdfSteppers);
      root.toggleAttribute("x-no-anim", !c.pdfAnim);
      root.toggleAttribute("x-autoparams", !!c.pdfAutoParams);
    };
    apply();
    const obs = () => apply();
    Services.prefs.addObserver("floorp.modern.studio", obs);
    this.#ac.signal.addEventListener("abort", () => {
      try {
        Services.prefs.removeObserver("floorp.modern.studio", obs);
      } catch {}
    });
  }

  /* Инструменты (карандаш, текст, маркер…): нажатие просто выбирает инструмент,
     панель «Цвет / Толщина» больше не выскакивает сама. Рядом с кнопкой — маленькая
     стрелочка ▾: она открывает полную панель настроек этого инструмента. */
  #setupToolChevrons() {
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    const group = doc.getElementById("editorModeButtons");
    if (!group) {
      return;
    }
    const allowed = new Set(); // панели, которые открыли стрелочкой
    const toolFor = tb => doc.querySelector(`[aria-controls="${tb.id}"]`);
    const isOpen = tb => !tb.classList.contains("hidden");
    const close = tb => {
      allowed.delete(tb);
      if (isOpen(tb)) {
        tb.classList.add("hidden");
      }
      const tool = toolFor(tb);
      tool?.setAttribute("aria-expanded", "false");
      tb.previousElementSibling?.classList?.contains("x-chev") && tb.previousElementSibling.removeAttribute("data-open");
      doc.querySelector(`.x-chev[data-for="${tb.id}"]`)?.removeAttribute("data-open");
    };
    // просмотрщик сам открывает панель при выборе инструмента — сразу прячем, если не просили
    const mo = new win.MutationObserver(list => {
      for (const m of list) {
        const tb = m.target;
        if (isOpen(tb) && !allowed.has(tb) && !pdfCfg().pdfAutoParams) {
          tb.classList.add("hidden");
          toolFor(tb)?.setAttribute("aria-expanded", "false");
        }
      }
    });
    for (const btn of group.querySelectorAll("button[aria-controls]")) {
      const tb = doc.getElementById(btn.getAttribute("aria-controls"));
      if (!tb || !tb.classList.contains("editorParamsToolbar") || tb.id === "editorCommentParamsToolbar" || btn.nextElementSibling?.classList?.contains("x-chev")) {
        continue;
      }
      mo.observe(tb, { attributes: true, attributeFilter: ["class"] });
      const chev = doc.createElement("button");
      chev.type = "button";
      chev.className = "x-chev";
      chev.dataset.for = tb.id;
      chev.title = t("Настройки инструмента: цвет, толщина, размер");
      chev.setAttribute("aria-label", chev.title);
      btn.parentElement.style.position ||= "relative";
      btn.after(chev);
      chev.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        if (allowed.has(tb) && isOpen(tb)) {
          close(tb);
          return;
        }
        // закрыть другие открытые панели
        for (const other of allowed) {
          if (other !== tb) close(other);
        }
        // если инструмент ещё не выбран — выбрать
        const active = btn.getAttribute("aria-pressed") === "true" || btn.classList.contains("toggled");
        allowed.add(tb);
        if (!active) {
          btn.click();
        }
        win.setTimeout(() => {
          tb.classList.remove("hidden");
          btn.setAttribute("aria-expanded", "true");
          chev.setAttribute("data-open", "");
        }, active ? 0 : 60);
      }, { signal });
    }
    // клик мимо панели — закрыть
    doc.addEventListener("pointerdown", e => {
      for (const tb of [...allowed]) {
        if (!tb.contains(e.target) && !e.target?.closest?.(`.x-chev[data-for="${tb.id}"]`) && !e.target?.closest?.("#xColorPop")) {
          close(tb);
        }
      }
    }, { capture: true, signal });
    doc.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        for (const tb of [...allowed]) close(tb);
      }
    }, { capture: true, signal });
    signal.addEventListener("abort", () => mo.disconnect());
  }

  /* Панель «Цвет / Размер / Толщина» у текста и рисования:
     - у ползунка размера появляются кнопки − / + с числом и готовые размеры одним нажатием;
     - квадратик цвета показывает выбранный цвет (раньше был пустым). */
  #setupParams() {
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    const el = (tag, cls, text) => {
      const e = doc.createElement(tag);
      if (cls) e.className = cls;
      if (text !== undefined) e.textContent = text;
      return e;
    };
    const presetsFor = (min, max) => {
      const nice = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72, 96, 100];
      const all = nice.filter(v => v >= min && v <= max);
      if (all.length <= 5) return all;
      const out = [];
      for (let i = 0; i < 5; i++) out.push(all[Math.round(i * (all.length - 1) / 4)]);
      return [...new Set(out)];
    };
    const setRange = (range, v) => {
      const min = Number(range.min) || 0, max = Number(range.max) || 100, step = Number(range.step) || 1;
      const dec = (String(step).split(".")[1] || "").length;
      v = Number(Math.min(max, Math.max(min, Math.round(v / step) * step)).toFixed(dec));
      if (String(v) === range.value) return;
      range.value = String(v);
      range.dispatchEvent(new win.Event("input", { bubbles: true }));
      range.dispatchEvent(new win.Event("change", { bubbles: true }));
    };
    const enhanceRange = range => {
      if (range.dataset.xSize) return;
      range.dataset.xSize = "1";
      const isOpacity = /opacity/i.test(range.id || range.className || "");
      const unit = isOpacity ? "%" : "";
      const box = el("div", "x-size");
      const minus = el("button", "x-step", "−");
      const plus = el("button", "x-step", "+");
      minus.type = plus.type = "button";
      const val = el("span", "x-val");
      const chips = el("div", "x-chips");
      const min = Number(range.min) || 0, max = Number(range.max) || 100;
      const step = Number(range.step) || 1;
      const bigStep = isOpacity ? Math.max(step, 0.1 * (max - min) >= 1 ? Math.round(0.1 * (max - min)) : step) : step;
      const show = v => (isOpacity && max <= 1 ? Math.round(v * 100) : v) + unit;
      const presets = isOpacity ? [] : presetsFor(min, max);
      const chipEls = presets.map(v => {
        const c = el("button", "x-chip", String(v));
        c.type = "button";
        c.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); setRange(range, v); sync(); }, { signal });
        chips.append(c);
        return [v, c];
      });
      const sync = () => {
        const v = Number(range.value);
        val.textContent = show(v);
        for (const [pv, c] of chipEls) c.toggleAttribute("aria-pressed", pv === v);
        c_ratio();
      };
      // заполненная часть дорожки ползунка
      const c_ratio = () => {
        const v = Number(range.value);
        range.style.setProperty("--x-fill", ((v - min) / (max - min || 1) * 100).toFixed(1) + "%");
      };
      const hold = (btn, dir) => {
        let t = 0, r = 0;
        const stepOnce = () => { setRange(range, Number(range.value) + dir * bigStep); sync(); };
        btn.addEventListener("pointerdown", e => {
          e.preventDefault(); e.stopPropagation();
          stepOnce();
          t = win.setTimeout(() => { r = win.setInterval(stepOnce, pdfCfg().pdfHoldSpeed); }, pdfCfg().pdfHoldDelay);
        }, { signal });
        const stop = () => { win.clearTimeout(t); win.clearInterval(r); };
        btn.addEventListener("pointerup", stop, { signal });
        btn.addEventListener("pointerleave", stop, { signal });
        btn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); }, { signal });
      };
      hold(minus, -1);
      hold(plus, 1);
      box.append(minus, val, plus);
      range.addEventListener("input", sync, { signal });
      // колёсико над ползунком или над числом
      for (const w of [range, box]) {
        w.addEventListener("wheel", e => {
          e.preventDefault();
          setRange(range, Number(range.value) + (e.deltaY < 0 ? 1 : -1) * bigStep);
          sync();
        }, { passive: false, signal });
      }
      range.classList.add("x-range");
      range.after(box);
      if (presets.length) box.after(chips);
      sync();
      range._xSync = sync;
    };
    const enhanceColor = input => {
      const paint = () => {
        input.style.setProperty("background", input.value || "#000", "important");
      };
      if (!input.dataset.xSwatch) {
        input.dataset.xSwatch = "1";
        input.addEventListener("input", paint, { signal });
        input.addEventListener("change", paint, { signal });
      }
      paint();
    };
    // компактный вид по умолчанию; кнопка «Точнее» раскрывает − / + и готовые размеры
    const PREF = "floorp.pdftweaks.paramsExpanded";
    let expanded = true; // панель открывается только стрелочкой — и сразу полная
    // в процессе страницы настройки браузера только читаются — помним выбор в хранилище страницы

    const addToggle = tb => {
      if (tb.id === "editorCommentParamsToolbar" || tb.querySelector(".x-more-toggle") || !tb.querySelector(".x-range")) return;
      const box = tb.querySelector(".editorParamsToolbarContainer") || tb;
      const tg = el("button", "x-more-toggle");
      tg.type = "button";
      const paint = () => {
        tb.toggleAttribute("data-x-expanded", expanded);
        tg.textContent = expanded ? t("Проще") + " ▴" : t("Точнее") + " ▾";
        tg.title = t(expanded ? "Спрятать кнопки − / + и готовые размеры" : "Показать кнопки − / + и готовые размеры");
      };
      tg.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        expanded = !expanded;
        try {
          win.localStorage.setItem(PREF, expanded ? "1" : "0");
        } catch {}
        for (const other of doc.querySelectorAll(".editorParamsToolbar")) {
          other.toggleAttribute("data-x-expanded", expanded);
          const o = other.querySelector(".x-more-toggle");
          if (o) o.textContent = expanded ? t("Проще") + " ▴" : t("Точнее") + " ▾";
        }
      }, { signal });
      box.append(tg);
      paint();
    };
    const scan = () => {
      for (const tb of doc.querySelectorAll(".editorParamsToolbar")) {
        tb.toggleAttribute("data-x-expanded", expanded);
      }
      for (const r of doc.querySelectorAll('.editorParamsToolbar input[type="range"]')) {
        enhanceRange(r);
        r._xSync?.();
      }
      for (const c of doc.querySelectorAll('.editorParamsToolbar input[type="color"]')) {
        enhanceColor(c);
      }

    };
    scan();
    // при открытии панели и смене инструмента значения меняет сам просмотрщик — обновляем
    const mo = new win.MutationObserver(() => scan());
    for (const tb of doc.querySelectorAll(".editorParamsToolbar")) {
      mo.observe(tb, { attributes: true, attributeFilter: ["class"] });
    }
    doc.addEventListener("click", e => {
      if (e.target?.closest?.("#editorModeButtons, .toolbarButton, .editorParamsToolbar")) {
        win.setTimeout(scan, 50);
      }
    }, { capture: true, signal });
    signal.addEventListener("abort", () => mo.disconnect());
  }

  #setupColorPicker() {
    const doc = this.document;
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    const COLORS = [
      "#000000", "#3A3A3C", "#8E8E93", "#C7C7CC", "#FFFFFF",
      "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00C7BE",
      "#30B0C7", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55",
      "#A2845E", "#FF6B6B", "#FFD60A", "#64D2FF", "#BF5AF2",
    ];
    const recent = [];
    let pop = null;
    let target = null;

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const toHex = n => Math.round(n).toString(16).padStart(2, "0");
    const hsvToHex = (h, sat, val) => {
      const f = n => {
        const k = (n + h / 60) % 6;
        return val - val * sat * Math.max(0, Math.min(k, 4 - k, 1));
      };
      return "#" + toHex(f(5) * 255) + toHex(f(3) * 255) + toHex(f(1) * 255);
    };
    const hexToHsv = hex => {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
      if (!m) {
        return null;
      }
      const n = parseInt(m[1], 16);
      const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
      const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
      let h = 0;
      if (d) {
        h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
      }
      return { h, s: max ? d / max : 0, v: max };
    };
    // стиль задаём через CSSOM (style.setProperty): атрибут style="" просмотрщик
    // запрещает своей политикой безопасности (CSP), и такие стили молча не применяются
    const css = (node, props) => {
      for (const [k, v] of Object.entries(props)) {
        node.style.setProperty(k, v);
      }
    };
    const el = (tag, cls) => {
      const e = doc.createElement(tag);
      if (cls) {
        e.className = cls;
      }
      return e;
    };

    const close = () => {
      pop?.remove();
      pop = null;
      target = null;
    };
    const apply = color => {
      const input = target;
      close();
      if (!input) {
        return;
      }
      const c = color.toLowerCase();
      if (!COLORS.some(x => x.toLowerCase() === c)) {
        const i = recent.indexOf(c);
        if (i >= 0) {
          recent.splice(i, 1);
        }
        recent.unshift(c);
        recent.length = Math.min(recent.length, 5);
      }
      input.value = c;
      input.dispatchEvent(new win.Event("input", { bubbles: true }));
      input.dispatchEvent(new win.Event("change", { bubbles: true }));
    };
    const dot = (c, current) => {
      const b = el("button", "x-dot");
      b.type = "button";
      css(b, { "--c": c });
      b.title = c.toUpperCase();
      if (c.toLowerCase() === current) {
        b.setAttribute("aria-pressed", "true");
      }
      b.addEventListener("click", () => apply(c), { signal });
      return b;
    };
    const place = input => {
      const r = input.getBoundingClientRect();
      const w = pop.offsetWidth, h = pop.offsetHeight;
      const below = r.bottom + 10;
      css(pop, {
        left: clamp(r.left + r.width / 2 - w / 2, 8, win.innerWidth - w - 8) + "px",
        top: (below + h > win.innerHeight - 8 ? Math.max(8, r.top - h - 10) : below) + "px",
      });
    };

    // свой цвет: поле насыщенность/яркость, полоса оттенка, HEX
    const buildCustom = (input, start) => {
      const hsv = hexToHsv(start) || { h: 210, s: 1, v: 1 };
      const box = el("div", "x-custom");
      const sv = el("div", "x-sv");
      const svKnob = el("div", "x-knob");
      sv.append(svKnob);
      const hue = el("div", "x-hue");
      const hueKnob = el("div", "x-knob");
      hue.append(hueKnob);
      const row = el("div", "x-row");
      const preview = el("div", "x-preview");
      const hex = el("input", "x-hex");
      hex.type = "text";
      hex.maxLength = 7;
      hex.spellcheck = false;
      const ok = el("button", "x-ok");
      ok.type = "button";
      ok.textContent = t("Готово");
      row.append(preview, hex, ok);
      box.append(sv, hue, row);

      const render = (fromHex = false) => {
        const c = hsvToHex(hsv.h, hsv.s, hsv.v);
        css(sv, { "--h": `hsl(${hsv.h.toFixed(1)} 100% 50%)` });
        css(svKnob, { left: (hsv.s * 100).toFixed(2) + "%", top: ((1 - hsv.v) * 100).toFixed(2) + "%", "--c": c });
        css(hueKnob, { left: (hsv.h / 360 * 100).toFixed(2) + "%", "--c": `hsl(${hsv.h.toFixed(1)} 100% 50%)` });
        css(preview, { "--c": c });
        if (!fromHex) {
          hex.value = c.toUpperCase();
        }
      };
      const drag = (area, onMove) => {
        const go = e => {
          const r = area.getBoundingClientRect();
          onMove(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
          render();
        };
        area.addEventListener("pointerdown", e => {
          e.preventDefault();
          area.setPointerCapture(e.pointerId);
          go(e);
        }, { signal });
        area.addEventListener("pointermove", e => {
          if (area.hasPointerCapture(e.pointerId)) {
            go(e);
          }
        }, { signal });
      };
      drag(sv, (x, y) => { hsv.s = x; hsv.v = 1 - y; });
      drag(hue, x => { hsv.h = Math.min(359.9, x * 360); });
      hex.addEventListener("input", () => {
        let v = hex.value.trim();
        if (!v.startsWith("#")) {
          v = "#" + v;
        }
        const parsed = hexToHsv(v);
        if (parsed) {
          Object.assign(hsv, parsed);
          render(true);
        }
      }, { signal });
      hex.addEventListener("keydown", e => {
        e.stopPropagation();
        if (e.key === "Enter") {
          apply(hsvToHex(hsv.h, hsv.s, hsv.v));
        } else if (e.key === "Escape") {
          close();
        }
      }, { signal });
      ok.addEventListener("click", () => apply(hsvToHex(hsv.h, hsv.s, hsv.v)), { signal });
      render();
      return box;
    };

    const open = input => {
      close();
      target = input;
      const current = String(input.value || "").toLowerCase();
      pop = el("div");
      pop.id = "xColorPop";
      const grid = el("div", "x-grid");
      for (const c of COLORS) {
        grid.append(dot(c, current));
      }
      pop.append(grid);
      if (recent.length) {
        const r = el("div", "x-grid x-recent");
        for (const c of recent) {
          r.append(dot(c, current));
        }
        pop.append(r);
      }
      const more = el("button", "x-more");
      more.type = "button";
      more.textContent = t("Свой цвет…");
      more.addEventListener("click", () => {
        if (pop.querySelector(".x-custom")) {
          return;
        }
        more.remove();
        pop.append(buildCustom(input, current));
        place(input);
        pop.querySelector(".x-hex")?.focus();
      }, { signal });
      pop.append(more);
      doc.body.append(pop);
      place(input);
    };

    doc.addEventListener("click", e => {
      const input = e.target?.closest?.('input[type="color"]');
      if (!input || !pdfCfg().pdfColors) {
        return; // выключено в Studio — системное окно «Цвет»
      }
      e.preventDefault();
      e.stopPropagation();
      if (target === input) {
        close();
      } else {
        open(input);
      }
    }, { capture: true, signal });
    doc.addEventListener("keydown", e => {
      const input = e.target?.closest?.('input[type="color"]');
      if (input && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        e.stopPropagation();
        open(input);
      } else if (e.key === "Escape" && pop) {
        close();
      }
    }, { capture: true, signal });
    doc.addEventListener("pointerdown", e => {
      if (pop && !pop.contains(e.target) && !e.target?.closest?.('input[type="color"]')) {
        close();
      }
    }, { capture: true, signal });
    win.addEventListener("resize", close, { signal });
  }

  #setupInk() {
    const win = this.contentWindow;
    const signal = this.#ac.signal;
    const opts = { capture: true, signal };

    win.addEventListener("pointerdown", e => this.#onDown(e), opts);
    win.addEventListener("pointermove", e => this.#onMove(e), opts);
    win.addEventListener("pointerup", e => this.#onUp(e), opts);
    win.addEventListener("pointercancel", () => {
      if (this.#session) {
        this.#session.drawing = false;
      }
    }, opts);

    // Хватать рисунок только за сами линии, без рамки вокруг
    win.addEventListener("pointermove", e => this.#queueHover(e), opts);
    win.addEventListener("pointerleave", () => this.#setHot(null, null), opts);
    win.addEventListener("pointerup", () => this.#queueSync(), opts);
    win.addEventListener("keyup", () => this.#queueSync(), opts);
  }

  /* ---------------------- grab ink by its strokes --------------------- */

  #hoverRaf = 0;
  #hoverEvent = null;
  #hotDiv = null;
  #hotSvg = null;
  #draws = null;
  #samples = new Map(); // path "d" -> [x0, y0, x1, y1, ...] in SVG user units

  #queueHover(e) {
    this.#hoverEvent = { x: e.clientX, y: e.clientY, buttons: e.buttons };
    if (this.#hoverRaf) {
      return;
    }
    this.#hoverRaf = this.contentWindow.requestAnimationFrame(() => {
      this.#hoverRaf = 0;
      try {
        this.#hover(this.#hoverEvent);
      } catch (err) {
        console.error("[pdf-tweaks] hover:", err);
      }
    });
  }

  #pointsFor(path) {
    const d = path.getAttribute("d") || "";
    let pts = this.#samples.get(d);
    if (pts) {
      return pts;
    }
    pts = [];
    const total = path.getTotalLength();
    if (total > 0) {
      const n = Math.min(4000, Math.max(8, Math.ceil(total * 1500)));
      for (let i = 0; i <= n; i++) {
        const p = path.getPointAtLength((total * i) / n);
        pts.push(p.x, p.y);
      }
    }
    if (this.#samples.size > 500) {
      this.#samples.clear();
    }
    this.#samples.set(d, pts);
    return pts;
  }

  /* distance in screen px from the point to the drawn line of an ink SVG */
  #strokeDistance(svg, x, y) {
    const path = svg.querySelector("defs > path");
    const m = svg.getScreenCTM();
    if (!path || !m) {
      return Infinity;
    }
    const pts = this.#pointsFor(path);
    let best = Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      const sx = m.a * pts[i] + m.c * pts[i + 1] + m.e;
      const sy = m.b * pts[i] + m.d * pts[i + 1] + m.f;
      const dd = (sx - x) * (sx - x) + (sy - y) * (sy - y);
      if (dd < best) {
        best = dd;
      }
    }
    const width = parseFloat(svg.getAttribute("stroke-width")) || 1;
    return Math.sqrt(best) - width / 2;
  }

  /* the ink editor box that belongs to a drawing SVG (same position/size) */
  #editorFor(svg, page) {
    const r = svg.getBoundingClientRect();
    let best = null;
    let bestScore = 12;
    for (const div of page.querySelectorAll(".annotationEditorLayer .inkEditor")) {
      const q = div.getBoundingClientRect();
      const score = Math.abs(q.left - r.left) + Math.abs(q.top - r.top) +
        Math.abs(q.right - r.right) + Math.abs(q.bottom - r.bottom);
      if (score < bestScore) {
        bestScore = score;
        best = div;
      }
    }
    return best;
  }

  #hover(ev) {
    if (!ev || ev.buttons || this.#session) {
      return; // не трогаем, пока что-то тащат или идёт рисунок (иначе при быстром письме тормозит)
    }
    const doc = this.document;
    this.#draws ??= doc.getElementsByClassName("draw");
    if (!this.#draws.length) {
      this.#setHot(null, null);
      return;
    }
    const under = doc.elementFromPoint(ev.x, ev.y);
    const page = under?.closest?.(".page");
    if (!page || page.querySelector(".annotationEditorLayer.drawing")) {
      this.#setHot(null, null);
      return;
    }
    let hitSvg = null;
    let hitDist = Infinity;
    for (const svg of page.querySelectorAll(".canvasWrapper svg.draw")) {
      if (svg.querySelector("use.mainOutline")) {
        continue; // это выделение маркером, не рисунок
      }
      const r = svg.getBoundingClientRect();
      const pad = pdfCfg().pdfGrab + (parseFloat(svg.getAttribute("stroke-width")) || 1);
      if (ev.x < r.left - pad || ev.x > r.right + pad || ev.y < r.top - pad || ev.y > r.bottom + pad) {
        continue;
      }
      const dist = this.#strokeDistance(svg, ev.x, ev.y);
      if (dist <= pdfCfg().pdfGrab && dist < hitDist) {
        hitDist = dist;
        hitSvg = svg;
      }
    }
    const div = hitSvg ? this.#editorFor(hitSvg, page) : null;
    this.#setHot(div ? hitSvg : null, div);
  }

  #setHot(svg, div) {
    if (this.#hotDiv !== div) {
      this.#hotDiv?.classList.remove("x-hot");
      div?.classList.add("x-hot");
      this.#hotDiv = div;
    }
    if (this.#hotSvg !== svg) {
      this.#hotSvg?.classList.remove("x-hover");
      svg?.classList.add("x-hover");
      this.#hotSvg = svg;
    }
  }

  #syncRaf = 0;
  #queueSync() {
    if (this.#syncRaf) {
      return;
    }
    this.#syncRaf = this.contentWindow.requestAnimationFrame(() => {
      this.#syncRaf = 0;
      try {
        this.#syncSelected();
      } catch {}
    });
  }

  /* подсветить линии выбранного рисунка (вместо рамки) */
  #syncSelected() {
    const doc = this.document;
    for (const svg of doc.querySelectorAll(".canvasWrapper svg.draw.x-sel")) {
      svg.classList.remove("x-sel");
    }
    for (const div of doc.querySelectorAll(".annotationEditorLayer .inkEditor.selectedEditor")) {
      const page = div.closest(".page");
      if (!page) {
        continue;
      }
      const r = div.getBoundingClientRect();
      let best = null;
      let bestScore = 12;
      for (const svg of page.querySelectorAll(".canvasWrapper svg.draw")) {
        const q = svg.getBoundingClientRect();
        const score = Math.abs(q.left - r.left) + Math.abs(q.top - r.top) +
          Math.abs(q.right - r.right) + Math.abs(q.bottom - r.bottom);
        if (score < bestScore) {
          bestScore = score;
          best = svg;
        }
      }
      best?.classList.add("x-sel");
    }
  }

  #local(e, div) {
    const r = div.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  #grow(e) {
    const s = this.#session;
    const [x, y] = this.#local(e, s.div);
    const add = (box, key) => {
      if (!s[key]) {
        s[key] = [x, y, x, y];
      } else {
        box = s[key];
        box[0] = Math.min(box[0], x);
        box[1] = Math.min(box[1], y);
        box[2] = Math.max(box[2], x);
        box[3] = Math.max(box[3], y);
      }
    };
    add(s.box, "box");
    add(s.stroke, "stroke"); // текущий штрих — от него меряем расстояние до следующего
  }

  // расстояние от точки до ПОСЛЕДНЕГО штриха (а не до всего рисунка — иначе при быстром
  // письме рисунок «растёт» и вся строка склеивается в одно целое)
  #distance(e) {
    const s = this.#session;
    const b = s.lastStroke || s.box;
    if (!b) {
      return 0;
    }
    const [x, y] = this.#local(e, s.div);
    const dx = Math.max(b[0] - x, 0, x - b[2]);
    const dy = Math.max(b[1] - y, 0, y - b[3]);
    return Math.hypot(dx, dy);
  }

  #tooBig() {
    const b = this.#session?.box;
    const c = pdfCfg();
    return !!b && (b[2] - b[0] > c.pdfInkMaxW || b[3] - b[1] > c.pdfInkMaxH);
  }

  #onDown(e) {
    if (e.button !== 0) {
      return;
    }
    this.#downAt = Date.now();
    this.#clearTimer();
    const target = e.target;
    const layerDiv = target?.closest?.(".annotationEditorLayer") || null;
    const s = this.#session;
    if (s) {
      const newDrawing =
        layerDiv !== s.div ||
        !pdfCfg().pdfInkGroup ||
        Date.now() - s.lastUp > pdfCfg().pdfInkIdle ||
        this.#distance(e) > pdfCfg().pdfInkGap ||
        this.#tooBig();
      if (newDrawing) {
        this.#finish();
      }
    }
    if (layerDiv && target === layerDiv && layerDiv.classList.contains("inkEditing")) {
      if (!this.#session) {
        this.#session = { div: layerDiv, box: null, lastUp: 0, drawing: false };
      }
      this.#session.drawing = true;
      this.#session.stroke = null;
      this.#grow(e);
    }
  }

  #onMove(e) {
    const s = this.#session;
    if (s?.drawing && (e.buttons & 1)) {
      this.#grow(e);
    }
  }

  #onUp() {
    const s = this.#session;
    if (!s?.drawing) {
      return;
    }
    s.drawing = false;
    s.lastUp = Date.now();
    s.lastStroke = s.stroke;
    this.#clearTimer();
    this.#timer = this.contentWindow.setTimeout(() => {
      if (this.#session === s && !s.drawing) {
        this.#finish();
      }
    }, pdfCfg().pdfInkGroup ? pdfCfg().pdfInkIdle : 0);
  }

  /* только что нарисованный рисунок не выделяется сам и не показывает панельку —
     чтобы выделить, по нему надо щёлкнуть (настройка pdfInkSelect в Studio) */
  #downAt = 0;
  #dontSelect(ed, app) {
    const win = this.contentWindow;
    const since = Date.now();
    const m = (() => {
      try {
        return app?.pdfViewer?._layerProperties?.annotationEditorUIManager || ed._uiManager || null;
      } catch {
        return null;
      }
    })();
    const drop = () => {
      if (this.#downAt > since) {
        return; // пользователь уже щёлкнул сам — его выбор не трогаем
      }
      try {
        const sel = m?.isSelected ? m.isSelected(ed) : ed.div?.classList.contains("selectedEditor");
        if (!sel) {
          return;
        }
        if (m?.unselect) {
          m.unselect(ed);
        } else {
          m?.unselectAll?.();
        }
        const a = this.document.activeElement;
        if (a && ed.div && (a === ed.div || ed.div.contains(a))) {
          a.blur();
        }
        this.#queueSync();
      } catch {}
    };
    drop();
    win.requestAnimationFrame(drop);
    win.setTimeout(drop, 60);
    win.setTimeout(drop, 200);
  }

  /* Commit the current ink drawing so it becomes a separate annotation. */
  #finish() {
    const s = this.#session;
    this.#session = null;
    this.#clearTimer();
    if (!s) {
      return;
    }
    try {
      const pageDiv = s.div.closest(".page");
      const n = parseInt(pageDiv?.getAttribute("data-page-number"), 10);
      const app = this.contentWindow.wrappedJSObject.PDFViewerApplication;
      const view = app?.pdfViewer?.getPageView(n - 1);
      const layer = view?.annotationEditorLayer?.annotationEditorLayer;
      if (layer && typeof layer.endDrawingSession === "function") {
        const ed = layer.endDrawingSession(false);
        if (ed && !pdfCfg().pdfInkSelect) {
          this.#dontSelect(ed, app);
        }
      }
    } catch (e) {
      console.error("[pdf-tweaks] finish:", e);
    }
  }
}

/* Тот же актор для страниц браузера (chrome://), например новой вкладки Floorp:
   обычный актор туда не заходит. Регистрирует floorp-modern.uc.js. */
export class FloorpModernNTChild extends FloorpPdfTweaksChild {
  handleEvent(event) {
    let href = "";
    try {
      href = String(this.contentWindow?.location?.href || "");
    } catch {}
    // обычные страницы и PDF обслуживает основной актор — здесь только страницы браузера
    if (!/^chrome:\/\/(noraneko-newtab|fmstudio)\//.test(href)) {
      // остальным окнам и страницам браузера (боковая панель, библиотека, настройки Floorp) — только тема
      if (event.type === "DOMContentLoaded" && href.startsWith("chrome://") && event.target === this.document) {
        try {
          this.markTheme();
        } catch {}
      }
      return;
    }
    super.handleEvent(event);
  }
}
