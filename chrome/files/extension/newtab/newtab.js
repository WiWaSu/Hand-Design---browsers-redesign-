/* Новая вкладка Hand Design for Chrome */
import { load, onChange, patch, customWall } from "../shared/settings.js";
import { applyTheme, themeById } from "../shared/apply.js";
import { WALLS, LIGHT_WALLS } from "../shared/walls.js";
import { T, setLang } from "../shared/i18n.js";

const $ = s => document.querySelector(s);
const root = document.documentElement;
const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const CLOCK_FONTS = {
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Cascadia Code", "JetBrains Mono", Consolas, monospace',
  rounded: '"Nunito", "Arial Rounded MT Bold", "Segoe UI Variable Display", sans-serif',
};
let S = null;

/* яркость любого CSS-цвета (0…255) — чтобы понять, светлые ли обои */
const probe = mk("i");
probe.style.display = "none";
document.documentElement.append(probe);
function lum(css) {
  probe.style.color = "";
  probe.style.color = css;
  const v = getComputedStyle(probe).color;
  const m = v.match(/[\d.]+/g);
  if (!m) return 255;
  // прозрачный цвет (цифры Nothing рисуются фоном) — не «тёмный»
  if (m.length > 3 && +m[3] === 0) return 255;
  // color-mix() и light-dark() браузер отдаёт как color(srgb 0.75 0.86 1) — доли, а не 0…255
  const k = v.startsWith("color(") ? 255 : 1;
  return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) * k;
}

function setVar(k, v) {
  if (v === undefined || v === null || v === "") root.style.removeProperty(k);
  else root.style.setProperty(k, v);
}

