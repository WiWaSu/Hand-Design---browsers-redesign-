/* Предпросмотр в Studio: уменьшенное окно браузера.
 * Цвета и форма берутся из темы (её themes/<id>-chrome.css или само окно браузера),
 * поверх — настройки Studio. Значки — из пака значков: выбранного в Studio или пака темы. */
import { FONTS, CLOCK_FONTS } from "./FloorpModernStudio.sys.mjs";
import { dataUrl, PACKS, BASE_PACK } from "./hd-icons.mjs";
import { THEMES } from "./FloorpModernThemes.sys.mjs";
import { t as tr } from "./FloorpModernL10n.sys.mjs";

// значки предпросмотра — из пака значков (выбранного в Studio или пака темы)
const IC = { back: "back", forward: "forward", reload: "reload", sidebar: "sidebar", extensions: "puzzle", menu: "menu", tabs: "chevronDown",
  close: "close", plus: "plus", lock: "lock", star: "star", copy: "copy", paste: "paste", link: "link", save: "save", search: "search",
  play: "play", folder: "folder", minimize: "minimize", maximize: "maximize" };
const h = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const icon = (name, cls = "") => {
  const i = h("i", "mb-i " + cls);
  i.dataset.ic = IC[name];
  return i;
};

/* значения темы: из её файла (для наведения) или из окна браузера (текущая) */
const fileCache = new Map();
async function themeTokens(id) {
  if (!fileCache.has(id)) {
    fileCache.set(id, fetch(`themes/${id}-chrome.css`).then(r => r.text()).then(css => {
      const block = css.slice(css.indexOf("{") + 1, css.indexOf("}"));
      const out = {};
      for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+?)\s*!important/g)) out[m[1]] = m[2];
      return out;
    }).catch(() => ({})));
  }
  return fileCache.get(id);
}
const WINDOW_KEYS = ["--fm-user-accent", "--fm-accent", "--fm-on-accent", "--fm-frame", "--fm-bar", "--fm-field", "--fm-menu", "--fm-ink", "--fm-muted", "--fm-line", "--fm-hover", "--fm-press", "--fm-soft", "--fm-radius", "--fm-gap", "--fm-font", "--panel-border-radius", "--menuitem-border-radius", "--toolbarbutton-border-radius", "--tab-border-radius"];
function windowTokens() {
  try {
    const w = Services.wm.getMostRecentWindow("navigator:browser");
    const cs = w.getComputedStyle(w.document.documentElement);
    const out = {};
    for (const k of WINDOW_KEYS) {
      const v = cs.getPropertyValue(k).trim();
      if (v) out[k] = v;
    }
    out.scheme = cs.colorScheme;
    return out;
  } catch {
    return null;
  }
}
const schemeOf = id => {
  const g = (THEMES.find(t => t[0] === id)?.[3] || "").split(" ");
  return g.includes("light") && !g.includes("dark") ? "light" : g.includes("dark") && !g.includes("light") ? "dark" : "light dark";
};

