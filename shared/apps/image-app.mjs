/* Hand Design — редактор картинок. Файл читает и пишет браузер через window.hdImg (FloorpPdfTweaksChild). */

await new Promise(resolve => {
  if (window.hdImg) resolve();
  else window.addEventListener("hd-img-ready", resolve, { once: true });
});

const t = (s, ...a) => window.hdImg.t(s, ...a);
const api = (op, data = null) => new Promise(resolve => {
  window.hdImg.call(op, JSON.stringify(data), json => resolve(JSON.parse(json)));
});

const P = d => `<path d="${d}"/>`;
const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const ICON = {
  move: P("M5.5 3.5l13 6.5-5.6 1.9-2.4 5.6z"),
  crop: P("M6 2v14a2 2 0 0 0 2 2h14") + P("M2 6h14a2 2 0 0 1 2 2v14"),
  pen: P("M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16z"),
  arrow: P("M5 19L19 5M10 5h9v9"),
  rect: `<rect x="4" y="5" width="16" height="14" rx="1.5"/>`,
  text: P("M5 7V4.5h14V7M12 4.5v15M9 19.5h6"),
  blur: P("M4 4h5v5H4zM15 4h5v5h-5zM9.5 9.5h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z"),
  rotL: P("M3 4v5h5") + P("M3.6 9a8.5 8.5 0 1 1 1.2 8"),
  rotR: P("M21 4v5h-5") + P("M20.4 9a8.5 8.5 0 1 0-1.2 8"),
  flip: P("M12 3v18") + P("M8.5 7L3 17h5.5zM15.5 7L21 17h-5.5z"),
  undo: P("M9 14L4 9l5-5") + P("M4 9h10.5a5.5 5.5 0 0 1 0 11H11"),
  redo: P("M15 14l5-5-5-5") + P("M20 9H9.5a5.5 5.5 0 0 0 0 11H13"),
  del: P("M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"),
  zoomOut: P("M6 12h12"),
  zoomIn: P("M6 12h12M12 6v12"),
};
const TOOLS = ["move", "crop", "pen", "arrow", "rect", "text", "blur"];
const KEYS = { move: "V", crop: "C", pen: "P", arrow: "A", rect: "R", text: "T", blur: "B" };
const CODES = Object.fromEntries(Object.entries(KEYS).map(([k, l]) => ["Key" + l, k]));
const COLORS = [
  "#000000", "#3a3a3c", "#8e8e93", "#c7c7cc", "#ffffff",
  "#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be",
  "#30b0c7", "#007aff", "#5856d6", "#af52de", "#ff2d55",
  "#a2845e", "#ff6b6b", "#ffd60a", "#64d2ff", "#bf5af2",
];
const STROKE = [3, 6, 11];
const TEXT = [22, 36, 58];
const FONT = `"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif`;
const MIME = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
const fmtOf = name => (/\.jpe?g$/i.test(name) ? "jpeg" : /\.webp$/i.test(name) ? "webp" : /\.png$/i.test(name) ? "png" : "");

const btn = (act, cls = "hd-csv-btn") => `<button type="button" class="${cls}" data-act="${act}">${svg(ICON[act])}</button>`;
document.documentElement.setAttribute("data-hd-md", "");
document.body.innerHTML = `
  <div class="hd-md hd-img">
    <header class="hd-md-bar">
      <div class="hd-md-file">
        <button type="button" class="hd-md-icon">IMG</button>
        <span class="hd-md-names"><span class="hd-md-name"></span><span class="hd-md-path"></span></span>
        <span class="hd-md-dirty" hidden></span>
      </div>
      <div></div>
      <div class="hd-md-actions">
        <span class="hd-md-state"></span>
        <button type="button" class="hd-img-pill" data-act="open"></button>
        <button type="button" class="hd-img-pill" data-act="exportOpen"></button>
        <button type="button" class="hd-md-save" disabled></button>
      </div>
    </header>
    <div class="hd-img-tools">
      <div class="hd-img-group" data-for="edit">
        ${TOOLS.map(x => btn(x, "hd-csv-btn hd-img-tool")).join("")}
        <i></i>
        <span class="hd-img-colors"></span>
        <span class="hd-img-sizes"></span>
        <i></i>
        ${btn("rotL")}${btn("rotR")}${btn("flip")}
        <i></i>
        ${btn("undo")}${btn("redo")}${btn("del")}
      </div>
      <div class="hd-img-group" data-for="crop" hidden>
        <span class="hd-img-ratios"></span>
        <span class="hd-img-cropsize"></span>
        <button type="button" class="hd-img-pill" data-act="cropCancel"></button>
        <button type="button" class="hd-img-pill" data-main data-act="cropApply"></button>
      </div>
      <div class="hd-img-zoom"><span class="hd-img-dims"></span>${btn("zoomOut")}<button type="button" class="hd-img-zoomval"></button>${btn("zoomIn")}</div>
    </div>
    <div class="hd-md-notice" hidden><span class="hd-md-notice-text"></span><button type="button" class="hd-md-notice-main"></button><button type="button" class="hd-md-notice-alt"></button></div>
    <div class="hd-img-stage">
      <div class="hd-img-wrap">
        <div class="hd-img-frame">
          <canvas></canvas>
          <div class="hd-img-sel" hidden></div>
          <div class="hd-img-crop" hidden>${["nw", "n", "ne", "e", "se", "s", "sw", "w"].map(h => `<b data-h="${h}"></b>`).join("")}</div>
        </div>
      </div>
      <div class="hd-img-empty" hidden><p></p><button type="button" class="hd-notes-primary" data-act="open"></button></div>
    </div>
  </div>
  <div class="hd-img-export" hidden>
    <div class="hd-img-row"><span data-l="Формат"></span><div class="hd-md-modes hd-img-formats"><button type="button" data-f="png">PNG</button><button type="button" data-f="jpeg">JPEG</button><button type="button" data-f="webp">WebP</button></div></div>
    <label class="hd-img-row hd-img-quality"><span data-l="Качество"></span><input type="range" min="10" max="100" step="1"><output></output></label>
    <div class="hd-img-row"><span data-l="Размер"></span><input type="number" class="hd-img-w" min="1"><span>×</span><input type="number" class="hd-img-h" min="1"><span>px</span></div>
    <p class="hd-img-est"></p>
    <div class="hd-img-row hd-img-end"><button type="button" class="hd-img-pill" data-act="copy"></button><button type="button" class="hd-img-pill" data-main data-act="export"></button></div>
  </div>`;