async function render(s) {
  S = s;
  setLang(s.lang || "");
  const t = applyTheme(root, s);
  // обои
  let wall = null;
  let themed = false;
  if (s.wall === "custom") {
    const url = await customWall();
    if (url) wall = `center / cover no-repeat url("${url}")`;
  } else if (s.wall !== "theme") {
    const w = WALLS.find(x => x[0] === s.wall);
    if (w) wall = w[3];
  }
  if (!wall) {
    wall = t.wall;
    themed = true;
  }
  setVar("--nt-bg", themed ? t.newtabBg : "#05060c");
  setVar("--nt-wall", wall);
  setVar("--nt-dim", String((s.wallDim ?? 15) / 100));
  setVar("--nt-shade", "#000");
  setVar("--nt-blur", (s.wallBlur || 0) + "px");
  setVar("--nt-blur-k", s.wallBlur ? String(Math.min(0.12, s.wallBlur / 300)) : "0");
  root.toggleAttribute("nt-blur", !!s.wallBlur);
  const live = !!s.wallLive && ((themed && t.live) || s.wall === "aurora");
  root.toggleAttribute("nt-live", live);
  liveMotion(live);
  root.toggleAttribute("nt-notoolbar", s.toolbar === false);

  // обои тёмные (почти у всех тем, даже в светлом режиме Windows) — значит и часы, дата, плитки
  // берутся из тёмного варианта темы, иначе получалась каша: тёмный фон и светлые подписи
  const wallDark = !themed || lum(t.newtabBg) < 110;
  if (wallDark && t.scheme === "both") setVar("color-scheme", "dark");
  // часы и поиск: для своих обоев — из темы, для остальных — «стекло»
  const c = t.clock;
  const clockColor = themed ? c.color : LIGHT_WALLS.has(s.wall) ? "#1b1b22" : "#ffffff";
  // светлые ли обои — по цвету часов, как его реально посчитал браузер (light-dark() у тем с двумя вариантами)
  setVar("--nt-clock-color", clockColor);
  const light = !(c.glass && themed) && lum(getComputedStyle($("#time")).color) < 110;
  root.toggleAttribute("nt-light", light);
  // светлые обои не «пачкаем» чёрным: затемнение слабее
  if (light) setVar("--nt-dim", String(((s.wallDim ?? 15) / 100) * 0.35));
  setVar("--nt-clock-color", clockColor);
  setVar("--nt-clock-size", s.clockSize ? s.clockSize + "px" : c.size);
  setVar("--nt-clock-weight", String(s.clockWeight || c.weight));
  setVar("--nt-clock-spacing", c.spacing || "0");
  setVar("--nt-clock-shadow", themed ? c.shadow : light ? "none" : "0 4px 40px rgb(0 0 0 / .3)");
  setVar("--nt-clock-font", CLOCK_FONTS[s.clockFont] || c.family || "var(--hd-font)");
  root.toggleAttribute("nt-glass-clock", !!c.glass && themed && s.clockFont === "ui");
  // цифры из узора (точки Nothing); со своим шрифтом часов — обычный цвет
  const fill = !!c.fill && themed && s.clockFont === "ui";
  setVar("--nt-clock-fill", fill ? c.fill : null);
  root.toggleAttribute("nt-fill-clock", fill);
  if (!fill && clockColor === "transparent") setVar("--nt-clock-color", "#ffffff");
  setVar("--nt-date", themed ? t.date.color : light ? "rgb(27 27 34 / .75)" : "rgb(255 255 255 / .85)");
  setVar("--nt-date-size", t.date.size);
  setVar("--nt-date-weight", t.date.weight);
  root.toggleAttribute("nt-date-above", !!t.dateAbove);
  const sr = t.search;
  if (themed) {
    setVar("--nt-s-radius", sr.radius);
    setVar("--nt-s-bg", sr.bg);
    setVar("--nt-s-border", sr.border);
    setVar("--nt-s-blur", sr.blur);
    setVar("--nt-s-shadow", sr.shadow);
  } else {
    setVar("--nt-s-radius", "999px");
    setVar("--nt-s-bg", light ? "rgb(255 255 255 / .6)" : "rgb(255 255 255 / .14)");
    setVar("--nt-s-border", light ? "1px solid rgb(0 0 0 / .08)" : "1px solid rgb(255 255 255 / .18)");
    setVar("--nt-s-blur", "blur(24px) saturate(1.6)");
    setVar("--nt-s-shadow", light ? "0 12px 34px rgb(0 0 0 / .08)" : "0 16px 40px rgb(0 0 0 / .3)");
  }
  setVar("--nt-s-ink", light ? clockColor : "#ffffff");
  setVar("--nt-ink", light ? clockColor : "#ffffff");
  setVar("--nt-glass", light ? "rgb(255 255 255 / .6)" : "rgb(20 21 26 / .45)");
  setVar("--nt-glass-line", light ? "rgb(0 0 0 / .08)" : "rgb(255 255 255 / .14)");
  setVar("--nt-tile-r", s.square ? "0" : t.rItem === "0px" ? "0" : parseInt(t.radius) <= 8 ? t.radius : "50%");
  setVar("--nt-search-w", (s.searchWidth || 50) + "%");
  root.setAttribute("nt-clock", s.clockPos || "top");
  root.toggleAttribute("nt-nodate", s.showDate === false);
  root.toggleAttribute("nt-nosearch", s.search === false);
  root.toggleAttribute("nt-notiles", s.tiles === false);

  texts();
  markWalls();
  if (s.tiles !== false) tiles();
  // кэш для boot.js: следующая вкладка сразу откроется в этих цветах
  try {
    const own = root.getAttribute("style") || "";
    localStorage.setItem("hd-boot-style", own.replace(/--nt-wall:[^;]*url\("data:[^)]*\)[^;]*;?/, ""));
    const attrs = {};
    for (const a of root.attributes) if (a.name.startsWith("nt-") || a.name.startsWith("hd-") || a.name.startsWith("data-")) attrs[a.name] = a.value;
    localStorage.setItem("hd-boot-attrs", JSON.stringify(attrs));
  } catch {}
}

function texts() {
  document.title = T("Новая вкладка", "New Tab");
  $("#q").placeholder = T("Поиск в интернете", "Search the web");
  $("#q").setAttribute("aria-label", T("Поиск", "Search"));
  $("#wall-btn").title = T("Обои", "Wallpaper");
  $("#wall-title").textContent = T("Обои", "Wallpaper");
  $("#dim-label").textContent = T("Затемнение", "Dimming");
  $("#more").textContent = T("Настроить весь дизайн…", "Customize the whole design…");
  $("#tb-img").textContent = T("Картинки", "Images");
  $("#apps-btn").title = T("Приложения и инструменты Chrome", "Apps and Chrome tools");
  $("#apps-chrome-title").textContent = T("Инструменты Chrome", "Chrome tools");
  appsBuilt = false;
}

/* ---------- живые обои ----------
   Раньше — CSS-анимация: браузер перерисовывал весь экран на частоте монитора (144–240 раз в секунду),
   и видеокарта была занята наполовину. Теперь сдвиг считается 20 раз в секунду, а движение такое медленное,
   что разницы не видно. Вкладка не на экране — не считаем вовсе. */
let liveTimer = 0;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
function liveFrame() {
  if (document.hidden) return;
  const t = performance.now() / 1000;
  const w = (p, a) => a * Math.sin((2 * Math.PI * t) / p);
  $("#wall-img").style.transform = `translate3d(${w(76, 4).toFixed(3)}%, ${w(61, -3).toFixed(3)}%, 0) rotate(${w(90, 7).toFixed(3)}deg) scale(${(1.05 + w(53, 0.03)).toFixed(4)})`;
}
function liveMotion(on) {
  clearInterval(liveTimer);
  liveTimer = 0;
  if (!on || reduced.matches || root.hasAttribute("hd-nomotion")) {
    $("#wall-img").style.transform = "";
    return;
  }
  liveFrame();
  liveTimer = setInterval(liveFrame, 50);
}

/* ---------- часы ---------- */
function tick() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if ($("#hh").textContent !== hh) $("#hh").textContent = hh;
  if ($("#mm").textContent !== mm) $("#mm").textContent = mm;
  const lang = S?.lang || navigator.language;
  let wd = "";
  try {
    wd = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" }).format(d);
  } catch {
    wd = d.toDateString();
  }
  const ds = wd.charAt(0).toUpperCase() + wd.slice(1);
  if ($("#date").textContent !== ds) $("#date").textContent = ds;
}
tick();
setInterval(tick, 1000);

/* ---------- поиск: поисковик браузера + подсказки как у Chrome ---------- */
function go(text) {
  if (!text) return;
  if (/^(https?:\/\/|www\.)\S+$/i.test(text) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text)) {
    location.href = /^https?:/i.test(text) ? text : "https://" + text;
    return;
  }
  chrome.search.query({ text, disposition: "CURRENT_TAB" });
}
$("#search").addEventListener("submit", e => {
  e.preventDefault();
  const it = sugg.items[sugg.sel];
  if (it && it.kind === "page") location.href = it.url;
  else go($("#q").value.trim());
});

/* История поиска берётся из истории браузера: адреса страниц результатов поисковиков.
   Это те же запросы, что Chrome показывает в своей строке на стандартной новой вкладке. */
const ENGINES = [
  [/(^|\.)google\.[a-z.]+$/, /^\/search/, "q"],
  [/(^|\.)(yandex\.[a-z.]+|ya\.ru)$/, /^\/(search|yandsearch)/, "text"],
  [/(^|\.)bing\.com$/, /^\/search/, "q"],
  [/(^|\.)duckduckgo\.com$/, /^\/$/, "q"],
  [/(^|\.)search\.yahoo\.com$/, /^\/search/, "p"],
  [/(^|\.)ecosia\.org$/, /^\/search/, "q"],
  [/(^|\.)search\.brave\.com$/, /^\/search/, "q"],
  [/(^|\.)youtube\.com$/, /^\/results/, "search_query"],
];
function searchTerm(url) {
  try {
    const u = new URL(url);
    for (const [h, p, k] of ENGINES) {
      if (h.test(u.hostname) && p.test(u.pathname)) {
        const q = (u.searchParams.get(k) || "").trim();
        if (q) return q.replace(/\s+/g, " ");
      }
    }
  } catch {}
  return null;
}
const ICONS = {
  history: "M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4",
  suggest: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm5 11.5 5 5",
};
const sugg = { items: [], sel: -1, typed: "", seq: 0, ctl: null };
const list = $("#sugg");
const svgIcon = d => {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", d);
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "2");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.append(p);
  return svg;
};
function withMatch(text, q) {
  const span = mk("span", "sg-t");
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0 || !q) {
    span.textContent = text;
    return span;
  }
  // как в Chrome: введённое — обычным, дописанное — жирным
  span.append(text.slice(0, i + q.length));
  span.append(mk("b", "", text.slice(i + q.length)));
  return span;
}
const safeDecode = u => {
  try {
    return decodeURI(u);
  } catch {
    return u;
  }
};
async function fromHistory(q) {
  if (!chrome.history) return { searches: [], pages: [] };
  // поиск истории Chrome по тексту не видит кириллицу в адресе (там %D0%BF…) — берём недавнюю историю и фильтруем сами
  const [recent, byText] = await Promise.all([
    chrome.history.search({ text: "", startTime: 0, maxResults: 3000 }).catch(() => []),
    q ? chrome.history.search({ text: q, startTime: 0, maxResults: 300 }).catch(() => []) : [],
  ]);
  const res = [...byText, ...recent.filter(h => !byText.some(b => b.id === h.id))];
  const seen = new Map();
  const pages = [];
  const ql = q.toLowerCase();
  for (const h of res) {
    const term = searchTerm(h.url);
    if (term) {
      const k = term.toLowerCase();
      if (ql && !k.includes(ql)) continue;
      const e = seen.get(k);
      if (e) e.urls.push(h.url);
      else seen.set(k, { kind: "history", text: term, urls: [h.url], last: h.lastVisitTime || 0, starts: k.startsWith(ql) });
    } else if (q && /^https?:/.test(h.url) && ((h.title || "").toLowerCase().includes(ql) || safeDecode(h.url).toLowerCase().includes(ql))) {
      pages.push({ kind: "page", text: h.title || h.url, url: h.url, score: (h.typedCount || 0) * 4 + (h.visitCount || 0) });
    }
  }
  const searches = [...seen.values()].sort((a, b) => b.starts - a.starts || b.last - a.last);
  pages.sort((a, b) => b.score - a.score);
  return { searches, pages };
}
async function fromEngine(q, signal) {
  if (!q || S?.searchSuggest === false) return [];
  try {
    const hl = (S?.lang || navigator.language || "ru").slice(0, 2);
    const r = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&hl=${hl}&q=${encodeURIComponent(q)}`, { signal, credentials: "omit" });
    const j = await r.json();
    return (j[1] || []).filter(x => typeof x === "string").slice(0, 8).map(text => ({ kind: "suggest", text }));
  } catch {
    return [];
  }
}
let suggTimer = 0;
function suggestSoon() {
  clearTimeout(suggTimer);
  suggTimer = setTimeout(suggest, 90);
}
async function suggest() {
  const q = $("#q").value.trim();
  const my = ++sugg.seq;
  sugg.ctl?.abort();
  sugg.ctl = new AbortController();
  const [h, eng] = await Promise.all([fromHistory(q), fromEngine(q, sugg.ctl.signal)]);
  if (my !== sugg.seq) return;
  const out = [];
  const used = new Set();
  const add = it => {
    const k = (it.kind === "page" ? it.url : it.text).toLowerCase();
    if (used.has(k) || used.has(it.text.toLowerCase())) return;
    used.add(k);
    used.add(it.text.toLowerCase());
    out.push(it);
  };
  if (!q) h.searches.slice(0, 8).forEach(add);
  else {
    h.searches.slice(0, 4).forEach(add);
    h.pages.slice(0, 2).forEach(add);
    eng.forEach(it => out.length < 10 && add(it));
  }
  sugg.items = out;
  sugg.typed = $("#q").value;
  sugg.sel = -1;
  drawSugg(q);
}
function drawSugg(q) {
  list.replaceChildren();
  if (!sugg.items.length || document.activeElement !== $("#q")) {
    list.hidden = true;
    return;
  }
  if (!q) list.append(mk("li", "sg-head", T("Недавние запросы", "Recent searches")));
  sugg.items.forEach((it, i) => {
    const li = mk("li", "sg");
    li.setAttribute("role", "option");
    li.setAttribute("kind", it.kind);
    li.dataset.i = i;
    const ico = mk("span", "sg-ico");
    if (it.kind === "page") {
      const img = new Image();
      img.alt = "";
      img.src = `/_favicon/?pageUrl=${encodeURIComponent(it.url)}&size=32`;
      ico.append(img);
    } else ico.append(svgIcon(ICONS[it.kind]));
    li.append(ico, withMatch(it.text, q));
    if (it.kind === "page") {
      let host = "";
      try {
        host = new URL(it.url).hostname.replace(/^www\./, "");
      } catch {}
      li.querySelector(".sg-t").append(mk("span", "sg-u", "— " + host));
    }
    if (it.kind !== "suggest") {
      const x = mk("button", "sg-x", "×");
      x.type = "button";
      x.title = T("Удалить из истории", "Remove from history");
      x.addEventListener("click", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        for (const url of it.urls || [it.url]) await chrome.history.deleteUrl({ url }).catch(() => {});
        suggest();
      });
      li.append(x);
    }
    list.append(li);
  });
  list.hidden = false;
  markSel();
}
function markSel() {
  for (const li of list.querySelectorAll(".sg")) li.toggleAttribute("sel", Number(li.dataset.i) === sugg.sel);
}
function closeSugg() {
  sugg.seq++;
  list.hidden = true;
  sugg.sel = -1;
}
// щелчок по подсказке не должен уводить фокус из строки
list.addEventListener("pointerdown", e => e.preventDefault());
list.addEventListener("click", e => {
  const li = e.target.closest(".sg");
  if (!li) return;
  const it = sugg.items[Number(li.dataset.i)];
  if (!it) return;
  if (it.kind === "page") location.href = it.url;
  else {
    $("#q").value = it.text;
    go(it.text);
  }
});
list.addEventListener("mousemove", e => {
  const li = e.target.closest(".sg");
  if (li && Number(li.dataset.i) !== sugg.sel) {
    sugg.sel = Number(li.dataset.i);
    markSel();
  }
});
$("#q").addEventListener("input", suggestSoon);
$("#q").addEventListener("focus", suggestSoon);
$("#q").addEventListener("blur", closeSugg);
$("#q").addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (!list.hidden) {
      e.preventDefault();
      $("#q").value = sugg.typed;
      closeSugg();
    }
    return;
  }
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  if (list.hidden) return suggest();
  e.preventDefault();
  const n = sugg.items.length;
  if (!n) return;
  sugg.sel = e.key === "ArrowDown" ? (sugg.sel + 1 >= n ? -1 : sugg.sel + 1) : sugg.sel - 1 < -1 ? n - 1 : sugg.sel - 1;
  const it = sugg.items[sugg.sel];
  $("#q").value = it ? (it.kind === "page" ? it.url : it.text) : sugg.typed;
  markSel();
});

/* ---------- верхняя панель: приложения Google и инструменты Chrome ---------- */
// chrome:// по обычной ссылке со страницы расширения не открыть — открываем через tabs
const CHROME_TOOLS = () => [
  ["chrome://history", T("История", "History"), "M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4"],
  ["chrome://downloads", T("Загрузки", "Downloads"), "M12 4v11m-5-5 5 5 5-5M5 20h14"],
  ["chrome://bookmarks", T("Закладки", "Bookmarks"), "M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1Z"],
  ["chrome://password-manager/passwords", T("Пароли", "Passwords"), "M8 11V8a4 4 0 1 1 8 0v3M6 11h12v9H6z"],
  ["chrome://extensions", T("Расширения", "Extensions"), "M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4h-4v-2a2 2 0 1 0-4 0v2H6v-4h2a2 2 0 1 0 0-4H6V6h4Z"],
  ["chrome://settings", T("Настройки", "Settings"), "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"],
  ["chrome://settings/clearBrowserData", T("Очистить историю", "Clear data"), "M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"],
  ["chrome://newtab/?hd-studio", T("Hand Design Studio", "Hand Design Studio"), "M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.4 17 3 12 3Z"],
  ["chrome://settings/help", T("О Chrome", "About Chrome"), "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v5m0-8.5v.5"],
];
const GOOGLE_APPS = () => [
  ["https://www.google.com/", T("Поиск", "Search")],
  ["https://www.youtube.com/", "YouTube"],
  ["https://mail.google.com/mail/", "Gmail"],
  ["https://drive.google.com/", T("Диск", "Drive")],
  ["https://maps.google.com/", T("Карты", "Maps")],
  ["https://translate.google.com/", T("Переводчик", "Translate")],
  ["https://calendar.google.com/", T("Календарь", "Calendar")],
  ["https://photos.google.com/", T("Фото", "Photos")],
  ["https://docs.google.com/", T("Документы", "Docs")],
  ["https://play.google.com/", "Play"],
  ["https://news.google.com/", T("Новости", "News")],
  ["https://gemini.google.com/", "Gemini"],
];
let appsBuilt = false;
function openUrl(url, newTab) {
  if (url.includes("?hd-studio")) return chrome.runtime.openOptionsPage();
  if (newTab) chrome.tabs.create({ url, active: false });
  else chrome.tabs.getCurrent(t => chrome.tabs.update(t ? t.id : undefined, { url }));
}
function buildApps() {
  if (appsBuilt) return;
  appsBuilt = true;
  const cg = $("#chrome-grid");
  cg.replaceChildren();
  for (const [url, name, d] of CHROME_TOOLS()) {
    const b = mk("button", "app");
    b.type = "button";
    b.append(svgIcon(d), mk("span", "", name));
    b.addEventListener("click", e => openUrl(url, e.ctrlKey || e.metaKey || e.shiftKey));
    b.addEventListener("auxclick", e => e.button === 1 && openUrl(url, true));
    cg.append(b);
  }
  const gg = $("#google-grid");
  gg.replaceChildren();
  for (const [url, name] of GOOGLE_APPS()) {
    const a = mk("a", "app");
    a.href = url;
    const img = new Image();
    img.alt = "";
    // значки Google-сервисов — с самого Google: в кэше браузера их может не быть, и вместо них был бы глобус
    img.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
    img.onerror = () => (img.src = `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=64`);
    a.append(img, mk("span", "", name));
    gg.append(a);
  }
}
const appsPop = $("#apps-pop");
function openApps(v) {
  if (v) buildApps();
  appsPop.hidden = !v;
  $("#apps-btn").toggleAttribute("open", v);
}
$("#apps-btn").addEventListener("click", e => {
  e.stopPropagation();
  openPop(false);
  openApps(appsPop.hidden);
});
appsPop.addEventListener("click", e => e.stopPropagation());
document.addEventListener("click", () => openApps(false));
document.addEventListener("keydown", e => e.key === "Escape" && openApps(false));
// начали печатать где угодно — сразу в поиск
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1 || document.activeElement === $("#q")) return;
  if (!$("#wall-pop").hidden || !$("#apps-pop").hidden) return;
  $("#q").focus();
});

/* ---------- ярлыки сайтов ---------- */
let tilesBusy = false;
async function tiles() {
  if (tilesBusy) return;
  tilesBusy = true;
  try {
    const nav = $("#tiles");
    const [sites, store] = await Promise.all([chrome.topSites.get(), chrome.storage.local.get("hdHiddenSites")]);
    const hidden = new Set(store.hdHiddenSites || []);
    const list = sites.filter(s => /^https?:/.test(s.url) && !hidden.has(s.url)).slice(0, 8);
    nav.replaceChildren();
    list.forEach((site, i) => {
      const a = mk("a", "tile");
      a.href = site.url;
      a.style.setProperty("--i", i);
      a.title = site.title || site.url;
      const ico = mk("span", "tile-ico");
      const img = new Image();
      img.alt = "";
      img.src = `/_favicon/?pageUrl=${encodeURIComponent(site.url)}&size=64`;
      img.onerror = () => {
        img.remove();
        ico.append(mk("b", "", (new URL(site.url).hostname.replace(/^www\./, "")[0] || "?").toUpperCase()));
      };
      ico.append(img);
      let name = site.title || "";
      try {
        name = new URL(site.url).hostname.replace(/^www\./, "");
      } catch {}
      const x = mk("button", "tile-x", "×");
      x.title = T("Убрать", "Remove");
      x.addEventListener("click", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        hidden.add(site.url);
        await chrome.storage.local.set({ hdHiddenSites: [...hidden].slice(-200) });
        a.remove();
      });
      a.append(ico, mk("span", "tile-name", name), x);
      nav.append(a);
    });
    nav.style.setProperty("--nt-cols", String(Math.min(8, Math.max(1, list.length))));
  } catch (e) {
    console.warn("[hd] top sites:", e);
  } finally {
    tilesBusy = false;
  }
}

/* ---------- меню обоев ---------- */
const pop = $("#wall-pop");
const grid = $("#wall-grid");
const items = new Map();
function addItem(id, label, bg) {
  const it = mk("button", "sw");
  it.dataset.id = id;
  it.title = label;
  if (bg) it.style.background = bg;
  it.append(mk("span", "", label));
  grid.append(it);
  items.set(id, it);
  return it;
}
function buildWalls() {
  grid.replaceChildren();
  items.clear();
  addItem("theme", T("Тема", "Theme"), "var(--nt-wall-theme, #333)");
  for (const [id, ru, en, css] of WALLS) addItem(id, T(ru, en), css);
  addItem("custom", T("Своя…", "Own…"), null).classList.add("sw-own");
}
async function markWalls() {
  if (!items.size) buildWalls();
  items.get("theme").style.background = themeById(S.theme).wall;
  for (const [k, el] of items) el.toggleAttribute("selected", k === S.wall);
  const own = items.get("custom");
  if (S.wall === "custom") {
    const url = await customWall();
    if (url) own.style.background = `center / cover no-repeat url("${url}")`;
  }
  $("#dim").value = String(S.wallDim ?? 15);
}
function openPop(v) {
  pop.hidden = !v;
  $("#wall-btn").toggleAttribute("open", v);
}
grid.addEventListener("click", e => {
  const it = e.target.closest(".sw");
  if (!it) return;
  if (it.dataset.id === "custom") pickFile(it);
  else patch({ wall: it.dataset.id === "theme" ? null : it.dataset.id });
});
function pickFile(own) {
  const input = mk("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    own.setAttribute("busy", "");
    try {
      // уменьшаем до 3200 px по длинной стороне — обои грузятся мгновенно
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await img.decode();
      const k = Math.min(1, 3200 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = mk("canvas");
      cv.width = Math.round(img.naturalWidth * k);
      cv.height = Math.round(img.naturalHeight * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      const data = cv.toDataURL("image/jpeg", 0.9);
      await chrome.storage.local.set({ hdWall: data });
      await patch({ wall: "custom" });
      render({ ...S, wall: "custom" });
    } catch (e) {
      console.error("[hd] wallpaper:", e);
    } finally {
      own.removeAttribute("busy");
    }
  });
  input.click();
}
$("#dim").addEventListener("input", e => setVar("--nt-dim", String(e.target.value / 100)));
$("#dim").addEventListener("change", e => patch({ wallDim: Number(e.target.value) }));
$("#wall-btn").addEventListener("click", e => {
  e.stopPropagation();
  openApps(false);
  openPop(pop.hidden);
});
pop.addEventListener("click", e => e.stopPropagation());
document.addEventListener("click", () => openPop(false));
document.addEventListener("keydown", e => e.key === "Escape" && openPop(false));
$("#more").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("#studio-btn").addEventListener("click", () => chrome.runtime.openOptionsPage());

/* ---------- одноразовое сообщение: верх браузера красится политикой ----------
   Политика цвета — единственный способ без ручной загрузки темы, но из-за неё Chrome пишет в меню
   «Управляется вашей организацией». Говорим об этом один раз и даём выключить. */
async function topNotice() {
  const { hdTop, hdTopNotice } = await chrome.storage.local.get(["hdTop", "hdTopNotice"]);
  if (hdTopNotice || !hdTop || !hdTop.on) return;
  const box = $("#notice");
  const txt = $("#notice-text");
  txt.replaceChildren(
    mk("b", "", T("Верх браузера теперь в цвет темы — сам.", "The browser frame now follows the theme automatically.")),
    document.createTextNode(" " + T(
      "Для этого Hand Design ставит в Windows настройку цвета для браузера, и в меню Chrome появилась надпись «Управляется вашей организацией». Это только цвет: браузером никто не управляет. Выключить: Studio → Цвета → «Красить верх браузера» — надпись пропадёт.",
      "To do this Hand Design sets a browser color setting in Windows, so the Chrome menu now says “Managed by your organization”. It is only the color — nobody controls your browser. To turn off: Studio → Colors → “Paint the browser frame” — the label disappears."))
  );
  $("#notice-ok").textContent = T("Понятно", "Got it");
  $("#notice-off").textContent = T("Выключить", "Turn off");
  box.hidden = false;
  const done = () => {
    box.hidden = true;
    chrome.storage.local.set({ hdTopNotice: true });
  };
  $("#notice-ok").onclick = done;
  $("#notice-off").onclick = () => {
    patch({ autoFrame: false });
    done();
  };
}

/* ---------- старт ---------- */
load().then(render).then(() => setTimeout(topNotice, 1200));
onChange(render);
matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => S && render(S));
reduced.addEventListener("change", () => S && render(S));
document.addEventListener("visibilitychange", () => !document.hidden && liveTimer && liveFrame());
