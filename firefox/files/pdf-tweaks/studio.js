/* Hand Design Studio — страница настроек.
 * Получает текущие настройки от браузера (событие fm-studio-config) и
 * отправляет изменения обратно (fm-studio-save). Применяет их сам браузер. */
import { SCHEMA, PRESETS, sanitize } from "./FloorpModernStudio.sys.mjs";
import { THEMES, GROUPS } from "./FloorpModernThemes.sys.mjs";
import { t as tr, LANGS, LANG_PREF, pickLang, currentLang, langSetting, useDicts } from "./FloorpModernL10n.sys.mjs";

const $ = (sel, root = document) => root.querySelector(sel);
const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
// значения по умолчанию для переключателей (null = как в теме)
const BOOL_DEFAULT = { ctrlTabPreview: false, square: false, pdfAutoParams: false, pdfInkSelect: false };

let cfg = {};
let connected = false;
const controls = new Map();

/* ---------- связь с браузером ----------
   Открыта как chrome://fmstudio/ — у страницы есть права браузера, пишем настройки сами.
   Открыта как resource:// — через события, их передаёт актор FloorpPdfTweaks. */
let direct = null;
let themesApi = null;
try {
  if (typeof ChromeUtils !== "undefined") {
    direct = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernStudio.sys.mjs");
    themesApi = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernThemes.sys.mjs");
  }
} catch {
  direct = null;
  themesApi = null;
}

/* ---------- язык ----------
   С правами браузера язык берётся из настроек сам. Без них (resource://) — из localStorage,
   его обновляет событие fm-studio-config; словари подгружаются здесь. */
const LS_LANG = "fm-studio-lang";
if (!direct) {
  let code = "auto";
  try {
    code = localStorage.getItem(LS_LANG) || "auto";
  } catch {}
  const c = pickLang(code);
  try {
    const en = c === "ru" ? {} : (await import("./l10n/en.sys.mjs")).default;
    const own = c === "ru" || c === "en" ? {} : (await import(`./l10n/${c}.sys.mjs`)).default;
    useDicts(c, en, own);
  } catch {
    useDicts(c, {}, {});
  }
}
document.documentElement.lang = currentLang();
// статичный текст страницы (studio.html)
(function translateDom(root) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walk.nextNode()) nodes.push(walk.currentNode);
  for (const n of nodes) {
    const raw = n.nodeValue;
    const s = raw.trim();
    if (s && /[А-Яа-яЁё]/.test(s)) n.nodeValue = raw.replace(s, tr(s));
  }
  for (const el of root.querySelectorAll("[title]")) el.title = tr(el.title);
})(document.body);
document.title = tr(document.title);

let theme = "";
let saveTimer = 0;
function save(now = false) {
  clearTimeout(saveTimer);
  const send = () => {
    if (direct) {
      try {
        direct.save(sanitize(cfg));
        return;
      } catch (e) {
        console.error(e);
      }
    }
    window.dispatchEvent(new CustomEvent("fm-studio-save", { detail: JSON.stringify(sanitize(cfg)) }));
  };
  if (now) send();
  else saveTimer = setTimeout(send, 120);
}
window.addEventListener("fm-studio-config", e => {
  connected = true;
  try {
    const d = JSON.parse(e.detail || "{}");
    cfg = sanitize(d.config || {});
    if (d.lang !== undefined && !direct) {
      let was = "auto";
      try {
        was = localStorage.getItem(LS_LANG) || "auto";
        localStorage.setItem(LS_LANG, d.lang || "auto");
      } catch {}
      if (pickLang(d.lang) !== currentLang() && was !== (d.lang || "auto")) {
        location.reload();
        return;
      }
    }
    if (d.version) showVer(d.version);
    if (d.theme) theme = d.theme;
    markTheme();
  } catch {
    cfg = {};
  }
  document.documentElement.toggleAttribute("connected", true);
  refreshAll();
});

function showVer(v) {
  const el = $("#ver");
  el.textContent = "· " + tr("версия") + " ";
  el.append(mk("span", "ver-pill", v));
}

function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  t.classList.remove("out");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => (t.hidden = true), 300);
  }, 1800);
}

function set(key, value) {
  if (value === null || value === undefined || value === "") delete cfg[key];
  else cfg[key] = value;
  refresh(key);
  save();
}

