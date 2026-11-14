/* Просмотрщик PDF Hand Design (pdf.js от Mozilla): темы, тон страниц, рисование, надписи, маркер,
   поиск, сохранение с рисунками, место чтения запоминается. */
import * as pdfjsLib from "./lib/pdf.min.mjs";
import { load, patch, onChange } from "../shared/settings.js";
import { applyTheme } from "../shared/apply.js";
import { T, setLang } from "../shared/i18n.js";

globalThis.pdfjsLib = pdfjsLib;
const { PDFViewer, EventBus, PDFLinkService, PDFFindController, LinkTarget } = await import("./lib/pdf_viewer.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("lib/pdf.worker.min.mjs", import.meta.url).href;
const { AnnotationEditorType: ED, AnnotationEditorParamsType: EP } = pdfjsLib;

const $ = s => document.querySelector(s);
const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const fileUrl = params.get("file") || "";
let S = await load();
setLang(S.lang || "");

/* ---------- вид ---------- */
function paint() {
  const mode = S.pdfUi === "light" || S.pdfUi === "dark" ? S.pdfUi : S.mode;
  applyTheme(root, { ...S, mode });
  if (S.pdfUi === "light" || S.pdfUi === "dark") root.style.setProperty("color-scheme", S.pdfUi);
  root.setAttribute("pdf-page", S.pdfPage === "auto" ? "paper" : S.pdfPage);
  for (const b of $("#ui-seg").children) b.toggleAttribute("on", b.dataset.v === S.pdfUi);
  for (const b of $("#page-seg").children) b.toggleAttribute("on", b.dataset.v === S.pdfPage);
}
function seg(box, key, opts) {
  for (const [v, ru, en] of opts) {
    const b = mk("button", "", T(ru, en));
    b.dataset.v = v;
    b.addEventListener("click", () => patch({ [key]: v === "auto" ? null : v }));
    box.append(b);
  }
}
seg($("#ui-seg"), "pdfUi", [["auto", "Как тема", "Theme"], ["light", "Светлый", "Light"], ["dark", "Тёмный", "Dark"]]);
seg($("#page-seg"), "pdfPage", [["auto", "Обычные", "Normal"], ["sepia", "Сепия", "Sepia"], ["night", "Ночь", "Night"]]);
paint();
onChange(s => {
  S = s;
  paint();
});

// подписи
const TIPS = {
  prev: T("Предыдущая страница", "Previous page"), next: T("Следующая страница", "Next page"),
  "zoom-out": T("Уменьшить (Ctrl −)", "Zoom out (Ctrl −)"), zoom: T("По ширине страницы", "Fit width"), "zoom-in": T("Увеличить (Ctrl +)", "Zoom in (Ctrl +)"),
  "t-hand": T("Выделение и прокрутка (Esc)", "Select and scroll (Esc)"), "t-ink": T("Рисовать (D)", "Draw (D)"), "t-text": T("Надпись (T)", "Text (T)"),
  "t-high": T("Выделить маркером (H)", "Highlight (H)"), color: T("Цвет и толщина", "Color and size"),
  "find-btn": T("Найти (Ctrl+F)", "Find (Ctrl+F)"), look: T("Вид: светлый / тёмный, тон страниц", "Look: light / dark, page tone"),
  save: T("Сохранить с рисунками (Ctrl+S)", "Save with drawings (Ctrl+S)"), print: T("Печать — откроется в просмотрщике Chrome", "Print — opens in Chrome's viewer"),
};
for (const [id, tip] of Object.entries(TIPS)) $("#" + id)?.setAttribute("data-tip", tip);
$("#cap-ui").textContent = T("Интерфейс", "Interface");
$("#cap-page").textContent = T("Страницы", "Pages");
$("#find-q").placeholder = T("Найти в документе", "Find in document");
$("#err-title").textContent = T("Не получилось открыть PDF", "Could not open the PDF");
$("#err-native").textContent = T("Открыть во встроенном просмотрщике", "Open in the built-in viewer");
$("#drop").textContent = T("Отпустите — откроется этот PDF", "Drop to open this PDF");

function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2200);
}

/* ---------- pdf.js ---------- */
const container = $("#viewerContainer");
const eventBus = new EventBus();
const linkService = new PDFLinkService({ eventBus, externalLinkTarget: LinkTarget.BLANK });
const findController = new PDFFindController({ eventBus, linkService });
const viewer = new PDFViewer({
  container, viewer: $("#viewer"), eventBus, linkService, findController,
  removePageBorders: true, annotationEditorMode: ED.NONE, imageResourcesPath: "lib/images/",
  annotationEditorHighlightColors: "yellow=#FFFF98,green=#53FFBC,blue=#80EBFF,pink=#FFCBE6,red=#FF4F5F",
});
linkService.setViewer(viewer);
let doc = null;
let fileName = "document.pdf";
const resumeKey = "hd-pdf:" + fileUrl;

