/* Hand Design — «островок» сверху по центру страницы (как Dynamic Island):
   • плашка звонка — звонок идёт в другой вкладке: таймер, микрофон, камера;
   • Now Bar — музыка или видео в другой вкладке: обложка, пауза, следующий трек.
   Работает в обычных вкладках (контент-скрипт) и на новой вкладке Hand Design. */
(() => {
  if (window.__hdIsland || window.top !== window) return;
  window.__hdIsland = true;
  const RU = /^(ru|uk|be|kk)/i.test(navigator.language || "");
  const T = (r, e) => (RU ? r : e);
  const isExt = location.protocol === "chrome-extension:";

  let myTab = null;
  let live = { media: null, call: null };
  let cfg = { showNowBar: true, showCallBar: true, square: false, lang: "" };
  let pos = null; // { x: доля ширины, y: px }
  let alive = true;

  /* ---------- оформление (тень DOM — стили сайта не мешают) ---------- */
  const host = document.createElement("hd-island");
  host.style.cssText = "all: initial; position: fixed; inset: 0 0 auto 0; height: 0; z-index: 2147483646; pointer-events: none;";
  const shadow = host.attachShadow({ mode: "closed" });
  const styleEl = document.createElement("style");
  styleEl.textContent = `
:host { all: initial; }
* { box-sizing: border-box; }
.isl {
  --w: 230px; position: fixed; top: 10px; left: 50%; translate: -50% 0; pointer-events: auto;
  display: flex; align-items: center; gap: 10px; min-height: 38px; max-width: min(560px, 94vw);
  padding: 5px 7px 5px 6px; border-radius: 999px; color: #fff;
  font: 500 13px/1.25 "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
  background: rgb(8 8 10 / .93); border: 1px solid rgb(255 255 255 / .1);
  box-shadow: 0 10px 34px rgb(0 0 0 / .35), inset 0 1px 0 rgb(255 255 255 / .08);
  transition: padding .45s cubic-bezier(.2,.9,.25,1.15), gap .45s cubic-bezier(.2,.9,.25,1.15), border-radius .45s;
  animation: in .55s cubic-bezier(.2,.9,.25,1.2) both; user-select: none; cursor: default;
}
.isl.square, .isl.square * { border-radius: 0 !important; }
.isl[hidden] { display: none; }
.isl.out { animation: out .22s ease-in both; }
@keyframes in { from { opacity: 0; scale: .6; translate: -50% -14px; } }
@keyframes out { to { opacity: 0; scale: .7; translate: -50% -10px; } }
.isl:hover { padding: 8px 10px 8px 8px; gap: 12px; border-radius: 26px; }
.art { width: 26px; height: 26px; border-radius: 8px; flex: none; background: #2a2b30 center / cover no-repeat; transition: width .45s cubic-bezier(.2,.9,.25,1.15), height .45s cubic-bezier(.2,.9,.25,1.15), border-radius .45s; display: grid; place-items: center; overflow: hidden; }
.art svg { width: 15px; height: 15px; fill: rgb(255 255 255 / .75); }
.isl:hover .art { width: 46px; height: 46px; border-radius: 12px; }
.txt { display: flex; flex-direction: column; min-width: 0; max-width: 220px; cursor: pointer; transition: max-width .45s cubic-bezier(.2,.9,.25,1.15); }
.isl:hover .txt { max-width: 280px; }
.t1 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.t2 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: rgb(255 255 255 / .6); font-size: 12px; max-height: 0; max-width: 0; opacity: 0; transition: max-height .4s, opacity .3s; }
.isl:hover .t2 { max-height: 18px; max-width: 280px; opacity: 1; }
.media:not(:hover) .btns { display: none; }
.btns { display: flex; gap: 4px; align-items: center; }
.b { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: rgb(255 255 255 / .1);
  border: 0; cursor: pointer; padding: 0; transition: scale .3s cubic-bezier(.2,.9,.25,1.2), background-color .2s; }
.b:hover { background: rgb(255 255 255 / .2); scale: 1.08; }
.b:active { scale: .88; }
.b svg { width: 16px; height: 16px; fill: currentColor; }
.b.big { width: 34px; height: 34px; background: #fff; color: #000; }
.b.big svg { width: 18px; height: 18px; }
.b.off { background: #ff3b30; }
.b.off:hover { background: #ff5146; }
.b.none { opacity: .45; }
.media .side { display: none; }
.media:hover .side { display: grid; }
.eq { display: flex; align-items: flex-end; gap: 2px; height: 14px; width: 16px; margin: 0 4px 0 0; flex: none; }
.eq i { flex: 1; background: var(--acc, #30d158); border-radius: 2px; height: 100%; transform-origin: 50% 100%; transform: scaleY(.3); animation: eq 1s ease-in-out infinite; will-change: transform; }
.eq i:nth-child(2) { animation-delay: -.35s; } .eq i:nth-child(3) { animation-delay: -.7s; }
.eq.paused i { animation: none; transform: scaleY(.25); opacity: .5; }
@keyframes eq { 0%, 100% { transform: scaleY(.25); } 50% { transform: scaleY(1); } }
.media:hover .eq { display: none; }
.dot { position: relative; width: 12px; height: 12px; border-radius: 50%; background: #30d158; box-shadow: 0 0 0 4px rgb(48 209 88 / .22); flex: none; margin-left: 6px; cursor: grab; }
.dot::after { content: ""; position: absolute; inset: -7px; border-radius: 50%; border: 3px solid rgb(48 209 88 / .22); animation: beat 2s ease-in-out infinite; will-change: transform, opacity; }
@keyframes beat { 0%, 100% { transform: scale(.75); opacity: .2; } 50% { transform: scale(1); opacity: 1; } }
.timer { font-variant-numeric: tabular-nums; font-weight: 700; color: #30d158; cursor: grab; }
.call .txt { max-width: 160px; }
.drag { cursor: grabbing !important; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;
  const isl = document.createElement("div");
  isl.className = "isl";
  isl.hidden = true;
  shadow.append(styleEl, isl);

  /* значки — только контуры (без innerHTML: на сайтах с Trusted Types, например Meet, он запрещён) */
  const ICON = {
    play: ["M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"],
    pause: ["M7.8 5h1.4c.7 0 1.3.6 1.3 1.3v11.4c0 .7-.6 1.3-1.3 1.3H7.8c-.7 0-1.3-.6-1.3-1.3V6.3C6.5 5.6 7.1 5 7.8 5Zm7 0h1.4c.7 0 1.3.6 1.3 1.3v11.4c0 .7-.6 1.3-1.3 1.3h-1.4c-.7 0-1.3-.6-1.3-1.3V6.3c0-.7.6-1.3 1.3-1.3Z"],
    next: ["M5 6.3v11.4a.8.8 0 0 0 1.2.7l8.6-5.7a.8.8 0 0 0 0-1.4L6.2 5.6A.8.8 0 0 0 5 6.3Z", "M17.5 5.5h.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-.5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"],
    prev: ["M19 6.3v11.4a.8.8 0 0 1-1.2.7L9.2 12.7a.8.8 0 0 1 0-1.4l8.6-5.7a.8.8 0 0 1 1.2.7Z", "M6 5.5h.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"],
    go: ["M9 5h10v10h-2V8.4l-9.3 9.3-1.4-1.4L15.6 7H9V5Z"],
    note: ["M10 4v10.6A3.5 3.5 0 1 0 12 17.7V9h6V4h-8Z"],
    mic: ["M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z", "M6 11a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0H6Zm5 7h2v3h-2z"],
    micOff: ["M15 10.6V6a3 3 0 0 0-5.8-1.1L15 10.6ZM4.3 3 3 4.3l6 6V11a3 3 0 0 0 4.4 2.6l1.5 1.5A4 4 0 0 1 8 11H6a6 6 0 0 0 5 5.9V21h2v-3.1a6 6 0 0 0 3.3-1.4l3.4 3.4 1.3-1.3L4.3 3ZM18 11h-2c0 .5-.1 1-.3 1.4l1.5 1.5c.5-.9.8-1.9.8-2.9Z"],
    cam: ["M6 6h7a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z", "m17 10 4-2.5v9L17 14v-4Z"],
    camOff: ["M4.3 3 3 4.3 4.9 6.2A3 3 0 0 0 3 9v6a3 3 0 0 0 3 3h9.7l4 4 1.3-1.3L4.3 3ZM17 10l4-2.5v9l-4-2.5V10Zm-1 2.2L9.8 6H13a3 3 0 0 1 3 3v3.2Z"],
  };
  const SVG = "http://www.w3.org/2000/svg";
  function icon(name) {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    for (const d of ICON[name]) {
      const p = document.createElementNS(SVG, "path");
      p.setAttribute("d", d);
      svg.append(p);
    }
    return svg;
  }
  // h("div", { class: "a", title: "…" }, детиили текст)
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v === null || v === undefined) continue;
      if (k === "style") e.style.cssText = v;
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k);
    return e;
  }
  const btn = (act, title, ico, cls = "") => h("button", { class: ("b " + cls).trim(), "data-act": act, title }, icon(ico));

  const send = msg => {
    try {
      return chrome.runtime.sendMessage(msg).catch(() => {});
    } catch {
      alive = false;
      host.remove();
    }
  };

  /* ---------- что показывать ---------- */
  let mode = "";
  let key = "";
  function render() {
    if (!alive) return;
    const call = cfg.showCallBar && live.call && live.call.tabId !== myTab ? live.call : null;
    const media = !call && cfg.showNowBar && live.media && live.media.tabId !== myTab ? live.media : null;
    const fs = !!document.fullscreenElement;
    if ((!call && !media) || fs) {
      if (!isl.hidden && !isl.classList.contains("out")) {
        isl.classList.add("out");
        setTimeout(() => {
          if (isl.classList.contains("out")) {
            isl.hidden = true;
            isl.classList.remove("out");
          }
        }, 220);
      }
      mode = "";
      key = "";
      return;
    }
    isl.classList.remove("out");
    isl.classList.toggle("square", !!cfg.square);
    const was = isl.hidden;
    isl.hidden = false;
    if (call) renderCall(call);
    else renderMedia(media);
    if (was) place();
  }

  function renderMedia(m) {
    const k = "m" + JSON.stringify([m.tabId, m.title, m.artist, m.artwork, m.playing, m.hasNext, m.hasPrev, m.site]);
    if (k === key) return;
    key = k;
    mode = "media";
    isl.className = "isl media" + (cfg.square ? " square" : "");
    const art = h("div", { class: "art" });
    if (m.artwork) art.style.backgroundImage = `url("${m.artwork.replace(/["\\]/g, "")}")`;
    else art.append(icon("note"));
    const sub = [m.artist, m.site].filter(Boolean).join(" · ");
    isl.replaceChildren(
      art,
      h("div", { class: "txt", "data-act": "go", title: T("Перейти во вкладку", "Go to tab") },
        h("div", { class: "t1" }, m.title || m.site || T("Музыка", "Media")), h("div", { class: "t2" }, sub)),
      h("div", { class: "eq" + (m.playing ? "" : " paused") }, h("i"), h("i"), h("i")),
      h("div", { class: "btns" },
        m.hasPrev ? btn("prev", T("Назад", "Previous"), "prev", "side") : null,
        btn("toggle", m.playing ? T("Пауза", "Pause") : T("Играть", "Play"), m.playing ? "pause" : "play", "big side"),
        m.hasNext ? btn("next", T("Дальше", "Next"), "next", "side") : null,
        btn("go", T("Перейти во вкладку", "Go to tab"), "go", "side"))
    );
  }

  let timerEl = null;
  function renderCall(c) {
    const k = "c" + JSON.stringify([c.tabId, c.mic, c.cam, c.site, c.start]);
    if (k === key) return;
    key = k;
    mode = "call";
    isl.className = "isl call" + (cfg.square ? " square" : "");
    const micBtn = c.mic === "none"
      ? btn("mic-on", T("Микрофон не используется", "Microphone not in use"), "micOff", "none")
      : btn(c.mic === "on" ? "mic-off" : "mic-on", c.mic === "on" ? T("Выключить микрофон (Alt+Shift+M)", "Mute (Alt+Shift+M)") : T("Включить микрофон (Alt+Shift+M)", "Unmute (Alt+Shift+M)"), c.mic === "on" ? "mic" : "micOff", c.mic === "off" ? "off" : "");
    const camBtn = c.cam === "none"
      ? btn("cam-on", T("Включить камеру", "Turn camera on"), "camOff", "none")
      : btn(c.cam === "on" ? "cam-off" : "cam-on", c.cam === "on" ? T("Выключить камеру", "Turn camera off") : T("Включить камеру", "Turn camera on"), c.cam === "on" ? "cam" : "camOff", c.cam === "off" ? "off" : "");
    isl.replaceChildren(
      h("div", { class: "dot", title: T("Перетащите, чтобы переместить. Двойной щелчок — на место", "Drag to move. Double-click to reset") }),
      h("div", { class: "timer" }, "0:00"),
      h("div", { class: "txt", "data-act": "go", title: T("Перейти к звонку", "Go to call") },
        h("div", { class: "t1" }, c.site || T("Звонок", "Call")), h("div", { class: "t2" }, c.title || "")),
      h("div", { class: "btns" }, micBtn, camBtn)
    );
    timerEl = isl.querySelector(".timer");
    tickTimer();
  }
  function tickTimer() {
    if (mode !== "call" || !timerEl || !live.call) return;
    const s = Math.max(0, Math.floor((Date.now() - live.call.start) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, "0");
    timerEl.textContent = h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
  }
  setInterval(tickTimer, 1000);

  /* ---------- нажатия ---------- */
  isl.addEventListener("click", e => {
    if (moved) return;
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    const target = mode === "call" ? live.call : live.media;
    if (!target) return;
    if (act === "go") send({ type: "hd:focus-tab", tabId: target.tabId });
    else if (mode === "media") send({ type: "hd:media-cmd", tabId: target.tabId, action: act });
    else {
      const [kind, want] = act.split("-");
      send({ type: "hd:call-cmd", tabId: target.tabId, kind, want });
    }
  });

  /* ---------- перетаскивание (место запоминается) ---------- */
  let moved = false;
  isl.addEventListener("pointerdown", e => {
    if (e.button !== 0 || e.target.closest("button")) return;
    const r = isl.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - r.top;
    const sx = e.clientX;
    const sy = e.clientY;
    moved = false;
    const move = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      if (!moved) {
        moved = true;
        isl.setPointerCapture(e.pointerId);
        isl.classList.add("drag");
      }
      pos = { x: Math.min(.98, Math.max(.02, (ev.clientX - dx) / innerWidth)), y: Math.min(innerHeight - 50, Math.max(4, ev.clientY - dy)) };
      place();
    };
    const up = () => {
      isl.removeEventListener("pointermove", move);
      isl.classList.remove("drag");
      if (moved) chrome.storage.local.set({ hdIslandPos: pos }).catch(() => {});
      setTimeout(() => (moved = false), 0);
    };
    isl.addEventListener("pointermove", move);
    isl.addEventListener("pointerup", up, { once: true });
    isl.addEventListener("pointercancel", up, { once: true });
  });
  isl.addEventListener("dblclick", e => {
    if (e.target.closest("button")) return;
    pos = null;
    chrome.storage.local.remove("hdIslandPos").catch(() => {});
    place();
  });
  function place() {
    isl.style.left = pos ? pos.x * 100 + "%" : "50%";
    isl.style.top = pos ? pos.y + "px" : "10px";
  }

  /* ---------- данные ---------- */
  function readCfg(raw) {
    raw = raw || {};
    cfg = { showNowBar: raw.showNowBar !== false, showCallBar: raw.showCallBar !== false, square: !!raw.square, lang: raw.lang || "" };
  }
  async function start() {
    try {
      if (isExt && chrome.tabs?.getCurrent) myTab = (await chrome.tabs.getCurrent())?.id ?? null;
      else myTab = (await chrome.runtime.sendMessage({ type: "hd:whoami" }))?.tabId ?? null;
    } catch {}
    try {
      const [l, s] = await Promise.all([chrome.storage.session.get("hdLive"), chrome.storage.local.get(["hd", "hdIslandPos"])]);
      live = l.hdLive || live;
      readCfg(s.hd);
      pos = s.hdIslandPos || null;
    } catch {
      // нет доступа к storage.session (фоновый скрипт ещё не проснулся) — дождёмся изменений
    }
    (document.body || document.documentElement).append(host);
    render();
  }
  try {
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === "session" && ch.hdLive) {
        live = ch.hdLive.newValue || { media: null, call: null };
        render();
      }
      if (area === "local" && ch.hd) {
        readCfg(ch.hd.newValue);
        key = "";
        render();
      }
    });
  } catch {}
  document.addEventListener("fullscreenchange", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
