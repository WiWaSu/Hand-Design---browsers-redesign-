/* Hand Design — страница «Заметки». Файлы читает и пишет браузер через window.hdNotes (FloorpPdfTweaksChild). */
import { createEditor, toolButton } from "./hd-notes-editor.mjs";
import { ensureIcons } from "./hd-icons.mjs";

ensureIcons();

await new Promise(resolve => {
  if (window.hdNotes) resolve();
  else window.addEventListener("hd-notes-ready", resolve, { once: true });
});

const t = (s, ...a) => window.hdNotes.t(s, ...a);
const caps = window.hdNotes.caps || {};
const api = (op, data = null) => new Promise(resolve => {
  window.hdNotes.call(op, JSON.stringify(data), json => resolve(JSON.parse(json)));
});

const svg = name => `<i class="hd-ic" style="--i: var(--fm-ic-${name})" aria-hidden="true"></i>`;
const ICON = { note: "note", folderAdd: "folderAdd", collapse: "collapse", side: "sidebar", folder: "folder", chev: "chevronRight", today: "calendar", find: "search", graph: "graph", close: "close", import: "import" };
const MENU_ICON = { open: "note", rename: "edit", pin: "pin", reveal: "folder", newNote: "note", newFolder: "folderAdd", delete: "delete" };

document.documentElement.setAttribute("data-hd-md", "");
document.title = t("Заметки");
document.body.innerHTML = `
  <div class="hd-notes" hidden>
    <aside class="hd-notes-side">
      <header class="hd-notes-head">
        <h1></h1>
        <button type="button" class="hd-notes-btn" data-act="find">${svg(ICON.find)}</button>
        <button type="button" class="hd-notes-btn" data-act="graph">${svg(ICON.graph)}</button>
        <button type="button" class="hd-notes-btn" data-act="today">${svg(ICON.today)}</button>
        <button type="button" class="hd-notes-btn" data-act="newNote">${svg(ICON.note)}</button>
        <button type="button" class="hd-notes-btn" data-act="newFolder">${svg(ICON.folderAdd)}</button>
        <button type="button" class="hd-notes-btn" data-act="collapse">${svg(ICON.collapse)}</button>
        <button type="button" class="hd-notes-btn" data-act="side">${svg(ICON.side)}</button>
      </header>
      <input type="search" class="hd-notes-search">
      <div class="hd-notes-tree" tabindex="-1"></div>
      <footer class="hd-notes-foot">
        <button type="button" class="hd-notes-folder">${svg(ICON.folder)}<span></span></button>
        <button type="button" class="hd-notes-import" hidden>${svg(ICON.import)}</button>
        <button type="button" class="hd-notes-change"></button>
      </footer>
    </aside>
    <section class="hd-notes-main"></section>
    <button type="button" class="hd-notes-btn hd-notes-show">${svg(ICON.side)}</button>
  </div>
  <div class="hd-notes-setup" hidden>
    <div class="hd-notes-card">
      <span class="hd-md-icon">MD</span>
      <h1></h1>
      <p></p>
      <button type="button" class="hd-notes-default"><b></b><small></small></button>
      <button type="button" class="hd-notes-pick"></button>
    </div>
  </div>`;

const $ = sel => document.querySelector(sel);
const app = $(".hd-notes");
const setup = $(".hd-notes-setup");
const tree = $(".hd-notes-tree");
const main = $(".hd-notes-main");
const search = $(".hd-notes-search");

$(".hd-notes-head h1").textContent = t("Заметки");
const headTitles = { find: t("Быстрый переход") + " (Ctrl+O)", graph: t("Граф связей"), today: t("Заметка на сегодня"), newNote: t("Новая заметка"), newFolder: t("Новая папка"), collapse: t("Свернуть все папки"), side: t("Скрыть список") };
for (const b of document.querySelectorAll(".hd-notes-head [data-act]")) {
  b.title = headTitles[b.dataset.act];
  b.setAttribute("aria-label", headTitles[b.dataset.act]);
}
$(".hd-notes-show").title = t("Показать список");
search.placeholder = t("Поиск по заметкам");
$(".hd-notes-change").textContent = t("Сменить папку");
$(".hd-notes-import").title = t("Импорт заметок");
$(".hd-notes-import").hidden = caps.import !== true;
$(".hd-notes-setup h1").textContent = t("Где хранить заметки?");
$(".hd-notes-setup p").textContent = t("Каждая заметка — обычный файл .md в этой папке. Их можно открыть в Obsidian или любом другом редакторе.");
$(".hd-notes-default b").textContent = t("Папка по умолчанию");
$(".hd-notes-pick").textContent = t("Выбрать другую папку…");

