/* Hand Design — редактор таблиц CSV. Файл читает и пишет браузер через window.hdCsv (FloorpPdfTweaksChild). */

await new Promise(resolve => {
  if (window.hdCsv) resolve();
  else window.addEventListener("hd-csv-ready", resolve, { once: true });
});

const t = (s, ...a) => window.hdCsv.t(s, ...a);
const api = (op, data = null) => new Promise(resolve => {
  window.hdCsv.call(op, JSON.stringify(data), json => resolve(JSON.parse(json)));
});

/* ------------------------------ разбор и запись CSV ------------------------------ */

const DELIMS = [";", ",", "\t", "|"];

function detect(text) {
  const lines = [];
  let quoted = false;
  let cur = "";
  for (let i = 0; i < text.length && lines.length < 30; i++) {
    const ch = text[i];
    if (ch === '"') quoted = !quoted;
    if (!quoted && (ch === "\n" || ch === "\r")) {
      if (cur) lines.push(cur);
      cur = "";
      continue;
    }
    if (!quoted) cur += ch;
  }
  if (cur) lines.push(cur);
  let best = ";";
  let score = -1;
  for (const d of DELIMS) {
    const counts = lines.map(l => l.split(d).length - 1);
    const first = counts[0] || 0;
    if (!first) continue;
    const same = counts.filter(n => n === first).length;
    const value = same * 100 + first;
    if (value > score) {
      score = value;
      best = d;
    }
  }
  return best;
}