eventBus.on("pagesinit", () => {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(resumeKey) || "null");
  } catch {}
  viewer.currentScaleValue = saved?.scale || "page-width";
  if (saved?.page > 1 && saved.page <= viewer.pagesCount) viewer.currentPageNumber = saved.page;
  if (params.get("page")) viewer.currentPageNumber = Number(params.get("page")) || 1;
});
let resumeTimer = 0;
function remember() {
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    try {
      const sv = viewer.currentScaleValue;
      localStorage.setItem(resumeKey, JSON.stringify({ page: viewer.currentPageNumber, scale: isNaN(sv) ? sv : Number(sv) }));
    } catch {}
  }, 400);
}
eventBus.on("pagechanging", e => {
  $("#page").value = e.pageNumber;
  $("#prev").disabled = e.pageNumber <= 1;
  $("#next").disabled = e.pageNumber >= viewer.pagesCount;
  remember();
});
eventBus.on("scalechanging", e => {
  $("#zoom").textContent = Math.round(e.scale * 100) + "%";
  remember();
});
eventBus.on("annotationeditormodechanged", e => setToolUi(e.mode));

function readFile(url) {
  // XHR, а не fetch: так открываются и файлы с компьютера (file://)
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("GET", url);
    x.responseType = "arraybuffer";
    x.withCredentials = true;
    x.onprogress = e => e.lengthComputable && progress(e.loaded / e.total);
    x.onload = () => (x.status === 200 || (x.status === 0 && x.response?.byteLength) ? resolve(x.response) : reject(new Error("HTTP " + x.status)));
    x.onerror = () => reject(new Error(url.startsWith("file:") ? T("нет доступа к файлам — включите «Разрешить доступ к URL файлов» в карточке расширения", "no file access — enable “Allow access to file URLs” on the extension card") : T("сеть недоступна", "network error")));
    x.send();
  });
}
function progress(v) {
  $("#progress i").style.width = Math.round(Math.max(0.05, v) * 100) + "%";
  $("#progress").toggleAttribute("done", v >= 1);
}

async function open(data, name) {
  progress(0.1);
  try {
    if (doc) await doc.destroy();
    const task = pdfjsLib.getDocument({
      data, cMapUrl: "lib/cmaps/", cMapPacked: true, standardFontDataUrl: "lib/standard_fonts/", wasmUrl: "lib/wasm/", iccUrl: "lib/iccs/",
      isEvalSupported: false, enableXfa: true,
    });
    task.onProgress = p => p.total && progress(0.5 + (p.loaded / p.total) / 2);
    task.onPassword = (cb, reason) => {
      const pw = prompt(reason === 2 ? T("Неверный пароль. Ещё раз:", "Wrong password. Try again:") : T("Этот PDF защищён паролем:", "This PDF is password-protected:"));
      if (pw === null) task.destroy();
      else cb(pw);
    };
    doc = await task.promise;
    viewer.setDocument(doc);
    linkService.setDocument(doc, null);
    $("#pages").textContent = "/ " + doc.numPages;
    fileName = name;
    let title = "";
    try {
      const md = await doc.getMetadata();
      title = (md.info && md.info.Title) || "";
    } catch {}
    document.title = (title || name) + " — PDF";
    $("#doc-title").textContent = title || name;
    $("#doc-title").title = name;
    $("#error").hidden = true;
    progress(1);
  } catch (e) {
    showError(e);
  }
}
function showError(e) {
  progress(1);
  $("#error").hidden = false;
  $("#err-text").textContent = String(e && e.message ? e.message : e);
  $("#err-native").hidden = !fileUrl || fileUrl.startsWith("file:");
}
$("#err-native").addEventListener("click", () => {
  location.href = fileUrl + (fileUrl.includes("#") ? "" : "#hd-native");
});

function nameOf(url) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
    return /\.pdf$/i.test(last) ? last : (last || u.hostname) + ".pdf";
  } catch {
    return "document.pdf";
  }
}