const store = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch {}
  return null;
};
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const fmtDate = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const when = ms => {
  const d = new Date(ms);
  return d.toDateString() === new Date().toDateString() ? fmtTime.format(d) : fmtDate.format(d);
};
const words = s => (s.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
const baseName = rel => rel.split("/").pop().replace(/\.(md|markdown|mdown|mkd|mkdn)$/i, "");
const parentOf = rel => (rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "");
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/* ------------------------------ настройки из Studio ------------------------------ */

let cfg = {};
const WIDTH = { narrow: "640px", normal: "780px", wide: "1000px", full: "none" };
const FONT = { ui: "var(--md-ui)", serif: "Georgia, \"Times New Roman\", serif", mono: "var(--md-mono)" };
const num = (v, min, max, def) => (typeof v === "number" && v >= min && v <= max ? v : def);
const editorSettings = () => ({ live: cfg.notesLive, marks: cfg.notesMarks === true, spell: cfg.notesSpell, selBar: cfg.notesSelBar, slash: cfg.notesSlash, menu: cfg.notesMenu });
async function applySettings() {
  cfg = (await api("settings")) || {};
  const s = app.style;
  const custom = typeof cfg.notesFontCustom === "string" && /^[\p{L}\p{N} ._-]{1,60}$/u.test(cfg.notesFontCustom.trim()) ? `"${cfg.notesFontCustom.trim()}", var(--md-ui)` : "";
  s.setProperty("--nt-font", cfg.notesFont === "custom" && custom ? custom : FONT[cfg.notesFont] || FONT.ui);
  const head = { text: "var(--nt-font)", serif: FONT.serif, mono: FONT.mono }[cfg.notesHeadFont];
  head ? s.setProperty("--nt-head-font", head) : s.removeProperty("--nt-head-font");
  s.setProperty("--nt-hs", String(num(cfg.notesHeadScale, 80, 140, 100) / 100));
  s.setProperty("--nt-title", num(cfg.notesTitleSize, 20, 56, 34) + "px");
  s.setProperty("--nt-r", num(cfg.notesRadius, 0, 24, 12) + "px");
  const color = v => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : "");
  for (const [key, prop, attr] of [["notesAccent", "--nt-accent", ""], ["notesText", "--nt-text", "data-text"], ["notesHead", "--nt-head", ""], ["notesBgColor", "--nt-bg", "data-bg-color"], ["notesSideColor", "--nt-side-bg", "data-side-bg"]]) {
    const c = color(cfg[key]);
    c ? s.setProperty(prop, c) : s.removeProperty(prop);
    if (attr) app.toggleAttribute(attr, !!c);
  }
  app.dataset.check = cfg.notesCheck === "square" ? "square" : "round";
  app.dataset.bullet = ["dash", "square"].includes(cfg.notesBullet) ? cfg.notesBullet : "dot";
  app.dataset.tags = cfg.notesTags === "plain" ? "plain" : "pill";
  app.dataset.callout = cfg.notesCallout === "line" ? "line" : "fill";
  app.dataset.table = ["zebra", "minimal"].includes(cfg.notesTable) ? cfg.notesTable : "lines";
  s.setProperty("--nt-size", num(cfg.notesSize, 13, 24, 16.5) + "px");
  s.setProperty("--nt-line", String(num(cfg.notesLine, 1.2, 2.2, 1.7)));
  s.setProperty("--nt-width", WIDTH[cfg.notesWidth] || WIDTH.normal);
  s.setProperty("--nt-side", num(cfg.notesSide, 200, 460, 300) + "px");
  app.toggleAttribute("data-compact", cfg.notesCompact === true);
  app.toggleAttribute("data-nopreview", cfg.notesPreview === false);
  app.toggleAttribute("data-notitle", cfg.notesTitle === false);
  app.toggleAttribute("data-nowords", cfg.notesWords === false);
  app.toggleAttribute("data-toolbar", cfg.notesToolbar === true);
  app.dataset.bg = cfg.notesBg === "paper" || cfg.notesBg === "dark" ? cfg.notesBg : "theme";
  note?.editor.configure(editorSettings());
}

/* ------------------------------ открытая заметка ------------------------------ */

let dir = "";
let notes = [];
let allNotes = [];
let folders = [];
let note = null;
let target = "";
const open = new Set(JSON.parse(store("hd-notes-open") || "[]"));
const saveOpen = () => store("hd-notes-open", JSON.stringify([...open]));
const TOOLBAR = [["h1", "h2", "h3"], ["bold", "italic", "strike", "highlight", "code", "link"], ["bullet", "ordered", "task", "quote"], ["table", "codeblock", "hr"]];

function openNote(rel, text, mtime) {
  main.innerHTML = `
    <div class="hd-note-notice" hidden><span></span><button type="button"></button><button type="button"></button></div>
    <div class="hd-note-tools"></div>
    <div class="hd-note-scroll">
      <div class="hd-note-inner">
        <input class="hd-note-title" spellcheck="false">
        <div class="hd-note-editor"></div>
        <section class="hd-note-mentions" hidden><h3></h3><ol></ol></section>
      </div>
    </div>
    <footer class="hd-note-status"><span class="hd-note-state"></span><span class="hd-note-words"></span></footer>`;
  const title = main.querySelector(".hd-note-title");
  const state = main.querySelector(".hd-note-state");
  const count = main.querySelector(".hd-note-words");
  const notice = main.querySelector(".hd-note-notice");
  const tools = main.querySelector(".hd-note-tools");
  const n = { rel, saved: text, mtime, busy: false, timer: 0 };
  note = n;

  const setState = (msg, kind = "") => {
    state.textContent = msg;
    state.dataset.kind = kind;
  };
  const showCount = () => {
    count.textContent = t("Слов: {0}", words(n.editor.text).toLocaleString());
  };
  const ask = (msg, main1, on1, alt, on2) => {
    notice.querySelector("span").textContent = msg;
    const [b1, b2] = notice.querySelectorAll("button");
    b1.textContent = main1;
    b2.textContent = alt;
    b1.onclick = () => { notice.hidden = true; on1(); };
    b2.onclick = () => { notice.hidden = true; on2(); };
    notice.hidden = false;
  };

  n.dirty = () => n.editor.text !== n.saved;
  n.save = async (force = false) => {
    window.clearTimeout(n.timer);
    if (n.busy || !n.dirty()) return;
    n.busy = true;
    const value = n.editor.text;
    setState(t("Сохраняю…"));
    const r = await api("save", { rel: n.rel, text: value, mtime: force ? 0 : n.mtime });
    n.busy = false;
    if (r?.ok) {
      n.saved = value;
      n.mtime = r.mtime;
      setState(t("Сохранено"));
      refresh();
      if (n.dirty()) schedule();
    } else if (r?.conflict) {
      setState("");
      ask(t("Файл на диске изменился после открытия."), t("Перезаписать"), () => n.save(true), t("Загрузить с диска"), reload);
    } else {
      setState(t("Не удалось сохранить: {0}", r?.error || "?"), "error");
    }
  };
  const schedule = () => {
    window.clearTimeout(n.timer);
    n.timer = window.setTimeout(() => n.save(), num(cfg.notesAutosave, 300, 5000, 600));
  };
  const reload = async () => {
    const r = await api("read", { rel: n.rel });
    if (!r?.ok) return;
    n.saved = r.text;
    n.mtime = r.mtime;
    n.editor.setText(r.text);
    showCount();
    setState(t("Обновлено с диска"));
  };
  n.check = async () => {
    if (n.busy || document.hidden || !notice.hidden || note !== n) return;
    const r = await api("stat", { rel: n.rel });
    if (!r?.ok || !n.mtime || r.mtime === n.mtime) return;
    if (n.dirty()) ask(t("Файл изменён в другой программе."), t("Загрузить с диска"), reload, t("Оставить мою версию"), () => (n.mtime = r.mtime));
    else reload();
  };

  n.editor = createEditor(main.querySelector(".hd-note-editor"), {
    text,
    t,
    settings: editorSettings(),
    placeholderText: t("Начните писать или нажмите / для блоков…"),
    onLink: target => followLink(target),
    onTag: tag => filterTag(tag),
    onTemplate: () => pickTemplate(),
    getImage: src => api("asset", { src, note: n.rel }).then(r => (r?.ok ? r.url : null)),
    saveImage: (name, b64) => api("attach", { note: n.rel, name, b64 }).then(r => (r?.ok ? r.name : null)),
    onChange: () => {
      showCount();
      if (n.dirty()) {
        setState(t("Есть несохранённые изменения"));
        schedule();
      }
    },
    openUrl: url => {
      if (/^(https?:|mailto:)/i.test(url)) window.open(url, "_blank", "noopener");
    },
  });

  for (const group of TOOLBAR) {
    for (const k of group) tools.append(toolButton(k));
    tools.append(document.createElement("i"));
  }
  tools.lastElementChild.remove();
  tools.addEventListener("mousedown", e => e.preventDefault());
  tools.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b) n.editor.run(b.dataset.cmd);
  });

  title.value = baseName(rel);
  title.placeholder = t("Без названия");
  title.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      n.editor.focus();
    } else if (e.key === "Escape") {
      title.value = baseName(n.rel);
      n.editor.focus();
    }
  });
  title.addEventListener("change", async () => {
    const next = title.value.trim();
    if (!next || next === baseName(n.rel)) {
      title.value = baseName(n.rel);
      return;
    }
    const r = await rename(n.rel, next, false);
    if (!r?.ok) {
      title.value = baseName(n.rel);
      setState(t("Не удалось переименовать: {0}", r?.error || "?"), "error");
    }
  });
  n.title = title;
  n.setState = setState;
  n.editor.setNotes(allNotes.map(it => it.name));
  showCount();
  mentions(n);
  return n;
}