const $ = sel => document.querySelector(sel);
const stage = $(".hd-img-stage");
const frame = $(".hd-img-frame");
const view = $("canvas");
const ctx = view.getContext("2d");
const selBox = $(".hd-img-sel");
const cropBox = $(".hd-img-crop");
const empty = $(".hd-img-empty");
const saveBtn = $(".hd-md-save");
const state = $(".hd-md-state");
const dirtyDot = $(".hd-md-dirty");
const notice = $(".hd-md-notice");
const exp = $(".hd-img-export");
const zoomVal = $(".hd-img-zoomval");

const titles = {
  move: t("Выбрать и двигать"), crop: t("Обрезать"), pen: t("Кисть"), arrow: t("Стрелка"), rect: t("Рамка"), text: t("Текст"), blur: t("Размытие"),
  rotL: t("Повернуть влево"), rotR: t("Повернуть вправо"), flip: t("Отразить"), undo: t("Отменить"), redo: t("Вернуть"), del: t("Удалить"),
  zoomOut: t("Уменьшить"), zoomIn: t("Увеличить"),
};
for (const b of document.querySelectorAll(".hd-csv-btn")) {
  const a = b.dataset.act;
  b.title = titles[a] + (KEYS[a] ? ` (${KEYS[a]})` : "");
  b.setAttribute("aria-label", titles[a]);
}
for (const el of document.querySelectorAll("[data-l]")) el.textContent = t(el.dataset.l);
for (const b of document.querySelectorAll('[data-act="open"]')) b.textContent = t("Открыть…");
$('[data-act="exportOpen"]').textContent = t("Сохранить как…");
$('[data-act="export"]').textContent = t("Сохранить как…");
$('[data-act="copy"]').textContent = t("Копировать");
$('[data-act="cropApply"]').textContent = t("Обрезать");
$('[data-act="cropCancel"]').textContent = t("Отмена");
saveBtn.textContent = t("Сохранить");
$(".hd-md-icon").title = t("Все документы");
dirtyDot.title = t("Есть несохранённые изменения");
zoomVal.title = t("По размеру окна или 100%");
empty.querySelector("p").textContent = t("Вставьте картинку (Ctrl+V), перетащите файл в окно или откройте его.");

let base = null;
let objs = [];
let tool = "arrow";
let color = "#ff3b30";
let sizeIdx = 1;
let zoom = 1;
let fit = true;
let selected = -1;
let hidden = -1;
let drag = null;
let crop = null;
let ratio = 0;
let textEdit = null;
let file = { name: "", folder: "", path: "", mtime: 0 };
let busy = false;
let v = 0;
let counter = 0;
let savedV = 0;
const undo = [];
const redo = [];
const out = { fmt: "png", q: 85, w: 0, h: 0 };

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
const unit = () => Math.max(1, Math.max(base.width, base.height) / 1000);
const dirty = () => !!base && v !== savedV;
const setState = (msg, kind = "") => {
  state.textContent = msg;
  state.dataset.kind = kind;
};
const sync = () => {
  const d = dirty();
  dirtyDot.hidden = !d;
  saveBtn.disabled = !d || busy;
  document.title = (d ? "• " : "") + (file.name || t("Картинка"));
  $('[data-act="undo"]').disabled = !undo.length;
  $('[data-act="redo"]').disabled = !redo.length;
  $('[data-act="del"]').disabled = selected < 0;
  for (const b of document.querySelectorAll('[data-act="rotL"], [data-act="rotR"], [data-act="flip"], .hd-img-tool, [data-act="exportOpen"]')) b.disabled = !base;
};
const snapshot = () => {
  undo.push({ base, objs: JSON.stringify(objs), v });
  if (undo.length > 60) undo.shift();
  redo.length = 0;
  v = ++counter;
};
const edit = fn => {
  snapshot();
  fn();
  render();
  sync();
};

/* ------------------------------ рисование ------------------------------ */

const meas = canvas(1, 1).getContext("2d");
const lines = o => o.text.split("\n");
const textW = o => {
  meas.font = `600 ${o.size}px ${FONT}`;
  return Math.max(o.size * .5, ...lines(o).map(l => meas.measureText(l).width));
};
const textH = o => lines(o).length * o.size * 1.25;
const norm = o => ({ x: Math.min(o.x, o.x + o.w), y: Math.min(o.y, o.y + o.h), w: Math.abs(o.w), h: Math.abs(o.h) });
const headOf = o => o.size * 3.2 + 6;

function bbox(o) {
  if (o.type === "text") return { x: o.x, y: o.y, w: textW(o), h: textH(o) };
  if (o.type === "rect" || o.type === "blur") {
    const b = norm(o);
    const p = o.type === "rect" ? o.size / 2 : 0;
    return { x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p };
  }
  const pts = o.type === "pen" ? o.pts : [[o.x1, o.y1], [o.x2, o.y2]];
  const p = o.type === "arrow" ? headOf(o) / 2 : o.size / 2;
  const xs = pts.map(q => q[0]);
  const ys = pts.map(q => q[1]);
  const x = Math.min(...xs) - p;
  const y = Math.min(...ys) - p;
  return { x, y, w: Math.max(...xs) + p - x, h: Math.max(...ys) + p - y };
}

