import { EditorState, StateField, StateEffect, EditorSelection, Compartment, findClusterBreak } from "@codemirror/state";
import { EditorView, Decoration, WidgetType, keymap, placeholder, showTooltip } from "@codemirror/view";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentMore, indentLess, deleteCharBackward, deleteCharForward } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ensureSyntaxTree, syntaxTree, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { search, searchKeymap } from "@codemirror/search";
import { tags } from "@lezer/highlight";
import { render, parseTable, formatTable } from "./HandDesignMarkdown.sys.mjs";

class Bullet extends WidgetType {
  eq() { return true; }
  toDOM() {
    const s = document.createElement("span");
    s.className = "cm-lp-bullet";
    return s;
  }
}

class Check extends WidgetType {
  constructor(done, pos) {
    super();
    this.done = done;
    this.pos = pos;
  }
  eq(o) { return o.done === this.done && o.pos === this.pos; }
  toDOM(view) {
    const box = document.createElement("span");
    box.className = "cm-lp-check";
    box.toggleAttribute("data-done", this.done);
    box.setAttribute("role", "checkbox");
    box.setAttribute("aria-checked", String(this.done));
    box.addEventListener("mousedown", e => {
      e.preventDefault();
      view.dispatch({ changes: { from: this.pos + 1, to: this.pos + 2, insert: this.done ? " " : "x" } });
    });
    return box;
  }
  ignoreEvent() { return true; }
}

class Rule extends WidgetType {
  eq() { return true; }
  toDOM() {
    const s = document.createElement("span");
    s.className = "cm-lp-hr";
    return s;
  }
}

/* картинки: из интернета напрямую, файлы из папки заметок — через loadImage */
let loadImage = null;
const imageCache = new Map();

function zoom(src) {
  const o = document.createElement("div");
  o.className = "cm-lp-zoom";
  const img = document.createElement("img");
  img.src = src;
  o.append(img);
  const close = () => {
    o.remove();
    removeEventListener("keydown", esc, true);
  };
  const esc = e => e.key === "Escape" && close();
  o.addEventListener("click", close);
  addEventListener("keydown", esc, true);
  document.body.append(o);
}

class Image extends WidgetType {
  constructor(src, alt, width) {
    super();
    this.src = src;
    this.alt = alt;
    this.width = width;
  }
  eq(o) { return o.src === this.src && o.width === this.width; }
  toDOM(view) {
    const img = document.createElement("img");
    img.className = "cm-lp-img";
    img.alt = this.alt || this.src;
    if (this.width) img.style.width = `${this.width}px`;
    img.addEventListener("load", () => view.requestMeasure());
    img.addEventListener("mousedown", e => {
      if (e.button !== 0 || !img.src) return;
      e.preventDefault();
      zoom(img.src);
    });
    if (/^(https?:|data:image\/)/i.test(this.src)) {
      img.src = this.src;
    } else if (imageCache.has(this.src)) {
      img.src = imageCache.get(this.src);
    } else {
      loadImage?.(this.src).then(url => {
        if (url) {
          imageCache.set(this.src, url);
          img.src = url;
        } else {
          img.classList.add("cm-lp-img-missing");
          img.title = this.src;
        }
      });
    }
    return img;
  }
  ignoreEvent() { return true; }
}

/* таблица всегда показывается таблицей, ячейки правятся прямо в ней */
let pendingCell = null;
const IC = name => `<i class="hd-ic" style="--i: var(--fm-ic-${name})" aria-hidden="true"></i>`;
const ICON_NAME = { bold: "bold", italic: "italic", strike: "strike", highlight: "marker", code: "code", link: "link", h1: "h1", h2: "h2", h3: "h3", bullet: "list", ordered: "ordered", task: "task", quote: "quoteMarks", table: "table", codeblock: "codeBlock", hr: "rule", template: "template" };
const TABLE_ICON_NAME = { rowAdd: "rowAdd", colAdd: "colAdd", rowDel: "rowDel", colDel: "colDel", left: "alignLeft", center: "alignCenter", right: "alignRight", drop: "delete" };
const CALLOUT_ICON_NAME = { note: "edit", info: "info", tip: "lightbulb", success: "checkCircle", question: "help", warning: "warning", danger: "closeCircle", example: "list", quote: "quoteMarks" };
const TABLE_ICONS = {
  rowAdd: `<rect x="4" y="4.5" width="16" height="9" rx="2"/><path d="M12 16.5v5M9.5 19h5"/>`,
  colAdd: `<rect x="4.5" y="4" width="9" height="16" rx="2"/><path d="M16.5 12h5M19 9.5v5"/>`,
  rowDel: `<rect x="4" y="4.5" width="16" height="9" rx="2"/><path d="M9.5 19h5"/>`,
  colDel: `<rect x="4.5" y="4" width="9" height="16" rx="2"/><path d="M16.5 12h5"/>`,
  left: `<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>`,
  center: `<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>`,
  right: `<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>`,
  drop: `<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>`,
};
const TABLE_TITLES = {
  rowAdd: "Строка ниже", colAdd: "Столбец справа", rowDel: "Удалить строку", colDel: "Удалить столбец",
  left: "По левому краю", center: "По центру", right: "По правому краю", drop: "Удалить таблицу",
};