async function mentions(n) {
  const r = await api("backlinks", { rel: n.rel });
  const box = main.querySelector(".hd-note-mentions");
  if (note !== n || !box || !r?.ok) return;
  box.hidden = !r.links.length;
  box.querySelector("h3").textContent = t("Упоминания: {0}", r.links.length);
  const ol = box.querySelector("ol");
  ol.textContent = "";
  for (const it of r.links) {
    const li = document.createElement("li");
    li.innerHTML = "<b></b><small></small>";
    li.querySelector("b").textContent = it.name;
    li.querySelector("small").textContent = it.line;
    li.addEventListener("click", () => openRel(it.rel));
    ol.append(li);
  }
}

function filterTag(tag) {
  search.value = "#" + tag;
  refresh();
}

async function followLink(target) {
  const want = target.toLowerCase().replace(/\.md$/, "");
  const leaf = want.split("/").pop();
  const hit = allNotes.find(it => it.rel.toLowerCase().replace(/\.md$/, "") === want) || allNotes.find(it => it.name.toLowerCase() === leaf);
  if (hit) {
    openRel(hit.rel);
    return;
  }
  const folder = target.includes("/") ? target.slice(0, target.lastIndexOf("/")) : "";
  const r = await api("new", { folder: folders.includes(folder) ? folder : "", name: target.split("/").pop() });
  if (!r?.ok) return;
  await refresh();
  await openRel(r.rel);
}

async function closeNote() {
  if (!note) return;
  const n = note;
  note = null;
  await n.save();
  n.editor.destroy();
}

async function openRel(rel, fresh = false) {
  if (note?.rel === rel) return;
  await closeNote();
  const r = await api("read", { rel });
  if (!r?.ok) {
    await refresh();
    return;
  }
  store("hd-notes-last", rel);
  target = parentOf(rel);
  for (let f = target; f; f = parentOf(f)) open.add(f);
  saveOpen();
  const n = openNote(rel, r.text, r.mtime);
  draw();
  if (fresh && cfg.notesTitle !== false) {
    n.title.focus();
    n.title.select();
  } else {
    n.editor.focus();
  }
}

function empty() {
  main.innerHTML = `<div class="hd-notes-blank"><p></p><button type="button" class="hd-notes-primary"></button></div>`;
  main.querySelector("p").textContent = notes.length ? t("Выберите заметку слева.") : t("Заметок пока нет.");
  const b = main.querySelector("button");
  b.textContent = t("Новая заметка");
  b.addEventListener("click", () => createNote(target));
}

/* ------------------------------ действия с файлами ------------------------------ */