/* ---------- страницы и масштаб ---------- */
$("#prev").addEventListener("click", () => viewer.previousPage());
$("#next").addEventListener("click", () => viewer.nextPage());
$("#page").addEventListener("change", e => {
  const n = Math.min(viewer.pagesCount, Math.max(1, Number(e.target.value) || 1));
  viewer.currentPageNumber = n;
});
$("#page").addEventListener("focus", e => e.target.select());
$("#zoom-in").addEventListener("click", () => viewer.increaseScale());
$("#zoom-out").addEventListener("click", () => viewer.decreaseScale());
$("#zoom").addEventListener("click", () => (viewer.currentScaleValue = viewer.currentScaleValue === "page-width" ? "page-fit" : "page-width"));

/* ---------- рисование, надпись, маркер ---------- */
const PENS = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00C7BE", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55", "#A2845E", "#8E8E93", "#000000", "#FFFFFF", "#FFFF98", "#53FFBC", "#80EBFF"];
const TOOL = {
  15: { color: EP.INK_COLOR, size: EP.INK_THICKNESS, min: 1, max: 20, def: ["#FF3B30", 3], label: T("Толщина", "Thickness") },
  3: { color: EP.FREETEXT_COLOR, size: EP.FREETEXT_SIZE, min: 8, max: 72, def: ["#FF3B30", 16], label: T("Размер", "Size") },
  9: { color: EP.HIGHLIGHT_COLOR, size: EP.HIGHLIGHT_THICKNESS, min: 8, max: 24, def: ["#FFFF98", 12], label: T("Толщина", "Thickness") },
};
let tool = 0;
function toolState(m) {
  try {
    const s = JSON.parse(localStorage.getItem("hd-pdf-tool-" + m) || "null");
    if (s && s.c && s.s) return s;
  } catch {}
  return { c: TOOL[m].def[0], s: TOOL[m].def[1] };
}
function sendParams(m) {
  const st = toolState(m);
  eventBus.dispatch("switchannotationeditorparams", { source: window, type: TOOL[m].color, value: st.c });
  eventBus.dispatch("switchannotationeditorparams", { source: window, type: TOOL[m].size, value: st.s });
  root.style.setProperty("--pen", st.c);
}
function setTool(m) {
  if (!doc) return;
  if (m === tool && m !== 0) m = 0;
  viewer.annotationEditorMode = { mode: m === 0 ? ED.NONE : m };
  tool = m;
  setToolUi(m);
  if (m) setTimeout(() => sendParams(m), 0);
}
function setToolUi(m) {
  tool = m || 0;
  for (const b of document.querySelectorAll(".tools .tb[data-mode]")) b.toggleAttribute("on", Number(b.dataset.mode) === tool);
  if (tool) root.setAttribute("pdf-tool", tool);
  else {
    root.removeAttribute("pdf-tool");
    $("#params").hidden = true;
  }
}
for (const b of document.querySelectorAll(".tools .tb[data-mode]")) b.addEventListener("click", () => setTool(Number(b.dataset.mode)));
function fillParams() {
  const st = toolState(tool);
  const dots = $("#dots");
  dots.replaceChildren();
  for (const c of PENS) {
    const d = mk("button");
    d.style.setProperty("--c", c);
    d.toggleAttribute("on", c.toUpperCase() === st.c.toUpperCase());
    d.addEventListener("click", () => {
      saveTool({ ...toolState(tool), c });
      fillParams();
    });
    dots.append(d);
  }
  const t = TOOL[tool];
  $("#size-label").textContent = t.label;
  Object.assign($("#size"), { min: t.min, max: t.max, value: st.s });
  $("#size-out").textContent = st.s;
}
function saveTool(st) {
  try {
    localStorage.setItem("hd-pdf-tool-" + tool, JSON.stringify(st));
  } catch {}
  sendParams(tool);
}
$("#size").addEventListener("input", e => {
  $("#size-out").textContent = e.target.value;
  saveTool({ ...toolState(tool), s: Number(e.target.value) });
});
$("#color").addEventListener("click", e => {
  e.stopPropagation();
  togglePop("#params", $("#color"), fillParams);
});

/* ---------- всплывашки ---------- */
function togglePop(sel, anchor, fill) {
  const p = $(sel);
  const show = p.hidden;
  for (const x of document.querySelectorAll(".pop")) x.hidden = true;
  if (!show) return;
  fill?.();
  p.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = p.offsetWidth;
  p.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left + r.width / 2 - w / 2)) + "px";
}
document.addEventListener("pointerdown", e => {
  if (!e.target.closest(".pop, .bar")) for (const x of document.querySelectorAll(".pop")) x.hidden = true;
});
$("#look").addEventListener("click", () => togglePop("#look-pop", $("#look")));

