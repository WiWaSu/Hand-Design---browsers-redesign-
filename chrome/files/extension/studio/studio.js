/* Hand Design Studio для Chrome — та же страница, что в Firefox-версии (studio.js), но настройки
   хранятся в chrome.storage и применяются всеми страницами расширения сразу. */
import { schema, presets, sanitize, loadRaw, saveRaw, DEFAULTS, VERSION, onChange } from "../shared/settings.js";
import { THEMES, GROUPS } from "../shared/themes.js";
import { applyTheme, themeById, swatchCss } from "../shared/apply.js";
import { paintFrame } from "../shared/frame.js";
import { T, setLang } from "../shared/i18n.js";

const $ = (sel, root = document) => root.querySelector(sel);
const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const root = document.documentElement;
let cfg = await loadRaw();
setLang(cfg.lang || "");
const SCHEMA = schema();
const controls = new Map();
const eff = () => ({ ...DEFAULTS, ...cfg });

let saveTimer = 0;
let selfWrite = 0;
function save(now = false) {
  clearTimeout(saveTimer);
  const send = () => {
    selfWrite = Date.now();
    saveRaw(cfg);
  };
  if (now) send();
  else saveTimer = setTimeout(send, 120);
}
function paintPage() {
  applyTheme(root, eff(), { page: false });
}

function showVer(v) {
  const el = $("#ver");
  el.textContent = T("· версия ", "· version ");
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
  cfg = sanitize(cfg);
  if (key === "lang") {
    // все подписи Studio строятся при загрузке — проще открыть заново
    clearTimeout(saveTimer);
    selfWrite = Date.now();
    saveRaw(cfg).then(() => location.reload());
    return;
  }
  refresh(key);
  paintPage();
  save();
}

/* ---------- элементы управления ---------- */
function row(it) {
  const r = mk("div", "row");
  r.dataset.key = it.key;
  const head = mk("div", "row-head");
  head.append(mk("div", "label", it.label));
  const reset = mk("button", "reset", "↺");
  reset.title = T("Как было по умолчанию", "Back to default");
  reset.addEventListener("click", () => set(it.key, null));
  head.append(reset);
  r.append(head);
  if (it.hint) r.append(mk("div", "hint", it.hint));
  return r;
}