const stamp = () => {
  const d = new Date();
  const p = x => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}`;
};

async function createNote(folder = "") {
  const r = await api("new", { folder, name: cfg.notesNewName === "date" ? stamp() : "" });
  if (!r?.ok) return;
  search.value = "";
  await refresh();
  await openRel(r.rel, true);
}

async function createFolder(folder = "") {
  const r = await api("mkdir", { folder });
  if (!r?.ok) return;
  if (folder) open.add(folder);
  saveOpen();
  await refresh();
  startRename(r.rel, true);
}

async function rename(rel, name, isFolder) {
  const r = await api("rename", { rel, name, isFolder });
  if (r?.ok) {
    moved(rel, r.rel, isFolder);
    if (r.updated) note?.setState(t("Ссылки обновлены в заметках: {0}", r.updated));
  }
  return r;
}

async function move(rel, folder, isFolder) {
  if (parentOf(rel) === folder) return;
  const r = await api("move", { rel, folder, isFolder });
  if (r?.ok) {
    if (folder) open.add(folder);
    moved(rel, r.rel, isFolder);
  }
}

function moved(from, to, isFolder) {
  const fix = rel => (rel === from ? to : isFolder && rel.startsWith(from + "/") ? to + rel.slice(from.length) : rel);
  if (note) {
    note.rel = fix(note.rel);
    note.title.value = baseName(note.rel);
    store("hd-notes-last", note.rel);
  }
  if (isFolder) {
    for (const f of [...open]) {
      if (f === from || f.startsWith(from + "/")) {
        open.delete(f);
        open.add(fix(f));
      }
    }
  }
  target = fix(target);
  saveOpen();
  refresh();
}

async function remove(rel, isFolder) {
  const current = note && (note.rel === rel || (isFolder && note.rel.startsWith(rel + "/")));
  if (current) await closeNote();
  await api("delete", { rel, isFolder });
  await refresh();
  if (current) notes[0] ? openRel(notes[0].rel) : empty();
}

/* ------------------------------ дерево ------------------------------ */

const sorter = () => {
  if (cfg.notesSort === "name") return (a, b) => collator.compare(a.name, b.name);
  if (cfg.notesSort === "created") return (a, b) => b.ctime - a.ctime;
  return (a, b) => b.mtime - a.mtime;
};

function noteRow(it, depth, showPath = false) {
  const row = document.createElement("div");
  row.className = "hd-tree-row hd-tree-note";
  row.style.setProperty("--d", depth);
  row.dataset.rel = it.rel;
  row.draggable = true;
  row.tabIndex = -1;
  row.toggleAttribute("data-current", it.rel === note?.rel);
  row.toggleAttribute("data-pinned", it.pinned);
  row.innerHTML = `<span class="hd-tree-icon">${svg(ICON.note)}</span><span class="hd-tree-text"><b></b><small></small></span><time></time>`;
  row.querySelector("b").textContent = it.name;
  const brief = cfg.notesPreview === false || cfg.notesCompact === true;
  const sub = showPath ? parentOf(it.rel).replace(/\//g, " / ") : brief ? "" : it.preview || t("Пустая заметка");
  row.querySelector("small").textContent = sub;
  row.querySelector("time").textContent = when(it.mtime);
  return row;
}

function folderRow(rel, depth) {
  const row = document.createElement("div");
  row.className = "hd-tree-row hd-tree-folder";
  row.style.setProperty("--d", depth);
  row.dataset.folder = rel;
  row.draggable = true;
  row.tabIndex = -1;
  row.toggleAttribute("data-open", open.has(rel));
  row.toggleAttribute("data-target", rel === target);
  row.innerHTML = `<span class="hd-tree-chev">${svg(ICON.chev)}</span><span class="hd-tree-text"><b></b></span>`;
  row.querySelector("b").textContent = rel.split("/").pop();
  return row;
}

function section(title) {
  const h = document.createElement("div");
  h.className = "hd-tree-section";
  h.textContent = title;
  return h;
}

function draw() {
  tree.textContent = "";
  const sort = sorter();
  if (search.value.trim()) {
    tree.append(section(notes.length ? t("Найдено: {0}", notes.length) : t("Ничего не найдено.")));
    for (const it of [...notes].sort(sort)) tree.append(noteRow(it, 0, true));
    return;
  }
  const pinned = notes.filter(n => n.pinned).sort(sort);
  if (pinned.length) {
    tree.append(section(t("Закреплённые")));
    for (const it of pinned) tree.append(noteRow(it, 0, true));
    tree.append(section(t("Все заметки")));
  }
  const walk = (parent, depth) => {
    const subs = folders.filter(f => parentOf(f) === parent).sort(collator.compare);
    for (const f of subs) {
      tree.append(folderRow(f, depth));
      if (open.has(f)) walk(f, depth + 1);
    }
    for (const it of notes.filter(n => parentOf(n.rel) === parent).sort(sort)) tree.append(noteRow(it, depth));
  };
  walk("", 0);
  const counts = new Map();
  for (const it of allNotes) {
    for (const tag of it.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  if (counts.size) {
    tree.append(section(t("Теги")));
    const box = document.createElement("div");
    box.className = "hd-tree-tags";
    for (const [tag, n] of [...counts].sort((a, b) => collator.compare(a[0], b[0]))) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cm-lp-tag";
      b.textContent = "#" + tag;
      const c = document.createElement("small");
      c.textContent = n;
      b.append(c);
      b.addEventListener("click", () => filterTag(tag));
      box.append(b);
    }
    tree.append(box);
  }
  if (!notes.length && !folders.length) {
    const p = document.createElement("p");
    p.className = "hd-notes-none";
    p.textContent = t("Заметок пока нет.");
    tree.append(p);
  }
}

async function refresh() {
  const r = await api("list", { q: search.value });
  if (!r?.ok) return;
  dir = r.dir;
  notes = r.notes;
  folders = r.folders;
  if (!search.value.trim()) {
    allNotes = r.notes;
    note?.editor.setNotes(allNotes.map(it => it.name));
  }
  $(".hd-notes-folder span").textContent = dir.split(/[\\/]/).pop();
  $(".hd-notes-folder").title = t("Открыть папку") + "\n" + dir;
  draw();
}

function startRename(rel, isFolder) {
  const row = tree.querySelector(isFolder ? `[data-folder="${CSS.escape(rel)}"]` : `[data-rel="${CSS.escape(rel)}"]`);
  const b = row?.querySelector("b");
  if (!b) return;
  const input = document.createElement("input");
  input.className = "hd-tree-input";
  input.value = isFolder ? rel.split("/").pop() : baseName(rel);
  b.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = async ok => {
    if (done) return;
    done = true;
    const next = input.value.trim();
    if (ok && next && next !== (isFolder ? rel.split("/").pop() : baseName(rel))) {
      const r = await rename(rel, next, isFolder);
      if (!r?.ok) window.alert(t("Не удалось переименовать: {0}", r?.error || "?"));
    } else {
      draw();
    }
  };
  input.addEventListener("keydown", e => {
    e.stopPropagation();
    if (e.key === "Enter") finish(true);
    else if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("mousedown", e => e.stopPropagation());
}

tree.addEventListener("click", e => {
  if (e.target.closest(".hd-tree-input")) return;
  const noteEl = e.target.closest(".hd-tree-note");
  const folderEl = e.target.closest(".hd-tree-folder");
  if (noteEl) {
    openRel(noteEl.dataset.rel);
  } else if (folderEl) {
    const f = folderEl.dataset.folder;
    open.has(f) ? open.delete(f) : open.add(f);
    target = f;
    saveOpen();
    draw();
  } else if (e.target === tree) {
    target = "";
    draw();
  }
});

/* перетаскивание: заметки и папки в папки, на пустое место — в корень */
let dragged = null;
tree.addEventListener("dragstart", e => {
  const row = e.target.closest(".hd-tree-row");
  if (!row) return;
  dragged = row.dataset.folder !== undefined ? { rel: row.dataset.folder, isFolder: true } : { rel: row.dataset.rel, isFolder: false };
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", dragged.rel);
});
const dropFolder = e => {
  const row = e.target.closest(".hd-tree-row");
  if (!row) return e.target.closest(".hd-notes-tree") ? "" : null;
  return row.dataset.folder !== undefined ? row.dataset.folder : parentOf(row.dataset.rel);
};
tree.addEventListener("dragover", e => {
  if (!dragged) return;
  const f = dropFolder(e);
  if (f === null || (dragged.isFolder && (f === dragged.rel || f.startsWith(dragged.rel + "/")))) return;
  e.preventDefault();
  for (const r of tree.querySelectorAll("[data-drop]")) r.removeAttribute("data-drop");
  (f ? tree.querySelector(`[data-folder="${CSS.escape(f)}"]`) : tree)?.setAttribute("data-drop", "");
});
tree.addEventListener("dragleave", e => {
  if (!tree.contains(e.relatedTarget)) for (const r of tree.querySelectorAll("[data-drop]")) r.removeAttribute("data-drop");
});
tree.addEventListener("drop", e => {
  e.preventDefault();
  const f = dropFolder(e);
  tree.removeAttribute("data-drop");
  for (const r of tree.querySelectorAll("[data-drop]")) r.removeAttribute("data-drop");
  if (dragged && f !== null) move(dragged.rel, f, dragged.isFolder);
  dragged = null;
});
tree.addEventListener("dragend", () => {
  dragged = null;
  tree.removeAttribute("data-drop");
});

/* меню правой кнопки в списке */
let menu = null;
const closeMenu = () => {
  menu?.remove();
  menu = null;
};
tree.addEventListener("contextmenu", e => {
  e.preventDefault();
  closeMenu();
  const noteEl = e.target.closest(".hd-tree-note");
  const folderEl = e.target.closest(".hd-tree-folder");
  menu = document.createElement("div");
  menu.className = "cm-lp-menu";
  const item = (icon, text, run) => {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = svg(MENU_ICON[icon]);
    b.append(text);
    b.addEventListener("click", () => {
      closeMenu();
      run();
    });
    menu.append(b);
  };
  const sep = () => menu.append(document.createElement("hr"));
  if (noteEl) {
    const rel = noteEl.dataset.rel;
    const it = notes.find(n => n.rel === rel);
    item("open", t("Открыть"), () => openRel(rel));
    item("rename", t("Переименовать"), () => startRename(rel, false));
    item("pin", it?.pinned ? t("Открепить") : t("Закрепить"), async () => {
      await api("pin", { rel, on: !it?.pinned });
      refresh();
    });
    if (caps.reveal !== false) item("reveal", t("Показать в проводнике"), () => api("reveal", { folder: parentOf(rel) }));
    sep();
    item("delete", t("Удалить (в папку .trash)"), () => remove(rel, false));
  } else {
    const f = folderEl ? folderEl.dataset.folder : "";
    item("newNote", t("Новая заметка"), () => createNote(f));
    item("newFolder", t("Новая папка"), () => createFolder(f));
    if (folderEl) {
      item("rename", t("Переименовать"), () => startRename(f, true));
      if (caps.reveal !== false) item("reveal", t("Показать в проводнике"), () => api("reveal", { folder: f }));
      sep();
      item("delete", t("Удалить (в папку .trash)"), () => remove(f, true));
    }
  }
  document.body.append(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(e.clientX, innerWidth - r.width - 8)}px`;
  menu.style.top = `${Math.max(8, Math.min(e.clientY, innerHeight - r.height - 8))}px`;
});
addEventListener("mousedown", e => menu && !menu.contains(e.target) && closeMenu(), true);
addEventListener("keydown", e => e.key === "Escape" && closeMenu(), true);
tree.addEventListener("keydown", e => {
  const row = document.activeElement?.closest?.(".hd-tree-row");
  if (e.key === "F2" && row) startRename(row.dataset.folder ?? row.dataset.rel, row.dataset.folder !== undefined);
});