export function createPreview(root) {
  const win = h("div", "mb-win");
  // вкладки
  const tabs = h("div", "mb-tabs");
  const tabList = ["Hand Design Studio", tr("Почта"), tr("Новости")].map((name, i) => {
    const t = h("div", "mb-tab" + (i === 0 ? " sel" : ""));
    t.append(h("span", "mb-fav"), h("span", "mb-label", name), icon("close", "mb-x"));
    return t;
  });
  const newTab = icon("plus", "mb-btn mb-newtab");
  const allTabs = icon("tabs", "mb-btn mb-alltabs");
  const wc = h("div", "mb-wc");
  wc.append(icon("minimize"), icon("maximize"), icon("close"));
  tabs.append(...tabList, newTab, h("span", "mb-flex"), allTabs, wc);
  // панель с адресом
  const nav = h("div", "mb-nav");
  const url = h("div", "mb-url");
  url.append(icon("lock", "mb-urlicon"), h("span", "mb-urltext", "github.com/WiWaSu/Hand-Design"), icon("star", "mb-urlicon"));
  const sideBtn = icon("sidebar", "mb-btn");
  const extBtn = icon("extensions", "mb-btn");
  nav.append(icon("back", "mb-btn"), icon("forward", "mb-btn"), icon("reload", "mb-btn"), sideBtn, url, extBtn, icon("menu", "mb-btn"));
  const progress = h("div", "fm-progress fm-active mb-progress");
  const progressFill = h("div", "fm-progress-fill");
  progressFill.style.width = "62%";
  progress.append(progressFill);
  const bm = h("div", "mb-bm");
  for (const name of ["GitHub", tr("Почта"), "YouTube", tr("Заметки")]) {
    const b = h("span", "mb-bmitem");
    b.append(icon("folder"), h("span", "", name));
    bm.append(b);
  }
  // страница: новая вкладка
  const page = h("div", "mb-page");
  const wall = h("div", "mb-wall");
  const clock = h("div", "mb-clock");
  const time = h("b", "", "12:34");
  const date = h("span", "mb-date", new Date().toLocaleDateString(document.documentElement.lang || undefined, { weekday: "long", day: "numeric", month: "long" }));
  clock.append(time, date);
  const search = h("div", "mb-search");
  search.append(icon("search"), h("span", "", tr("Поиск или адрес")));
  const tiles = h("div", "mb-tiles");
  for (const c of ["G", "Y", "W", "M", "R"]) tiles.append(h("span", "mb-tile", c));
  // меню правой кнопки
  const menu = h("div", "mb-menu");
  for (const [ic, name, on] of [["back", "Назад"], ["reload", "Обновить"], ["star", "Добавить в закладки"], [null], ["copy", "Копировать", true], ["paste", "Вставить"], ["link", "Копировать ссылку"], ["save", "Сохранить страницу как…"]]) {
    if (!ic) {
      menu.append(h("hr"));
      continue;
    }
    const it = h("div", "mb-item" + (on ? " on" : ""));
    it.append(icon(ic, "mb-micon"), h("span", "", tr(name)));
    menu.append(it);
  }
  const nowbar = h("div", "mb-nowbar");
  const eq = h("span", "mb-eq");
  eq.append(h("i"), h("i"), h("i"));
  nowbar.append(eq, h("span", "mb-nowtitle", "Lo-fi beats — Radio"), icon("play", "mb-btn"));
  page.append(wall, clock, search, tiles, menu, nowbar);
  win.append(tabs, nav, progress, bm, page);
  root.append(win);

  let hover = null;
  let last = { cfg: {}, theme: "" };
  let seq = 0;
  async function render(cfg, theme) {
    last = { cfg, theme };
    const id = hover || theme;
    const n = ++seq;
    // наведение на другую тему: её цвета без своих цветов Studio (их сбрасывает смена темы)
    const own = hover && hover !== theme;
    const live = windowTokens();
    const tok = (!own && live) || await themeTokens(id);
    if (n !== seq) return;
    const c = own ? Object.fromEntries(Object.entries(cfg).filter(([k]) => !["accent", "frame", "bar", "menuBg", "ink", "menuAlpha", "menuBlur"].includes(k))) : cfg;
    const s = win.style;
    s.cssText = "";
    s.colorScheme = tok.scheme && tok.scheme !== "normal" ? tok.scheme : schemeOf(id);
    // свой акцент из установщика остаётся при смене темы, акцент Studio — нет
    s.setProperty("--fm-user-accent", c.accent || (!cfg.accent && live?.["--fm-user-accent"]) || "initial");
    for (const [k, v] of Object.entries(tok)) if (k.startsWith("--")) s.setProperty(k, v);
    const set = (k, v) => v !== undefined && v !== null && s.setProperty(k, v);
    const px = v => v + "px";
    if (c.accent) {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(c.accent.slice(i, i + 2), 16));
      set("--fm-accent", c.accent);
      set("--fm-on-accent", c.onAccent || (0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#000000" : "#ffffff"));
    } else if (c.onAccent) set("--fm-on-accent", c.onAccent);
    for (const [k, prop] of [["frame", "--fm-frame"], ["bar", "--fm-bar"], ["ink", "--fm-ink"], ["muted", "--fm-muted"], ["line", "--fm-line"], ["menuBg", "--fm-menu"]]) if (c[k]) set(prop, c[k]);
    if (c.field || c.bar) set("--fm-field", c.field || c.bar);
    for (const [k, prop, pct] of [["hover", "--fm-hover", 12], ["press", "--fm-press", 20], ["soft", "--fm-soft", 24]]) if (c[k]) set(prop, `color-mix(in srgb, ${c[k]} ${pct}%, transparent)`);
    if (c.radius !== undefined) set("--fm-radius", px(c.radius));
    if (c.gap !== undefined) set("--fm-gap", px(c.gap));
    if (c.pageShadow !== undefined) set("--mb-shadow", `0 1px 3px rgb(0 0 0 / ${(c.pageShadow / 250).toFixed(2)}), 0 12px 34px rgb(0 0 0 / ${(c.pageShadow / 220).toFixed(2)})`);
    if (c.menuRadius !== undefined) set("--panel-border-radius", px(c.menuRadius));
    if (c.menuItemRadius !== undefined) set("--menuitem-border-radius", px(c.menuItemRadius));
    else if (c.menuRadius !== undefined) set("--menuitem-border-radius", px(Math.round(c.menuRadius * 0.6)));
    if (c.menuAlpha) set("--mb-menu-alpha", 100 - c.menuAlpha + "%");
    if (c.menuBlur) set("--mb-menu-blur", px(c.menuBlur));
    if (c.menuItemHeight) set("--mb-item-h", px(c.menuItemHeight));
    if (c.menuFont) set("--mb-menu-font", px(c.menuFont));
    if (c.buttonShape) set("--toolbarbutton-border-radius", { round: "999px", rounded: "10px", square: "3px" }[c.buttonShape]);
    if (c.density) set("--mb-pad", { compact: "6px", normal: "8px", touch: "11px" }[c.density]);
    if (c.tabHeight) set("--mb-tab-h", px(c.tabHeight));
    if (c.tabMinWidth) set("--mb-tab-w", px(Math.max(c.tabMinWidth, 90)));
    if (c.tabWeight) set("--mb-tab-weight", c.tabWeight);
    if (c.urlHeight) set("--mb-url-h", px(c.urlHeight));
    if (c.urlRadius !== undefined) set("--mb-url-r", px(c.urlRadius));
    const font = c.font === "custom" ? (c.fontCustom ? `"${c.fontCustom}", "Segoe UI", sans-serif` : null) : FONTS[c.font];
    if (font) set("--fm-font", font);
    if (c.fontSize) set("--mb-font-size", px(c.fontSize));
    if (c.clockSize) set("--mb-clock-size", px(Math.round(c.clockSize * 0.45)));
    if (c.clockWeight) set("--mb-clock-weight", c.clockWeight);
    if (c.clockFont) set("--mb-clock-font", c.clockFont === "ui" ? (font || "var(--fm-font)") : CLOCK_FONTS[c.clockFont]);
    if (c.searchWidth) set("--mb-search-w", c.searchWidth + "%");
    if (c.wallBlur) set("--mb-wall-blur", px(Math.round(c.wallBlur / 2)));
    const attrs = {
      "tab-shape": c.tabShape, "tab-sel": c.tabSelected, "tab-close": c.tabClose, "tabs-hide": c.tabsHide,
      "url-align": c.urlAlign, "url-border": c.urlBorder, "menu-style": c.menuStyle, "clock-pos": c.clockPos,
    };
    for (const [k, v] of Object.entries(attrs)) v ? win.setAttribute("data-" + k, v) : win.removeAttribute("data-" + k);
    win.toggleAttribute("data-square", c.square === true);
    win.toggleAttribute("data-no-icons", c.menuIcons === false);
    bm.hidden = c.showBookmarks === false;
    sideBtn.hidden = c.showSidebarButton === false;
    allTabs.hidden = c.showTabList === false;
    newTab.hidden = c.showNewTabButton === false;
    extBtn.hidden = c.showExtensions === false;
    nowbar.hidden = c.showNowBar === false;
    progress.hidden = c.showProgress === false;
    date.hidden = c.showDate === false;
    tiles.hidden = c.tiles === false;
    win.dataset.theme = id;
    progress.dataset.s = c.loadBar || id;
    const pack = PACKS[c.iconPack] ? c.iconPack : PACKS[id] ? id : BASE_PACK;
    if (win.dataset.pack !== pack) {
      win.dataset.pack = pack;
      for (const el of win.querySelectorAll("[data-ic]")) el.style.setProperty("--i", dataUrl(el.dataset.ic, pack));
    }
  }
  return {
    render,
    hover(id) {
      hover = id;
      render(last.cfg, last.theme);
    },
    // подсветить место окна, к которому относится настройка
    highlight(area) {
      if (area) win.dataset.hl = area;
      else delete win.dataset.hl;
    },
  };
}