/* ---------- элементы управления ---------- */
function row(it) {
  const r = mk("div", "row");
  r.dataset.key = it.key;
  const head = mk("div", "row-head");
  const lab = mk("div", "label", tr(it.label));
  head.append(lab);
  const reset = mk("button", "reset", "↺");
  reset.title = tr("Как в теме");
  reset.addEventListener("click", () => set(it.key, null));
  head.append(reset);
  r.append(head);
  if (it.hint) r.append(mk("div", "hint", tr(it.hint)));
  return r;
}

// Firefox при восстановлении вкладки сам заполняет поля формы и шлёт события —
// принимаем изменения только от элементов, которых пользователь реально касался
function touchable(el) {
  el.setAttribute("autocomplete", "off");
  const mark = () => (el.dataset.touched = "1");
  el.addEventListener("pointerdown", mark);
  el.addEventListener("keydown", mark);
  return () => el.dataset.touched === "1";
}

/* ---------- свой выбор цвета (вместо системного окна Windows) ---------- */
const PALETTE = [
  "#FF453A", "#FF6B6B", "#FF9F0A", "#FFD60A", "#FFE600", "#B4E33D",
  "#30D158", "#16A37A", "#64D2FF", "#22C3E6", "#0A84FF", "#3E91FF",
  "#5E5CE6", "#6C8CFF", "#A35CFF", "#BF5AF2", "#FF4FD8", "#FF5C8A",
  "#EBBCBA", "#E0567F", "#8B5E3C", "#FE8019", "#88C0D0", "#7BC47F",
  "#FFFFFF", "#E5E9F0", "#9196A1", "#3A3B42", "#1C1D21", "#000000",
];
const THEME_SLOT = { accent: 2, frame: 0, bar: 1, menuBg: 1, ink: 3 };
function themeColor(key) {
  try {
    const t = THEMES.find(x => x[0] === theme) || THEMES[0];
    return t[2][THEME_SLOT[key] ?? 2];
  } catch {
    return "";
  }
}
function normHex(v) {
  v = String(v || "").trim().replace(/^#?/, "#");
  if (/^#[0-9a-f]{3}$/i.test(v)) v = "#" + [...v.slice(1)].map(c => c + c).join("");
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : "";
}
function hexToHsv(h) {
  const n = parseInt(h.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let hue = 0;
  if (d) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return { h: hue, s: max ? d / max : 0, v: max };
}
function hsvToHex({ h, s, v }) {
  const f = n => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return "#" + [f(5), f(3), f(1)].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
let recent = [];
try {
  recent = JSON.parse(localStorage.getItem("fm-recent-colors") || "[]").filter(normHex).slice(0, 12);
} catch {}
function remember(c) {
  recent = [c, ...recent.filter(x => x !== c)].slice(0, 12);
  try {
    localStorage.setItem("fm-recent-colors", JSON.stringify(recent));
  } catch {}
}

let pop = null;
function closePicker(commit = true) {
  if (!pop) return;
  const p = pop;
  pop = null;
  if (commit && p.dirty && cfg[p.key]) remember(cfg[p.key]);
  p.el.setAttribute("closing", "");
  p.anchor.removeAttribute("open");
  setTimeout(() => p.el.remove(), 160);
}
document.addEventListener("pointerdown", e => {
  if (pop && !pop.el.contains(e.target) && e.target !== pop.anchor) closePicker();
}, true);
document.addEventListener("keydown", e => {
  if (!pop) return;
  if (e.key === "Escape") {
    set(pop.key, pop.before);
    closePicker(false);
  } else if (e.key === "Enter" && e.target.tagName !== "BUTTON") closePicker();
});

function openPicker(anchor, key) {
  if (pop?.anchor === anchor) return closePicker();
  closePicker();
  const before = cfg[key] ?? null;
  let hsv = hexToHsv(normHex(before || themeColor(key)) || "#808080");
  const el = mk("div", "picker");
  const sv = mk("div", "pk-sv");
  const svKnob = mk("div", "pk-knob");
  sv.append(svKnob);
  const hue = mk("div", "pk-hue");
  const hueKnob = mk("div", "pk-knob");
  hue.append(hueKnob);
  const top = mk("div", "pk-top");
  const prev = mk("div", "pk-prev");
  const was = mk("button", "pk-was");
  was.type = "button";
  was.title = tr("Вернуть как было");
  was.style.setProperty("--c", before || themeColor(key) || "transparent");
  const now = mk("div", "pk-now");
  prev.append(was, now);
  const hex = mk("input", "hex");
  hex.maxLength = 7;
  hex.spellcheck = false;
  top.append(prev, hex);

  const grid = mk("div", "pk-grid");
  const addDot = (c, title) => {
    const b = mk("button", "pk-dot");
    b.type = "button";
    b.style.setProperty("--c", c);
    b.title = title || c;
    b.dataset.c = c;
    b.addEventListener("click", () => {
      hsv = hexToHsv(c);
      apply();
    });
    grid.append(b);
  };
  const t = THEMES.find(x => x[0] === theme);
  const sec = label => grid.append(mk("div", "pk-label", label));
  if (t) {
    sec(tr("Из темы «{0}»", t[1]));
    [...new Set(t[2].map(normHex))].forEach(c => addDot(c, tr("Тема: ") + c));
  }
  if (recent.length) {
    sec(tr("Недавние"));
    recent.forEach(c => addDot(c));
  }
  sec(tr("Палитра"));
  PALETTE.forEach(c => addDot(c));

  const foot = mk("div", "pk-foot");
  const themeBtn = mk("button", "ghost", tr("Как в теме"));
  themeBtn.type = "button";
  themeBtn.addEventListener("click", () => {
    set(key, null);
    closePicker(false);
  });
  const ok = mk("button", "pk-ok", tr("Готово"));
  ok.type = "button";
  ok.addEventListener("click", () => closePicker());
  foot.append(themeBtn, ok);
  el.append(sv, hue, top, grid, foot);

  const p = { el, anchor, key, before, dirty: false };
  function paint() {
    const c = hsvToHex(hsv);
    sv.style.setProperty("--h", `hsl(${hsv.h} 100% 50%)`);
    svKnob.style.left = hsv.s * 100 + "%";
    svKnob.style.top = (1 - hsv.v) * 100 + "%";
    svKnob.style.setProperty("--c", c);
    hueKnob.style.left = (hsv.h / 360) * 100 + "%";
    hueKnob.style.setProperty("--c", `hsl(${hsv.h} 100% 50%)`);
    now.style.setProperty("--c", c);
    if (document.activeElement !== hex) hex.value = c;
    for (const d of grid.querySelectorAll(".pk-dot")) d.toggleAttribute("on", d.dataset.c === c);
    return c;
  }
  function apply() {
    const c = paint();
    p.dirty = true;
    set(key, c);
  }
  was.addEventListener("click", () => {
    set(key, before);
    hsv = hexToHsv(normHex(before || themeColor(key)) || "#808080");
    paint();
  });
  hex.addEventListener("input", () => {
    const c = normHex(hex.value);
    if (c) {
      hsv = hexToHsv(c);
      apply();
    }
  });
  const drag = (area, onMove) => {
    area.addEventListener("pointerdown", e => {
      e.preventDefault();
      area.setPointerCapture(e.pointerId);
      const move = ev => {
        const r = area.getBoundingClientRect();
        onMove(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
        apply();
      };
      move(e);
      area.addEventListener("pointermove", move);
      area.addEventListener("pointerup", () => area.removeEventListener("pointermove", move), { once: true });
    });
  };
  drag(sv, (x, y) => {
    hsv.s = x;
    hsv.v = 1 - y;
  });
  drag(hue, x => {
    hsv.h = Math.min(359.9, x * 360);
  });
  el.addEventListener("wheel", e => {
    if (!hue.contains(e.target)) return;
    e.preventDefault();
    hsv.h = (hsv.h + (e.deltaY > 0 ? 4 : -4) + 360) % 360;
    apply();
  }, { passive: false });

  anchor.setAttribute("open", "");
  anchor.parentElement.append(el);
  paint();
  pop = p;
  // не вылезать за низ окна
  const r = el.getBoundingClientRect();
  if (r.bottom > innerHeight - 12) el.style.translate = `0 ${-Math.min(r.bottom - innerHeight + 12, r.top - 12)}px`;
}

function buildControl(it) {
  const r = row(it);
  let update;
  if (it.type === "color") {
    const wrap = mk("div", "color");
    const sw = mk("button", "swatch");
    sw.type = "button";
    sw.title = tr("Выбрать цвет");
    const hex = mk("input", "hex");
    hex.maxLength = 7;
    hex.spellcheck = false;
    hex.placeholder = "#RRGGBB";
    const theme = mk("span", "badge", tr("как в теме"));
    const tHex = touchable(hex);
    hex.addEventListener("change", () => {
      const v = normHex(hex.value);
      if (tHex() && v) set(it.key, v);
    });
    sw.addEventListener("click", () => openPicker(sw, it.key));
    wrap.append(sw, hex, theme);
    r.append(wrap);
    update = v => {
      const shown = v || themeColor(it.key);
      sw.style.setProperty("--c", shown || "transparent");
      sw.toggleAttribute("unset", !v);
      hex.value = v || "";
      if (!v && shown) hex.placeholder = shown.toUpperCase();
      theme.hidden = !!v;
    };
  } else if (it.type === "range") {
    const wrap = mk("div", "range");
    const input = mk("input");
    input.type = "range";
    input.min = it.min;
    input.max = it.max;
    input.step = it.step;
    const out = mk("output");
    const tRange = touchable(input);
    input.addEventListener("input", () => {
      if (!tRange()) return;
      out.textContent = input.value + tr(it.unit || "");
      set(it.key, Number(input.value));
    });
    wrap.append(input, out);
    r.append(wrap);
    update = v => {
      input.value = v ?? it.def ?? (it.min + it.max) / 2;
      input.toggleAttribute("unset", v === undefined);
      out.textContent = v === undefined ? (it.def !== undefined ? it.def + tr(it.unit || "") : tr("тема")) : v + tr(it.unit || "");
    };
  } else if (it.type === "select") {
    const seg = mk("div", "seg");
    for (const [val, name] of it.options) {
      const b = mk("button", "", tr(name));
      b.dataset.v = val;
      b.addEventListener("click", () => set(it.key, cfg[it.key] === val ? null : val));
      seg.append(b);
    }
    r.append(seg);
    update = v => {
      for (const b of seg.children) b.toggleAttribute("on", b.dataset.v === v);
    };
  } else if (it.type === "cards") {
    const grid = mk("div", "cards");
    for (const [val, name, desc] of it.options) {
      const c = mk("button", "card");
      c.dataset.v = val;
      const pv = mk("div", `pv pv-${it.key} pv-${val}`);
      // мини-превью: меню с тремя пунктами или три карточки вкладок
      for (let i = 0; i < 3; i++) pv.append(mk("i", i === 1 ? "sel" : ""));
      c.append(pv, mk("b", "", tr(name)), mk("small", "", desc ? tr(desc) : ""));
      c.addEventListener("click", () => set(it.key, cfg[it.key] === val ? null : val));
      grid.append(c);
    }
    r.append(grid);
    update = v => {
      for (const b of grid.children) b.toggleAttribute("on", b.dataset.v === v);
    };
  } else if (it.type === "bool") {
    const sw = mk("button", "switch");
    sw.setAttribute("role", "switch");
    sw.addEventListener("click", () => {
      const cur = cfg[it.key] ?? BOOL_DEFAULT[it.key] ?? true;
      set(it.key, !cur);
    });
    r.querySelector(".row-head").insertBefore(sw, r.querySelector(".reset"));
    r.classList.add("row-bool");
    update = v => {
      const on = v ?? BOOL_DEFAULT[it.key] ?? true;
      sw.setAttribute("aria-checked", String(on));
      sw.toggleAttribute("unset", v === undefined);
    };
  } else if (it.type === "text") {
    const input = mk("input", "text");
    input.placeholder = tr("например, JetBrains Mono");
    const tText = touchable(input);
    input.addEventListener("change", () => tText() && set(it.key, input.value.trim() || null));
    r.append(input);
    update = v => {
      input.value = v || "";
    };
  }
  controls.set(it.key, { row: r, update });
  return r;
}

function refresh(key) {
  const c = controls.get(key);
  if (c) {
    c.update(cfg[key]);
    c.row.toggleAttribute("changed", cfg[key] !== undefined);
  }
  // свой шрифт виден только при выборе «Свой…»
  const fc = controls.get("fontCustom");
  if (fc) fc.row.hidden = cfg.font !== "custom";
}
function refreshAll() {
  for (const k of controls.keys()) refresh(k);
  try {
    markSquare();
  } catch {}
}

/* ---------- страница ---------- */
const nav = $("#nav");
const groups = $("#groups");
for (const g of SCHEMA) {
  const sec = mk("section", "group");
  sec.id = "g-" + g.group;
  sec.append(mk("h2", "", tr(g.title)));
  const box = mk("div", "box");
  for (const it of g.items) box.append(buildControl(it));
  sec.append(box);
  groups.append(sec);
  const a = mk("a", "", tr(g.title));
  a.href = "#g-" + g.group;
  nav.append(a);
}
// подсветка раздела в меню слева
const io = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (en.isIntersecting) {
      for (const a of nav.children) a.toggleAttribute("on", a.getAttribute("href") === "#" + en.target.id);
    }
  }
}, { rootMargin: "-40% 0px -55% 0px" });
for (const s of groups.children) io.observe(s);

/* ---------- тема: компактные «таблетки» и фильтр ---------- */
const themeRow = $("#themes");
const themeFilter = $("#theme-filter");
const themeName = $("#theme-current");
let group = "all";
function markTheme() {
  for (const b of themeRow.children) b.toggleAttribute("on", b.dataset.id === theme);
  const t = THEMES.find(x => x[0] === theme);
  themeName.textContent = t ? "· " + t[1] : "";
  for (const k of Object.keys(THEME_SLOT)) if (controls.has(k)) refresh(k);
}
function filterThemes() {
  for (const b of themeRow.children) b.hidden = group !== "all" && !b.dataset.groups.split(" ").includes(group);
  for (const f of themeFilter.children) f.toggleAttribute("on", f.dataset.g === group);
}
for (const [g, label] of GROUPS) {
  const f = mk("button", "filter", tr(label));
  f.dataset.g = g;
  f.addEventListener("click", () => {
    group = g;
    filterThemes();
  });
  themeFilter.append(f);
}
for (const [id, name, sw, groups] of THEMES) {
  const b = mk("button", "theme");
  b.dataset.id = id;
  b.dataset.groups = groups || "";
  b.title = name;
  const dot = mk("span", "theme-dot");
  dot.style.background = `conic-gradient(from 200deg, ${sw[2]} 0 25%, ${sw[1]} 0 62%, ${sw[0]} 0)`;
  dot.style.boxShadow = `inset 0 0 0 1px ${sw[3]}33`;
  b.append(dot, mk("span", "theme-name", name));
  b.addEventListener("click", async () => {
    theme = id;
    // свои цвета сбрасываются вместе со сменой темы (это делает и сам браузер)
    for (const k of ["accent", "frame", "bar", "menuBg", "ink", "menuAlpha", "menuBlur"]) delete cfg[k];
    refreshAll();
    markTheme();
    try {
      if (themesApi) await themesApi.setTheme(id);
      else window.dispatchEvent(new CustomEvent("fm-theme-set", { detail: id }));
      toast(tr("Тема «{0}»", name));
    } catch (e) {
      console.error(e);
      toast(tr("Не получилось сменить тему"));
    }
  });
  themeRow.append(b);
}
filterThemes();

/* ---------- скругления: одна большая кнопка вверху ---------- */
const sqRow = $("#square-row");
function markSquare() {
  for (const b of sqRow.children) b.toggleAttribute("on", (b.dataset.v === "none") === (cfg.square === true));
}
for (const [v, label, hint] of [["theme", "Как в теме", "Скругления выбранной темы"], ["none", "Без скруглений", "Совсем ноль: окно, вкладки, меню, кнопки, страницы, PDF"]]) {
  const b = mk("button", "sq sq-" + v);
  b.dataset.v = v;
  b.append(mk("span", "sq-pv"), mk("b", "", tr(label)), mk("small", "", tr(hint)));
  b.addEventListener("click", () => {
    if (v === "none") cfg.square = true;
    else delete cfg.square;
    refreshAll();
    save(true);
    toast(tr(v === "none" ? "Скругления убраны везде" : "Скругления как в теме"));
  });
  sqRow.append(b);
}

const presetRow = $("#presets");
for (const [id, name, values] of PRESETS) {
  const b = mk("button", `preset preset-${id}`);
  b.append(mk("span", "dot"), mk("span", "", tr(name)));
  b.addEventListener("click", () => {
    cfg = sanitize({ ...cfg, ...values });
    refreshAll();
    save(true);
    toast(tr("Набор «{0}» применён", tr(name)));
  });
  presetRow.append(b);
}

$("#reset").addEventListener("click", () => {
  cfg = {};
  refreshAll();
  save(true);
  toast(tr("Всё как в теме"));
});
$("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(sanitize(cfg), null, 2)], { type: "application/json" });
  const a = mk("a");
  a.href = URL.createObjectURL(blob);
  a.download = "floorp-modern-studio.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$("#import").addEventListener("click", () => {
  const input = mk("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.addEventListener("change", async () => {
    try {
      const text = await input.files[0].text();
      cfg = sanitize(JSON.parse(text));
      refreshAll();
      save(true);
      toast(tr("Настройки загружены"));
    } catch {
      toast(tr("Не получилось прочитать файл"));
    }
  });
  input.click();
});