/* ------------------------------ запуск ------------------------------ */

// заметка из боковой панели Hand Design: открыть здесь, если эта вкладка уже открыта
window.addEventListener("storage", async e => {
  if (e.key !== "hd-notes-open" || !e.newValue || app.hidden) return;
  await refresh();
  openRel(e.newValue.split("|")[0]);
});

async function start() {
  const st = await api("state");
  if (!st) return;
  setup.querySelector(".hd-notes-default small").textContent = st.suggested;
  setup.querySelector(".hd-notes-default").hidden = st.noDefault === true;
  if (st.label) setup.querySelector(".hd-notes-default b").textContent = st.label;
  if (!st.dir) {
    app.hidden = true;
    setup.hidden = false;
    return;
  }
  setup.hidden = true;
  app.hidden = false;
  await closeNote();
  await refresh();
  const last = store("hd-notes-last");
  const pick = notes.find(n => n.rel === last) || notes[0];
  pick ? openRel(pick.rel) : empty();
}

const headActs = {
  find: () => switcher(),
  graph: () => openGraph(),
  today: () => openToday(),
  newNote: () => createNote(target),
  newFolder: () => createFolder(target),
  collapse: () => {
    open.clear();
    saveOpen();
    draw();
  },
  side: () => {
    app.toggleAttribute("data-noside", true);
    store("hd-notes-side", "hidden");
  },
};
for (const b of document.querySelectorAll(".hd-notes-head [data-act]")) b.addEventListener("click", () => headActs[b.dataset.act]());
$(".hd-notes-show").addEventListener("click", () => {
  app.removeAttribute("data-noside");
  store("hd-notes-side", "");
});
app.toggleAttribute("data-noside", store("hd-notes-side") === "hidden");
setup.querySelector(".hd-notes-default").addEventListener("click", async () => {
  await api("useDefault");
  start();
});
setup.querySelector(".hd-notes-pick").addEventListener("click", async () => {
  const st = await api("pick");
  if (st?.dir) start();
});
$(".hd-notes-change").addEventListener("click", async () => {
  await closeNote();
  await api("pick");
  start();
});
$(".hd-notes-folder").addEventListener("click", () => caps.reveal !== false && api("reveal", { folder: "" }));
let searchTimer = 0;
search.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(refresh, 200);
});
window.addEventListener("focus", () => {
  if (app.hidden) return;
  refresh();
  note?.check();
});
window.addEventListener("hd-notes-settings", async () => {
  await applySettings();
  draw();
});
window.setInterval(() => note?.check(), 4000);
window.addEventListener("beforeunload", e => {
  if (note?.dirty()) {
    note.save();
    e.preventDefault();
  }
});
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === "KeyS") {
    e.preventDefault();
    note?.save();
  } else if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === "KeyO") {
    e.preventDefault();
    switcher();
  }
}, true);