function pixelate(c, src, b) {
  const x = Math.round(clamp(b.x, 0, src.width));
  const y = Math.round(clamp(b.y, 0, src.height));
  const w = Math.round(clamp(b.x + b.w, 0, src.width)) - x;
  const h = Math.round(clamp(b.y + b.h, 0, src.height)) - y;
  if (w < 1 || h < 1) return;
  const block = Math.max(6, Math.round(Math.max(src.width, src.height) / 90));
  const tmp = canvas(Math.max(1, Math.ceil(w / block)), Math.max(1, Math.ceil(h / block)));
  tmp.getContext("2d").drawImage(src, x, y, w, h, 0, 0, tmp.width, tmp.height);
  c.imageSmoothingEnabled = false;
  c.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
  c.imageSmoothingEnabled = true;
}

function draw(c, o) {
  c.save();
  c.strokeStyle = c.fillStyle = o.color;
  c.lineWidth = o.size;
  c.lineCap = "round";
  c.lineJoin = "round";
  if (o.type === "pen") {
    c.beginPath();
    o.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    if (o.pts.length === 1) c.lineTo(o.pts[0][0] + .01, o.pts[0][1]);
    c.stroke();
  } else if (o.type === "rect") {
    const b = norm(o);
    c.strokeRect(b.x, b.y, b.w, b.h);
  } else if (o.type === "arrow") {
    const dx = o.x2 - o.x1;
    const dy = o.y2 - o.y1;
    const len = Math.hypot(dx, dy) || 1;
    const head = Math.min(headOf(o), len * .7);
    const ux = dx / len;
    const uy = dy / len;
    const bx = o.x2 - ux * head;
    const by = o.y2 - uy * head;
    c.beginPath();
    c.moveTo(o.x1, o.y1);
    c.lineTo(bx + ux * head * .2, by + uy * head * .2);
    c.stroke();
    c.beginPath();
    c.moveTo(o.x2, o.y2);
    c.lineTo(bx - uy * head * .6, by + ux * head * .6);
    c.lineTo(bx + uy * head * .6, by - ux * head * .6);
    c.closePath();
    c.fill();
  } else if (o.type === "text") {
    c.font = `600 ${o.size}px ${FONT}`;
    c.textBaseline = "top";
    lines(o).forEach((l, i) => c.fillText(l, o.x, o.y + i * o.size * 1.25 + o.size * .1));
  } else if (o.type === "blur") {
    pixelate(c, c.canvas, norm(o));
  }
  c.restore();
}

function composite() {
  const c = canvas(base.width, base.height);
  const g = c.getContext("2d");
  g.drawImage(base, 0, 0);
  for (const o of objs) draw(g, o);
  return c;
}

let frameReq = 0;
function render() {
  cancelAnimationFrame(frameReq);
  frameReq = 0;
  if (!base) return;
  if (view.width !== base.width || view.height !== base.height) {
    view.width = base.width;
    view.height = base.height;
    layout();
  }
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.drawImage(base, 0, 0);
  objs.forEach((o, i) => i !== hidden && draw(ctx, o));
  overlay();
}
const later = () => (frameReq ||= requestAnimationFrame(render));

const place = (el, b) => {
  el.style.left = `${b.x * zoom}px`;
  el.style.top = `${b.y * zoom}px`;
  el.style.width = `${b.w * zoom}px`;
  el.style.height = `${b.h * zoom}px`;
};
function overlay() {
  if (!objs[selected]) selected = -1;
  selBox.hidden = selected < 0 || selected === hidden;
  if (!selBox.hidden) place(selBox, bbox(objs[selected]));
  cropBox.hidden = !crop;
  cropBox.toggleAttribute("data-fixed", !!ratio);
  if (crop) {
    place(cropBox, crop);
    $(".hd-img-cropsize").textContent = `${Math.round(crop.w)} × ${Math.round(crop.h)}`;
  }
  if (textEdit) placeText();
}

function layout() {
  if (!base) return;
  if (fit) {
    const r = stage.getBoundingClientRect();
    zoom = Math.min(1, (r.width - 48) / base.width, (r.height - 48) / base.height);
    zoom = Math.max(zoom, .02);
  }
  frame.style.width = view.style.width = `${base.width * zoom}px`;
  frame.style.height = view.style.height = `${base.height * zoom}px`;
  zoomVal.textContent = `${Math.round(zoom * 100)}%`;
  $(".hd-img-dims").textContent = `${base.width} × ${base.height}`;
  overlay();
}
function setZoom(z, e) {
  if (!base) return;
  const s = stage.getBoundingClientRect();
  const r = view.getBoundingClientRect();
  const px = e ? e.clientX : s.left + s.width / 2;
  const py = e ? e.clientY : s.top + s.height / 2;
  const ix = (px - r.left) / zoom;
  const iy = (py - r.top) / zoom;
  fit = false;
  zoom = clamp(z, .02, 16);
  layout();
  const r2 = view.getBoundingClientRect();
  stage.scrollLeft += r2.left + ix * zoom - px;
  stage.scrollTop += r2.top + iy * zoom - py;
}
new ResizeObserver(() => fit && layout()).observe(stage);

/* ------------------------------ панель ------------------------------ */

const colorsEl = $(".hd-img-colors");
const colorBtn = document.createElement("button");
colorBtn.type = "button";
colorBtn.className = "hd-img-swatch";
colorBtn.title = t("Цвет");
colorsEl.append(colorBtn);