function editCell(view, widget, box, r, c) {
  const model = parseTable(widget.text.split("\n"));
  const rows = model.rows.length;
  const cols = model.align.length;
  r = Math.max(0, Math.min(r, rows - 1));
  c = Math.max(0, Math.min(c, cols - 1));
  const cell = box.querySelector("table")?.rows[r]?.cells[c];
  if (!cell) return;
  box.setAttribute("data-editing", "");
  cell.setAttribute("data-edit", "");
  cell.contentEditable = "plaintext-only";
  cell.textContent = model.rows[r][c];
  const bar = box.querySelector(".cm-lp-tbar");
  bar.querySelector("[data-t=rowDel]").disabled = r === 0;
  bar.querySelector("[data-t=colDel]").disabled = cols < 2;
  for (const k of ["left", "center", "right"]) bar.querySelector(`[data-t=${k}]`).setAttribute("aria-pressed", String((model.align[c] || "left") === k));
  cell.focus();
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(false);
  getSelection().removeAllRanges();
  getSelection().addRange(range);
  let done = false;
  const commit = (next, fn) => {
    if (done) return;
    done = true;
    box.hdCommit = null;
    model.rows[r][c] = cell.textContent.replace(/\s*\n\s*/g, " ").trim();
    if (typeof fn === "function") fn(model);
    const text = fn === "drop" ? "" : formatTable(model).join("\n");
    pendingCell = next && text ? { from: widget.from, r: next[0], c: next[1] } : null;
    if (fn === "drop") {
      const to = Math.min(view.state.doc.length, widget.from + widget.text.length + 1);
      view.dispatch({ changes: { from: widget.from, to, insert: "" }, selection: { anchor: widget.from } });
      view.focus();
    } else if (text !== widget.text) {
      view.dispatch({ changes: { from: widget.from, to: widget.from + widget.text.length, insert: text } });
    } else {
      pendingCell = null;
      box.removeAttribute("data-editing");
      cell.removeAttribute("data-edit");
      cell.removeAttribute("contenteditable");
      cell.innerHTML = render(`| ${model.rows[r][c].replace(/\|/g, "\\|")} |\n| - |`).html.match(/<th[^>]*>([\s\S]*?)<\/th>/)?.[1] ?? "";
      if (next) editCell(view, widget, box, next[0], next[1]);
    }
  };
  box.hdCommit = commit;
  const blank = () => Array(cols).fill("");
  cell.onkeydown = e => {
    const mod = e.ctrlKey || e.metaKey || e.altKey;
    if (e.key === "Tab" && !mod) {
      e.preventDefault();
      if (e.shiftKey) {
        if (r > 0 || c > 0) commit(c > 0 ? [r, c - 1] : [r - 1, cols - 1]);
      } else if (c < cols - 1) commit([r, c + 1]);
      else if (r < rows - 1) commit([r + 1, 0]);
      else commit([r + 1, 0], m => m.rows.push(blank()));
    } else if (e.key === "Enter" && !mod) {
      e.preventDefault();
      if (e.shiftKey) document.execCommand("insertText", false, "<br>");
      else if (r < rows - 1) commit([r + 1, c]);
      else commit([r + 1, c], m => m.rows.push(blank()));
    } else if ((e.key === "ArrowUp" && r > 0) || (e.key === "ArrowDown" && r < rows - 1)) {
      if (mod || e.shiftKey) return;
      e.preventDefault();
      commit([r + (e.key === "ArrowUp" ? -1 : 1), c]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      commit(null);
      view.focus();
    }
  };
  cell.onblur = () => setTimeout(() => !box.contains(document.activeElement) && commit(null), 0);
  bar.onclick = e => {
    const k = e.target.closest("button")?.dataset.t;
    if (!k) return;
    const acts = {
      rowAdd: () => commit([r + 1, c], m => m.rows.splice(r + 1, 0, blank())),
      colAdd: () => commit([r, c + 1], m => {
        m.rows.forEach(row => row.splice(c + 1, 0, ""));
        m.align.splice(c + 1, 0, "");
      }),
      rowDel: () => r > 0 && commit([r - 1, c], m => m.rows.splice(r, 1)),
      colDel: () => cols > 1 && commit([r, Math.max(0, c - 1)], m => {
        m.rows.forEach(row => row.splice(c, 1));
        m.align.splice(c, 1);
      }),
      left: () => commit([r, c], m => (m.align[c] = "left")),
      center: () => commit([r, c], m => (m.align[c] = "center")),
      right: () => commit([r, c], m => (m.align[c] = "right")),
      drop: () => commit(null, "drop"),
    };
    acts[k]();
  };
}

class Table extends WidgetType {
  constructor(text, from) {
    super();
    this.text = text;
    this.from = from;
  }
  eq(o) { return o.text === this.text && o.from === this.from; }
  toDOM(view) {
    const box = document.createElement("div");
    box.className = "cm-lp-table";
    box.innerHTML = render(this.text).html;
    const bar = document.createElement("div");
    bar.className = "cm-lp-tbar";
    for (const k of Object.keys(TABLE_ICONS)) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.t = k;
      b.title = tr(TABLE_TITLES[k]);
      b.innerHTML = IC(TABLE_ICON_NAME[k]);
      bar.append(b);
    }
    bar.addEventListener("mousedown", e => e.preventDefault());
    box.prepend(bar);
    box.addEventListener("mousedown", e => {
      if (e.target.closest("a, .cm-lp-tbar, [data-edit]")) return;
      const cell = e.target.closest("td, th");
      if (!cell) return;
      e.preventDefault();
      if (box.hdCommit) box.hdCommit([cell.parentElement.rowIndex, cell.cellIndex]);
      else editCell(view, this, box, cell.parentElement.rowIndex, cell.cellIndex);
    });
    if (pendingCell && pendingCell.from === this.from) {
      const { r, c } = pendingCell;
      pendingCell = null;
      requestAnimationFrame(() => editCell(view, this, box, r, c));
    }
    return box;
  }
  ignoreEvent() { return true; }
}

/* [[ссылки]] между заметками */
let noteNames = new Set();
let noteList = [];
let openNote = null;
const refreshLinks = StateEffect.define();

class WikiLink extends WidgetType {
  constructor(target, label, exists) {
    super();
    this.target = target;
    this.label = label;
    this.exists = exists;
  }
  eq(o) { return o.target === this.target && o.label === this.label && o.exists === this.exists; }
  toDOM() {
    const a = document.createElement("span");
    a.className = this.exists ? "cm-lp-wiki" : "cm-lp-wiki cm-lp-wiki-missing";
    a.textContent = this.label;
    a.title = this.exists ? this.target : tr("Заметки «{0}» нет — щёлкните, чтобы создать", this.target);
    a.addEventListener("mousedown", e => {
      if (e.button !== 0) return;
      e.preventDefault();
      openNote?.(this.target);
    });
    return a;
  }
  ignoreEvent() { return true; }
}