function parse(text, d) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === d) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function serialize(rows, d, eol, tail) {
  const q = v => (v.includes(d) || /["\r\n]/.test(v) || /^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map(r => r.map(q).join(d)).join(eol) + (tail ? eol : "");
}

/* ------------------------------ страница ------------------------------ */

const P = d => `<path d="${d}"/>`;
const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const ICON = {
  rowAdd: `<rect x="4" y="4.5" width="16" height="9" rx="2"/>` + P("M12 16.5v5M9.5 19h5"),
  colAdd: `<rect x="4.5" y="4" width="9" height="16" rx="2"/>` + P("M16.5 12h5M19 9.5v5"),
  rowDel: `<rect x="4" y="4.5" width="16" height="9" rx="2"/>` + P("M9.5 19h5"),
  colDel: `<rect x="4.5" y="4" width="9" height="16" rx="2"/>` + P("M16.5 12h5"),
  sortUp: P("M7 15l5-5 5 5"),
  sortDown: P("M7 9l5 5 5-5"),
  search: `<circle cx="11" cy="11" r="6.5"/>` + P("M16 16l4 4"),
};

document.documentElement.setAttribute("data-hd-md", "");
document.body.innerHTML = `
  <div class="hd-md hd-csv">
    <header class="hd-md-bar">
      <div class="hd-md-file">
        <button type="button" class="hd-md-icon">CSV</button>
        <span class="hd-md-names"><span class="hd-md-name"></span><span class="hd-md-path"></span></span>
        <span class="hd-md-dirty" hidden></span>
      </div>
      <div class="hd-csv-tools">
        <label class="hd-csv-search">${svg(ICON.search)}<input type="search" spellcheck="false"></label>
        <button type="button" class="hd-csv-btn" data-act="rowAdd">${svg(ICON.rowAdd)}</button>
        <button type="button" class="hd-csv-btn" data-act="colAdd">${svg(ICON.colAdd)}</button>
        <button type="button" class="hd-csv-btn" data-act="rowDel">${svg(ICON.rowDel)}</button>
        <button type="button" class="hd-csv-btn" data-act="colDel">${svg(ICON.colDel)}</button>
        <button type="button" class="hd-csv-toggle" data-act="head"></button>
        <select class="hd-csv-delim"></select>
      </div>
      <div class="hd-md-actions">
        <span class="hd-md-state"></span>
        <button type="button" class="hd-md-save" disabled></button>
      </div>
    </header>
    <div class="hd-md-notice" hidden><span class="hd-md-notice-text"></span><button type="button" class="hd-md-notice-main"></button><button type="button" class="hd-md-notice-alt"></button></div>
    <div class="hd-csv-body" tabindex="0"><table class="hd-csv-grid"></table></div>
  </div>`;

const $ = sel => document.querySelector(sel);
const body = $(".hd-csv-body");
const grid = $(".hd-csv-grid");
const search = $(".hd-csv-search input");
const delimSel = $(".hd-csv-delim");
const headBtn = $(".hd-csv-toggle");
const saveBtn = $(".hd-md-save");
const state = $(".hd-md-state");
const dirtyDot = $(".hd-md-dirty");
const notice = $(".hd-md-notice");

const titles = { rowAdd: t("Строка ниже"), colAdd: t("Столбец справа"), rowDel: t("Удалить строку"), colDel: t("Удалить столбец") };
for (const b of document.querySelectorAll(".hd-csv-btn")) {
  b.title = titles[b.dataset.act];
  b.setAttribute("aria-label", titles[b.dataset.act]);
}
headBtn.textContent = t("Первая строка — заголовки");
search.placeholder = t("Поиск в таблице");
saveBtn.textContent = t("Сохранить");
$(".hd-md-icon").title = t("Все документы");
dirtyDot.title = t("Есть несохранённые изменения");
for (const [d, name] of [[";", t("Разделитель: ;")], [",", t("Разделитель: ,")], ["\t", t("Разделитель: Tab")], ["|", t("Разделитель: |")]]) {
  const o = document.createElement("option");
  o.value = d;
  o.textContent = name;
  delimSel.append(o);
}

let rows = [[""]];
let file = { encoding: "utf-8", bom: false, mtime: 0, eol: "\r\n", tail: true };
let delim = ";";
let header = true;
let saved = "";
let sel = { r: 0, c: 0 };
let editing = null;
let sortState = null;
let busy = false;
const undo = [];
const redo = [];

const cols = () => Math.max(1, ...rows.map(r => r.length));
const normalize = () => {
  const n = cols();
  for (const r of rows) while (r.length < n) r.push("");
};
const letter = n => {
  let s = "";
  for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const text = () => serialize(rows, delim, file.eol, file.tail);
const dirty = () => text() !== saved;
const setState = (msg, kind = "") => {
  state.textContent = msg;
  state.dataset.kind = kind;
};
const showCount = () => setState(t("Строк: {0} · столбцов: {1}", Math.max(0, rows.length - (header ? 1 : 0)), cols()));
const syncDirty = () => {
  const d = dirty();
  dirtyDot.hidden = !d;
  saveBtn.disabled = !d || busy;
  document.title = (d ? "• " : "") + ($(".hd-md-name").textContent || "CSV");
};
const snapshot = () => {
  undo.push(JSON.stringify(rows));
  if (undo.length > 100) undo.shift();
  redo.length = 0;
};
const change = fn => {
  snapshot();
  fn();
  normalize();
  draw();
  syncDirty();
};

/* ------------------------------ отрисовка ------------------------------ */

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function draw() {
  const n = cols();
  const q = search.value.trim().toLowerCase();
  let html = `<thead><tr><th class="hd-csv-corner"></th>`;
  for (let c = 0; c < n; c++) {
    const s = sortState?.c === c ? (sortState.dir > 0 ? svg(ICON.sortUp) : svg(ICON.sortDown)) : "";
    html += `<th class="hd-csv-col" data-c="${c}">${letter(c)}${s}</th>`;
  }
  html += "</tr></thead><tbody>";
  rows.forEach((row, r) => {
    const head = header && r === 0;
    const hide = q && !head && !row.some(v => v.toLowerCase().includes(q));
    html += `<tr data-r="${r}"${head ? ' class="hd-csv-head"' : ""}${hide ? " hidden" : ""}><th class="hd-csv-num">${r + 1}</th>`;
    for (let c = 0; c < n; c++) {
      const v = row[c] ?? "";
      const hit = q && v.toLowerCase().includes(q) ? " data-hit" : "";
      const on = sel.r === r && sel.c === c ? " data-sel" : "";
      html += `<td data-c="${c}"${hit}${on} title="${esc(v).replace(/"/g, "&quot;")}">${esc(v)}</td>`;
    }
    html += "</tr>";
  });
  grid.innerHTML = html + "</tbody>";
  headBtn.setAttribute("aria-pressed", String(header));
  showCount();
}

const cellEl = (r, c) => grid.querySelector(`tr[data-r="${r}"] td[data-c="${c}"]`);
function select(r, c, scroll = true) {
  r = Math.max(0, Math.min(r, rows.length - 1));
  c = Math.max(0, Math.min(c, cols() - 1));
  grid.querySelector("td[data-sel]")?.removeAttribute("data-sel");
  sel = { r, c };
  const el = cellEl(r, c);
  el?.setAttribute("data-sel", "");
  if (scroll) el?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function startEdit(replace = false) {
  const el = cellEl(sel.r, sel.c);
  if (!el) return;
  editing = { r: sel.r, c: sel.c, before: rows[sel.r][sel.c] };
  el.contentEditable = "plaintext-only";
  el.setAttribute("data-edit", "");
  el.textContent = replace ? "" : rows[sel.r][sel.c];
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  getSelection().removeAllRanges();
  getSelection().addRange(range);
}

function endEdit(keep) {
  if (!editing) return;
  const { r, c, before } = editing;
  const el = cellEl(r, c);
  const value = keep && el ? el.textContent : before;
  editing = null;
  if (value !== before) {
    change(() => (rows[r][c] = value));
  } else {
    draw();
  }
  select(r, c, false);
  body.focus({ preventScroll: true });
}

/* ------------------------------ действия ------------------------------ */

const acts = {
  rowAdd: () => {
    change(() => rows.splice(sel.r + 1, 0, Array(cols()).fill("")));
    select(sel.r + 1, sel.c);
  },
  rowAbove: () => change(() => rows.splice(sel.r, 0, Array(cols()).fill(""))),
  rowDel: () => rows.length > 1 && change(() => rows.splice(sel.r, 1)),
  colAdd: () => {
    change(() => rows.forEach(r => r.splice(sel.c + 1, 0, "")));
    select(sel.r, sel.c + 1);
  },
  colLeft: () => change(() => rows.forEach(r => r.splice(sel.c, 0, ""))),
  colDel: () => cols() > 1 && change(() => rows.forEach(r => r.splice(sel.c, 1))),
  head: () => {
    header = !header;
    draw();
    select(sel.r, sel.c, false);
  },
};
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const asNumber = v => {
  const s = v.replace(/\s/g, "").replace(",", ".");
  return s !== "" && isFinite(s) ? Number(s) : null;
};
function sortBy(c, dir) {
  change(() => {
    const top = header ? rows.slice(0, 1) : [];
    const rest = header ? rows.slice(1) : rows.slice();
    rest.sort((a, b) => {
      const x = a[c] ?? "";
      const y = b[c] ?? "";
      const nx = asNumber(x);
      const ny = asNumber(y);
      const r = nx !== null && ny !== null ? nx - ny : collator.compare(x, y);
      return r * dir;
    });
    rows = [...top, ...rest];
  });
  sortState = { c, dir };
  draw();
}

for (const b of document.querySelectorAll("[data-act]")) {
  b.addEventListener("click", () => {
    acts[b.dataset.act]();
    body.focus({ preventScroll: true });
  });
}
delimSel.addEventListener("change", () => {
  delim = delimSel.value;
  syncDirty();
});
search.addEventListener("input", () => draw());
$(".hd-md-icon").addEventListener("click", () => api("home"));

grid.addEventListener("mousedown", e => {
  if (e.target.closest("[data-edit]")) return;
  const col = e.target.closest(".hd-csv-col");
  if (col && e.button === 0) {
    const c = +col.dataset.c;
    sortBy(c, sortState?.c === c ? -sortState.dir : 1);
    return;
  }
  const td = e.target.closest("td");
  if (!td) return;
  if (editing) endEdit(true);
  e.preventDefault();
  select(+td.parentElement.dataset.r, +td.dataset.c, false);
  body.focus({ preventScroll: true });
});
grid.addEventListener("dblclick", e => {
  if (e.target.closest("td") && !editing) startEdit();
});

body.addEventListener("keydown", e => {
  const mod = e.ctrlKey || e.metaKey;
  if (editing) {
    if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      endEdit(true);
      select(sel.r + 1, sel.c);
    } else if (e.key === "Tab") {
      e.preventDefault();
      endEdit(true);
      select(sel.r, sel.c + (e.shiftKey ? -1 : 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      endEdit(false);
    }
    return;
  }
  const move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
  if (move && !mod) {
    e.preventDefault();
    select(sel.r + move[0], sel.c + move[1]);
  } else if (e.key === "Tab") {
    e.preventDefault();
    select(sel.r, sel.c + (e.shiftKey ? -1 : 1));
  } else if (e.key === "Enter" || e.key === "F2") {
    e.preventDefault();
    startEdit();
  } else if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    if (rows[sel.r][sel.c] !== "") change(() => (rows[sel.r][sel.c] = ""));
    select(sel.r, sel.c, false);
  } else if (e.key === "Home") {
    select(sel.r, 0);
  } else if (e.key === "End") {
    select(sel.r, cols() - 1);
  } else if (mod && e.code === "KeyZ" && !e.shiftKey) {
    e.preventDefault();
    if (undo.length) {
      redo.push(JSON.stringify(rows));
      rows = JSON.parse(undo.pop());
      draw();
      select(sel.r, sel.c, false);
      syncDirty();
    }
  } else if (mod && (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey))) {
    e.preventDefault();
    if (redo.length) {
      undo.push(JSON.stringify(rows));
      rows = JSON.parse(redo.pop());
      draw();
      select(sel.r, sel.c, false);
      syncDirty();
    }
  } else if (mod && e.code === "KeyC") {
    e.preventDefault();
    navigator.clipboard.writeText(rows[sel.r][sel.c]);
  } else if (mod && e.code === "KeyF") {
    e.preventDefault();
    search.focus();
    search.select();
  } else if (!mod && !e.altKey && e.key.length === 1) {
    startEdit(true);
  }
});

/* вставка блока из Excel или другой таблицы: строки через перевод строки, ячейки через Tab */
document.addEventListener("paste", e => {
  if (editing || e.target === search) return;
  const data = e.clipboardData?.getData("text/plain");
  if (!data) return;
  e.preventDefault();
  const block = parse(data.replace(/\r?\n$/, ""), data.includes("\t") ? "\t" : delim);
  change(() => {
    block.forEach((line, i) => {
      const r = sel.r + i;
      while (rows.length <= r) rows.push(Array(cols()).fill(""));
      line.forEach((v, j) => {
        const row = rows[r];
        while (row.length <= sel.c + j) row.push("");
        row[sel.c + j] = v;
      });
    });
  });
  select(sel.r, sel.c, false);
});

/* меню правой кнопки */
let menu = null;
const closeMenu = () => {
  menu?.remove();
  menu = null;
};
grid.addEventListener("contextmenu", e => {
  const td = e.target.closest("td, .hd-csv-col");
  if (!td) return;
  e.preventDefault();
  closeMenu();
  if (td.matches("td")) select(+td.parentElement.dataset.r, +td.dataset.c, false);
  else select(sel.r, +td.dataset.c, false);
  menu = document.createElement("div");
  menu.className = "cm-lp-menu";
  const item = (icon, label, run) => {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = icon ? svg(ICON[icon]) : "<i></i>";
    b.append(label);
    b.addEventListener("click", () => {
      closeMenu();
      run();
      body.focus({ preventScroll: true });
    });
    menu.append(b);
  };
  const sep = () => menu.append(document.createElement("hr"));
  item("rowAdd", t("Строка выше"), acts.rowAbove);
  item("rowAdd", t("Строка ниже"), acts.rowAdd);
  item("rowDel", t("Удалить строку"), acts.rowDel);
  sep();
  item("colAdd", t("Столбец слева"), acts.colLeft);
  item("colAdd", t("Столбец справа"), acts.colAdd);
  item("colDel", t("Удалить столбец"), acts.colDel);
  sep();
  item("sortUp", t("Сортировать по возрастанию"), () => sortBy(sel.c, 1));
  item("sortDown", t("Сортировать по убыванию"), () => sortBy(sel.c, -1));
  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(e.clientX, innerWidth - rect.width - 8)}px`;
  menu.style.top = `${Math.max(8, Math.min(e.clientY, innerHeight - rect.height - 8))}px`;
});
addEventListener("mousedown", e => menu && !menu.contains(e.target) && closeMenu(), true);
addEventListener("keydown", e => e.key === "Escape" && closeMenu(), true);

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

function load(r) {
  file = {
    encoding: r.encoding,
    bom: r.bom,
    mtime: r.mtime,
    eol: r.text.includes("\r\n") ? "\r\n" : "\n",
    tail: /\r?\n$/.test(r.text),
  };
  delim = /\.tsv$/i.test(r.name) ? "\t" : detect(r.text);
  delimSel.value = delim;
  rows = parse(r.text, delim);
  if (!rows.length) rows = [[""]];
  normalize();
  saved = text();
  undo.length = 0;
  redo.length = 0;
  sortState = null;
  draw();
  select(Math.min(sel.r, rows.length - 1), Math.min(sel.c, cols() - 1), false);
  syncDirty();
}

async function save(force = false) {
  if (editing) endEdit(true);
  if (busy || !dirty()) return;
  busy = true;
  syncDirty();
  setState(t("Сохраняю…"));
  const value = text();
  const r = await api("save", { text: value, encoding: file.encoding, bom: file.bom, mtime: force ? 0 : file.mtime });
  busy = false;
  if (r?.ok) {
    saved = value;
    file.mtime = r.mtime;
    notice.hidden = true;
    setState(t("Сохранено"));
    setTimeout(() => !busy && !dirty() && showCount(), 1600);
  } else if (r?.conflict) {
    showCount();
    ask(t("Файл на диске изменился после открытия."), t("Перезаписать"), () => save(true), t("Загрузить с диска"), reload);
  } else {
    setState(t("Не удалось сохранить: {0}", r?.error || "?"), "error");
  }
  syncDirty();
}

async function reload() {
  const r = await api("read");
  if (r?.ok) {
    load(r);
    setState(t("Обновлено с диска"));
  }
}

let checking = false;
async function check() {
  if (checking || busy || document.hidden || !notice.hidden) return;
  checking = true;
  const r = await api("stat");
  if (r?.ok && file.mtime && r.mtime !== file.mtime) {
    if (dirty()) ask(t("Файл изменён в другой программе."), t("Загрузить с диска"), reload, t("Оставить мою версию"), () => (file.mtime = r.mtime));
    else await reload();
  }
  checking = false;
}

saveBtn.addEventListener("click", () => save());
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === "KeyS") {
    e.preventDefault();
    save();
  }
}, true);
addEventListener("focus", check);
setInterval(check, 4000);
addEventListener("beforeunload", e => {
  if (dirty()) e.preventDefault();
});

saved = text();
const first = await api("read");
if (first?.ok) {
  $(".hd-md-name").textContent = first.name;
  $(".hd-md-path").textContent = first.folder;
  $(".hd-md-path").title = first.folder;
  load(first);
  body.focus({ preventScroll: true });
} else {
  setState(t("Не удалось открыть файл: {0}", first?.error || "?"), "error");
}