const recent = [];
const hsvToHex = (h, sat, val) => {
  const f = n => {
    const k = (n + h / 60) % 6;
    return val - val * sat * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return "#" + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
};
const hexToHsv = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = ((max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360;
  return { h, s: max ? d / max : 0, v: max };
};
let pop = null;
function closePalette() {
  pop?.remove();
  pop = null;
}
function pickColor(c) {
  c = c.toLowerCase();
  closePalette();
  if (!COLORS.includes(c)) {
    recent.splice(0, recent.length, c, ...recent.filter(x => x !== c).slice(0, 4));
  }
  color = c;
  applyToSelected(o => (o.color = color));
  paintBar();
}
function placePalette() {
  const r = colorBtn.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + "px";
  pop.style.top = (r.bottom + 10 + h > innerHeight - 8 ? Math.max(8, r.top - h - 10) : r.bottom + 10) + "px";
}
function customPicker() {
  const hsv = hexToHsv(color) || { h: 210, s: 1, v: 1 };
  const box = document.createElement("div");
  box.className = "hd-pal-custom";
  box.innerHTML = `<div class="hd-pal-sv"><i></i></div><div class="hd-pal-hue"><i></i></div>
    <div class="hd-pal-row"><span class="hd-pal-preview"></span><input class="hd-pal-hex" maxlength="7" spellcheck="false"><button type="button" class="hd-pal-ok">${t("Готово")}</button></div>`;
  const [sv, hue] = box.querySelectorAll(".hd-pal-sv, .hd-pal-hue");
  const hex = box.querySelector(".hd-pal-hex");
  const paint = (fromHex = false) => {
    const c = hsvToHex(hsv.h, hsv.s, hsv.v);
    sv.style.setProperty("--h", `hsl(${hsv.h.toFixed(1)} 100% 50%)`);
    sv.firstChild.style.cssText = `left:${hsv.s * 100}%;top:${(1 - hsv.v) * 100}%;--c:${c}`;
    hue.firstChild.style.cssText = `left:${hsv.h / 3.6}%;--c:hsl(${hsv.h.toFixed(1)} 100% 50%)`;
    box.querySelector(".hd-pal-preview").style.setProperty("--c", c);
    if (!fromHex) hex.value = c.toUpperCase();
  };
  const drag = (area, fn) => {
    const go = e => {
      const r = area.getBoundingClientRect();
      fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
      paint();
    };
    area.addEventListener("pointerdown", e => {
      e.preventDefault();
      area.setPointerCapture(e.pointerId);
      go(e);
    });
    area.addEventListener("pointermove", e => area.hasPointerCapture(e.pointerId) && go(e));
  };
  drag(sv, (x, y) => {
    hsv.s = x;
    hsv.v = 1 - y;
  });
  drag(hue, x => (hsv.h = Math.min(359.9, x * 360)));
  hex.addEventListener("input", () => {
    const parsed = hexToHsv(hex.value.startsWith("#") ? hex.value : "#" + hex.value);
    if (parsed) {
      Object.assign(hsv, parsed);
      paint(true);
    }
  });
  hex.addEventListener("keydown", e => {
    if (e.key === "Enter") pickColor(hsvToHex(hsv.h, hsv.s, hsv.v));
    else if (e.key === "Escape") closePalette();
  });
  box.querySelector(".hd-pal-ok").addEventListener("click", () => pickColor(hsvToHex(hsv.h, hsv.s, hsv.v)));
  paint();
  return box;
}
function openPalette() {
  closePalette();
  pop = document.createElement("div");
  pop.className = "hd-pal";
  const dots = list => `<div class="hd-pal-grid">${list.map(c => `<button type="button" class="hd-pal-dot" data-c="${c}" title="${c.toUpperCase()}" style="--c:${c}" aria-pressed="${c === color}"></button>`).join("")}</div>`;
  pop.innerHTML = dots(COLORS) + (recent.length ? dots(recent).replace("hd-pal-grid", "hd-pal-grid hd-pal-recent") : "") + `<button type="button" class="hd-pal-more">${t("Свой цвет…")}</button>`;
  pop.addEventListener("click", e => {
    const d = e.target.closest(".hd-pal-dot");
    if (d) pickColor(d.dataset.c);
    else if (e.target.closest(".hd-pal-more")) {
      e.target.remove();
      pop.append(customPicker());
      placePalette();
      pop.querySelector(".hd-pal-hex").focus();
    }
  });
  document.body.append(pop);
  placePalette();
}
colorBtn.addEventListener("click", () => (pop ? closePalette() : openPalette()));
document.addEventListener("pointerdown", e => {
  if (pop && !pop.contains(e.target) && !colorBtn.contains(e.target)) closePalette();
}, true);
addEventListener("resize", closePalette);
const sizesEl = $(".hd-img-sizes");
[t("Тонко"), t("Средне"), t("Толсто")].forEach((name, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "hd-img-size";
  b.dataset.i = i;
  b.title = name;
  b.innerHTML = `<i style="--d:${4 + i * 4}px"></i>`;
  sizesEl.append(b);
});
const RATIOS = [[0, t("Свободно")], [-1, t("Исходные")], [1, "1:1"], [4 / 3, "4:3"], [3 / 2, "3:2"], [16 / 9, "16:9"], [9 / 16, "9:16"]];
const ratiosEl = $(".hd-img-ratios");
for (const [r, name] of RATIOS) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "hd-img-chip";
  b.dataset.r = r;
  b.textContent = name;
  ratiosEl.append(b);
}

function paintBar() {
  for (const b of document.querySelectorAll(".hd-img-tool")) b.setAttribute("aria-pressed", String(b.dataset.act === tool));
  colorBtn.style.setProperty("--c", color);
  for (const b of sizesEl.children) b.setAttribute("aria-pressed", String(+b.dataset.i === sizeIdx));
  for (const b of ratiosEl.children) b.setAttribute("aria-pressed", String(+b.dataset.r === ratio));
  $('[data-for="edit"]').hidden = !!crop;
  $('[data-for="crop"]').hidden = !crop;
  stage.dataset.tool = tool;
  sync();
}

function setTool(name) {
  if (!base) return;
  finishText(true);
  if (crop && name !== "crop") crop = null;
  tool = name;
  selected = -1;
  if (name === "crop") {
    crop = { x: 0, y: 0, w: base.width, h: base.height };
    ratio = 0;
  }
  paintBar();
  render();
}

function applyToSelected(fn) {
  const o = objs[selected];
  if (o && o.type !== "blur") edit(() => fn(o));
}
sizesEl.addEventListener("click", e => {
  const b = e.target.closest("[data-i]");
  if (!b) return;
  sizeIdx = +b.dataset.i;
  applyToSelected(o => (o.size = (o.type === "text" ? TEXT : STROKE)[sizeIdx] * unit()));
  paintBar();
});
ratiosEl.addEventListener("click", e => {
  const b = e.target.closest("[data-r]");
  if (!b || !crop) return;
  ratio = +b.dataset.r === -1 ? -1 : +b.dataset.r;
  const r = ratio === -1 ? base.width / base.height : ratio;
  if (r) {
    let w = base.width;
    let h = w / r;
    if (h > base.height) {
      h = base.height;
      w = h * r;
    }
    crop = { x: (base.width - w) / 2, y: (base.height - h) / 2, w, h };
  }
  paintBar();
  overlay();
});

/* ------------------------------ поворот и обрезка ------------------------------ */

function mapObj(o, f) {
  if (o.type === "pen") {
    o.pts = o.pts.map(p => f(p[0], p[1]));
  } else if (o.type === "arrow") {
    [o.x1, o.y1] = f(o.x1, o.y1);
    [o.x2, o.y2] = f(o.x2, o.y2);
  } else if (o.type === "text") {
    const [cx, cy] = f(o.x + textW(o) / 2, o.y + textH(o) / 2);
    o.x = cx - textW(o) / 2;
    o.y = cy - textH(o) / 2;
  } else {
    const b = norm(o);
    const [x1, y1] = f(b.x, b.y);
    const [x2, y2] = f(b.x + b.w, b.y + b.h);
    Object.assign(o, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
  }
}

function transform(kind) {
  if (!base) return;
  finishText(true);
  if (crop) setTool("move");
  const W = base.width;
  const H = base.height;
  const turn = kind !== "flip";
  const f = { rotR: (x, y) => [H - y, x], rotL: (x, y) => [y, W - x], flip: (x, y) => [W - x, y] }[kind];
  edit(() => {
    const c = canvas(turn ? H : W, turn ? W : H);
    const g = c.getContext("2d");
    if (kind === "rotR") {
      g.translate(H, 0);
      g.rotate(Math.PI / 2);
    } else if (kind === "rotL") {
      g.translate(0, W);
      g.rotate(-Math.PI / 2);
    } else {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    g.drawImage(base, 0, 0);
    base = c;
    objs.forEach(o => mapObj(o, f));
  });
  if (turn) {
    fit = true;
    layout();
  }
}

function applyCrop() {
  if (!crop) return;
  const x = Math.round(crop.x);
  const y = Math.round(crop.y);
  const w = Math.round(crop.w);
  const h = Math.round(crop.h);
  crop = null;
  if (w >= 1 && h >= 1 && (w !== base.width || h !== base.height)) {
    edit(() => {
      const c = canvas(w, h);
      c.getContext("2d").drawImage(base, -x, -y);
      base = c;
      objs.forEach(o => mapObj(o, (px, py) => [px - x, py - y]));
    });
    fit = true;
    layout();
  }
  setTool("move");
}

function cropTo(ax, ay, mx, my) {
  const W = base.width;
  const H = base.height;
  mx = clamp(mx, 0, W);
  my = clamp(my, 0, H);
  let w = Math.abs(mx - ax);
  let h = Math.abs(my - ay);
  const r = ratio === -1 ? W / H : ratio;
  if (r) {
    const sx = mx < ax ? -1 : 1;
    const sy = my < ay ? -1 : 1;
    if (w / r > h) h = w / r;
    else w = h * r;
    const maxW = sx > 0 ? W - ax : ax;
    const maxH = sy > 0 ? H - ay : ay;
    if (w > maxW) {
      w = maxW;
      h = w / r;
    }
    if (h > maxH) {
      h = maxH;
      w = h * r;
    }
    mx = ax + sx * w;
    my = ay + sy * h;
  }
  crop = { x: Math.min(ax, mx), y: Math.min(ay, my), w, h };
}

function cropMove(d, x, y) {
  const s = d.start;
  const dx = x - d.x;
  const dy = y - d.y;
  const R = s.x + s.w;
  const B = s.y + s.h;
  if (d.mode === "new") return cropTo(d.x, d.y, x, y);
  if (d.mode === "move") {
    crop = { ...s, x: clamp(s.x + dx, 0, base.width - s.w), y: clamp(s.y + dy, 0, base.height - s.h) };
    return;
  }
  const ax = d.mode.includes("w") ? R : s.x;
  const ay = d.mode.includes("n") ? B : s.y;
  const mx = d.mode.includes("w") ? s.x + dx : d.mode.includes("e") ? R + dx : null;
  const my = d.mode.includes("n") ? s.y + dy : d.mode.includes("s") ? B + dy : null;
  if (mx !== null && my !== null) return cropTo(ax, ay, mx, my);
  const span = (a, m, lo, hi, max) => (m === null ? [lo, hi] : [Math.min(a, clamp(m, 0, max)), Math.max(a, clamp(m, 0, max))]);
  const [x1, x2] = span(ax, mx, s.x, R, base.width);
  const [y1, y2] = span(ay, my, s.y, B, base.height);
  crop = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/* ------------------------------ мышь ------------------------------ */

const point = e => {
  const r = view.getBoundingClientRect();
  return [(e.clientX - r.left) * base.width / r.width, (e.clientY - r.top) * base.height / r.height];
};
const distSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - ax - k * dx, py - ay - k * dy);
};
function hitTest(x, y) {
  const tol = 6 / zoom;
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i];
    if (o.type === "pen" || o.type === "arrow") {
      const pts = o.type === "pen" ? o.pts : [[o.x1, o.y1], [o.x2, o.y2]];
      const lim = o.size / 2 + tol + (o.type === "arrow" ? headOf(o) / 3 : 0);
      if (pts.length === 1 && Math.hypot(x - pts[0][0], y - pts[0][1]) <= lim) return i;
      for (let j = 1; j < pts.length; j++) if (distSeg(x, y, ...pts[j - 1], ...pts[j]) <= lim) return i;
    } else {
      const b = bbox(o);
      if (x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol) return i;
    }
  }
  return -1;
}
const shift = (o, dx, dy) => mapObj(o, (x, y) => [x + dx, y + dy]);