const wikiSource = context => {
  const m = context.matchBefore(/\[\[[^\][\n|#]*$/);
  if (!m) return null;
  return {
    from: m.from + 2,
    validFor: /^[^\][\n|#]*$/,
    options: noteList.map(name => ({
      label: name,
      apply(view, completion, from, to) {
        const close = view.state.sliceDoc(to, to + 2) === "]]" ? "" : "]]";
        view.dispatch({ changes: { from, to, insert: name + close }, selection: { anchor: from + name.length + 2 } });
      },
    })),
  };
};

/* синтаксис Obsidian: блоки > [!note], свойства, сноски, теги */
let openTag = null;
const CALLOUTS = {
  note: "note", info: "info", todo: "info", abstract: "note", summary: "note", tldr: "note",
  tip: "tip", hint: "tip", important: "tip", success: "success", check: "success", done: "success",
  question: "question", help: "question", faq: "question", warning: "warning", caution: "warning", attention: "warning",
  failure: "danger", fail: "danger", missing: "danger", danger: "danger", error: "danger", bug: "danger",
  example: "example", quote: "quote", cite: "quote",
};
const CALLOUT_LABEL = {
  note: "Заметка", info: "Инфо", todo: "Задачи", abstract: "Кратко", summary: "Кратко", tldr: "Кратко",
  tip: "Совет", hint: "Совет", important: "Важно", success: "Готово", check: "Готово", done: "Готово",
  question: "Вопрос", help: "Вопрос", faq: "Вопрос", warning: "Внимание", caution: "Внимание", attention: "Внимание",
  failure: "Не получилось", fail: "Не получилось", missing: "Не хватает", danger: "Опасно", error: "Ошибка", bug: "Ошибка",
  example: "Пример", quote: "Цитата", cite: "Цитата",
};
const CALLOUT_ICON = {
  note: `<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/>`,
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>`,
  tip: `<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>`,
  success: `<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>`,
  question: `<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/>`,
  warning: `<path d="M12 4l9 16H3zM12 10v4M12 17h.01"/>`,
  danger: `<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>`,
  example: `<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>`,
  quote: `<path d="M6 7h4v4.5c0 2.5-1.3 4.2-3.5 5M14 7h4v4.5c0 2.5-1.3 4.2-3.5 5"/>`,
};

class CalloutHead extends WidgetType {
  constructor(kind, label) {
    super();
    this.kind = kind;
    this.label = label;
  }
  eq(o) { return o.kind === this.kind && o.label === this.label; }
  toDOM() {
    const s = document.createElement("span");
    s.className = "cm-lp-callout-icon";
    s.innerHTML = IC(CALLOUT_ICON_NAME[this.kind] || "info");
    if (this.label) s.append(tr(this.label));
    return s;
  }
}

class Footnote extends WidgetType {
  constructor(id, text) {
    super();
    this.id = id;
    this.text = text;
  }
  eq(o) { return o.id === this.id && o.text === this.text; }
  toDOM() {
    const s = document.createElement("sup");
    s.className = "cm-lp-fn";
    s.textContent = this.id;
    if (this.text) s.title = this.text;
    return s;
  }
}

class Props extends WidgetType {
  constructor(text) {
    super();
    this.text = text;
  }
  eq(o) { return o.text === this.text; }
  toDOM(view) {
    const box = document.createElement("div");
    box.className = "cm-lp-props";
    const rows = [];
    for (const line of this.text.split("\n")) {
      const kv = line.match(/^([^\s:#][^:]*):\s*(.*)$/);
      const item = line.match(/^\s+-\s+(.*)$/);
      if (kv) rows.push([kv[1].trim(), kv[2].trim() ? [kv[2].trim()] : []]);
      else if (item && rows.length) rows[rows.length - 1][1].push(item[1].trim());
    }
    for (const [key, values] of rows) {
      const row = document.createElement("div");
      const k = document.createElement("span");
      k.className = "cm-lp-prop-key";
      k.textContent = key;
      const v = document.createElement("span");
      v.className = "cm-lp-prop-val";
      const list = values.length === 1 && /^\[.*\]$/.test(values[0]) ? values[0].slice(1, -1).split(",").map(x => x.trim()).filter(Boolean) : values;
      if (/^(tags?|теги|aliases)$/i.test(key) || list.length > 1) {
        for (const x of list) {
          const pill = document.createElement("span");
          pill.className = /^tags?$|^теги$/i.test(key) ? "cm-lp-tag" : "cm-lp-pill";
          pill.textContent = x.replace(/^["']|["']$/g, "");
          if (pill.className === "cm-lp-tag") pill.dataset.tag = pill.textContent.replace(/^#/, "");
          v.append(pill);
        }
      } else {
        v.textContent = list.join(", ").replace(/^["']|["']$/g, "");
      }
      row.append(k, v);
      box.append(row);
    }
    box.addEventListener("mousedown", e => {
      if (e.target.closest(".cm-lp-tag")) return;
      e.preventDefault();
      view.focus();
      view.dispatch({ selection: { anchor: 4 } });
    });
    return box;
  }
  ignoreEvent(e) { return !e.target?.closest?.(".cm-lp-tag"); }
}

const hide = Decoration.replace({});
const lineCls = cls => Decoration.line({ class: cls });
const markCls = cls => Decoration.mark({ class: cls });
const atomMark = Decoration.mark({});
let showMarks = false;
const EMPTY = { deco: Decoration.none, atoms: Decoration.none, prefix: new Map(), inlineStart: new Map(), inlineEnd: new Map(), blocks: new Set() };

function build(state) {
  const tree = ensureSyntaxTree(state, state.doc.length, 300);
  const out = [];
  if (!tree) return EMPTY;
  const { doc } = state;
  const ranges = state.selection.ranges;
  const fm = doc.sliceString(0, Math.min(doc.length, 20000)).match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  const fmEnd = fm ? doc.lineAt(fm[0].trimEnd().length).to : -1;
  const touches = (from, to) => ranges.some(r => r.from <= to && r.to >= from);
  const lineActive = pos => {
    const l = doc.lineAt(pos);
    return touches(l.from, l.to);
  };
  const near = (from, to) => showMarks && touches(from, to);
  const nearLine = pos => showMarks && lineActive(pos);
  const atoms = [];
  const prefix = new Map();
  const inlineStart = new Map();
  const inlineEnd = new Map();
  const blocks = new Set();
  const atom = (from, to, isPrefix) => {
    if (showMarks || to <= from) return;
    atoms.push(atomMark.range(from, to));
    if (isPrefix) {
      prefix.set(from, to);
    } else {
      inlineStart.set(from, to);
      inlineEnd.set(to, from);
    }
  };
  const withSpace = pos => Math.min(pos + (doc.sliceString(pos, pos + 1) === " " ? 1 : 0), doc.length);
  const add = (from, to, deco) => {
    if (from < to || deco.spec?.class || deco.spec?.attributes || deco === hide) out.push(deco.range(from, to));
  };
  const hideMark = (node, extra = 0) => {
    const to = extra ? withSpace(node.to) : node.to;
    if (to > node.from) out.push(hide.range(node.from, to));
    atom(node.from, to, !!extra);
  };
  const lines = (from, to, cls) => {
    for (let n = doc.lineAt(from).number, end = doc.lineAt(to).number; n <= end; n++) {
      const l = doc.line(n);
      out.push(lineCls(cls).range(l.from));
    }
  };

  tree.iterate({
    enter(ref) {
      const node = ref.node;
      const name = node.name;
      if (fm && name !== "Document" && node.from <= fmEnd) return false;
      let m;
      if ((m = name.match(/^ATXHeading(\d)$/))) {
        out.push(lineCls(`cm-lp-h cm-lp-h${m[1]}`).range(doc.lineAt(node.from).from));
        if (!nearLine(node.from)) {
          const mark = node.getChild("HeaderMark");
          if (mark && (showMarks || doc.sliceString(mark.to, mark.to + 1) === " ")) hideMark(mark, 1);
        }
        return;
      }
      if ((m = name.match(/^SetextHeading(\d)$/))) {
        out.push(lineCls(`cm-lp-h cm-lp-h${m[1]}`).range(doc.lineAt(node.from).from));
        return;
      }
      if (name === "Emphasis" || name === "StrongEmphasis" || name === "Strikethrough" || name === "InlineCode" || name === "Highlight") {
        const cls = { Emphasis: "cm-lp-em", StrongEmphasis: "cm-lp-strong", Strikethrough: "cm-lp-del", InlineCode: "cm-lp-code", Highlight: "cm-lp-mark" }[name];
        add(node.from, node.to, markCls(cls));
        if (!near(node.from, node.to)) {
          for (const k of ["EmphasisMark", "StrikethroughMark", "CodeMark", "HighlightMark"]) {
            for (const c of node.getChildren(k)) hideMark(c);
          }
        }
        return;
      }
      if (name === "Link") {
        if (doc.sliceString(node.from, node.from + 2) === "[^") return false;
        const marks = node.getChildren("LinkMark");
        const url = node.getChild("URL");
        if (marks.length >= 2 && !touches(node.from, node.to)) {
          const href = url ? doc.sliceString(url.from, url.to) : "";
          out.push(hide.range(node.from, marks[0].to));
          if (marks[1].from > marks[0].to) {
            out.push(Decoration.mark({ class: "cm-lp-link", attributes: { "data-url": href } }).range(marks[0].to, marks[1].from));
          }
          out.push(hide.range(marks[1].from, node.to));
        } else {
          add(node.from, node.to, markCls("cm-lp-link-raw"));
        }
        return false;
      }
      if (name === "Image") {
        const url = node.getChild("URL");
        const src = url ? doc.sliceString(url.from, url.to).replace(/^<|>$/g, "") : "";
        if (src && !touches(node.from, node.to)) {
          const alt = doc.sliceString(node.from + 2, (node.getChildren("LinkMark")[1] || node).from);
          const m = alt.match(/^(.*?)\|(\d+)(?:x\d+)?$/);
          out.push(Decoration.replace({ widget: new Image(src, m ? m[1] : alt, m ? +m[2] : 0) }).range(node.from, node.to));
        }
        return false;
      }
      if (name === "URL" && ref.node.parent?.name !== "Link" && ref.node.parent?.name !== "Image") {
        add(node.from, node.to, Decoration.mark({ class: "cm-lp-link", attributes: { "data-url": doc.sliceString(node.from, node.to).replace(/^<|>$/g, "") } }));
        return;
      }
      if (name === "Blockquote") {
        const head = doc.lineAt(node.from);
        const cm = head.text.match(/^(\s*>\s*)\[!([\w-]+)\][+-]?(\s*)(.*)$/);
        if (!cm) {
          lines(node.from, node.to, "cm-lp-quote");
          return;
        }
        const type = cm[2].toLowerCase();
        const kind = CALLOUTS[type] || "note";
        for (let n = head.number, end = doc.lineAt(node.to).number; n <= end; n++) {
          out.push(Decoration.line({ class: n === head.number ? "cm-lp-callout cm-lp-callout-head" : "cm-lp-callout", attributes: { "data-callout": kind } }).range(doc.line(n).from));
        }
        if (!nearLine(head.from)) {
          const from = head.from + cm[1].length;
          const to = from + cm[2].length + 3 + (head.text.slice(cm[1].length + cm[2].length + 3).match(/^[+-]?\s*/)[0].length);
          out.push(Decoration.replace({ widget: new CalloutHead(kind, cm[4].trim() ? "" : CALLOUT_LABEL[type] || cm[2]) }).range(from, to));
          atom(from, to, true);
        }
        return;
      }
      if (name === "QuoteMark") {
        if (!nearLine(node.from)) hideMark(node, 1);
        return;
      }
      if (name === "ListMark") {
        const item = node.parent;
        const task = item?.getChild("Task");
        if (nearLine(node.from)) return;
        if (task) {
          hideMark(node, 1);
          return;
        }
        if (!showMarks && doc.sliceString(node.to, node.to + 1) !== " ") return;
        if (item?.parent?.name === "BulletList") {
          out.push(Decoration.replace({ widget: new Bullet() }).range(node.from, node.to));
        } else {
          add(node.from, node.to, markCls("cm-lp-num"));
        }
        atom(node.from, withSpace(node.to), true);
        return;
      }
      if (name === "Task") {
        const marker = node.getChild("TaskMarker");
        if (!marker) return;
        const done = /x/i.test(doc.sliceString(marker.from, marker.to));
        if (done) add(marker.to, node.to, markCls("cm-lp-done"));
        if (!nearLine(node.from)) {
          const to = withSpace(marker.to);
          out.push(Decoration.replace({ widget: new Check(done, marker.from) }).range(marker.from, to));
          atom(marker.from, to, true);
        }
        return;
      }
      if (name === "HorizontalRule") {
        if (!lineActive(node.from)) out.push(Decoration.replace({ widget: new Rule() }).range(node.from, node.to));
        if (!showMarks) blocks.add(doc.lineAt(node.from).from);
        return false;
      }
      if (name === "FencedCode") {
        const first = doc.lineAt(node.from).number;
        const last = doc.lineAt(node.to).number;
        const inside = touches(node.from, node.to);
        for (let n = first; n <= last; n++) {
          const line = doc.line(n);
          const fence = (n === first || n === last) && /^\s*(`{3,}|~{3,})/.test(line.text);
          if (!fence) {
            out.push(lineCls("cm-lp-codeblock").range(line.from));
          } else if (showMarks) {
            out.push(lineCls(inside ? "cm-lp-codeblock cm-lp-fence" : "cm-lp-codeblock cm-lp-fence cm-lp-fence-hidden").range(line.from));
          } else {
            blocks.add(line.from);
            const active = touches(line.from, line.to);
            out.push(lineCls(active ? "cm-lp-codeblock cm-lp-fence" : "cm-lp-codeblock cm-lp-fence cm-lp-fence-hidden").range(line.from));
            if (!active && line.to > line.from) out.push(hide.range(line.from, line.to));
          }
        }
        return false;
      }
      if (name === "Table") {
        const first = doc.lineAt(node.from).number;
        const end = doc.lineAt(node.to).number;
        let last = first + 1;
        while (last < end && doc.line(last + 1).text.includes("|")) last++;
        const from = doc.line(first).from;
        const to = doc.line(Math.min(last, doc.lines)).to;
        out.push(Decoration.replace({ widget: new Table(doc.sliceString(from, to), from), block: true }).range(from, to));
        return false;
      }
    },
  });
  if (fm) {
    if (!touches(0, fmEnd)) out.push(Decoration.replace({ widget: new Props(fm[1]), block: true }).range(0, fmEnd));
    else lines(0, fmEnd, "cm-lp-fm");
  }
  const notes = new Map();
  for (const m of doc.toString().matchAll(/^\[\^([^\]\s]+)\]:[ \t]*(.*)$/gm)) notes.set(m[1], m[2]);
  const inCode = pos => /Code|HTMLBlock/.test(tree.resolveInner(pos, 1).name);
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    if (line.to <= fmEnd || !/[#%^]/.test(line.text)) continue;
    if (/^\[\^[^\]\s]+\]:/.test(line.text)) out.push(lineCls("cm-lp-fndef").range(line.from));
    for (const m of line.text.matchAll(/(^|[\s(])#([\p{L}\p{N}_\/-]*[\p{L}_\/-][\p{L}\p{N}_\/-]*)/gu)) {
      const from = line.from + m.index + m[1].length;
      if (/^#{1,6}\s/.test(line.text) && m.index === 0) continue;
      if (inCode(from)) continue;
      out.push(Decoration.mark({ class: "cm-lp-tag", attributes: { "data-tag": m[2] } }).range(from, from + m[2].length + 1));
    }
    for (const m of line.text.matchAll(/\[\^([^\]\s]+)\](?!:)/g)) {
      const from = line.from + m.index;
      const to = from + m[0].length;
      if (inCode(from)) continue;
      if (touches(from, to)) out.push(markCls("cm-lp-fn-raw").range(from, to));
      else out.push(Decoration.replace({ widget: new Footnote(m[1], notes.get(m[1]) || "") }).range(from, to));
    }
    for (const m of line.text.matchAll(/%%.*?%%/g)) {
      const from = line.from + m.index;
      if (!inCode(from)) out.push(markCls("cm-lp-comment").range(from, from + m[0].length));
    }
  }
  const wiki = /(!?)\[\[([^\]|#\n]+)(#[^\]|\n]*)?(?:\|([^\]\n]*))?\]\]/g;
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    if (!line.text.includes("[[")) continue;
    for (const m of line.text.matchAll(wiki)) {
      const from = line.from + m.index;
      const to = from + m[0].length;
      if (/Code/.test(tree.resolveInner(from, 1).name)) continue;
      const target = m[2].trim();
      if (m[1]) {
        if (!/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(target)) continue;
        if (touches(from, to)) out.push(markCls("cm-lp-link-raw").range(from, to));
        else out.push(Decoration.replace({ widget: new Image(target, "", parseInt(m[4], 10) || 0) }).range(from, to));
        continue;
      }
      const exists = noteNames.has(target.toLowerCase()) || noteNames.has(target.split("/").pop().toLowerCase());
      if (touches(from, to)) {
        out.push(markCls(exists ? "cm-lp-wiki-raw" : "cm-lp-wiki-raw cm-lp-wiki-missing").range(from, to));
      } else {
        const label = m[4] || (m[3] ? `${target} › ${m[3].slice(1)}` : target);
        out.push(Decoration.replace({ widget: new WikiLink(target, label, exists) }).range(from, to));
      }
    }
  }
  return { deco: Decoration.set(out, true), atoms: Decoration.set(atoms, true), prefix, inlineStart, inlineEnd, blocks };
}

const livePreview = StateField.define({
  create: state => build(state),
  update(lp, tr) {
    return tr.docChanged || tr.selection || tr.effects.some(e => e.is(refreshLinks)) || ensureSyntaxTree(tr.state, tr.state.doc.length, 0) !== ensureSyntaxTree(tr.startState, tr.startState.doc.length, 0) ? build(tr.state) : lp;
  },
  provide: f => [EditorView.decorations.from(f, lp => lp.deco), EditorView.atomicRanges.from(f, lp => () => lp.atoms)],
});

const caretFix = EditorState.transactionFilter.of(tr => {
  if (showMarks || !tr.selection || tr.selection.ranges.length > 1 || !tr.selection.main.empty) return tr;
  const lp = tr.state.field(livePreview, false);
  if (!lp) return tr;
  const { doc } = tr.state;
  const start = tr.selection.main.head;
  let head = start;
  let append = false;
  const dir = head >= tr.startState.selection.main.head ? 1 : -1;
  if (!tr.docChanged && tr.isUserEvent("select") && !tr.isUserEvent("select.pointer")) {
    const map = dir > 0 ? lp.inlineStart : lp.inlineEnd;
    const old = tr.startState.selection.main.head;
    let p = old;
    for (let i = 0; i < 10 && map.has(p); i++) p = map.get(p);
    if (p === head && p !== old) {
      const line = doc.lineAt(head);
      const at = head - line.from;
      if (dir > 0) head = at < line.length ? line.from + findClusterBreak(line.text, at, true) : Math.min(head + 1, doc.length);
      else head = at > 0 ? line.from + findClusterBreak(line.text, at, false) : Math.max(head - 1, 0);
    }
    for (let i = 0; i < 10 && map.has(head); i++) head = map.get(head);
  }
  if (!tr.docChanged && lp.blocks.size) {
    for (let i = 0; i < 100 && lp.blocks.has(doc.lineAt(head).from); i++) {
      const n = doc.lineAt(head).number;
      if (dir < 0 && n > 1) head = doc.line(n - 1).to;
      else if (n < doc.lines) head = doc.line(n + 1).from;
      else {
        append = true;
        break;
      }
    }
  }
  for (let i = 0; i < 10 && lp.prefix.has(head); i++) head = lp.prefix.get(head);
  if (append) return [tr, { changes: { from: doc.length, insert: "\n" }, selection: { anchor: doc.length + 1 }, sequential: true }];
  return head === start ? tr : [tr, { selection: { anchor: head }, sequential: true }];
});

const FORMAT = ["Emphasis", "StrongEmphasis", "Strikethrough", "Highlight", "InlineCode"];
const EMPTY_PAIRS = ["**", "~~", "==", "*", "_", "`"];
const smartDelete = forward => view => {
  const lp = view.state.field(livePreview, false);
  const sel = view.state.selection;
  if (showMarks || !lp || sel.ranges.length > 1 || !sel.main.empty) return false;
  const map = forward ? lp.inlineStart : lp.inlineEnd;
  let p = sel.main.head;
  for (let i = 0; i < 10 && map.has(p); i++) p = map.get(p);
  let inFormat = false;
  for (let n = syntaxTree(view.state).resolveInner(p, forward ? 1 : -1); n; n = n.parent) if (FORMAT.includes(n.name)) inFormat = true;
  if (p !== sel.main.head) view.dispatch({ selection: { anchor: p } });
  (forward ? deleteCharForward : deleteCharBackward)(view);
  if (!inFormat) return true;
  const { doc, selection } = view.state;
  const h = selection.main.head;
  const pair = EMPTY_PAIRS.find(m => doc.sliceString(h - m.length, h) === m && doc.sliceString(h, h + m.length) === m);
  if (pair) view.dispatch({ changes: { from: h - pair.length, to: h + pair.length }, userEvent: forward ? "delete.forward" : "delete.backward" });
  return true;
};

let pending = null;
const pendingInput = EditorView.inputHandler.of((view, from, to, text) => {
  if (!pending || from !== to || from !== pending.pos) return false;
  const left = pending.marks.join("");
  const right = [...pending.marks].reverse().join("");
  pending = null;
  view.dispatch({ changes: { from, insert: left + text + right }, selection: { anchor: from + left.length + text.length }, userEvent: "input.type" });
  return true;
});

/* ==выделение== как в Obsidian */
const HighlightDelim = { resolve: "Highlight", mark: "HighlightMark" };
const Highlight = {
  defineNodes: [{ name: "Highlight", style: tags.special(tags.content) }, { name: "HighlightMark", style: tags.processingInstruction }],
  parseInline: [{
    name: "Highlight",
    parse(cx, next, pos) {
      if (next !== 61 || cx.char(pos + 1) !== 61 || cx.char(pos + 2) === 61) return -1;
      const before = cx.slice(pos - 1, pos);
      const after = cx.slice(pos + 2, pos + 3);
      return cx.addDelimiter(HighlightDelim, pos, pos + 2, !/\s|^$/.test(after), !/\s|^$/.test(before));
    },
    after: "Emphasis",
  }],
};

/* ------------------------------ команды ------------------------------ */

const WRAP_NODE = { "**": "StrongEmphasis", "*": "Emphasis", "~~": "Strikethrough", "==": "Highlight", "`": "InlineCode" };
const nodeAt = (state, pos, test) => {
  for (const side of [-1, 1]) {
    for (let n = syntaxTree(state).resolveInner(pos, side); n; n = n.parent) if (test(n.name)) return n;
  }
  return null;
};

const wrap = (left, right = left) => view => {
  const { state } = view;
  const sel = state.selection;
  if (nodeAt(state, sel.main.head, n => n === "FencedCode" || n === "CodeBlock")) return true;
  if (!showMarks && state.field(livePreview, false) && sel.ranges.length === 1 && sel.main.empty) {
    const pos = sel.main.head;
    const node = nodeAt(state, pos, n => n === WRAP_NODE[left]);
    const open = node?.firstChild;
    const close = node?.lastChild;
    let to = null;
    if (node && open && close && open !== close) {
      if (pos === node.to) to = close.from;
      else if (pos === node.from) to = open.to;
      else if (pos <= open.to) to = node.from;
      else if (pos >= close.from) to = node.to;
    }
    if (to !== null) {
      view.dispatch({ selection: { anchor: to } });
    } else {
      if (pending?.pos !== pos) pending = { pos, marks: [] };
      const i = pending.marks.indexOf(left);
      if (i >= 0) pending.marks.splice(i, 1);
      else pending.marks.push(left);
      if (!pending.marks.length) pending = null;
    }
    view.focus();
    return true;
  }
  view.dispatch(view.state.changeByRange(range => {
    const { from, to } = range;
    const doc = view.state.doc;
    if (doc.sliceString(from - left.length, from) === left && doc.sliceString(to, to + right.length) === right) {
      return {
        changes: [{ from: from - left.length, to: from }, { from: to, to: to + right.length }],
        range: EditorSelection.range(from - left.length, to - left.length),
      };
    }
    return {
      changes: [{ from, insert: left }, { from: to, insert: right }],
      range: EditorSelection.range(from + left.length, to + left.length),
    };
  }));
  view.focus();
  return true;
};

const link = view => {
  const { from, to } = view.state.selection.main;
  const text = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `[${text}](url)` },
    selection: { anchor: from + text.length + 3, head: from + text.length + 6 },
  });
  view.focus();
  return true;
};