/* ---------- свой выбор цвета (как в Firefox-версии) ---------- */
const PALETTE = [
  "#FF453A", "#FF6B6B", "#FF9F0A", "#FFD60A", "#FFE600", "#B4E33D",
  "#30D158", "#16A37A", "#64D2FF", "#22C3E6", "#0A84FF", "#3E91FF",
  "#5E5CE6", "#6C8CFF", "#A35CFF", "#BF5AF2", "#FF4FD8", "#FF5C8A",
  "#EBBCBA", "#E0567F", "#8B5E3C", "#FE8019", "#88C0D0", "#7BC47F",
  "#FFFFFF", "#E5E9F0", "#9196A1", "#3A3B42", "#1C1D21", "#000000",
];
const THEME_SLOT = { accent: 2, frame: 0, bar: 1, ink: 3 };
function themeColor(key) {
  const t = themeById(eff().theme);
  return t.swatch[THEME_SLOT[key] ?? 2];
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
  recent = JSON.parse(localStorage.getItem("hd-recent-colors") || "[]").filter(normHex).slice(0, 12);
} catch {}
function remember(c) {
  recent = [c, ...recent.filter(x => x !== c)].slice(0, 12);
  try {
    localStorage.setItem("hd-recent-colors", JSON.stringify(recent));
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
  was.title = T("Вернуть как было", "Revert");
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
  const t = themeById(eff().theme);
  const sec = label => grid.append(mk("div", "pk-label", label));
  sec(T("Из темы «", "From theme “") + t.name + T("»", "”"));
  [...new Set(t.swatch.map(normHex))].forEach(c => addDot(c, c));
  if (recent.length) {
    sec(T("Недавние", "Recent"));
    recent.forEach(c => addDot(c));
  }
  sec(T("Палитра", "Palette"));
  PALETTE.forEach(c => addDot(c));

  const foot = mk("div", "pk-foot");
  const themeBtn = mk("button", "ghost", T("Как в теме", "Theme color"));
  themeBtn.type = "button";
  themeBtn.addEventListener("click", () => {
    set(key, null);
    closePicker(false);
  });
  const ok = mk("button", "pk-ok", T("Готово", "Done"));
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
  const r = el.getBoundingClientRect();
  if (r.bottom > innerHeight - 12) el.style.translate = `0 ${-Math.min(r.bottom - innerHeight + 12, r.top - 12)}px`;
}

/* значение «по умолчанию» для ползунка: из DEFAULTS или из темы */
function rangeDefault(it) {
  if (DEFAULTS[it.key] !== undefined) return DEFAULTS[it.key];
  const t = themeById(eff().theme);
  if (it.key === "radius") return parseInt(t.radius) || 0;
  if (it.key === "rItem") return parseInt(t.rItem) || 0;
  if (it.key === "clockWeight") return parseInt(t.clock.weight) || 300;
  if (it.key === "clockSize") return 160;
  return (it.min + it.max) / 2;
}

function buildControl(it) {
  const r = row(it);
  let update;
  if (it.type === "color") {
    const wrap = mk("div", "color");
    const sw = mk("button", "swatch");
    sw.type = "button";
    sw.title = T("Выбрать цвет", "Pick a color");
    const hex = mk("input", "hex");
    hex.maxLength = 7;
    hex.spellcheck = false;
    hex.placeholder = "#RRGGBB";
    const badge = mk("span", "badge", T("как в теме", "theme"));
    hex.addEventListener("change", () => {
      const v = normHex(hex.value);
      if (v) set(it.key, v);
    });
    sw.addEventListener("click", () => openPicker(sw, it.key));
    wrap.append(sw, hex, badge);
    r.append(wrap);
    update = v => {
      const shown = v || themeColor(it.key);
      sw.style.setProperty("--c", shown || "transparent");
      sw.toggleAttribute("unset", !v);
      hex.value = v || "";
      if (!v && shown) hex.placeholder = shown.toUpperCase();
      badge.hidden = !!v;
    };
  } else if (it.type === "range") {
    const wrap = mk("div", "range");
    const input = mk("input");
    input.type = "range";
    input.min = it.min;
    input.max = it.max;
    input.step = it.step;
    const out = mk("output");
    input.addEventListener("input", () => {
      out.textContent = input.value + (it.unit || "");
      set(it.key, Number(input.value));
    });
    wrap.append(input, out);
    r.append(wrap);
    update = v => {
      const d = rangeDefault(it);
      input.value = v ?? d;
      input.toggleAttribute("unset", v === undefined);
      out.textContent = v === undefined ? (DEFAULTS[it.key] !== undefined ? d + (it.unit || "") : T("тема", "theme")) : v + (it.unit || "");
    };
  } else if (it.type === "select") {
    const seg = mk("div", "seg");
    for (const [val, name] of it.options) {
      const b = mk("button", "", name);
      b.dataset.v = val;
      b.addEventListener("click", () => set(it.key, val === DEFAULTS[it.key] ? null : val));
      seg.append(b);
    }
    r.append(seg);
    update = v => {
      const cur = v ?? DEFAULTS[it.key];
      for (const b of seg.children) b.toggleAttribute("on", b.dataset.v === cur);
    };
  } else if (it.type === "cards") {
    const grid = mk("div", "cards");
    for (const [val, name, desc] of it.options) {
      const c = mk("button", "card");
      c.dataset.v = val;
      const pv = mk("div", `pv pv-ctrlTabStyle pv-${val}`);
      for (let i = 0; i < 3; i++) pv.append(mk("i", i === 1 ? "sel" : ""));
      c.append(pv, mk("b", "", name), mk("small", "", desc));
      c.addEventListener("click", () => set(it.key, val === DEFAULTS[it.key] ? null : val));
      grid.append(c);
    }
    r.append(grid);
    update = v => {
      const cur = v ?? DEFAULTS[it.key];
      for (const b of grid.children) b.toggleAttribute("on", b.dataset.v === cur);
    };
  } else if (it.type === "bool") {
    const sw = mk("button", "switch");
    sw.setAttribute("role", "switch");
    sw.addEventListener("click", () => {
      const cur = cfg[it.key] ?? DEFAULTS[it.key] ?? true;
      set(it.key, !cur === DEFAULTS[it.key] ? null : !cur);
    });
    r.querySelector(".row-head").insertBefore(sw, r.querySelector(".reset"));
    r.classList.add("row-bool");
    update = v => {
      const on = v ?? DEFAULTS[it.key] ?? true;
      sw.setAttribute("aria-checked", String(on));
    };
  } else if (it.type === "text") {
    const input = mk("input", "text");
    input.placeholder = T("например, JetBrains Mono", "e.g. JetBrains Mono");
    input.addEventListener("change", () => set(it.key, input.value.trim() || null));
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
  const fc = controls.get("fontCustom");
  if (fc) fc.row.hidden = cfg.font !== "custom";
}
function refreshAll() {
  for (const k of controls.keys()) refresh(k);
  markTheme();
  markSquare();
  paintPage();
}

/* ---------- тексты страницы ---------- */
document.title = "Hand Design Studio";
$("#sub").textContent = T("Изменения сразу видны на новой вкладке справа.", "Changes show up in the new tab preview on the right.");
$("#export").textContent = T("Сохранить в файл", "Save to file");
$("#import").textContent = T("Загрузить из файла", "Load from file");
$("#reset").textContent = T("Сбросить всё", "Reset all");
$("#github").title = T("Страница Hand Design на GitHub: новые версии, описание, вопросы", "Hand Design on GitHub: releases, docs, questions");
$("#h-theme").textContent = T("Тема", "Theme");
$("#h-square").textContent = T("Скругления", "Corners");
$("#h-presets").textContent = T("Готовые наборы", "Presets");
$("#frame-title").textContent = T("Рамка браузера", "Browser frame");
$("#frame-hint").textContent = T("Вкладки и адресную строку Chrome красит тема-пакет — один щелчок и «Загрузить распакованное».", "Chrome's tabs and address bar are painted by a theme pack — one click plus “Load unpacked”.");
$("#frame-btn").textContent = T("Покрасить рамку", "Paint the frame");
$("#pv-cap").textContent = T("Новая вкладка — живой предпросмотр", "New tab — live preview");
showVer(VERSION);

/* ---------- разделы ---------- */
const nav = $("#nav");
const groups = $("#groups");
const chromeLink = (url, label) => {
  const d = mk("div", "row-link");
  const a = mk("a", "", label);
  a.href = "#";
  a.addEventListener("click", e => {
    e.preventDefault();
    chrome.tabs.create({ url });
  });
  d.append(a);
  return d;
};
for (const g of SCHEMA) {
  const sec = mk("section", "group");
  sec.id = "g-" + g.group;
  sec.append(mk("h2", "", g.title));
  const box = mk("div", "box");
  for (const it of g.items) box.append(buildControl(it));
  if (g.group === "ctrltab" || g.group === "islands") {
    box.lastChild.append(chromeLink("chrome://extensions/shortcuts", T("Поменять горячие клавиши →", "Change keyboard shortcuts →")));
  }
  if (g.group === "pdf") {
    box.lastChild.append(chromeLink(`chrome://extensions/?id=${chrome.runtime.id}`, T("Открыть карточку расширения (доступ к файлам) →", "Open the extension card (file access) →")));
  }
  if (g.group === "update") {
    const d = mk("div", "row-link");
    const a = mk("a", "", T("Проверить сейчас", "Check now"));
    a.href = "#";
    a.addEventListener("click", async e => {
      e.preventDefault();
      a.textContent = T("Проверяю…", "Checking…");
      const info = await chrome.runtime.sendMessage({ type: "hd:check-update" }).catch(() => null);
      if (!info || info.error) a.textContent = T("Не получилось проверить — нет связи с GitHub", "Could not check — GitHub unreachable");
      else if (info.available) a.textContent = T(`Доступна версия ${info.latest}`, `Version ${info.latest} is available`);
      else a.textContent = T(`У вас последняя версия (${VERSION})`, `You have the latest version (${VERSION})`);
    });
    d.append(a);
    box.lastChild.append(d);
  }
  sec.append(box);
  groups.append(sec);
  const a = mk("a", "", g.title);
  a.href = "#g-" + g.group;
  nav.append(a);
}
const io = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (en.isIntersecting) for (const a of nav.children) a.toggleAttribute("on", a.getAttribute("href") === "#" + en.target.id);
  }
}, { rootMargin: "-40% 0px -55% 0px" });
for (const s of groups.children) io.observe(s);