/* ---------- выбор языка (в шапке) ---------- */
{
  const sel = mk("select", "lang-select");
  sel.title = tr("Язык Hand Design в браузере");
  const auto = mk("option", "", tr("Как в браузере"));
  auto.value = "auto";
  sel.append(auto);
  for (const [code, name] of LANGS) {
    const o = mk("option", "", name);
    o.value = code;
    sel.append(o);
  }
  let curSetting = "auto";
  try {
    curSetting = direct ? langSetting() : localStorage.getItem(LS_LANG) || "auto";
  } catch {}
  sel.value = curSetting;
  sel.addEventListener("change", () => {
    const v = sel.value;
    if (direct) {
      try {
        Services.prefs.setStringPref(LANG_PREF, v);
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        localStorage.setItem(LS_LANG, v);
      } catch {}
      window.dispatchEvent(new CustomEvent("fm-studio-lang", { detail: v }));
    }
    setTimeout(() => location.reload(), 150);
  });
  $(".actions").prepend(sel);
}

/* ---------- проверка обновлений вручную ---------- */
if (direct) {
  try {
    const up = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernUpdate.sys.mjs");
    const r = mk("div", "row");
    const head = mk("div", "row-head");
    const btn = mk("button", "ghost", tr("Проверить обновления"));
    head.append(mk("div", "label", "Hand Design " + up.APP_VERSION), btn);
    const hint = mk("div", "hint");
    r.append(head, hint);
    $("#g-update .box").append(r);
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = tr("Проверяю…");
      const res = await up.check(window, { force: true });
      btn.disabled = false;
      btn.textContent = tr("Проверить обновления");
      hint.textContent = "";
      if (res.error) {
        hint.textContent = tr("Не получилось проверить обновления: ") + tr(String(res.error));
      } else if (res.newer) {
        hint.append(tr("Доступна версия ") + res.latest.version + " · ");
        const notes = mk("a", "", tr("Что нового"));
        notes.href = res.latest.notes;
        notes.target = "_blank";
        const zip = mk("a", "", tr("Скачать"));
        zip.href = res.latest.zip;
        zip.target = "_blank";
        hint.append(notes, " · ", zip);
      } else {
        hint.textContent = tr("У вас последняя версия — ") + up.APP_VERSION;
      }
    });
  } catch {}
}