/* ---------- поиск ---------- */
function find(again, prev = false) {
  const query = $("#find-q").value;
  eventBus.dispatch("find", { source: window, type: again ? "again" : "", query, caseSensitive: false, entireWord: false, highlightAll: true, findPrevious: prev, matchDiacritics: false });
}
$("#find-btn").addEventListener("click", () => {
  togglePop("#find", $("#find-btn"));
  if (!$("#find").hidden) $("#find-q").focus();
});
$("#find-q").addEventListener("input", () => find(false));
$("#find-q").addEventListener("keydown", e => {
  if (e.key === "Enter") find(true, e.shiftKey);
  if (e.key === "Escape") $("#find").hidden = true;
});
$("#find-next").addEventListener("click", () => find(true));
$("#find-prev").addEventListener("click", () => find(true, true));
const showCount = e => {
  const m = e.matchesCount || {};
  $("#find-res").textContent = !$("#find-q").value ? "" : m.total ? `${m.current} / ${m.total}` : T("нет", "none");
};
eventBus.on("updatefindmatchescount", showCount);
eventBus.on("updatefindcontrolstate", showCount);

/* ---------- сохранить, печать ---------- */
async function bytes() {
  return doc.annotationStorage.size ? await doc.saveDocument() : await doc.getData();
}
$("#save").addEventListener("click", save);
async function save() {
  if (!doc) return;
  try {
    const blob = new Blob([await bytes()], { type: "application/pdf" });
    const a = mk("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    edited = false;
    toast(T("Сохранено: ", "Saved: ") + fileName);
  } catch (e) {
    toast(T("Не получилось сохранить: ", "Could not save: ") + e.message);
  }
}
$("#print").addEventListener("click", async () => {
  if (!doc) return;
  const blob = new Blob([await bytes()], { type: "application/pdf" });
  chrome.tabs.create({ url: URL.createObjectURL(blob) });
  toast(T("Открыто в просмотрщике Chrome — там Ctrl+P", "Opened in Chrome's viewer — press Ctrl+P there"));
});
let edited = false;
eventBus.on("annotationeditorstateschanged", () => (edited = !!doc?.annotationStorage.size));
window.addEventListener("beforeunload", e => {
  if (edited) e.preventDefault();
});

/* ---------- клавиши ---------- */
document.addEventListener("keydown", e => {
  const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
  if (e.ctrlKey && (e.key === "f" || e.key === "F" || e.code === "KeyF")) {
    e.preventDefault();
    $("#find-btn").click();
  } else if (e.ctrlKey && e.code === "KeyS") {
    e.preventDefault();
    save();
  } else if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
    e.preventDefault();
    viewer.increaseScale();
  } else if (e.ctrlKey && e.key === "-") {
    e.preventDefault();
    viewer.decreaseScale();
  } else if (e.ctrlKey && e.key === "0") {
    e.preventDefault();
    viewer.currentScaleValue = "page-width";
  } else if (!typing && !e.ctrlKey && !e.altKey) {
    if (e.code === "KeyD") setTool(15);
    else if (e.code === "KeyT") setTool(3);
    else if (e.code === "KeyH") setTool(9);
    else if (e.key === "Escape" && tool) setTool(0);
  }
});
container.addEventListener("wheel", e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  if (e.deltaY < 0) viewer.increaseScale();
  else viewer.decreaseScale();
}, { passive: false });

/* ---------- перетащить файл ---------- */
let dragDepth = 0;
document.addEventListener("dragenter", e => {
  if ([...e.dataTransfer.types].includes("Files")) {
    dragDepth++;
    $("#drop").hidden = false;
  }
});
document.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) $("#drop").hidden = true;
});
document.addEventListener("dragover", e => e.preventDefault());
document.addEventListener("drop", async e => {
  e.preventDefault();
  dragDepth = 0;
  $("#drop").hidden = true;
  const f = [...e.dataTransfer.files].find(x => /pdf$/i.test(x.type) || /\.pdf$/i.test(x.name));
  if (f) open(new Uint8Array(await f.arrayBuffer()), f.name);
});

/* ---------- старт ---------- */
if (fileUrl) {
  fileName = nameOf(fileUrl);
  document.title = fileName + " — PDF";
  readFile(fileUrl).then(buf => open(new Uint8Array(buf), fileName), showError);
} else {
  $("#doc-title").textContent = T("Перетащите PDF сюда", "Drop a PDF here");
  progress(1);
}