/* ---------- тема ---------- */
const themeRow = $("#themes");
const themeFilter = $("#theme-filter");
let group = "all";
function markTheme() {
  const id = eff().theme;
  for (const b of themeRow.children) b.toggleAttribute("on", b.dataset.id === id);
  $("#theme-current").textContent = "· " + themeById(id).name;
  for (const k of Object.keys(THEME_SLOT)) if (controls.has(k)) refresh(k);
}
function filterThemes() {
  for (const b of themeRow.children) b.hidden = group !== "all" && !b.dataset.groups.split(" ").includes(group);
  for (const f of themeFilter.children) f.toggleAttribute("on", f.dataset.g === group);
}
for (const [g, ru, en] of GROUPS) {
  const f = mk("button", "filter", T(ru, en));
  f.dataset.g = g;
  f.addEventListener("click", () => {
    group = g;
    filterThemes();
  });
  themeFilter.append(f);
}
for (const t of THEMES) {
  const b = mk("button", "theme");
  b.dataset.id = t.id;
  b.dataset.groups = t.groups.join(" ");
  b.title = t.name;
  const dot = mk("span", "theme-dot");
  dot.style.background = swatchCss(t);
  dot.style.boxShadow = `inset 0 0 0 1px ${t.swatch[3]}33`;
  b.append(dot, mk("span", "theme-name", t.name));
  b.addEventListener("click", () => {
    cfg.theme = t.id;
    refreshAll();
    save(true);
    toast(T(`Тема «${t.name}»`, `Theme “${t.name}”`));
  });
  themeRow.append(b);
}
filterThemes();
$("#frame-btn").addEventListener("click", () => paintFrame(eff(), $("#frame-steps"), mk));