stage.addEventListener("pointerdown", e => {
  if (!base || e.button !== 0 || e.target.closest(".hd-img-text, .hd-img-empty")) return;
  if (textEdit) {
    finishText(true);
    if (tool === "text") return;
  }
  const [x, y] = point(e);
  e.preventDefault();
  stage.setPointerCapture(e.pointerId);
  if (tool === "crop") {
    const h = e.target.closest("[data-h]")?.dataset.h;
    const inside = crop && x >= crop.x && x <= crop.x + crop.w && y >= crop.y && y <= crop.y + crop.h;
    const [cx, cy] = [clamp(x, 0, base.width), clamp(y, 0, base.height)];
    drag = { kind: "crop", mode: h || (inside ? "move" : "new"), x: h || inside ? x : cx, y: h || inside ? y : cy, start: { ...crop } };
    return;
  }
  if (tool === "move") {
    const i = hitTest(x, y);
    selected = i;
    drag = i >= 0
      ? { kind: "move", i, x, y, orig: JSON.stringify(objs[i]), moved: false }
      : { kind: "pan", sx: e.clientX, sy: e.clientY, l: stage.scrollLeft, t: stage.scrollTop };
    paintBar();
    overlay();
    return;
  }
  if (tool === "text") {
    if (x < 0 || y < 0 || x > base.width || y > base.height) return;
    const i = objs.findLastIndex((o, j) => o.type === "text" && hitTest(x, y) === j);
    startText(x, y, i);
    return;
  }
  const size = STROKE[sizeIdx] * unit();
  const o = tool === "pen" ? { type: "pen", pts: [[x, y]], color, size }
    : tool === "arrow" ? { type: "arrow", x1: x, y1: y, x2: x, y2: y, color, size }
    : { type: tool, x, y, w: 0, h: 0, color, size };
  snapshot();
  objs.push(o);
  drag = { kind: "draw", o, x, y };
  later();
});