/* ---------- справка ---------- */
const GUIDE = [
  ["Быстрая панель «Дизайн»", [
    ["", "Кнопка с палитрой на панели браузера. Там тема, светлая или тёмная, цвет акцента, режим без скруглений и скрытие вкладок."],
    ["", "Оттуда же открывается эта страница и проверяются обновления."],
  ]],
  ["Горячие клавиши", [
    ["Alt+Shift+C", "Скопировать адрес страницы"],
    ["Alt+Shift+D", "Закрыть повторяющиеся вкладки"],
    ["Alt+Shift+Z", "Режим фокуса: убрать закладки и боковые панели"],
    ["Alt+Shift+T", "Спрятать или показать вкладки"],
    ["Alt+Shift+M", "Микрофон в звонке, из любой вкладки"],
    ["Ctrl+Tab", "Окно с превью вкладок, если оно включено в разделе «Переключатель Ctrl+Tab»"],
  ]],
  ["Now Bar", [
    ["", "Появляется внизу, когда музыка или видео играют в другой вкладке: пауза, назад, вперёд, звук."],
    ["", "Через несколько секунд сворачивается в кружок, при наведении раскрывается. Щелчок по названию открывает вкладку."],
    ["", "Плашку можно перетащить. Двойной щелчок по пустому месту возвращает её вниз по центру."],
  ]],
  ["Плашка звонка", [
    ["", "Появляется, когда в другой вкладке идёт звонок. Кнопками можно выключить и включить микрофон и камеру, не переходя на сайт."],
    ["", "Перетаскивается за зелёный кружок, двойной щелчок по нему возвращает плашку на место."],
  ]],
  ["Новая вкладка", [
    ["", "Обои меняются кнопкой слева внизу: готовые или своя картинка."],
  ]],
  ["PDF", [
    ["", "Кнопка темы в панели меняет цвет страниц: бумага, сепия, ночь."],
    ["Shift", "Зажмите во время рисования — линия пойдёт ровно."],
    ["Ctrl+B", "Закладка на текущей странице"],
    ["", "Стрелочка ▾ рядом с карандашом или текстом открывает толщину и цвет. «Очистить» убирает рисунки."],
    ["", "Двойной щелчок по пустому месту сразу создаёт поле для текста. Документ открывается там, где вы остановились."],
  ]],
  ["Markdown", [
    ["", "Перетащите файл .md в окно браузера — он откроется оформленным. Вверху режимы: просмотр, рядом с текстом, только текст."],
    ["", "Создать новый документ, открыть файл или вернуться к недавним — на странице «Документы»: кнопка в быстрой панели или значок MD в редакторе."],
    ["", "Над текстом — кнопки форматирования: заголовок, жирный, курсив, списки, задачи, цитата, таблица, код. Повторное нажатие снимает оформление."],
    ["Ctrl+S", "Сохранить файл"],
    ["Ctrl+E", "Переключить просмотр и текст"],
    ["Ctrl+B / Ctrl+I / Ctrl+K", "Жирный, курсив, ссылка"],
    ["", "Enter в конце пункта продолжает список. Щелчок по кружку задачи отмечает её. Если файл изменят в другой программе, редактор предложит загрузить новую версию."],
  ]],
  ["Studio", [
    ["", "Всё применяется сразу. Кнопка ↺ у настройки возвращает значение из темы."],
    ["", "«Сохранить в файл» и «Загрузить из файла» переносят настройки на другой компьютер."],
  ]],
  ["Обновление", [
    ["", "Скачайте новую версию, запустите Setup.cmd и нажмите «Обновить» — тема и настройки останутся."],
    ["", "Если после большого обновления браузера пропали кнопки или функции PDF, запустите Setup.cmd ещё раз."],
  ]],
];