/* ---------- скругления ---------- */
const sqRow = $("#square-row");
function markSquare() {
  for (const b of sqRow.children) b.toggleAttribute("on", (b.dataset.v === "none") === (cfg.square === true));
}
for (const [v, label, hint] of [
  ["theme", T("Как в теме", "Theme corners"), T("Скругления выбранной темы", "The theme's own rounding")],
  ["none", T("Без скруглений", "No rounding"), T("Совсем ноль: новая вкладка, панель, плашки, PDF, переключатель вкладок", "Zero everywhere: new tab, panel, islands, PDF, tab switcher")],
]) {
  const b = mk("button", "sq sq-" + v);
  b.dataset.v = v;
  b.append(mk("span", "sq-pv"), mk("b", "", label), mk("small", "", hint));
  b.addEventListener("click", () => {
    if (v === "none") cfg.square = true;
    else delete cfg.square;
    refreshAll();
    save(true);
    toast(v === "none" ? T("Скругления убраны везде", "Rounding removed everywhere") : T("Скругления как в теме", "Theme rounding"));
  });
  sqRow.append(b);
}

/* ---------- готовые наборы ---------- */
const presetRow = $("#presets");
for (const [id, name, values] of presets()) {
  const b = mk("button", `preset preset-${id === "focus" ? "clean" : id === "bubble" ? "bubble" : id}`);
  b.append(mk("span", "dot"), mk("span", "", name));
  b.addEventListener("click", () => {
    cfg = sanitize({ ...cfg, ...values });
    refreshAll();
    save(true);
    toast(T(`Набор «${name}» применён`, `Preset “${name}” applied`));
  });
  presetRow.append(b);
}