stage.addEventListener("pointermove", e => {
  if (!drag) return;
  if (drag.kind === "pan") {
    stage.scrollLeft = drag.l - (e.clientX - drag.sx);
    stage.scrollTop = drag.t - (e.clientY - drag.sy);
    return;
  }
  let [x, y] = point(e);
  if (drag.kind === "crop") {
    cropMove(drag, x, y);
    overlay();
    return;
  }
  if (drag.kind === "move") {
    if (!drag.moved) {
      if (Math.hypot(x - drag.x, y - drag.y) * zoom < 3) return;
      drag.moved = true;
      snapshot();
    }
    objs[drag.i] = JSON.parse(drag.orig);
    shift(objs[drag.i], x - drag.x, y - drag.y);
    later();
    return;
  }
  const o = drag.o;
  if (o.type === "pen") {
    o.pts.push([x, y]);
  } else if (o.type === "arrow") {
    if (e.shiftKey) {
      const a = Math.round(Math.atan2(y - o.y1, x - o.x1) / (Math.PI / 4)) * (Math.PI / 4);
      const len = Math.hypot(x - o.x1, y - o.y1);
      x = o.x1 + Math.cos(a) * len;
      y = o.y1 + Math.sin(a) * len;
    }
    o.x2 = x;
    o.y2 = y;
  } else {
    let w = x - o.x;
    let h = y - o.y;
    if (e.shiftKey) {
      const m = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * m;
      h = Math.sign(h || 1) * m;
    }
    o.w = w;
    o.h = h;
  }
  later();
});

const endDrag = () => {
  const d = drag;
  drag = null;
  if (!d) return;
  if (d.kind === "draw") {
    const b = bbox(d.o);
    const tiny = d.o.type === "pen" ? false : Math.max(b.w, b.h) * zoom < 6 + d.o.size * zoom;
    if (tiny) {
      objs.pop();
      const last = undo.pop();
      v = last.v;
    } else if (d.o.type === "rect" || d.o.type === "blur") {
      Object.assign(d.o, norm(d.o));
    }
    render();
  } else if (d.kind === "crop") {
    if (crop.w < 2 || crop.h < 2) crop = d.start;
    overlay();
  }
  sync();
};
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("dblclick", e => {
  if (!base || tool !== "move") return;
  const [x, y] = point(e);
  const i = hitTest(x, y);
  if (objs[i]?.type === "text") startText(objs[i].x, objs[i].y, i);
});
stage.addEventListener("wheel", e => {
  if (!e.ctrlKey || !base) return;
  e.preventDefault();
  setZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e);
}, { passive: false });

/* ------------------------------ текст ------------------------------ */

function startText(x, y, i = -1) {
  const o = i >= 0 ? objs[i] : { type: "text", x, y: y - TEXT[sizeIdx] * unit() * .6, text: "", color, size: TEXT[sizeIdx] * unit() };
  const ta = document.createElement("textarea");
  ta.className = "hd-img-text";
  ta.spellcheck = false;
  ta.wrap = "off";
  ta.value = o.text;
  frame.append(ta);
  textEdit = { i, o, ta };
  hidden = i;
  selected = -1;
  render();
  ta.addEventListener("input", placeText);
  ta.addEventListener("keydown", e => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      finishText(false);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finishText(true);
    }
  });
  ta.addEventListener("blur", () => finishText(true));
  requestAnimationFrame(() => ta.focus());
}
function placeText() {
  const { o, ta } = textEdit;
  const probe = { ...o, text: ta.value || " " };
  ta.style.left = `${o.x * zoom}px`;
  ta.style.top = `${o.y * zoom}px`;
  ta.style.font = `600 ${o.size * zoom}px/1.25 ${FONT}`;
  ta.style.color = o.color;
  ta.style.width = `${(textW(probe) + o.size) * zoom}px`;
  ta.style.height = `${textH(probe) * zoom}px`;
}
function finishText(keep) {
  if (!textEdit) return;
  const { i, o, ta } = textEdit;
  textEdit = null;
  hidden = -1;
  ta.remove();
  const value = ta.value.replace(/\s+$/, "");
  if (keep && value && value !== o.text) {
    edit(() => (i >= 0 ? (objs[i].text = value) : objs.push({ ...o, text: value })));
  } else if (keep && !value && i >= 0) {
    edit(() => objs.splice(i, 1));
  } else {
    render();
  }
}

