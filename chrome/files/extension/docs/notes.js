/* Мост для общей страницы «Заметки» (../apps/notes-app.mjs): те же операции, что у Firefox-версии,
   только файлы — в папке, к которой пользователь дал доступ (File System Access API). */
import { initPage, t } from "./page.js";
import { onChange } from "../shared/settings.js";
import * as fs from "./fs.js";

let S = await initPage();
onChange(next => {
  S = next;
  window.dispatchEvent(new CustomEvent("hd-notes-settings"));
});
const MD_RE = /\.(md|markdown|mdown|mkd|mkdn)$/i;
const IMG_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const PIN_KEY = "hdNotesPinned";
let root = null;

function preview(text) {
  return text
    .replace(/^﻿/, "")
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .replace(/%%[\s\S]*?%%/g, "")
    .replace(/^>\s*\[![\w-]+\][+-]?/gm, "")
    .replace(/!\[\[[^\]\n]*\]\]|!\[[^\]\n]*\]\([^)\n]*\)/g, "")
    .split("\n")
    .map(l => l.replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/, "").replace(/[*_`~]|!?\[([^\]]*)\]\([^)]*\)/g, "$1").trim())
    .filter(l => l && !/^[-=|: ]+$/.test(l) && !l.startsWith("|"))
    .join(" ")
    .slice(0, 160);
}
function noteTags(text) {
  const tags = new Map();
  const put = x => {
    x = x.trim().replace(/^#/, "");
    if (x && !tags.has(x.toLowerCase())) tags.set(x.toLowerCase(), x);
  };
  const fm = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    const m = fm[1].match(/^(?:tags?|теги):[ \t]*(.*)((?:\r?\n[ \t]+-.*)*)/im);
    if (m) {
      for (const x of m[1].replace(/^\[|\]$/g, "").split(",")) put(x.replace(/^["']|["']$/g, ""));
      for (const x of m[2].matchAll(/-[ \t]*(.+)/g)) put(x[1].replace(/^["']|["']$/g, ""));
    }
  }
  const body = (fm ? text.slice(fm[0].length) : text).replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g, " ");
  for (const m of body.matchAll(/(^|[\s(])#([\p{L}\p{N}_\/-]*[\p{L}_\/-][\p{L}\p{N}_\/-]*)/gu)) put(m[2]);
  return [...tags.values()];
}
const linkRe = name => new RegExp(`(!?\\[\\[)((?:[^\\]|#\\n]*/)?)(${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(\\.md)?((?:#[^\\]|\\n]*)?(?:\\|[^\\]\\n]*)?\\]\\])`, "gi");

async function walk() {
  const notes = [];
  const folders = [];
  const visit = async (dir, rel, depth) => {
    for await (const [name, h] of dir.entries()) {
      if (name.startsWith(".")) continue;
      const r = rel ? `${rel}/${name}` : name;
      if (h.kind === "directory") {
        folders.push(r);
        if (depth < 6) await visit(h, r, depth + 1);
      } else if (MD_RE.test(name) && notes.length < 3000) {
        const f = await h.getFile();
        notes.push({ rel: r, h, file: f, mtime: f.lastModified, ctime: f.lastModified, size: f.size });
      }
    }
  };
  await visit(root, "", 0);
  return { notes, folders };
}
async function findFile(name) {
  const want = name.toLowerCase();
  const visit = async (dir, depth) => {
    for await (const [n, h] of dir.entries()) {
      if (n.startsWith(".")) continue;
      if (n.toLowerCase() === want && h.kind === "file") return h;
      if (h.kind === "directory" && depth < 6) {
        const hit = await visit(h, depth + 1);
        if (hit) return hit;
      }
    }
    return null;
  };
  return visit(root, 0);
}

const pinned = async () => (await chrome.storage.local.get(PIN_KEY))[PIN_KEY] || [];
const setPinned = list => chrome.storage.local.set({ [PIN_KEY]: [...new Set(list)] });
async function repin(from, to) {
  await setPinned((await pinned()).flatMap(x => (x === from || x.startsWith(from + "/") ? (to ? [to + x.slice(from.length)] : []) : [x])));
}

async function state() {
  const saved = await fs.kvGet("notesDir").catch(() => null);
  if (saved && (await fs.permitted(saved))) {
    root = saved;
    return { dir: saved.name || "/" };
  }
  root = null;
  if (saved) return { dir: "", label: t("Открыть прошлую папку"), suggested: saved.name || "/" };
  return { dir: "", noDefault: true, suggested: "" };
}
async function pick() {
  try {
    const h = await showDirectoryPicker({ id: "hd-notes", mode: "readwrite", startIn: "documents" });
    await fs.kvSet("notesDir", h);
  } catch {}
  return state();
}

const OPS = {
  state,
  pick,
  async useDefault() {
    const saved = await fs.kvGet("notesDir").catch(() => null);
    if (saved && (await fs.ask(saved))) return state();
    return pick();
  },
  async settings() {
    return Object.fromEntries(Object.entries(S).filter(([k]) => k.startsWith("notes")));
  },
  async reveal() {
    return { ok: false };
  },
  async list(data) {
    const pins = await pinned();
    const q = String(data?.q || "").trim().toLowerCase();
    const { notes, folders } = await walk();
    const out = [];
    for (const n of notes) {
      const text = n.size < 2_000_000 ? (await n.file.text()).replace(/^﻿/, "") : "";
      const name = n.rel.split("/").pop().replace(MD_RE, "");
      const tags = noteTags(text);
      if (q.startsWith("#") && q.length > 1) {
        const tag = q.slice(1);
        if (!tags.some(x => x.toLowerCase() === tag || x.toLowerCase().startsWith(tag + "/"))) continue;
      } else if (q && !name.toLowerCase().includes(q) && !text.toLowerCase().includes(q)) {
        continue;
      }
      out.push({ rel: n.rel, name, mtime: n.mtime, ctime: n.ctime, preview: preview(text), pinned: pins.includes(n.rel), tags });
    }
    return { ok: true, dir: root.name || "/", notes: out, folders };
  },
  async new(data, op = "new") {
    const folder = fs.safeRel(data?.folder ?? "");
    if (folder === null) return { ok: false, error: "bad path" };
    const dir = await fs.dirAt(root, folder, true);
    const base = fs.cleanName(data?.name) || fs.cleanName(t(op === "new" ? "Без названия" : "Новая папка")) || "Note";
    const name = await fs.freeName(dir, base, op === "new" ? ".md" : "");
    if (op === "new") await fs.write(await dir.getFileHandle(name, { create: true }), String(data?.text ?? ""));
    else await dir.getDirectoryHandle(name, { create: true });
    return { ok: true, rel: (folder ? folder + "/" : "") + name };
  },
  mkdir(data) {
    return OPS.new(data, "mkdir");
  },
  async attach(data) {
    const name = fs.cleanName(data?.name);
    const ext = (name.match(IMG_RE) || [])[1];
    const b64 = String(data?.b64 || "");
    if (!ext || !b64 || b64.length > 40_000_000) return { ok: false, error: "bad image" };
    const noteDir = fs.safeRel(String(data?.note || "").replace(/(^|\/)[^/]*$/, "")) ?? "";
    const target = S.notesAttach === "near" ? noteDir : "attachments";
    const dir = await fs.dirAt(root, target, true);
    const file = await fs.freeName(dir, name.slice(0, -ext.length - 1), "." + ext.toLowerCase());
    await fs.write(await dir.getFileHandle(file, { create: true }), fs.fromB64(b64));
    return { ok: true, name: file };
  },
  async asset(data) {
    const src = decodeURIComponent(String(data?.src || "")).replace(/\\/g, "/").replace(/^\.\//, "");
    if (!IMG_RE.test(src) || /^[a-z]+:/i.test(src)) return { ok: false };
    const noteFolder = String(data?.note || "").replace(/(^|\/)[^/]*$/, "");
    let h = null;
    for (const rel of [noteFolder ? `${noteFolder}/${src}` : src, src]) {
      const norm = fs.safeRel(rel.split("/").reduce((a, part) => (part === ".." ? a.slice(0, -1) : [...a, part]), []).join("/"), false);
      if (!norm) continue;
      h = await fs.fileAt(root, norm).catch(() => null);
      if (h) break;
    }
    h ||= await findFile(src.split("/").pop());
    if (!h) return { ok: false };
    const f = await h.getFile();
    if (f.size > 30_000_000) return { ok: false };
    return { ok: true, url: URL.createObjectURL(f) };
  },
  async graph() {
    const list = (await walk()).notes;
    const index = new Map();
    list.forEach((n, i) => {
      const full = n.rel.replace(MD_RE, "").toLowerCase();
      index.set(full, i);
      const leaf = full.split("/").pop();
      if (!index.has(leaf)) index.set(leaf, i);
    });
    const edges = new Set();
    for (let i = 0; i < list.length; i++) {
      if (list[i].size > 2_000_000) continue;
      const text = await list[i].file.text();
      for (const m of text.matchAll(/(?<!!)\[\[([^\]|#\n]+)/g)) {
        const want = m[1].trim().toLowerCase().replace(/\.md$/, "");
        const j = index.get(want) ?? index.get(want.split("/").pop());
        if (j !== undefined && j !== i) edges.add(i < j ? `${i}:${j}` : `${j}:${i}`);
      }
    }
    return { ok: true, nodes: list.map(n => ({ rel: n.rel, name: n.rel.split("/").pop().replace(MD_RE, "") })), edges: [...edges].map(e => e.split(":").map(Number)) };
  },
  async backlinks(data) {
    const self = String(data?.rel || "");
    const name = self.split("/").pop().replace(MD_RE, "");
    if (!name) return { ok: false };
    const out = [];
    for (const n of (await walk()).notes) {
      if (n.rel === self || n.size > 2_000_000) continue;
      const text = await n.file.text();
      const re = linkRe(name);
      const line = text.split("\n").find(l => ((re.lastIndex = 0), re.test(l)));
      if (line !== undefined) out.push({ rel: n.rel, name: n.rel.split("/").pop().replace(MD_RE, ""), line: line.trim().slice(0, 200) });
      if (out.length >= 100) break;
    }
    return { ok: true, links: out };
  },
  async read(data) {
    const r = await fs.readText(await fs.fileAt(root, noteRel(data)));
    return { ok: true, text: r.text, mtime: r.mtime };
  },
  async stat(data) {
    return { ok: true, mtime: (await (await fs.fileAt(root, noteRel(data))).getFile()).lastModified };
  },
  async save(data) {
    return fs.writeMd(await fs.fileAt(root, noteRel(data)), String(data?.text ?? ""), data?.mtime);
  },
  async pin(data) {
    const rel = String(data?.rel ?? "");
    const list = await pinned();
    await setPinned(data?.on ? [...list, rel] : list.filter(x => x !== rel));
    return { ok: true };
  },
  async rename(data) {
    const isFolder = !!data?.isFolder;
    const rel = entryRel(data);
    const base = fs.cleanName(data?.name);
    if (!base) return { ok: false, error: t("Пустое название") };
    const file = base + (isFolder ? "" : ".md");
    const [parent, old] = fs.splitRel(rel);
    const res = await moveTo(rel, isFolder, parent, file);
    if (res.ok && !isFolder) {
      const oldName = old.replace(MD_RE, "");
      res.updated = 0;
      for (const n of (await walk()).notes) {
        const text = await n.file.text().catch(() => null);
        if (text === null || !text.includes("[[")) continue;
        const next = text.replace(linkRe(oldName), (m, open, folderPart, _n, ext, rest) => open + folderPart + base + (ext || "") + rest);
        if (next !== text) {
          await fs.writeMd(n.h, next.replace(/^﻿/, ""), 0);
          res.updated++;
        }
      }
    }
    return res;
  },
  async move(data) {
    const isFolder = !!data?.isFolder;
    const rel = entryRel(data);
    const folder = fs.safeRel(data?.folder ?? "");
    if (folder === null || (isFolder && (folder === rel || folder.startsWith(rel + "/")))) return { ok: false, error: "bad path" };
    return moveTo(rel, isFolder, folder, fs.splitRel(rel)[1]);
  },
  async importPick(data) {
    const LIMIT = 400 * 1024 * 1024;
    let h;
    try {
      h = data?.mode === "folder"
        ? await showDirectoryPicker({ id: "hd-import", mode: "read" })
        : (await showOpenFilePicker({
            id: "hd-import",
            types: (data?.filters || []).map(([description, mask]) => ({ description: String(description), accept: { "application/octet-stream": String(mask).split(";").map(m => m.trim().replace(/^\*/, "")) } })),
          }))[0];
    } catch {
      return { ok: false, cancel: true };
    }
    if (h.kind === "file") {
      const f = await h.getFile();
      if (f.size > LIMIT) return { ok: false, error: t("Файл слишком большой") };
      return { ok: true, name: f.name, b64: await fs.toB64(f) };
    }
    const files = [];
    let total = 0;
    const visit = async (dir, rel, depth) => {
      for await (const [name, c] of dir.entries()) {
        if (name.startsWith(".") || name === "node_modules") continue;
        const r = rel ? `${rel}/${name}` : name;
        if (c.kind === "directory") {
          if (depth < 8) await visit(c, r, depth + 1);
          continue;
        }
        const f = await c.getFile().catch(() => null);
        if (f && files.length < 5000 && total + f.size <= LIMIT) {
          total += f.size;
          files.push({ rel: r, b64: await fs.toB64(f) });
        }
      }
    };
    await visit(h, "", 0);
    return { ok: true, name: h.name, files };
  },
  async importBegin(data) {
    const top = fs.cleanName(t("Импорт")) || "Import";
    const dir = await root.getDirectoryHandle(top, { create: true });
    const name = await fs.freeName(dir, fs.cleanName(data?.name) || "Import", "");
    await dir.getDirectoryHandle(name, { create: true });
    return { ok: true, folder: `${top}/${name}` };
  },
  async importWrite(data) {
    const base = fs.safeRel(data?.folder, false);
    if (!base) return { ok: false, error: "bad path" };
    let written = 0;
    for (const it of data?.items || []) {
      const parts = String(it?.rel || "").split("/").map(p => fs.cleanName(p).replace(/[. ]+$/, ""));
      if (!parts.length || parts.some(p => !p)) continue;
      const dir = await fs.dirAt(root, [base, ...parts.slice(0, -1)].join("/"), true);
      const last = parts.at(-1);
      const ext = (last.match(/\.[^.]+$/) || [""])[0];
      const name = await fs.freeName(dir, last.slice(0, last.length - ext.length), ext);
      await fs.write(await dir.getFileHandle(name, { create: true }), typeof it.text === "string" ? it.text : fs.fromB64(it.b64));
      written++;
    }
    return { ok: true, written };
  },
  async delete(data) {
    const isFolder = !!data?.isFolder;
    const rel = entryRel(data);
    const [parent, name] = fs.splitRel(rel);
    const trash = await root.getDirectoryHandle(".trash", { create: true });
    const target = await fs.freeName(trash, isFolder ? name : name.replace(MD_RE, ""), isFolder ? "" : ".md");
    await fs.move(await fs.dirAt(root, parent), name, trash, target);
    await repin(rel, null);
    return { ok: true };
  },
};
function noteRel(data) {
  const rel = fs.safeRel(data?.rel, false);
  if (!rel || !MD_RE.test(rel)) throw new Error("bad path");
  return rel;
}
function entryRel(data) {
  const rel = data?.isFolder ? fs.safeRel(data?.rel, false) : noteRel(data);
  if (!rel) throw new Error("bad path");
  return rel;
}
async function moveTo(rel, isFolder, destFolder, newName) {
  const [parent, name] = fs.splitRel(rel);
  const src = await fs.dirAt(root, parent);
  const dest = await fs.dirAt(root, destFolder);
  const same = (await src.isSameEntry(dest)) && name.toLowerCase() === newName.toLowerCase();
  if (!same && (await fs.has(dest, newName))) return { ok: false, error: t(isFolder ? "Папка с таким названием уже есть" : "Заметка с таким названием уже есть") };
  await fs.move(src, name, dest, newName);
  const nextRel = (destFolder ? destFolder + "/" : "") + newName;
  await repin(rel, nextRel);
  return { ok: true, rel: nextRel, name: newName.replace(MD_RE, "") };
}

const NEEDS_ROOT = new Set(["state", "pick", "useDefault", "settings", "reveal"]);
window.hdNotes = {
  t,
  caps: { reveal: false, import: true },
  call(op, json, done) {
    let data = null;
    try {
      data = JSON.parse(json);
    } catch {}
    (async () => {
      const fn = OPS[op];
      if (!fn) return null;
      if (!NEEDS_ROOT.has(op) && !root) {
        await state();
        if (!root) return { ok: false, error: "no folder" };
      }
      return fn(data);
    })()
      .catch(e => ({ ok: false, error: e?.message || String(e) }))
      .then(r => done(JSON.stringify(r ?? null)));
  },
};
window.dispatchEvent(new CustomEvent("hd-notes-ready"));