/* ---------- файлы и сброс ---------- */
const KEEP = ["theme", "sysAccent", "lang"];
$("#reset").addEventListener("click", () => {
  const kept = {};
  for (const k of KEEP) if (cfg[k] !== undefined) kept[k] = cfg[k];
  cfg = kept;
  refreshAll();
  save(true);
  toast(T("Всё как по умолчанию", "Everything reset"));
});
$("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(sanitize(cfg), null, 2)], { type: "application/json" });
  const a = mk("a");
  a.href = URL.createObjectURL(blob);
  a.download = "hand-design-chrome.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$("#import").addEventListener("click", () => {
  const input = mk("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.addEventListener("change", async () => {
    try {
      cfg = sanitize(JSON.parse(await input.files[0].text()));
      refreshAll();
      save(true);
      toast(T("Настройки загружены", "Settings loaded"));
    } catch {
      toast(T("Не получилось прочитать файл", "Could not read the file"));
    }
  });
  input.click();
});

/* ---------- первый запуск ---------- */
function welcome() {
  if (location.hash !== "#welcome") return;
  const w = $("#welcome");
  w.hidden = false;
  $("#w-title").textContent = T("Hand Design установлен 🎉", "Hand Design is installed 🎉");
  const steps = $("#w-steps");
  const li = (text, url, link) => {
    const l = mk("li", "", text + " ");
    if (url) {
      const a = mk("a", "", link);
      a.href = "#";
      a.addEventListener("click", e => {
        e.preventDefault();
        chrome.tabs.create({ url });
      });
      l.append(a);
    }
    steps.append(l);
  };
  li(T("Закрепите кнопку Hand Design: значок пазла справа от адресной строки → булавка. Это быстрая панель (Alt+Shift+D).", "Pin the Hand Design button: puzzle icon next to the address bar → pin. It's the quick panel (Alt+Shift+D)."));
  li(T("Покрасьте рамку браузера в цвет темы — кнопка «Покрасить рамку» ниже.", "Paint the browser frame in theme colors — the “Paint the frame” button below."));
  li(T("Откройте новую вкладку: обои, часы, поиск. Обои меняются кнопкой внизу справа.", "Open a new tab: wallpaper, clock, search. Change wallpaper with the button at the bottom right."));
  li(T("Для PDF с компьютера включите «Разрешить доступ к URL файлов»:", "For local PDFs enable “Allow access to file URLs”:"), `chrome://extensions/?id=${chrome.runtime.id}`, T("карточка расширения", "extension card"));
  li(T("Клавиши: Alt+Q — вкладки с превью, Alt+Shift+M — микрофон в звонке, Alt+Shift+S — эта страница.", "Keys: Alt+Q — tab switcher, Alt+Shift+M — call microphone, Alt+Shift+S — this page."), "chrome://extensions/shortcuts", T("поменять", "change"));
  $("#w-close").textContent = T("Понятно", "Got it");
  $("#w-close").addEventListener("click", () => {
    w.hidden = true;
    history.replaceState(null, "", location.pathname);
  });
}

/* изменения из быстрой панели или новой вкладки — подхватываем */
onChange(async () => {
  if (Date.now() - selfWrite < 600) return;
  cfg = await loadRaw();
  refreshAll();
});
matchMedia("(prefers-color-scheme: light)").addEventListener("change", paintPage);

refreshAll();
welcome();
const { hdUpdate } = await chrome.storage.local.get("hdUpdate");
if (hdUpdate?.available) {
  const a = mk("a", "upd", T(` · доступна ${hdUpdate.latest}`, ` · ${hdUpdate.latest} available`));
  a.href = hdUpdate.url;
  a.target = "_blank";
  $("#ver").append(a);
}