/* ------------------------------ файл ------------------------------ */

const ask = (msg, main, onMain, alt, onAlt) => {
  $(".hd-md-notice-text").textContent = msg;
  const b1 = $(".hd-md-notice-main");
  const b2 = $(".hd-md-notice-alt");
  b1.textContent = main;
  b2.textContent = alt;
  b1.onclick = () => { notice.hidden = true; onMain(); };
  b2.onclick = () => { notice.hidden = true; onAlt(); };
  notice.hidden = false;
};

function showFile() {
  $(".hd-md-name").textContent = file.name;
  $(".hd-md-path").textContent = file.folder;
  $(".hd-md-path").title = file.folder;
}

async function load(blob, info) {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    setState(t("Не удалось открыть картинку"), "error");
    return;
  }
  const c = canvas(img.naturalWidth || 1, img.naturalHeight || 1);
  c.getContext("2d").drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  finishText(false);
  base = c;
  objs = [];
  crop = null;
  selected = -1;
  undo.length = 0;
  redo.length = 0;
  v = ++counter;
  savedV = info.path ? v : -1;
  file = info;
  out.fmt = fmtOf(file.name) || "png";
  empty.hidden = true;
  frame.hidden = false;
  fit = true;
  showFile();
  setState("");
  render();
  layout();
  setTool(tool === "crop" ? "move" : tool);
}

async function encode(fmt, q, w, h) {
  let src = composite();
  while (src.width / 2 >= w && src.height / 2 >= h) {
    const half = canvas(Math.round(src.width / 2), Math.round(src.height / 2));
    half.getContext("2d").drawImage(src, 0, 0, half.width, half.height);
    src = half;
  }
  let c = src;
  if (w !== src.width || h !== src.height || fmt === "jpeg") {
    c = canvas(w, h);
    const g = c.getContext("2d");
    if (fmt === "jpeg") {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
    }
    g.imageSmoothingQuality = "high";
    g.drawImage(src, 0, 0, w, h);
  }
  return new Promise(resolve => c.toBlob(resolve, MIME[fmt], q));
}
const b64 = async blob => new Uint8Array(await blob.arrayBuffer()).toBase64();

async function save(force = false) {
  finishText(true);
  if (!base || busy || (!dirty() && !force)) return;
  const fmt = fmtOf(file.name);
  if (!file.path || !fmt) return openExport();
  busy = true;
  sync();
  setState(t("Сохраняю…"));
  const blob = await encode(fmt, .92, base.width, base.height);
  const r = await api("save", { data: await b64(blob), mtime: force ? 0 : file.mtime });
  busy = false;
  if (r?.ok) {
    savedV = v;
    file.mtime = r.mtime;
    notice.hidden = true;
    setState(t("Сохранено"));
    setTimeout(() => !busy && !dirty() && setState(""), 1600);
  } else if (r?.conflict) {
    setState("");
    ask(t("Файл на диске изменился после открытия."), t("Перезаписать"), () => save(true), t("Отмена"), () => {});
  } else {
    setState(t("Не удалось сохранить: {0}", r?.error || "?"), "error");
  }
  sync();
}

/* ------------------------------ экспорт ------------------------------ */

const fmtBytes = n => (n < 1024 * 1024 ? t("{0} КБ", Math.max(1, Math.round(n / 1024))) : t("{0} МБ", (n / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })));
const wIn = $(".hd-img-w");
const hIn = $(".hd-img-h");
const qIn = $(".hd-img-quality input");
let estTimer = 0;
function paintExport() {
  for (const b of exp.querySelectorAll("[data-f]")) b.setAttribute("aria-pressed", String(b.dataset.f === out.fmt));
  $(".hd-img-quality").hidden = out.fmt === "png";
  qIn.value = out.q;
  $(".hd-img-quality output").textContent = `${out.q}%`;
  wIn.value = out.w;
  hIn.value = out.h;
  clearTimeout(estTimer);
  $(".hd-img-est").textContent = "…";
  estTimer = setTimeout(async () => {
    const blob = await encode(out.fmt, out.q / 100, out.w, out.h);
    if (!exp.hidden && blob) $(".hd-img-est").textContent = t("Размер файла: {0}", fmtBytes(blob.size));
  }, 250);
}
function openExport() {
  if (!base) return;
  finishText(true);
  out.w = base.width;
  out.h = base.height;
  exp.hidden = false;
  const r = $('[data-act="exportOpen"]').getBoundingClientRect();
  exp.style.top = `${r.bottom + 8}px`;
  exp.style.right = `${Math.max(8, innerWidth - r.right)}px`;
  paintExport();
}
exp.addEventListener("click", e => {
  const f = e.target.closest("[data-f]");
  if (f) {
    out.fmt = f.dataset.f;
    paintExport();
  }
});
qIn.addEventListener("input", () => {
  out.q = +qIn.value;
  paintExport();
});
const sizeInput = (el, other) => el.addEventListener("change", () => {
  const n = clamp(Math.round(+el.value || 1), 1, 20000);
  if (other === "h") {
    out.w = n;
    out.h = Math.max(1, Math.round(n * base.height / base.width));
  } else {
    out.h = n;
    out.w = Math.max(1, Math.round(n * base.width / base.height));
  }
  paintExport();
});
sizeInput(wIn, "h");
sizeInput(hIn, "w");
addEventListener("mousedown", e => {
  if (!exp.hidden && !exp.contains(e.target) && !e.target.closest('[data-act="exportOpen"]')) exp.hidden = true;
}, true);