{
  const dlg = mk("dialog", "guide");
  const top = mk("div", "guide-top");
  top.append(mk("h2", "", tr("Как пользоваться Hand Design")));
  const close = mk("button", "guide-close", "✕");
  close.title = tr("Закрыть");
  close.addEventListener("click", () => dlg.close());
  top.append(close);
  const body = mk("div", "guide-body");
  for (const [title, items] of GUIDE) {
    const sec = mk("section", "guide-sec");
    sec.append(mk("h3", "", tr(title)));
    const ul = mk("ul");
    for (const [keys, text] of items) {
      const li = mk("li");
      if (keys) {
        const k = mk("span", "guide-keys");
        for (const part of keys.split(" / ")) {
          k.append(mk("kbd", "", part));
        }
        li.append(k);
      }
      li.append(mk("span", "", tr(text)));
      ul.append(li);
    }
    sec.append(ul);
    body.append(sec);
  }
  dlg.append(top, body);
  dlg.addEventListener("click", e => e.target === dlg && dlg.close());
  document.body.append(dlg);
  const help = mk("button", "ghost help", "i");
  help.title = tr("Как пользоваться Hand Design");
  help.addEventListener("click", () => dlg.showModal());
  $(".actions").prepend(help);
}

refreshAll();
if (direct) {
  connected = true;
  cfg = sanitize(direct.readConfig());
  try {
    theme = themesApi.current();
  } catch {}
  markTheme();
  try {
    showVer(direct.version());
    const up = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernUpdate.sys.mjs");
    const k = up.known();
    if (k) {
      const a = mk("a", "upd", " · " + tr("доступна {0}", k.version));
      a.href = k.notes;
      a.target = "_blank";
      $("#ver").append(a);
    }
  } catch {}
  document.documentElement.toggleAttribute("connected", true);
  refreshAll();
}
setTimeout(() => {
  if (!connected) {
    document.documentElement.dataset.offline = tr("Не вижу Hand Design: откройте эту страницу в браузере, куда он установлен.");
    document.documentElement.toggleAttribute("offline", true);
  }
}, 1500);
