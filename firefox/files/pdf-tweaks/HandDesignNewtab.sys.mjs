/* Новая вкладка Hand Design: часы, поиск, ярлыки, обои и виджеты.
   Разметка повторяет новую вкладку Floorp (те же классы), поэтому к ней применяются
   стили Hand Design, детали тем и настройки Studio. Виджеты — HandDesignWidgets.sys.mjs,
   свои виджеты — в изолированных рамках (sandbox) с мостом window.hd. */
import { WIDGETS, AI_PROMPT } from "resource://pdftweaks/HandDesignWidgets.sys.mjs";

const GRID = 16;
const MIN_W = 140;
const MIN_H = 90;
const BUILTINS = [["clock", "Часы", "speed"], ["search", "Поиск", "search"], ["tiles", "Ярлыки", "grid"]];
const STORE_MAX = 64 * 1024;

export function mountNewtab(win, doc, api) {
  const { t, q } = api;
  const lang = doc.documentElement.lang || undefined;
  const h = (tag, cls, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  };
  const icon = name => {
    const i = h("i", "hd-ic");
    i.style.setProperty("--i", `var(--fm-ic-${name})`);
    return i;
  };
  const btn = (name, title, fn, cls = "hd-ib") => {
    const b = h("button", cls);
    b.type = "button";
    b.title = title;
    b.append(icon(name));
    b.addEventListener("click", e => {
      e.stopPropagation();
      fn(e);
    });
    return b;
  };
  doc.title = t("Новая вкладка");
  const root = doc.getElementById("root");

  /* ---------- поиск и ярлыки (как у Floorp) ---------- */
  const main = h("div", "w-full min-h-screen flex flex-col justify-center items-center");
  main.id = "hd-main";
  const search = h("div", "group cursor-pointer");
  search.dataset.hdEl = "search";
  const sIcon = icon("search");
  const sInput = h("input");
  sInput.readOnly = true;
  sInput.placeholder = t("Поиск или адрес");
  search.append(sIcon, sInput);
  search.addEventListener("click", () => !editing && q("search", { text: "" }));
  doc.addEventListener("keydown", e => {
    if (editing || e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
    const a = doc.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !a.readOnly) return;
    e.preventDefault();
    q("search", { text: e.key });
  });
  const tiles = h("div", "inline-block backdrop-blur-sm p-3");
  tiles.dataset.hdEl = "tiles";
  tiles.hidden = true;
  main.append(search, tiles);
  root.append(main);
  q("sites").then(list => {
    for (const s of list || []) {
      const a = h("a", "group flex flex-col items-center");
      a.href = s.url;
      a.title = s.url;
      const ic = h("div", "overflow-hidden bg-gray-700");
      if (s.icon) {
        const img = h("img");
        img.src = s.icon;
        img.alt = "";
        ic.append(img);
      } else {
        ic.append(h("span", "hd-letter", (s.host || s.title || "?").charAt(0).toUpperCase()));
      }
      a.append(ic, h("span", "hd-site", s.title));
      tiles.append(a);
    }
    tiles.hidden = !tiles.querySelector("a");
  });

  /* ---------- состояние ---------- */
  let state = norm({});
  let editing = false;
  let saveTimer = 0;
  let lastSaved = "";
  function norm(s) {
    s = s && typeof s === "object" ? s : {};
    return {
      items: Array.isArray(s.items) ? s.items.filter(x => x && WIDGETS[x.type]) : [],
      moved: s.moved && typeof s.moved === "object" ? s.moved : {},
      hidden: s.hidden && typeof s.hidden === "object" ? s.hidden : {},
      size: s.size && typeof s.size === "object" ? s.size : {},
      grid: s.grid !== false,
    };
  }
  const save = () => {
    win.clearTimeout(saveTimer);
    saveTimer = win.setTimeout(() => {
      lastSaved = JSON.stringify(state);
      q("state-set", { state });
    }, 250);
  };
  const load = async () => {
    const raw = (await q("state-get")) || {};
    if (raw.theme) doc.documentElement.setAttribute("hd-theme", raw.theme);
    doc.documentElement.toggleAttribute("hd-square", !!raw.square);
    const s = norm(raw);
    if (JSON.stringify(s) === lastSaved || editing) return;
    state = s;
    lastSaved = JSON.stringify(state);
    layoutBuiltins();
    renderAll();
  };
  api.onState(load);
  doc.addEventListener("visibilitychange", () => doc.visibilityState === "visible" && load());

  /* ---------- слой виджетов ---------- */
  const layer = h("div");
  layer.id = "hd-widgets";
  doc.body.append(layer);
  const cards = new Map();
  const vw = () => win.innerWidth;
  const vh = () => win.innerHeight;
  const snap = v => (state.grid ? Math.round(v / GRID) * GRID : Math.round(v));
  const clampBox = it => {
    const w = Math.min(Math.max(it.w || MIN_W, MIN_W), vw() - 16);
    const hh = Math.min(Math.max(it.h || MIN_H, MIN_H), vh() - 16);
    const x = Math.min(Math.max(((it.x ?? 50) / 100) * vw(), 8), vw() - w - 8);
    const y = Math.min(Math.max(((it.y ?? 50) / 100) * vh(), 8), vh() - hh - 8);
    return { x, y, w, hh };
  };
  const place = (card, it) => {
    const b = clampBox(it);
    card.style.left = b.x + "px";
    card.style.top = b.y + "px";
    card.style.width = b.w + "px";
    card.style.height = b.hh + "px";
  };

  function renderAll() {
    const ids = new Set(state.items.map(x => x.id));
    for (const [id, c] of cards) {
      if (!ids.has(id)) {
        c.cleanup();
        c.el.remove();
        cards.delete(id);
      }
    }
    for (const it of state.items) {
      let c = cards.get(it.id);
      if (!c) {
        c = makeCard(it);
        cards.set(it.id, c);
        layer.append(c.el);
      }
      c.it = it;
      place(c.el, it);
      c.render();
    }
  }

  function makeCard(it) {
    const def = WIDGETS[it.type];
    const el = h("section", "hd-w");
    el.dataset.type = it.type;
    const head = h("header", "hd-w-head");
    const ttl = h("span", "hd-w-title");
    const hic = icon(def.icon);
    head.append(hic, ttl);
    const body = h("div", "hd-w-body");
    const tools = h("div", "hd-w-tools");
    const c = { el, it, timers: [], cleanup() {} };
    if (def.fields?.length || it.type === "custom") {
      tools.append(btn("settings", t("Настроить"), () => (it.type === "custom" ? openCustom(c.it) : openSettings(c))));
    }
    tools.append(btn("close", t("Убрать"), () => remove(c.it.id)));
    const grip = h("span", "hd-w-resize");
    el.append(head, body, tools, grip);
    let seq = 0;
    c.cleanup = () => {
      c.timers.forEach(x => win.clearInterval(x));
      c.timers = [];
      if (c.frameOff) c.frameOff();
    };
    c.render = async () => {
      const n = ++seq;
      c.cleanup();
      body.textContent = "";
      body.removeAttribute("data-idle");
      ttl.textContent = c.it.type === "custom" ? c.it.o?.name || t("Свой виджет") : t(def.title);
      if (c.it.type === "custom") {
        renderCustom(c, body, () => n === seq);
        return;
      }
      const ctx = {
        id: c.it.id, el: body, o: { ...(def.defaults || {}), ...(c.it.o || {}) }, t, q, h, icon, win, doc, lang,
        btn: (name, title, fn) => btn(name, title, fn),
        empty: text => h("div", "hd-w-empty", text),
        size: () => ({ w: el.clientWidth, hh: el.clientHeight }),
        every: (fn, ms) => c.timers.push(win.setInterval(() => n === seq && fn(), ms)),
        rerender: () => n === seq && c.render(),
        setTitle: s => s && (ttl.textContent = s),
        save: (o, quiet) => {
          c.it.o = o;
          save();
          if (!quiet) c.render();
        },
        beep,
      };
      try {
        await def.render(ctx);
      } catch (e) {
        if (n === seq) body.append(h("div", "hd-w-empty", t("Ошибка виджета")));
        console.error("[hd-newtab]", it.type, e);
      }
    };
    // перетаскивание и размер — только в режиме правки
    el.addEventListener("pointerdown", e => {
      if (!editing || e.button !== 0 || e.target.closest(".hd-w-tools, input, textarea, select, button:not(.hd-w-head *)")) return;
      const resize = e.target === grip;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      el.toggleAttribute("data-drag", true);
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (resize) {
          el.style.width = Math.max(MIN_W, snap(r.width + dx)) + "px";
          el.style.height = Math.max(MIN_H, snap(r.height + dy)) + "px";
        } else {
          el.style.left = snap(Math.min(Math.max(r.left + dx, 0), vw() - r.width)) + "px";
          el.style.top = snap(Math.min(Math.max(r.top + dy, 0), vh() - r.height)) + "px";
        }
      };
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeAttribute("data-drag");
        const b = el.getBoundingClientRect();
        c.it.x = +((b.left / vw()) * 100).toFixed(2);
        c.it.y = +((b.top / vh()) * 100).toFixed(2);
        c.it.w = Math.round(b.width);
        c.it.h = Math.round(b.height);
        save();
        if (resize) c.render();
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up, { once: true });
      el.addEventListener("pointercancel", up, { once: true });
    });
    return c;
  }

  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  function freeSpot(w, hh) {
    const boxes = [...cards.values()].map(c => c.el.getBoundingClientRect());
    for (const sel of ["#fm-clock", "#hd-main .group", "#hd-main .inline-block"]) {
      const e = doc.querySelector(sel);
      if (e && !e.hidden) boxes.push(e.getBoundingClientRect());
    }
    const hit = (x, y) => boxes.some(b => x < b.right + 12 && x + w + 12 > b.left && y < b.bottom + 12 && y + hh + 12 > b.top);
    for (let y = 24; y + hh < vh() - 24; y += GRID * 2) {
      for (let x = 24; x + w < vw() - 24; x += GRID * 2) {
        if (!hit(x, y)) return [(x / vw()) * 100, (y / vh()) * 100];
      }
    }
    return [10 + cards.size * 2, 15 + cards.size * 3];
  }
  function add(type, extra = {}) {
    const def = WIDGETS[type];
    const w = extra.w || def.w, hh = extra.h || def.h;
    const [x, y] = freeSpot(w, hh);
    const it = { id: newId(), type, x: +x.toFixed(2), y: +y.toFixed(2), w, h: hh, o: { ...(def.defaults || {}), ...(extra.o || {}) } };
    state.items.push(it);
    save();
    renderAll();
    return it;
  }
  function remove(id) {
    const it = state.items.find(x => x.id === id);
    state.items = state.items.filter(x => x.id !== id);
    if (it && (it.type === "custom" || it.type === "image")) q("file-delete", { id });
    save();
    renderAll();
  }

  /* ---------- встроенные элементы: часы, поиск, ярлыки ---------- */
  const builtinEl = key => (key === "clock" ? doc.getElementById("fm-clock") : key === "search" ? search : tiles);
  function layoutBuiltins() {
    for (const [key] of BUILTINS) {
      const e = builtinEl(key);
      if (!e) continue;
      const m = state.moved[key];
      e.style.translate = m ? `${m[0]}vw ${m[1]}vh` : "";
      sizeBuiltin(key, e);
      e.toggleAttribute("data-hd-hidden", !!state.hidden[key]);
      e.dataset.hdEl = key;
      if (!e.querySelector(":scope > .hd-b-close")) {
        const x = btn("close", t("Убрать"), () => {
          state.hidden[key] = true;
          save();
          layoutBuiltins();
          drawGallery();
        }, "hd-ib hd-b-close");
        e.append(x, h("span", "hd-w-resize hd-b-resize"));
        e.addEventListener("pointerdown", ev => dragBuiltin(ev, key, e));
      }
    }
  }
  // поиск — ширина и высота, часы и ярлыки — масштаб
  function sizeBuiltin(key, e) {
    const s = state.size[key];
    const prop = (name, v) => (v ? e.style.setProperty(name, v, "important") : e.style.removeProperty(name));
    if (key === "search") {
      prop("width", s?.[0] ? `min(${s[0]}px, 96vw)` : "");
      prop("height", s?.[1] ? s[1] + "px" : "");
    } else {
      prop("scale", s ? String(s) : "");
    }
  }
  function resizeBuiltin(e, key, el) {
    e.preventDefault();
    e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const s0 = +state.size[key] || 1;
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (key === "search") {
        // ширина растёт в обе стороны: поиск стоит по центру
        state.size.search = [Math.round(Math.min(Math.max(snap(r.width + dx * 2), 240), vw() - 16)), Math.round(Math.min(Math.max(snap(r.height + dy), 36), 120))];
      } else {
        const k = Math.max((r.width + dx) / r.width, (r.height + dy) / r.height);
        state.size[key] = +Math.min(Math.max(s0 * k, 0.5), 3).toFixed(2);
      }
      sizeBuiltin(key, el);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", () => {
      el.removeEventListener("pointermove", move);
      save();
    }, { once: true });
  }
  function dragBuiltin(e, key, el) {
    if (!editing || e.button !== 0 || e.target.closest("button")) return;
    if (e.target.classList.contains("hd-b-resize")) return resizeBuiltin(e, key, el);
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const m = state.moved[key] || [0, 0];
    const sx = e.clientX, sy = e.clientY;
    const move = ev => {
      const dx = m[0] + ((snap(ev.clientX - sx)) / vw()) * 100;
      const dy = m[1] + ((snap(ev.clientY - sy)) / vh()) * 100;
      el.style.translate = `${dx}vw ${dy}vh`;
      state.moved[key] = [+dx.toFixed(2), +dy.toFixed(2)];
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", () => {
      el.removeEventListener("pointermove", move);
      save();
    }, { once: true });
  }
  // часы ставит актор чуть позже — ждём их появления
  const mo = new win.MutationObserver(() => {
    if (doc.getElementById("fm-clock")) {
      mo.disconnect();
      layoutBuiltins();
    }
  });
  mo.observe(doc.body, { childList: true });
  layoutBuiltins();

  /* ---------- режим правки ---------- */
  const fab = btn("edit", t("Виджеты"), () => setEdit(!editing), "hd-fab");
  const bar = h("div", "hd-editbar");
  const gridBtn = h("button", "hd-pill hd-pill-ghost");
  const resetBtn = h("button", "hd-pill hd-pill-ghost", t("Сбросить"));
  const doneBtn = h("button", "hd-pill", t("Готово"));
  bar.append(gridBtn, resetBtn, doneBtn);
  const gallery = h("div", "hd-gallery");
  doc.body.append(fab, bar, gallery);
  gridBtn.addEventListener("click", () => {
    state.grid = !state.grid;
    save();
    drawBar();
  });
  let resetArm = 0;
  resetBtn.addEventListener("click", () => {
    if (!resetArm) {
      resetBtn.textContent = t("Точно сбросить?");
      resetArm = win.setTimeout(() => {
        resetArm = 0;
        drawBar();
      }, 3000);
      return;
    }
    win.clearTimeout(resetArm);
    resetArm = 0;
    for (const it of state.items) if (it.type === "custom" || it.type === "image") q("file-delete", { id: it.id });
    state = norm({ grid: state.grid });
    save();
    layoutBuiltins();
    renderAll();
    drawBar();
    drawGallery();
  });
  doneBtn.addEventListener("click", () => setEdit(false));
  const drawBar = () => {
    gridBtn.textContent = state.grid ? t("Сетка: вкл.") : t("Сетка: выкл.");
    if (!resetArm) resetBtn.textContent = t("Сбросить");
  };
  function drawGallery() {
    gallery.textContent = "";
    const row = h("div", "hd-gallery-row");
    for (const [type, def] of Object.entries(WIDGETS)) {
      const card = h("button", "hd-gcard");
      card.append(icon(def.icon), h("b", "", t(def.title)));
      card.title = t(def.desc);
      card.addEventListener("click", () => {
        if (type === "custom") return openCustom(null);
        const it = add(type);
        const c = cards.get(it.id);
        if (def.fields?.some(f => f.type !== "select" && !it.o[f.id]) && c) openSettings(c);
      });
      row.append(card);
    }
    for (const [key, name, ic] of BUILTINS) {
      if (!state.hidden[key]) continue;
      const card = h("button", "hd-gcard hd-gcard-back");
      card.append(icon(ic), h("b", "", t(name)));
      card.title = t("Вернуть на вкладку");
      card.addEventListener("click", () => {
        delete state.hidden[key];
        save();
        layoutBuiltins();
        drawGallery();
      });
      row.append(card);
    }
    gallery.append(row);
  }
  function setEdit(on) {
    editing = on;
    doc.documentElement.toggleAttribute("hd-edit", on);
    fab.hidden = on;
    if (on) {
      drawBar();
      drawGallery();
    } else {
      closePop();
    }
  }
  doc.addEventListener("keydown", e => e.key === "Escape" && (pop ? closePop() : editing && setEdit(false)));

  /* ---------- настройки виджета ---------- */
  let pop = null;
  function closePop() {
    pop?.remove();
    pop = null;
  }
  async function field(f, value, onChange) {
    const row = h("label", "hd-field");
    row.append(h("span", "", t(f.label)));
    let input;
    if (f.type === "select" || f.type === "note" || f.type === "folder") {
      input = h("select");
      let opts = f.options || [];
      if (f.type === "note") {
        const r = await q("notes");
        opts = [["", r?.dir ? "—" : t("Сначала выберите папку в Заметках")], ...(r?.items || []).map(n => [n.rel, n.rel.replace(/\.md$/i, "")])];
      } else if (f.type === "folder") {
        opts = [["", t("Панель закладок")], ...((await q("folders")) || []).map(x => [x.guid, x.title])];
      }
      for (const [v, label] of opts) {
        const o = h("option", "", f.type === "select" ? t(label) : label);
        o.value = v;
        input.append(o);
      }
      input.value = value ?? opts[0]?.[0] ?? "";
      input.addEventListener("change", () => onChange(input.value));
    } else if (f.type === "toggle") {
      input = h("input");
      input.type = "checkbox";
      input.checked = !!value;
      input.addEventListener("change", () => onChange(input.checked));
      row.classList.add("hd-field-toggle");
    } else if (f.type === "textarea") {
      input = h("textarea");
      input.value = value || "";
      input.rows = 5;
      input.addEventListener("change", () => onChange(input.value));
    } else if (f.type === "image") {
      input = h("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp,image/gif";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        const kind = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }[file.type];
        if (!kind || file.size > 15 * 1024 * 1024) return;
        const b64 = new Uint8Array(await file.arrayBuffer()).toBase64();
        onChange(kind, { b64 });
      });
    } else {
      input = h("input");
      input.type = ["number", "date", "time", "color"].includes(f.type) ? f.type : "text";
      if (f.min !== undefined) input.min = f.min;
      if (f.max !== undefined) input.max = f.max;
      if (f.placeholder) input.placeholder = t(f.placeholder);
      input.value = value ?? (f.type === "color" ? "#888888" : "");
      input.addEventListener("change", () => onChange(f.type === "number" ? Number(input.value) : input.value));
    }
    row.append(input);
    return row;
  }
  async function openSettings(c) {
    closePop();
    const def = WIDGETS[c.it.type];
    pop = h("div", "hd-pop");
    pop.append(h("b", "hd-pop-title", t(def.title)));
    const o = { ...(def.defaults || {}), ...(c.it.o || {}) };
    for (const f of def.fields) {
      pop.append(await field(f, o[f.id], async (v, extra) => {
        if (f.type === "image" && extra) {
          await q("file-save", { id: c.it.id, kind: v, b64: extra.b64 });
        }
        c.it.o = { ...(c.it.o || {}), [f.id]: v };
        save();
        c.render();
      }));
    }
    const ok = h("button", "hd-pill", t("Готово"));
    ok.addEventListener("click", closePop);
    pop.append(ok);
    doc.body.append(pop);
    const r = c.el.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    pop.style.left = Math.min(Math.max(8, r.right + 10 + pw > vw() ? r.left - pw - 10 : r.right + 10), vw() - pw - 8) + "px";
    pop.style.top = Math.min(Math.max(8, r.top), vh() - ph - 8) + "px";
  }
  doc.addEventListener("pointerdown", e => {
    if (pop && !pop.contains(e.target) && !e.target.closest?.(".hd-w-tools")) closePop();
  });

  /* ---------- свои виджеты ---------- */
  const themeVars = () => {
    const cs = win.getComputedStyle(doc.documentElement);
    const g = (k, d) => cs.getPropertyValue(k).trim() || d;
    return {
      "--hd-card": g("--fm-bar", "#1e1f24"), "--hd-ink": g("--fm-ink", "#f2f2f4"), "--hd-muted": g("--fm-muted", "#9a9ca4"),
      "--hd-accent": g("--fm-accent", "#8e6bff"), "--hd-on-accent": g("--fm-on-accent", "#fff"), "--hd-line": g("--fm-line", "rgb(255 255 255 / .1)"),
      "--hd-radius": g("--fm-radius", "14px"), "--hd-font": g("--fm-font", "system-ui, sans-serif"), "--hd-mono": "\"Cascadia Code\", Consolas, monospace",
      "--hd-bg": g("--fm-frame", "#111"),
    };
  };
  const BRIDGE = `(()=>{const P=new Map;let N=0;const call=(op,a)=>new Promise(r=>{const id=++N;P.set(id,r);parent.postMessage({hd:1,id,op,a},"*")});
const S={settings:[],theme:[]};const vars=v=>{for(const k in v)document.documentElement.style.setProperty(k,v[k])};
addEventListener("message",e=>{const d=e.data;if(e.source!==parent||!d||d.hd!==1)return;if(d.re){P.get(d.re)?.(d.result);P.delete(d.re);return}
if(d.type==="settings"){hd.settings=d.settings;S.settings.forEach(f=>{try{f(d.settings)}catch(x){console.error(x)}})}
if(d.type==="theme"){vars(d.vars);S.theme.forEach(f=>{try{f()}catch(x){console.error(x)}})}});
const hd={settings:__S__,onSettings:f=>S.settings.push(f),onTheme:f=>S.theme.push(f),
fetch:url=>call("fetch",{url:String(url)}).then(r=>{let j=null;try{j=JSON.parse(r.text)}catch(x){}return{ok:!!r.ok,status:r.status||0,text:r.text||"",json:j}}),
store:{get:k=>call("get",{k:String(k)}),set:(k,v)=>call("set",{k:String(k),v})},open:url=>call("open",{url:String(url)})};
Object.defineProperty(window,"hd",{value:Object.freeze(hd)});vars(__V__)})();`;
  const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data:; media-src data: blob:";
  const json = v => JSON.stringify(v).replace(/</g, "\\u003c");
  function srcdoc(code, settings) {
    const head = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><style>:root{color-scheme:light dark}html,body{margin:0;height:100%;background:transparent;color:var(--hd-ink);font-family:var(--hd-font);overflow:hidden}</style><script>${BRIDGE.replace("__S__", json(settings)).replace("__V__", json(themeVars()))}<\/script>`;
    return /<head[^>]*>/i.test(code) ? code.replace(/<head[^>]*>/i, m => m + head) : head + code;
  }
  function parseMeta(code) {
    const d = new win.DOMParser().parseFromString(code, "text/html");
    const raw = d.querySelector('meta[name="hd-widget"]')?.getAttribute("content");
    if (!raw) return null;
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      try {
        m = JSON.parse(raw.replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1"));
      } catch {
        return null;
      }
    }
    const size = Array.isArray(m.size) ? m.size.map(Number) : [];
    return {
      name: String(m.name || t("Свой виджет")).slice(0, 60),
      w: Math.min(900, Math.max(MIN_W, size[0] > 12 ? size[0] : (size[0] || 2) * 130)),
      h: Math.min(900, Math.max(MIN_H, size[1] > 12 ? size[1] : (size[1] || 1) * 130)),
      network: (Array.isArray(m.network) ? m.network : []).map(String).filter(u => /^https:\/\/[^\s/]+/.test(u)).slice(0, 10),
      settings: (Array.isArray(m.settings) ? m.settings : []).filter(f => f && /^[\w-]{1,40}$/.test(f.id)).slice(0, 20).map(f => ({
        id: f.id, label: String(f.label || f.id).slice(0, 60),
        type: ["text", "number", "date", "time", "color", "toggle", "select"].includes(f.type) ? f.type : "text",
        options: Array.isArray(f.options) ? f.options.map(o => (Array.isArray(o) ? [String(o[0]), String(o[1] ?? o[0])] : [String(o), String(o)])) : undefined,
      })),
    };
  }
  const frames = new Map();
  win.addEventListener("message", async e => {
    const d = e.data;
    const f = [...frames.entries()].find(([fr]) => fr.contentWindow === e.source);
    if (!f || !d || d.hd !== 1 || !d.id) return;
    const it = state.items.find(x => x.id === f[1]);
    if (!it) return;
    let result = null;
    const a = d.a || {};
    if (d.op === "fetch") result = await q("fetch", { id: it.id, url: a.url });
    else if (d.op === "get") result = (it.o.store || {})[a.k] ?? null;
    else if (d.op === "set") {
      const st = { ...(it.o.store || {}), [a.k]: a.v };
      if (JSON.stringify(st).length <= STORE_MAX) {
        it.o.store = st;
        save();
        result = true;
      } else result = false;
    } else if (d.op === "open") result = await q("open", { url: a.url });
    e.source.postMessage({ hd: 1, re: d.id, result }, "*");
  });
  async function renderCustom(c, body, alive) {
    const r = await q("file-read", { id: c.it.id, kind: "code" });
    if (!alive()) return;
    if (!r?.text) {
      body.append(h("div", "hd-w-empty", t("Код виджета не найден")));
      return;
    }
    const fr = h("iframe", "hd-frame");
    fr.setAttribute("sandbox", "allow-scripts");
    fr.setAttribute("referrerpolicy", "no-referrer");
    fr.srcdoc = srcdoc(r.text, c.it.o.values || {});
    body.append(fr);
    frames.set(fr, c.it.id);
    c.frameOff = () => frames.delete(fr);
  }
  const themeObs = new win.MutationObserver(() => {
    const vars = themeVars();
    for (const fr of frames.keys()) fr.contentWindow?.postMessage({ hd: 1, type: "theme", vars }, "*");
  });
  themeObs.observe(doc.documentElement, { attributes: true, attributeFilter: ["fm-theme", "style", "class"] });

  /* окно «Свой виджет»: вставить код или открыть файл, проверить, добавить */
  function openCustom(existing) {
    closePop();
    const dlg = h("div", "hd-modal");
    const box = h("div", "hd-custom");
    const head = h("div", "hd-custom-head");
    const info = h("button", "hd-info", "i");
    info.type = "button";
    info.title = t("Как сделать свой виджет");
    const tip = h("div", "hd-tip");
    tip.hidden = true;
    tip.append(h("p", "", t("Свой виджет — это один файл .html. Его можно написать самому или попросить нейросеть: скопируйте задание, допишите, какой виджет нужен, и вставьте ответ сюда. Подробно — в README.")));
    const copy = h("button", "hd-pill", t("Скопировать задание"));
    copy.addEventListener("click", async () => {
      try {
        await win.navigator.clipboard.writeText(t(AI_PROMPT));
        copy.textContent = t("Скопировано");
      } catch {
        copy.textContent = t("Не получилось скопировать");
      }
    });
    tip.append(copy);
    info.addEventListener("click", () => (tip.hidden = !tip.hidden));
    const fileBtn = h("button", "hd-pill hd-pill-ghost", t("Открыть файл"));
    const fileIn = h("input");
    fileIn.type = "file";
    fileIn.accept = ".html,.htm,text/html";
    fileIn.hidden = true;
    fileBtn.addEventListener("click", () => fileIn.click());
    const close = btn("close", t("Закрыть"), () => dlg.remove());
    head.append(h("b", "", t("Свой виджет")), info, h("span", "hd-flex"), fileBtn, fileIn, close);
    const ta = h("textarea", "hd-code");
    ta.spellcheck = false;
    ta.placeholder = t("Вставьте код виджета или перетащите файл .html");
    const side = h("div", "hd-custom-side");
    const pv = h("div", "hd-w hd-w-preview");
    const pvBody = h("div", "hd-w-body");
    pv.append(pvBody);
    const metaBox = h("div", "hd-custom-meta");
    const addBtn = h("button", "hd-pill", existing ? t("Сохранить") : t("Добавить на вкладку"));
    addBtn.disabled = true;
    side.append(h("span", "hd-muted", t("Предпросмотр")), pv, metaBox, addBtn);
    box.append(head, tip, ta, side);
    dlg.append(box);
    doc.body.append(dlg);
    dlg.addEventListener("pointerdown", e => e.target === dlg && dlg.remove());
    let meta = null;
    let values = { ...(existing?.o?.values || {}) };
    let pvFrame = null;
    const preview = () => {
      pvBody.textContent = "";
      metaBox.textContent = "";
      meta = ta.value.trim() ? parseMeta(ta.value) : null;
      addBtn.disabled = !meta;
      if (!ta.value.trim()) return;
      if (!meta) {
        pvBody.append(h("div", "hd-w-empty", t('Не нашёл описание <meta name="hd-widget">. Попросите нейросеть добавить его.')));
        return;
      }
      pv.style.width = Math.min(meta.w, 340) + "px";
      pv.style.height = Math.min(meta.h, 300) + "px";
      if (pvFrame) frames.delete(pvFrame);
      pvFrame = h("iframe", "hd-frame");
      pvFrame.setAttribute("sandbox", "allow-scripts");
      pvFrame.srcdoc = srcdoc(ta.value, values);
      pvBody.append(pvFrame);
      metaBox.append(h("b", "", meta.name));
      metaBox.append(h("small", "", meta.network.length ? t("Ходит в интернет: ") + meta.network.map(u => new URL(u).host).join(", ") : t("Без интернета")));
      for (const f of meta.settings) {
        field(f, values[f.id], v => {
          values[f.id] = v;
          pvFrame?.contentWindow?.postMessage({ hd: 1, type: "settings", settings: values }, "*");
        }).then(r => metaBox.append(r));
      }
    };
    let tm = 0;
    ta.addEventListener("input", () => {
      win.clearTimeout(tm);
      tm = win.setTimeout(preview, 400);
    });
    const loadFile = async file => {
      if (file && file.size < 2 * 1024 * 1024) {
        ta.value = await file.text();
        preview();
      }
    };
    fileIn.addEventListener("change", () => loadFile(fileIn.files?.[0]));
    ta.addEventListener("dragover", e => e.preventDefault());
    ta.addEventListener("drop", e => {
      const f = e.dataTransfer?.files?.[0];
      if (f) {
        e.preventDefault();
        loadFile(f);
      }
    });
    addBtn.addEventListener("click", async () => {
      if (!meta) return;
      if (pvFrame) frames.delete(pvFrame);
      let it = existing ? state.items.find(x => x.id === existing.id) : null;
      if (!it) it = add("custom", { w: meta.w, h: meta.h, o: {} });
      it.o = { ...(it.o || {}), name: meta.name, network: meta.network, values, store: it.o?.store || {} };
      await q("file-save", { id: it.id, kind: "code", text: ta.value });
      save();
      dlg.remove();
      renderAll();
      cards.get(it.id)?.render();
    });
    if (existing) {
      q("file-read", { id: existing.id, kind: "code" }).then(r => {
        ta.value = r?.text || "";
        preview();
      });
      const exp = h("button", "hd-pill hd-pill-ghost", t("Сохранить в файл"));
      exp.addEventListener("click", () => {
        const a = h("a");
        a.href = win.URL.createObjectURL(new win.Blob([ta.value], { type: "text/html" }));
        a.download = (existing.o?.name || "widget").replace(/[\\/:*?"<>|]/g, " ") + ".html";
        a.click();
      });
      head.insertBefore(exp, close);
    }
    ta.focus();
  }

  function beep() {
    try {
      const ac = new win.AudioContext();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 0.65);
    } catch {}
  }

  let rt = 0;
  win.addEventListener("resize", () => {
    win.clearTimeout(rt);
    rt = win.setTimeout(() => {
      for (const c of cards.values()) place(c.el, c.it);
    }, 120);
  });
  load();
}