async function exportAs() {
  busy = true;
  sync();
  const blob = await encode(out.fmt, out.q / 100, out.w, out.h);
  const stem = (file.name || t("Картинка")).replace(/\.[^.]+$/, "");
  const r = await api("saveAs", { data: await b64(blob), ext: out.fmt === "jpeg" ? "jpg" : out.fmt, name: stem });
  busy = false;
  if (r?.ok) {
    exp.hidden = true;
    history.replaceState(null, "", "#" + encodeURIComponent(r.path));
    const resized = out.w !== base.width || out.h !== base.height;
    file = { name: r.name, folder: r.folder, path: r.path, mtime: r.mtime };
    showFile();
    if (resized) {
      await reload();
    } else {
      savedV = v;
    }
    setState(t("Сохранено"));
    setTimeout(() => !busy && !dirty() && setState(""), 1600);
  } else if (!r?.cancel) {
    setState(t("Не удалось сохранить: {0}", r?.error || "?"), "error");
  }
  sync();
}

async function copy() {
  if (!base) return;
  finishText(true);
  const blob = await encode("png", 1, base.width, base.height);
  const r = await api("copy", { data: await b64(blob) });
  setState(r?.ok ? t("Скопировано") : t("Не удалось скопировать"), r?.ok ? "" : "error");
  setTimeout(() => !busy && setState(""), 1600);
}

async function reload() {
  const r = await api("read");
  if (r?.ok) {
    await load(new Blob([Uint8Array.fromBase64(r.data)], { type: r.mime }), { name: r.name, folder: r.folder, path: r.path, mtime: r.mtime });
  } else if (r?.empty) {
    empty.hidden = false;
    frame.hidden = true;
    setState("");
  } else {
    empty.hidden = false;
    frame.hidden = true;
    setState(t("Не удалось открыть картинку: {0}", r?.error || "?"), "error");
  }
  sync();
}

/* ------------------------------ команды ------------------------------ */

const acts = {
  open: () => api("open"),
  exportOpen: () => (exp.hidden ? openExport() : (exp.hidden = true)),
  export: exportAs,
  copy,
  cropApply: applyCrop,
  cropCancel: () => setTool("move"),
  rotL: () => transform("rotL"),
  rotR: () => transform("rotR"),
  flip: () => transform("flip"),
  undo: () => step(undo, redo),
  redo: () => step(redo, undo),
  del: () => selected >= 0 && edit(() => objs.splice(selected, 1)),
  zoomIn: () => setZoom(zoom * 1.25),
  zoomOut: () => setZoom(zoom / 1.25),
};
for (const n of TOOLS) acts[n] = () => setTool(n);

function step(from, to) {
  finishText(true);
  if (!from.length) return;
  to.push({ base, objs: JSON.stringify(objs), v });
  const s = from.pop();
  const resized = s.base.width !== base.width || s.base.height !== base.height;
  base = s.base;
  objs = JSON.parse(s.objs);
  v = s.v;
  selected = -1;
  if (resized) fit = true;
  render();
  layout();
  sync();
}

document.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (b && !b.disabled) acts[b.dataset.act]();
});
zoomVal.addEventListener("click", () => {
  if (fit) {
    setZoom(1);
  } else {
    fit = true;
    layout();
  }
});
$(".hd-md-icon").addEventListener("click", () => api("home"));
saveBtn.addEventListener("click", () => save());

document.addEventListener("keydown", e => {
  const mod = e.ctrlKey || e.metaKey;
  if (e.target.closest?.("input, textarea")) return;
  if (mod && !e.altKey && e.code === "KeyS") {
    e.preventDefault();
    if (e.shiftKey) openExport();
    else save();
  } else if (mod && e.code === "KeyO") {
    e.preventDefault();
    api("open");
  } else if (mod && e.code === "KeyZ" && !e.shiftKey) {
    e.preventDefault();
    acts.undo();
  } else if (mod && (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey))) {
    e.preventDefault();
    acts.redo();
  } else if (mod && e.code === "KeyC" && base && !getSelection().toString()) {
    e.preventDefault();
    copy();
  } else if (e.key === "Escape") {
    if (pop) closePalette();
    else if (!exp.hidden) exp.hidden = true;
    else if (crop) setTool("move");
    else if (selected >= 0) {
      selected = -1;
      overlay();
      sync();
    }
  } else if (e.key === "Enter" && crop) {
    e.preventDefault();
    applyCrop();
  } else if ((e.key === "Delete" || e.key === "Backspace") && selected >= 0) {
    e.preventDefault();
    acts.del();
  } else if (!mod && !e.altKey && base) {
    const name = !e.shiftKey && CODES[e.code];
    if (name) setTool(name);
    else if (e.key === "+" || e.key === "=") acts.zoomIn();
    else if (e.key === "-") acts.zoomOut();
    else if (e.key === "0") {
      fit = true;
      layout();
    } else if (e.key === "1") setZoom(1);
  }
}, true);

document.addEventListener("paste", e => {
  if (textEdit || e.target.closest?.("input, textarea")) return;
  const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith("image/"));
  if (!f) return;
  e.preventDefault();
  const go = () => {
    history.replaceState(null, "", location.pathname);
    load(f, { name: t("Картинка") + ".png", folder: "", path: "", mtime: 0 });
  };
  if (dirty()) ask(t("Заменить картинку той, что в буфере обмена? Несохранённые правки пропадут."), t("Заменить"), go, t("Отмена"), () => {});
  else go();
});

addEventListener("beforeunload", e => {
  if (dirty()) e.preventDefault();
});

paintBar();
await reload();