/* ------------------------------ быстрый переход, заметка дня, шаблоны ------------------------------ */

function chooser({ placeholder, items, create, pick }) {
  document.querySelector(".hd-qs")?.remove();
  const box = document.createElement("div");
  box.className = "hd-qs";
  box.innerHTML = `<div class="hd-qs-card"><input spellcheck="false"><ol></ol></div>`;
  const input = box.querySelector("input");
  const ol = box.querySelector("ol");
  input.placeholder = placeholder;
  let shown = [];
  let at = 0;
  const close = () => box.remove();
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    shown = items
      .filter(it => !q || it.name.toLowerCase().includes(q) || it.sub.toLowerCase().includes(q))
      .sort((a, b) => (q ? a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q) : 0))
      .slice(0, 50);
    if (create && q && !items.some(it => it.name.toLowerCase() === q)) {
      shown.push({ name: t("Создать «{0}»", input.value.trim()), sub: "", create: input.value.trim() });
    }
    at = Math.min(at, Math.max(0, shown.length - 1));
    ol.textContent = "";
    shown.forEach((it, i) => {
      const li = document.createElement("li");
      li.toggleAttribute("data-on", i === at);
      li.innerHTML = "<b></b><small></small>";
      li.querySelector("b").textContent = it.name;
      li.querySelector("small").textContent = it.sub;
      li.addEventListener("mousedown", e => {
        e.preventDefault();
        choose(it);
      });
      ol.append(li);
    });
  };
  const choose = it => {
    close();
    if (it.create) create(it.create);
    else pick(it);
  };
  input.addEventListener("input", () => {
    at = 0;
    draw();
  });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      at = (at + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % Math.max(1, shown.length);
      draw();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[at]) choose(shown[at]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
      note?.editor.focus();
    }
  });
  box.addEventListener("mousedown", e => e.target === box && close());
  document.body.append(box);
  draw();
  input.focus();
}

