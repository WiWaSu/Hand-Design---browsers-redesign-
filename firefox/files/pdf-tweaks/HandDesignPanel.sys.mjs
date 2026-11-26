/* Боковая панель Hand Design: заметки и документы в узкой колонке, поиск, быстрая заметка.
   Данные — через HDNewtab:* (HandDesignNewtabParent.sys.mjs), страница resource://handdesign/panel.html. */
import { ensureIcons } from "resource://pdftweaks/hd-icons.mjs";

const KIND = [["md", "MD", /\.(md|markdown|mdown|mkd|mkdn)$/i], ["csv", "CSV", /\.(csv|tsv)$/i], ["pdf", "PDF", /\.pdf$/i], ["img", "IMG", /\.(png|jpe?g|gif|webp|avif|bmp)$/i]];

export function mountPanel(win, doc, { t, q }) {
  doc.documentElement.setAttribute("data-hd-md", "");
  doc.title = t("Заметки и документы");
  try {
    ensureIcons(doc);
  } catch {}
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
  const lang = doc.documentElement.lang || undefined;
  const fmtT = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" });
  const fmtD = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });
  const when = ms => {
    if (!ms) return "";
    const d = new Date(ms), now = new Date();
    if (d.toDateString() === now.toDateString()) return fmtT.format(d);
    return fmtD.format(d);
  };
  const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е");

  const root = h("main", "hd-panel");
  const seg = h("div", "hd-panel-seg");
  const tabs = [["notes", "Заметки"], ["docs", "Документы"]].map(([id, label]) => {
    const b = h("button", "", t(label));
    b.dataset.v = id;
    b.addEventListener("click", () => setTab(id));
    seg.append(b);
    return b;
  });
  const find = h("label", "hd-panel-find");
  const input = h("input");
  input.type = "search";
  find.append(icon("search"), input);
  const list = h("div", "hd-panel-list");
  const quick = h("div", "hd-panel-quick");
  const ta = h("textarea");
  ta.rows = 2;
  ta.placeholder = t("Быстрая заметка: Enter — сохранить во «Входящие»");
  const qbar = h("div", "hd-panel-qbar");
  const linkBtn = h("button", "hd-panel-link");
  linkBtn.append(icon("link"), h("span", "", t("ссылка на страницу")));
  const saved = h("span", "hd-panel-saved");
  qbar.append(linkBtn, saved);
  quick.append(ta, qbar);
  root.append(seg, find, list, quick);
  doc.body.append(root);

  let tab = "notes";
  try {
    tab = win.localStorage.getItem("hd-panel-tab") === "docs" ? "docs" : "notes";
  } catch {}
  let notes = null;
  let docs = null;
  let hitSeq = 0;

  const openNote = rel => {
    try {
      win.localStorage.setItem("hd-notes-last", rel);
      win.localStorage.setItem("hd-notes-open", rel + "|" + Date.now());
    } catch {}
    q("note-open", { rel });
  };
  const section = title => list.append(h("div", "hd-panel-lab", t(title)));
  const noteRow = n => {
    const b = h("button", "hd-panel-row");
    const ic = h("span", "hd-panel-ic");
    ic.append(icon(n.pinned ? "pin" : "note"));
    const txt = h("span", "hd-panel-txt");
    txt.append(h("b", "", n.title));
    let sub = n.snippet || n.preview || "";
    if (n.tasks) sub = `${n.done}/${n.tasks} ✓` + (sub ? " · " + sub : "");
    const folder = n.rel.includes("/") ? n.rel.slice(0, n.rel.lastIndexOf("/")) : "";
    if (folder) sub = folder + (sub ? " · " + sub : "");
    if (sub) txt.append(h("small", "", sub));
    b.append(ic, txt);
    if (n.mtime) b.append(h("time", "", when(n.mtime)));
    b.title = n.rel;
    b.addEventListener("click", () => openNote(n.rel));
    return b;
  };
  const docRow = d => {
    const name = d.path.split(/[\\/]/).pop();
    const k = KIND.find(x => x[2].test(name)) || KIND[0];
    const b = h("button", "hd-panel-row");
    b.toggleAttribute("data-missing", !d.exists);
    const badge = h("span", "hd-docs-file");
    badge.dataset.kind = k[1];
    badge.dataset.k = k[0];
    const txt = h("span", "hd-panel-txt");
    txt.append(h("b", "", name));
    const folder = d.path.slice(0, d.path.length - name.length - 1);
    txt.append(h("small", "", d.exists ? (d.page && d.pages ? `${t("стр. {0} из {1}", d.page, d.pages)} · ${folder}` : folder) : t("Файл не найден")));
    b.append(badge, txt);
    if (d.pinned) b.append(icon("pin"));
    b.title = d.path;
    b.addEventListener("click", () => d.exists && q("doc-open", { path: d.path }));
    return b;
  };

  async function draw() {
    const query = norm(input.value.trim());
    list.textContent = "";
    if (tab === "notes") {
      if (!notes) notes = (await q("panel-notes")) || {};
      list.textContent = "";
      if (!notes.dir) {
        list.append(h("p", "hd-panel-empty", t("Сначала выберите папку в Заметках")));
        const go = h("button", "hd-pill", t("Открыть Заметки"));
        go.addEventListener("click", () => q("note-open", {}));
        list.append(go);
        quick.hidden = true;
        return;
      }
      quick.hidden = false;
      const match = n => !query || norm(n.title).includes(query) || norm(n.preview).includes(query);
      const pinned = (notes.pinned || []).filter(match).map(n => ({ ...n, pinned: true }));
      const recent = query ? (notes.all || []).filter(n => norm(n.title).includes(query) && !pinned.some(p => p.rel === n.rel)) : notes.recent || [];
      if (pinned.length) {
        section("Закреплённые");
        pinned.forEach(n => list.append(noteRow(n)));
      }
      if (recent.length) {
        section(query ? "По названию" : "Недавние");
        recent.slice(0, query ? 30 : 25).forEach(n => list.append(noteRow(n)));
      }
      if (query.length >= 2) {
        const n = ++hitSeq;
        const hits = (await q("notes-search", { q: input.value.trim() })) || [];
        if (n !== hitSeq) return;
        const seen = new Set([...pinned, ...recent].map(x => x.rel));
        const more = hits.filter(x => !seen.has(x.rel));
        if (more.length) {
          section("Найдено в тексте");
          more.forEach(x => list.append(noteRow(x)));
        }
        if (!pinned.length && !recent.length && !more.length) list.append(h("p", "hd-panel-empty", t("Ничего не нашлось")));
      } else if (!pinned.length && !recent.length) {
        list.append(h("p", "hd-panel-empty", t(query ? "Ничего не нашлось" : "Заметок пока нет")));
      }
    } else {
      quick.hidden = true;
      if (!docs) docs = (await q("docs")) || [];
      list.textContent = "";
      const items = docs.filter(d => !query || norm(d.path.split(/[\\/]/).pop()).includes(query));
      const pinned = items.filter(d => d.pinned);
      const rest = items.filter(d => !d.pinned);
      if (pinned.length) {
        section("Закреплённые");
        pinned.forEach(d => list.append(docRow(d)));
      }
      if (rest.length) {
        section("Недавние");
        rest.slice(0, 40).forEach(d => list.append(docRow(d)));
      }
      if (!items.length) list.append(h("p", "hd-panel-empty", t(query ? "Ничего не нашлось" : "Здесь появятся файлы, которые вы открывали.")));
      const all = h("button", "hd-panel-more", t("Все документы"));
      all.addEventListener("click", () => q("open-docs"));
      list.append(all);
    }
  }

  function setTab(id) {
    tab = id;
    try {
      win.localStorage.setItem("hd-panel-tab", id);
    } catch {}
    for (const b of tabs) b.toggleAttribute("data-on", b.dataset.v === id);
    input.placeholder = t(id === "notes" ? "Найти заметку…" : "Найти документ…");
    draw();
  }

  let tm = 0;
  input.addEventListener("input", () => {
    win.clearTimeout(tm);
    tm = win.setTimeout(draw, 200);
  });
  linkBtn.addEventListener("click", async () => {
    const p = await q("page");
    if (!p) return;
    const md = `[${p.title.replace(/[[\]]/g, "")}](${p.url})`;
    ta.value = ta.value.trim() ? ta.value.trimEnd() + " " + md : md;
    ta.focus();
  });
  const send = async () => {
    const text = ta.value.trim();
    if (!text) return;
    const r = await q("inbox-add", { text, name: t("Входящие") });
    if (r?.ok) {
      ta.value = "";
      saved.textContent = t("Сохранено во «Входящие»");
      win.setTimeout(() => (saved.textContent = ""), 2500);
      notes = null;
      if (tab === "notes") draw();
    }
  };
  ta.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  // свежие данные при каждом показе панели
  const refresh = () => {
    notes = null;
    docs = null;
    draw();
  };
  doc.addEventListener("visibilitychange", () => doc.visibilityState === "visible" && refresh());
  win.addEventListener("focus", refresh);
  setTab(tab);
}