const PREFIX = /^(\s*)(?:#{1,6} |[-*+] \[[ xX]\] |[-*+] |\d{1,9}[.)] |> )?/;
const prefix = (make, test) => view => {
  const { state } = view;
  const lines = [];
  for (const r of state.selection.ranges) {
    for (let n = state.doc.lineAt(r.from).number; n <= state.doc.lineAt(r.to).number; n++) {
      if (!lines.includes(n)) lines.push(n);
    }
  }
  const all = lines.every(n => !state.doc.line(n).text.trim() || test.test(state.doc.line(n).text));
  let k = 0;
  const changes = lines.map(n => {
    const line = state.doc.line(n);
    const m = line.text.match(PREFIX);
    return { from: line.from + m[1].length, to: line.from + m[0].length, insert: all ? "" : make(++k) };
  });
  view.dispatch({ changes });
  view.focus();
  return true;
};

const blockAt = (text, caret, cell) => view => {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const empty = !line.text.trim();
  const lead = empty ? "" : "\n\n";
  const from = empty ? line.from : line.to;
  const next = line.number < state.doc.lines ? state.doc.line(line.number + 1) : null;
  const tail = next && next.text.trim() ? "\n" : "";
  if (cell) pendingCell = { from: from + lead.length, r: 0, c: 0 };
  view.dispatch({ changes: { from, to: line.to, insert: lead + text + tail }, selection: { anchor: from + lead.length + caret } });
  view.focus();
  return true;
};

export const COMMANDS = {
  bold: wrap("**"),
  italic: wrap("*"),
  strike: wrap("~~"),
  highlight: wrap("=="),
  code: wrap("`"),
  link,
  h1: prefix(() => "# ", /^\s*# /),
  h2: prefix(() => "## ", /^\s*## /),
  h3: prefix(() => "### ", /^\s*### /),
  bullet: prefix(() => "- ", /^\s*[-*+] (?!\[[ xX]\] )/),
  ordered: prefix(n => `${n}. `, /^\s*\d{1,9}[.)] /),
  task: prefix(() => "- [ ] ", /^\s*[-*+] \[[ xX]\] /),
  quote: prefix(() => "> ", /^\s*> /),
  codeblock: blockAt("```\n\n```", 4),
  table: view => blockAt(`| ${tr("Столбец")} 1 | ${tr("Столбец")} 2 |\n| --- | --- |\n|  |  |`, 0, true)(view),
  hr: blockAt("---\n", 4),
  template: () => {
    openTemplate?.();
    return true;
  },
};
let openTemplate = null;
let tr = s => s;

const P = d => `<path d="${d}"/>`;
export const ICONS = {
  bold: P("M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"),
  italic: P("M10 5h8M6 19h8M14 5l-4 14"),
  strike: P("M16.5 7.5C15.7 6 14.2 5 12 5c-2.8 0-4.8 1.4-4.8 3.6 0 1.3.7 2.3 2.2 3M7.5 16.5C8.3 18 9.8 19 12 19c2.8 0 4.8-1.4 4.8-3.6 0-.5-.1-1-.4-1.4M4 12h16"),
  highlight: P("M5 19h14M8 15l7.5-9.5a2 2 0 0 1 3 2.5L11 17H8z"),
  code: P("M9 8l-4 4 4 4M15 8l4 4-4 4"),
  link: P("M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"),
  h1: P("M4 6v12M12 6v12M4 12h8M17 10l2-1.5V18"),
  h2: P("M4 6v12M12 6v12M4 12h8M16.5 10.5a1.8 1.8 0 0 1 3.5.6c0 1.6-3.5 3.4-3.5 6.9h3.5"),
  h3: P("M4 6v12M12 6v12M4 12h8M16.5 9h3.3l-2 3c1.3 0 2.2.9 2.2 2.2s-1 2.3-2.3 2.3c-.7 0-1.2-.2-1.7-.7"),
  bullet: P("M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"),
  ordered: P("M10 6h10M10 12h10M10 18h10M4 4.5l1.5-1V9M3.5 13.3c.4-.8 2.2-.8 2.2.4 0 1-2.2 1.8-2.2 3h2.4"),
  task: `<rect x="3.5" y="4.5" width="6" height="6" rx="1.5"/>` + P("M4 16.5l1.8 1.8 3.4-3.6M13 7.5h7.5M13 16.5h7.5"),
  quote: P("M6 7h4v4.5c0 2.5-1.3 4.2-3.5 5M14 7h4v4.5c0 2.5-1.3 4.2-3.5 5"),
  table: `<rect x="3.5" y="4.5" width="17" height="15" rx="2"/>` + P("M3.5 10h17M3.5 15h17M10 4.5v15"),
  codeblock: `<rect x="3.5" y="4.5" width="17" height="15" rx="2"/>` + P("M10 10l-2 2 2 2M14 10l2 2-2 2"),
  hr: P("M4 12h16M7 7.5h10M7 16.5h10"),
  template: `<rect x="4" y="4" width="16" height="16" rx="2"/>` + P("M4 9h16M9 9v11"),
};
export const TITLES = {
  bold: "Жирный", italic: "Курсив", strike: "Зачёркнутый", highlight: "Выделение цветом", code: "Код в строке", link: "Ссылка",
  h1: "Заголовок 1", h2: "Заголовок 2", h3: "Заголовок 3", bullet: "Список", ordered: "Нумерованный список", task: "Задача",
  quote: "Цитата", table: "Таблица", codeblock: "Блок кода", hr: "Разделитель", template: "Шаблон",
};
const KEYS = { bold: "Ctrl+B", italic: "Ctrl+I", link: "Ctrl+K", strike: "Ctrl+Shift+X", code: "Ctrl+E", highlight: "Ctrl+Shift+H" };
export const label = k => tr(TITLES[k]) + (KEYS[k] ? ` (${KEYS[k]})` : "");
const button = (k, cls = "cm-lp-tool") => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.dataset.cmd = k;
  b.title = label(k);
  b.setAttribute("aria-label", label(k));
  b.innerHTML = IC(ICON_NAME[k]);
  return b;
};
export const toolButton = button;

const tableTab = back => view => {
  const { state } = view;
  const doc = state.doc;
  const pos = state.selection.main.head;
  const line = doc.lineAt(pos);
  const isRow = n => n >= 1 && n <= doc.lines && /^\s*\|/.test(doc.line(n).text);
  if (!isRow(line.number)) return false;
  let s = line.number;
  while (isRow(s - 1)) s--;
  let e = line.number;
  while (isRow(e + 1)) e++;
  if (e - s < 1 || !/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(doc.line(s + 1).text)) return false;
  const src = [];
  for (let n = s; n <= e; n++) src.push(doc.line(n).text);
  const model = parseTable(src);
  const cols = model.align.length;
  const before = line.text.slice(0, pos - line.from);
  const col = Math.min(cols - 1, Math.max(0, (before.match(/(?<!\\)\|/g) || []).length - 1));
  const d = line.number - s;
  let r = d < 2 ? 0 : d - 1;
  let c = col + (back ? -1 : 1);
  if (c >= cols) { c = 0; r++; } else if (c < 0) { c = cols - 1; r--; }
  if (r < 0) { r = 0; c = 0; }
  if (r >= model.rows.length) model.rows.push(Array(cols).fill(""));
  const out = formatTable(model);
  const from = doc.line(s).from;
  const li = r === 0 ? 0 : r + 1;
  const row = out[li];
  const base = from + out.slice(0, li).join("\n").length + (li ? 1 : 0);
  const pipes = [...row.matchAll(/(?<!\\)\|/g)].map(m => m.index);
  const a = pipes[c] + 2;
  const b = Math.max(a, row.slice(0, pipes[c + 1]).trimEnd().length);
  view.dispatch({ changes: { from, to: doc.line(e).to, insert: out.join("\n") }, selection: { anchor: base + a, head: base + b } });
  return true;
};

/* ------------------------------ панелька при выделении ------------------------------ */

const SEL_TOOLS = ["bold", "italic", "strike", "highlight", "code", "link", "h1", "h2", "quote"];
const selBar = StateField.define({
  create: () => null,
  update(tip, trn) {
    const sel = trn.state.selection.main;
    if (sel.empty || trn.state.selection.ranges.length > 1) return null;
    if (tip && !trn.docChanged && !trn.selection) return tip;
    return {
      pos: sel.from,
      above: true,
      strictSide: false,
      arrow: false,
      create(view) {
        const dom = document.createElement("div");
        dom.className = "cm-lp-selbar";
        for (const k of SEL_TOOLS) dom.append(button(k));
        dom.addEventListener("mousedown", e => e.preventDefault());
        dom.addEventListener("click", e => {
          const b = e.target.closest("button");
          if (b) COMMANDS[b.dataset.cmd](view);
        });
        return { dom, offset: { x: 0, y: 10 } };
      },
    };
  },
  provide: f => showTooltip.from(f),
});

/* ------------------------------ меню по «/» ------------------------------ */

const SLASH = ["h1", "h2", "h3", "bullet", "ordered", "task", "quote", "table", "codeblock", "hr", "template"];
const slashSource = context => {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const m = before.match(/^(\s*)\/([\p{L}\d ]*)$/u);
  if (!m) return null;
  const from = line.from + m[1].length + 1;
  return {
    from,
    filter: true,
    options: SLASH.map(k => ({
      label: tr(TITLES[k]),
      type: k,
      apply(view, completion, a, b) {
        view.dispatch({ changes: { from: a - 1, to: b, insert: "" } });
        COMMANDS[k](view);
      },
    })),
  };
};

/* ------------------------------ меню правой кнопки ------------------------------ */

let menuEl = null;
const closeMenu = () => {
  menuEl?.remove();
  menuEl = null;
};
function openMenu(view, x, y) {
  closeMenu();
  const menu = document.createElement("div");
  menu.className = "cm-lp-menu";
  const item = (text, run, icon) => {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = icon ? IC(ICON_NAME[icon]) : "<i></i>";
    b.append(text);
    b.addEventListener("click", () => {
      closeMenu();
      run();
    });
    menu.append(b);
  };
  const sep = () => menu.append(document.createElement("hr"));
  const has = !view.state.selection.main.empty;
  if (has) {
    item(tr("Вырезать"), () => document.execCommand("cut"));
    item(tr("Копировать"), () => document.execCommand("copy"));
  }
  item(tr("Вставить"), async () => {
    try {
      const text = await navigator.clipboard.readText();
      view.dispatch(view.state.replaceSelection(text));
    } catch {}
  });
  sep();
  for (const k of ["bold", "italic", "strike", "highlight", "code", "link"]) item(label(k), () => COMMANDS[k](view), k);
  sep();
  for (const k of ["h1", "h2", "h3", "bullet", "ordered", "task", "quote"]) item(tr(TITLES[k]), () => COMMANDS[k](view), k);
  sep();
  for (const k of ["table", "codeblock", "hr"]) item(tr(TITLES[k]), () => COMMANDS[k](view), k);
  document.body.append(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, innerWidth - r.width - 8)}px`;
  menu.style.top = `${Math.max(8, Math.min(y, innerHeight - r.height - 8))}px`;
  menuEl = menu;
}
addEventListener("mousedown", e => menuEl && !menuEl.contains(e.target) && closeMenu(), true);
addEventListener("keydown", e => e.key === "Escape" && closeMenu(), true);
addEventListener("blur", closeMenu);

const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif", "image/bmp": "bmp", "image/svg+xml": "svg" };
async function insertImages(view, files, pos, pasted, saveImage) {
  const parts = [];
  for (const file of files) {
    const ext = EXT[file.type] || "png";
    const d = new Date();
    const p = x => String(x).padStart(2, "0");
    const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
    const name = pasted || !file.name ? `${tr("Изображение")} ${stamp}.${ext}` : file.name;
    const b64 = await new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.readAsDataURL(file);
    });
    const saved = await saveImage(name, b64);
    if (saved) parts.push(`![[${saved}]]`);
  }
  if (!parts.length) return;
  const insert = parts.join("\n");
  view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length }, userEvent: "input.paste" });
  view.focus();
}

/* ------------------------------ редактор ------------------------------ */

const style = HighlightStyle.define([
  { tag: tags.processingInstruction, class: "cm-lp-markup" },
  { tag: tags.heading, class: "cm-lp-src-h" },
  { tag: tags.strong, class: "cm-lp-strong" },
  { tag: tags.emphasis, class: "cm-lp-em" },
  { tag: tags.strikethrough, class: "cm-lp-del" },
  { tag: tags.monospace, class: "cm-lp-mono" },
  { tag: tags.link, class: "cm-lp-link-raw" },
  { tag: tags.url, class: "cm-lp-link-raw" },
]);

export function createEditor(parent, { text = "", placeholderText = "", onChange, openUrl, t, settings = {}, getImage, saveImage, onLink, onTag, onTemplate } = {}) {
  if (t) tr = t;
  loadImage = getImage;
  openNote = onLink;
  openTag = onTag;
  openTemplate = onTemplate;
  imageCache.clear();
  const mode = new Compartment();
  const spell = new Compartment();
  const extras = new Compartment();
  let opts = {};
  const parts = s => {
    opts = { live: s.live !== false, spell: !!s.spell, selBar: s.selBar !== false, slash: s.slash !== false, menu: s.menu !== false };
    showMarks = !!s.marks;
    pending = null;
    return {
      mode: opts.live ? [livePreview, caretFix, pendingInput] : [],
      spell: EditorView.contentAttributes.of({ spellcheck: String(opts.spell) }),
      extras: [
        opts.selBar ? selBar : [],
        autocompletion({ override: opts.slash ? [slashSource, wikiSource] : [wikiSource], icons: false }),
      ],
    };
  };
  const first = parts(settings);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: text,
      selection: { anchor: (text.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/) || [""])[0].length },
      extensions: [
        history(),
        markdown({ base: markdownLanguage, extensions: [Highlight] }),
        syntaxHighlighting(style),
        search({ top: true }),
        mode.of(first.mode),
        spell.of(first.spell),
        extras.of(first.extras),
        EditorView.lineWrapping,
        placeholder(placeholderText),
        keymap.of([
          { key: "Mod-b", run: COMMANDS.bold },
          { key: "Mod-i", run: COMMANDS.italic },
          { key: "Mod-k", run: COMMANDS.link },
          { key: "Mod-Shift-x", run: COMMANDS.strike },
          { key: "Mod-Shift-h", run: COMMANDS.highlight },
          { key: "Mod-e", run: COMMANDS.code },
          { key: "Tab", run: v => tableTab(false)(v) || indentMore(v) },
          { key: "Shift-Tab", run: v => tableTab(true)(v) || indentLess(v) },
          { key: "Backspace", run: smartDelete(false) },
          { key: "Delete", run: smartDelete(true) },
          ...completionKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...defaultKeymap,
        ]),
        EditorView.updateListener.of(u => {
          if (pending && (u.docChanged || u.selectionSet)) pending = null;
          if (u.docChanged) onChange?.(u.state.doc.toString());
        }),
        EditorView.domEventHandlers({
          mousedown(e) {
            const tag = e.target.closest?.(".cm-lp-tag[data-tag]");
            if (tag && e.button === 0 && openTag) {
              e.preventDefault();
              openTag(tag.dataset.tag);
              return true;
            }
            const a = e.target.closest?.(".cm-lp-link[data-url]");
            if (!a || e.button !== 0 || e.altKey) return false;
            e.preventDefault();
            openUrl?.(a.dataset.url);
            return true;
          },
          paste(e, v) {
            const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith("image/"));
            if (!files.length || !saveImage) return false;
            e.preventDefault();
            insertImages(v, files, v.state.selection.main.head, true, saveImage);
            return true;
          },
          drop(e, v) {
            const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith("image/"));
            if (!files.length || !saveImage) return false;
            e.preventDefault();
            const pos = v.posAtCoords({ x: e.clientX, y: e.clientY }) ?? v.state.selection.main.head;
            insertImages(v, files, pos, false, saveImage);
            return true;
          },
          contextmenu(e, v) {
            if (!opts.menu) return false;
            e.preventDefault();
            openMenu(v, e.clientX, e.clientY);
            return true;
          },
        }),
      ],
    }),
  });
  return {
    view,
    get text() { return view.state.doc.toString(); },
    setText(next) {
      const head = Math.min(view.state.selection.main.head, next.length);
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next }, selection: { anchor: head } });
    },
    configure(s) {
      const p = parts(s);
      view.dispatch({ effects: [mode.reconfigure(p.mode), spell.reconfigure(p.spell), extras.reconfigure(p.extras), refreshLinks.of(null)] });
      requestAnimationFrame(() => view.requestMeasure());
    },
    run(cmd) { return COMMANDS[cmd]?.(view); },
    insert(text) {
      view.dispatch(view.state.replaceSelection(text));
      view.focus();
    },
    setNotes(names) {
      noteList = names;
      noteNames = new Set(names.map(n => n.toLowerCase()));
      view.dispatch({ effects: refreshLinks.of(null) });
    },
    focus() { view.focus(); },
    destroy() {
      closeMenu();
      view.destroy();
    },
  };
}