function switcher() {
  if (app.hidden) return;
  chooser({
    placeholder: t("Название заметки…"),
    items: [...allNotes].sort((a, b) => b.mtime - a.mtime).map(it => ({ name: it.name, sub: parentOf(it.rel).replace(/\//g, " / "), rel: it.rel })),
    pick: it => openRel(it.rel),
    create: name => followLink(name),
  });
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const pad = x => String(x).padStart(2, "0");
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayName = d => {
  if (cfg.notesDailyFormat === "dmy") return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  if (cfg.notesDailyFormat === "long") return `${d.getDate()} ${t(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
  return isoDate(d);
};
const cleanFolder = v => String(v || "").trim().replace(/^[\\/]+|[\\/]+$/g, "").replace(/\\/g, "/");
const templatesFolder = () => cleanFolder(cfg.notesTemplates) || t("Шаблоны");

async function expand(rel, title) {
  const r = await api("read", { rel });
  if (!r?.ok) return "";
  const d = new Date();
  return r.text
    .replace(/\{\{title\}\}/gi, title)
    .replace(/\{\{date\}\}/gi, isoDate(d))
    .replace(/\{\{time\}\}/gi, `${pad(d.getHours())}:${pad(d.getMinutes())}`);
}

async function openToday() {
  const name = dayName(new Date());
  const folder = cleanFolder(cfg.notesDaily);
  const rel = (folder ? folder + "/" : "") + name + ".md";
  if (allNotes.some(it => it.rel === rel)) {
    openRel(rel);
    return;
  }
  const tpl = String(cfg.notesDailyTemplate || "").trim();
  const tplNote = tpl && allNotes.find(it => it.rel.startsWith(templatesFolder() + "/") && it.name.toLowerCase() === tpl.toLowerCase());
  const text = tplNote ? await expand(tplNote.rel, name) : "";
  const r = await api("new", { folder, name, text });
  if (!r?.ok) return;
  await refresh();
  await openRel(r.rel);
}

function pickTemplate() {
  const folder = templatesFolder();
  const list = allNotes.filter(it => it.rel.startsWith(folder + "/"));
  if (!list.length) {
    note?.setState(t("Шаблонов нет: положите заметки в папку «{0}»", folder));
    return;
  }
  chooser({
    placeholder: t("Шаблон…"),
    items: list.map(it => ({ name: it.name, sub: "", rel: it.rel })),
    pick: async it => {
      if (!note) return;
      note.editor.insert(await expand(it.rel, baseName(note.rel)));
    },
  });
}
/* ------------------------------ импорт ------------------------------ */

const IMPORTS = [
  { kind: "notion", name: "Notion", sub: t("Экспорт «Markdown & CSV», файл .zip"), pick: { mode: "file", filters: [["Notion (.zip)", "*.zip"]] } },
  { kind: "evernote", name: "Evernote", sub: t("Экспорт блокнота, файл .enex"), pick: { mode: "file", filters: [["Evernote (.enex)", "*.enex"]] } },
  { kind: "keep", name: "Google Keep", sub: t("Архив Google Takeout, файл .zip"), pick: { mode: "file", filters: [["Google Takeout (.zip)", "*.zip"]] } },
  { kind: "folder", name: t("Папка с заметками"), sub: t("Obsidian, Joplin и другие файлы .md"), pick: { mode: "folder" } },
];

function importStatus() {
  const box = document.createElement("div");
  box.className = "hd-qs";
  box.innerHTML = `<div class="hd-qs-card hd-notes-progress"><p></p><button type="button" hidden></button></div>`;
  const p = box.querySelector("p");
  const ok = box.querySelector("button");
  ok.textContent = t("Готово");
  ok.addEventListener("click", () => box.remove());
  document.body.append(box);
  return {
    set: text => (p.textContent = text),
    done: text => {
      p.textContent = text;
      ok.hidden = false;
      ok.focus();
    },
  };
}

async function runImport(src) {
  const picked = await api("importPick", src.pick);
  if (!picked?.ok) {
    if (picked?.error) importStatus().done(picked.error);
    return;
  }
  const st = importStatus();
  st.set(t("Читаю файлы…"));
  try {
    const { convert, fromB64, toB64 } = await import("./notes-import.mjs");
    const input = picked.files
      ? { name: picked.name, files: new Map(picked.files.map(f => [f.rel, fromB64(f.b64)])) }
      : { name: picked.name, bytes: fromB64(picked.b64) };
    const out = await convert(src.kind, input, t);
    if (!out.notes.length) {
      st.done(t("Заметок не нашлось. Проверьте, что выбран нужный файл."));
      return;
    }
    const begin = await api("importBegin", { name: src.kind === "folder" ? picked.name : src.name });
    if (!begin?.ok) {
      st.done(begin?.error || t("Не получилось создать папку"));
      return;
    }
    const items = [...out.notes.map(n => ({ rel: n.path, text: n.text })), ...out.files.map(f => ({ rel: f.path, bytes: f.bytes }))];
    let done = 0;
    let batch = [];
    let size = 0;
    const flush = async () => {
      if (!batch.length) return;
      const r = await api("importWrite", { folder: begin.folder, items: batch });
      if (!r?.ok) throw new Error(r?.error || "write");
      done += batch.length;
      batch = [];
      size = 0;
      st.set(t("Импорт: {0} из {1}", done, items.length));
    };
    for (const it of items) {
      const entry = it.bytes ? { rel: it.rel, b64: toB64(it.bytes) } : it;
      batch.push(entry);
      size += (entry.b64 || entry.text).length;
      if (size > 4_000_000 || batch.length >= 200) await flush();
    }
    await flush();
    for (const n of out.notes) if (n.pinned) await api("pin", { rel: begin.folder + "/" + n.path, on: true });
    await refresh();
    st.done(t("Импортировано заметок: {0}. Они в папке «{1}».", out.notes.length, begin.folder));
    await openRel(begin.folder + "/" + out.notes[0].path);
  } catch (e) {
    st.done(t("Не удалось импортировать: {0}", String(e?.message || e)));
  }
}
$(".hd-notes-import").addEventListener("click", () => chooser({ placeholder: t("Откуда импортировать…"), items: IMPORTS, pick: runImport }));

await applySettings();
start();

/* ------------------------------ граф связей ------------------------------ */

async function openGraph(local = false) {
  const r = await api("graph");
  if (!r?.ok) return;
  document.querySelector(".hd-graph")?.hdClose();
  const ac = new AbortController();
  const box = document.createElement("div");
  box.className = "hd-graph";
  box.innerHTML = `<header><nav class="hd-md-modes"><button type="button" data-m="all"></button><button type="button" data-m="local"></button></nav><span class="hd-graph-info"></span><button type="button" class="hd-notes-btn" data-close>${svg(ICON.close)}</button></header><canvas></canvas><i class="hd-graph-probe"></i>`;
  main.append(box);
  const [bAll, bLocal] = box.querySelectorAll("[data-m]");
  bAll.textContent = t("Все заметки");
  bLocal.textContent = t("Связи этой заметки");
  bLocal.disabled = !note;
  bAll.setAttribute("aria-pressed", String(!local));
  bLocal.setAttribute("aria-pressed", String(local));
  bAll.onclick = () => openGraph(false);
  bLocal.onclick = () => openGraph(true);
  box.querySelector("[data-close]").title = t("Закрыть") + " (Esc)";

  let nodes = r.nodes.map((n, i) => ({ ...n, i, deg: 0, nb: new Set() }));
  let edges = r.edges;
  for (const [a, b] of edges) {
    nodes[a].deg++;
    nodes[b].deg++;
    nodes[a].nb.add(b);
    nodes[b].nb.add(a);
  }
  const cur = nodes.find(n => n.rel === note?.rel);
  if (local && cur) {
    const keep = new Set([cur.i, ...cur.nb]);
    for (const j of cur.nb) for (const k of nodes[j].nb) keep.add(k);
    edges = edges.filter(([a, b]) => keep.has(a) && keep.has(b));
    nodes = nodes.filter(n => keep.has(n.i));
  }
  const byI = new Map(nodes.map(n => [n.i, n]));
  edges = edges.map(([a, b]) => [byI.get(a), byI.get(b)]);
  box.querySelector(".hd-graph-info").textContent = t("Заметок: {0} · связей: {1}", nodes.length, edges.length);
  const spread = Math.sqrt(nodes.length) * 40 + 40;
  nodes.forEach((n, k) => {
    const a = k * 2.399963;
    const d = spread * Math.sqrt((k + 0.5) / nodes.length);
    n.x = Math.cos(a) * d;
    n.y = Math.sin(a) * d;
    n.vx = n.vy = 0;
    n.r = 4 + Math.sqrt(n.deg) * 2.2;
  });

  const canvas = box.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const probe = box.querySelector(".hd-graph-probe");
  const colorOf = v => {
    probe.style.color = v;
    return getComputedStyle(probe).color;
  };
  const C = { accent: colorOf("var(--md-accent)"), node: colorOf("var(--md-muted)"), line: colorOf("var(--md-line)"), ink: colorOf("var(--md-ink)"), bg: colorOf("var(--md-bg)") };
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let hover = null;
  let heat = 1;
  let frame = 0;
  let w = 0;
  let h = 0;
  const resize = () => {
    const dpr = devicePixelRatio || 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    kick();
  };
  const toWorld = (x, y) => [(x - w / 2 - panX) / zoom, (y - h / 2 - panY) / zoom];

  const step = () => {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy || 0.01;
        if (d2 > 90000) continue;
        const f = 900 / d2;
        const d = Math.sqrt(d2);
        dx = (dx / d) * f;
        dy = (dy / d) * f;
        a.vx += dx; a.vy += dy;
        b.vx -= dx; b.vy -= dy;
      }
    }
    for (const [a, b] of edges) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 70) * 0.02;
      a.vx += (dx / d) * f; a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
    }
    for (const n of nodes) {
      if (n === drag?.node) continue;
      n.vx -= n.x * 0.004;
      n.vy -= n.y * 0.004;
      n.vx *= 0.82;
      n.vy *= 0.82;
      n.x += Math.max(-20, Math.min(20, n.vx)) * heat;
      n.y += Math.max(-20, Math.min(20, n.vy)) * heat;
    }
    heat *= 0.985;
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 + panX, h / 2 + panY);
    ctx.scale(zoom, zoom);
    const lit = hover ? new Set([hover.i, ...hover.nb]) : null;
    ctx.lineWidth = 1 / zoom;
    for (const [a, b] of edges) {
      const on = lit && lit.has(a.i) && lit.has(b.i) && (a === hover || b === hover);
      ctx.strokeStyle = on ? C.accent : C.line;
      ctx.globalAlpha = lit && !on ? 0.35 : 1;
      ctx.lineWidth = (on ? 1.6 : 1) / zoom;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const n of nodes) {
      const on = !lit || lit.has(n.i);
      ctx.globalAlpha = on ? (n.deg ? 1 : 0.6) : 0.25;
      ctx.fillStyle = n === hover || n === cur ? C.accent : C.node;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = `${12 / Math.max(zoom, 0.6)}px "Segoe UI Variable Text", "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    for (const n of nodes) {
      const show = (lit && lit.has(n.i)) || n === cur || zoom > 1.3 || nodes.length <= 30;
      if (!show) continue;
      ctx.globalAlpha = lit && !lit.has(n.i) ? 0.3 : 1;
      ctx.fillStyle = n === hover ? C.ink : C.node;
      ctx.fillText(n.name, n.x, n.y + n.r + 13 / Math.max(zoom, 0.6));
    }
    ctx.restore();
  };

  const loop = () => {
    frame = 0;
    if (!box.isConnected) return;
    if (heat > 0.02) {
      step();
      step();
    }
    draw();
    if (heat > 0.02 || drag) frame = requestAnimationFrame(loop);
  };
  function kick(more = 0) {
    heat = Math.max(heat, more);
    if (!frame) frame = requestAnimationFrame(loop);
  }

  const pick = (x, y) => {
    const [wx, wy] = toWorld(x, y);
    let best = null;
    let bd = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < n.r + 5 / zoom && d < bd) {
        best = n;
        bd = d;
      }
    }
    return best;
  };
  let drag = null;
  canvas.addEventListener("mousedown", e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drag = { node: pick(x, y), x, y, px: panX, py: panY, moved: false };
    kick();
  });
  addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (drag) {
      if (Math.hypot(x - drag.x, y - drag.y) > 3) drag.moved = true;
      if (drag.node) {
        [drag.node.x, drag.node.y] = toWorld(x, y);
        kick(0.3);
      } else {
        panX = drag.px + x - drag.x;
        panY = drag.py + y - drag.y;
      }
      kick();
      return;
    }
    const n = x >= 0 && y >= 0 && x <= w && y <= h ? pick(x, y) : null;
    if (n !== hover) {
      hover = n;
      canvas.style.cursor = n ? "pointer" : "grab";
      kick();
    }
  }, { signal: ac.signal });
  addEventListener("mouseup", () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.node && !d.moved) {
      close();
      openRel(d.node.rel);
    }
  }, { signal: ac.signal });
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - w / 2;
    const y = e.clientY - rect.top - h / 2;
    const k = Math.exp(-e.deltaY * 0.0015);
    const next = Math.max(0.2, Math.min(4, zoom * k));
    panX = x - ((x - panX) * next) / zoom;
    panY = y - ((y - panY) * next) / zoom;
    zoom = next;
    kick();
  }, { passive: false });
  function close() {
    ac.abort();
    box.remove();
    note?.editor.focus();
  }
  box.hdClose = close;
  addEventListener("keydown", e => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }, { capture: true, signal: ac.signal });
  box.querySelector("[data-close]").onclick = close;
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  ac.signal.addEventListener("abort", () => ro.disconnect());
  resize();
  kick(1);
}
