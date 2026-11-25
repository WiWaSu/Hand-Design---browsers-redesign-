/* Hand Design — импорт заметок из Notion, Evernote, Google Keep и папок Markdown (Obsidian, Joplin).
   Без обращений к браузеру: на входе файлы, на выходе заметки .md и вложения с путями внутри папки импорта. */

const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
export const safe = s => {
  const v = String(s ?? "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "").replace(/[. ]+$/, "").slice(0, 120);
  return RESERVED.test(v) ? "_" + v : v;
};

const dec = new TextDecoder();
const text = bytes => dec.decode(bytes).replace(/^﻿/, "");

export function fromB64(s) {
  if (Uint8Array.fromBase64) return Uint8Array.fromBase64(s);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function toB64(bytes) {
  if (bytes.toBase64) return bytes.toBase64();
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/* ------------------------------- zip ------------------------------- */

export async function unzip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip");
  let count = dv.getUint16(eocd + 10, true);
  let cd = dv.getUint32(eocd + 16, true);
  if ((cd === 0xffffffff || count === 0xffff) && eocd >= 20 && dv.getUint32(eocd - 20, true) === 0x07064b50) {
    const z64 = Number(dv.getBigUint64(eocd - 12, true));
    count = Number(dv.getBigUint64(z64 + 32, true));
    cd = Number(dv.getBigUint64(z64 + 48, true));
  }
  const out = new Map();
  let p = cd;
  for (let n = 0; n < count && dv.getUint32(p, true) === 0x02014b50; n++) {
    const method = dv.getUint16(p + 10, true);
    let csize = dv.getUint32(p + 20, true);
    let usize = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true);
    const xlen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    let off = dv.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nlen)).replace(/\\/g, "/");
    for (let q = p + 46 + nlen, end = q + xlen; q + 4 <= end; ) {
      const id = dv.getUint16(q, true);
      const size = dv.getUint16(q + 2, true);
      if (id === 1) {
        let r = q + 4;
        if (usize === 0xffffffff) { usize = Number(dv.getBigUint64(r, true)); r += 8; }
        if (csize === 0xffffffff) { csize = Number(dv.getBigUint64(r, true)); r += 8; }
        if (off === 0xffffffff) off = Number(dv.getBigUint64(r, true));
      }
      q += 4 + size;
    }
    p += 46 + nlen + xlen + clen;
    if (name.endsWith("/")) continue;
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
    const data = bytes.subarray(start, start + csize);
    if (method === 0) out.set(name, data.slice());
    else if (method === 8) out.set(name, new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()));
  }
  return out;
}

/* ------------------------------- md5 ------------------------------- */

const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
export function md5(bytes) {
  const len = bytes.length;
  const n = ((len + 8) >>> 6) + 1;
  const w = new Uint32Array(n * 16);
  for (let i = 0; i < len; i++) w[i >> 2] |= bytes[i] << ((i % 4) * 8);
  w[len >> 2] |= 0x80 << ((len % 4) * 8);
  w[n * 16 - 2] = (len * 8) >>> 0;
  w[n * 16 - 1] = Math.floor(len / 0x20000000);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < w.length; o += 16) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const s = S[(i >> 4) * 4 + (i % 4)];
      const x = (a + f + K[i] + w[o + g]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0].map(v => [0, 8, 16, 24].map(sh => ((v >>> sh) & 255).toString(16).padStart(2, "0")).join("")).join("");
}

/* ------------------------------ вывод ------------------------------ */

class Out {
  notes = [];
  files = [];
  #used = new Set();
  unique(path) {
    const m = path.match(/^(.*?)(\.[^./]+)?$/);
    for (let n = 1; ; n++) {
      const p = n === 1 ? path : `${m[1]} ${n}${m[2] || ""}`;
      if (!this.#used.has(p.toLowerCase())) {
        this.#used.add(p.toLowerCase());
        return p;
      }
    }
  }
  note(path, body) {
    const p = this.unique(path);
    this.notes.push({ path: p, text: body });
    return p;
  }
  file(path, bytes) {
    const p = this.unique(path);
    this.files.push({ path: p, bytes });
    return p;
  }
}

const dirOf = p => p.replace(/(^|\/)[^/]*$/, "");
const leaf = p => p.split("/").pop();
const linkPath = s => s.replace(/[%() ]/g, c => encodeURIComponent(c));
function relative(fromDir, to) {
  const a = fromDir ? fromDir.split("/") : [];
  const b = to.split("/");
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => ".."), ...b.slice(i)].join("/");
}
const pad = n => String(n).padStart(2, "0");
const stamp = d => (d && !isNaN(d) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` : "");
const yamlValue = v => (/: | #|[\[\]{},"]|^[#&*!|>%@`'-]|^\s|\s$|:$/.test(v) ? JSON.stringify(v) : v);
function front(props) {
  const lines = [];
  for (const [k, v] of Object.entries(props)) {
    if (Array.isArray(v) ? !v.length : !v) continue;
    lines.push(`${k}: ${Array.isArray(v) ? "[" + v.map(yamlValue).join(", ") + "]" : yamlValue(String(v))}`);
  }
  return lines.length ? `---\n${lines.join("\n")}\n---\n\n` : "";
}

/* --------------------------- HTML → Markdown --------------------------- */

function htmlToMd(root, ctx) {
  const esc = s => s.replace(/([\\`*_[\]])/g, "\\$1");
  const wrap = (mark, s) => {
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : s;
  };
  const kids = (n, c) => [...n.childNodes].map(x => conv(x, c)).join("");
  const list = (n, c, ordered) => {
    let i = 0;
    const items = [];
    for (const li of n.children) {
      if (li.localName !== "li") continue;
      i++;
      const todo = li.querySelector(":scope > en-todo");
      const mark = todo ? `- [${todo.getAttribute("checked") === "true" ? "x" : " "}] ` : ordered ? `${i}. ` : "- ";
      const body = kids(li, { ...c, depth: c.depth + 1, inLi: true }).replace(/^\n+|\n+$/g, "").replace(/\n{2,}/g, "\n");
      const [first, ...rest] = body.split("\n");
      items.push("  ".repeat(c.depth) + mark + first.trim() + rest.map(l => "\n" + (/^\s*([-*]|\d+\.)\s/.test(l) ? l : "  ".repeat(c.depth + 1) + l.trim())).join(""));
    }
    return `\n${items.join("\n")}\n`;
  };
  const table = n => {
    const rows = [...n.querySelectorAll("tr")].map(tr => [...tr.children].map(td => kids(td, { depth: 0 }).replace(/\s*\n+\s*/g, "<br>").replace(/\|/g, "\\|").trim()));
    if (!rows.length) return "";
    const w = Math.max(...rows.map(r => r.length));
    const line = r => `| ${Array.from({ length: w }, (_, i) => r[i] ?? "").join(" | ")} |`;
    return `\n\n${line(rows[0])}\n| ${Array(w).fill("---").join(" | ")} |\n${rows.slice(1).map(line).join("\n")}\n\n`;
  };
  function conv(n, c) {
    if (n.nodeType === 3) return esc(n.nodeValue.replace(/\s+/g, " "));
    if (n.nodeType !== 1) return "";
    const tag = n.localName;
    switch (tag) {
      case "script": case "style": case "head": case "title": return "";
      case "br": return "\n";
      case "hr": return "\n\n---\n\n";
      case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
        return `\n\n${"#".repeat(+tag[1])} ${kids(n, c).replace(/\s+/g, " ").trim()}\n\n`;
      case "p": return `\n\n${kids(n, c).trim()}\n\n`;
      case "div": case "section": case "article": case "header": case "footer": case "en-note": case "body":
        return `\u0001${kids(n, c)}\u0001`;
      case "ul": return list(n, c, false);
      case "ol": return list(n, c, true);
      case "blockquote": return `\n\n${kids(n, c).trim().split("\n").map(l => "> " + l).join("\n")}\n\n`;
      case "pre": return `\n\n\`\`\`\n${n.textContent.replace(/\n$/, "")}\n\`\`\`\n\n`;
      case "table": return table(n);
      case "b": case "strong": return wrap("**", kids(n, c));
      case "i": case "em": return wrap("*", kids(n, c));
      case "s": case "strike": case "del": return wrap("~~", kids(n, c));
      case "code": return wrap("`", n.textContent);
      case "a": {
        const href = n.getAttribute("href") || "";
        const label = kids(n, c).trim();
        return href && !/^javascript:/i.test(href) ? `[${label || href}](${href.replace(/[ ()]/g, x => encodeURIComponent(x))})` : label;
      }
      case "img": {
        const src = n.getAttribute("src") || "";
        return src && !src.startsWith("data:") ? `![${n.getAttribute("alt") || ""}](${src})` : "";
      }
      case "en-todo": return (c.inLi ? "" : `- [${n.getAttribute("checked") === "true" ? "x" : " "}] `) + kids(n, c);
      case "en-media": return ctx.media(n.getAttribute("hash"), n.getAttribute("type"));
      case "en-crypt": return `*${ctx.t("Зашифрованный текст")}*`;
      default: return kids(n, c);
    }
  }
  return conv(root, { depth: 0 })
    .replace(/[ \t]*\u0001[\u0001 \t]*/g, "\n")
    .split("\n").map(l => l.replace(/\s+$/, "")).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

/* ------------------------------ CSV ------------------------------ */

function parseCsv(s) {
  const rows = [[]];
  let cell = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { rows.at(-1).push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      rows.at(-1).push(cell);
      cell = "";
      rows.push([]);
    } else cell += ch;
  }
  rows.at(-1).push(cell);
  return rows.filter(r => r.some(x => x !== ""));
}
function csvToMd(s) {
  const rows = parseCsv(s);
  if (!rows.length) return "";
  const w = Math.max(...rows.map(r => r.length));
  const cell = v => (v ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>").trim();
  const line = r => `| ${Array.from({ length: w }, (_, i) => cell(r[i])).join(" | ")} |`;
  return `${line(rows[0])}\n| ${Array(w).fill("---").join(" | ")} |\n${rows.slice(1).map(line).join("\n")}\n`;
}

/* ------------------------------ источники ------------------------------ */

function stripRoot(files) {
  const keys = [...files.keys()];
  const first = keys[0]?.split("/")[0];
  if (keys.length && keys.every(k => k.includes("/") && k.split("/")[0] === first)) {
    return new Map(keys.map(k => [k.slice(first.length + 1), files.get(k)]));
  }
  return files;
}

async function notion(files, out) {
  for (let i = 0; i < 3 && ![...files.keys()].some(k => /\.md$/i.test(k)); i++) {
    const inner = new Map();
    for (const [k, v] of files) {
      if (/\.zip$/i.test(k)) for (const [ik, iv] of await unzip(v)) inner.set(ik, iv);
      else inner.set(k, v);
    }
    files = inner;
  }
  files = stripRoot(files);
  const ID = /\s+[0-9a-f]{32}(?=$|\.[^.]+$)/i;
  const map = new Map();
  const keys = [...files.keys()].filter(k => !/_all\.csv$/i.test(k) && !/(^|\/)\./.test(k));
  for (const k of keys) {
    const parts = k.split("/").map(seg => safe(seg.replace(ID, "")) || "_");
    let p = parts.join("/");
    if (/\.csv$/i.test(p)) p = p.replace(/\.csv$/i, ".md");
    map.set(k, out.unique(p));
  }
  for (const k of keys) {
    const p = map.get(k);
    const bytes = files.get(k);
    if (/\.csv$/i.test(k)) {
      out.notes.push({ path: p, text: csvToMd(text(bytes)) });
    } else if (/\.md$/i.test(k)) {
      const here = dirOf(k);
      const body = text(bytes).replace(/(!?)\[([^\]\n]*)\]\(([^)\s]+)\)/g, (m, bang, label, href) => {
        if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) return m;
        let target;
        try {
          target = decodeURIComponent(href);
        } catch {
          return m;
        }
        const resolved = (here ? here.split("/") : []).concat(target.split("/")).reduce((a, s) => (s === ".." ? a.slice(0, -1) : s === "." ? a : [...a, s]), []).join("/");
        const to = map.get(resolved);
        if (!to) return m;
        if (/\.md$/i.test(to) && !bang) {
          const name = leaf(to).replace(/\.md$/i, "");
          return `[[${name}${label && label !== name ? "|" + label : ""}]]`;
        }
        return `${bang}[${label}](${linkPath(relative(dirOf(p), to))})`;
      });
      const title = leaf(p).replace(/\.md$/i, "");
      out.notes.push({ path: p, text: body.replace(/^#[ \t]+(.+)\r?\n(\r?\n)?/, (m, h) => (safe(h) === title ? "" : m)) });
    } else {
      out.files.push({ path: p, bytes });
    }
  }
}

function markdownFolder(files, out) {
  for (const [k, bytes] of stripRoot(files)) {
    if (/(^|\/)\./.test(k) || /(^|\/)(node_modules|\.trash)\//.test(k)) continue;
    const p = out.unique(k.split("/").map(s => safe(s) || "_").join("/"));
    if (/\.(md|markdown)$/i.test(k)) out.notes.push({ path: p.replace(/\.markdown$/i, ".md"), text: text(bytes) });
    else out.files.push({ path: p, bytes });
  }
}

const EXT = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg", "application/pdf": ".pdf", "audio/mpeg": ".mp3", "audio/wav": ".wav" };
const enexDate = s => {
  const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/.exec(s || "");
  return m ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6])) : null;
};

function evernote(name, bytes, out, t) {
  const xml = new DOMParser().parseFromString(text(bytes), "text/xml");
  if (xml.querySelector("parsererror")) throw new Error("enex");
  const book = safe(name.replace(/\.enex$/i, "")) || "Evernote";
  const child = (n, sel) => n.querySelector(sel)?.textContent?.trim() || "";
  for (const note of xml.getElementsByTagName("note")) {
    const title = safe(child(note, "title")) || safe(t("Без названия"));
    const notePath = out.unique(`${book}/${title}.md`);
    const media = new Map();
    for (const r of note.getElementsByTagName("resource")) {
      const raw = (r.querySelector("data")?.textContent || "").replace(/\s+/g, "");
      if (!raw) continue;
      const data = fromB64(raw);
      const mime = child(r, "mime");
      const fname = safe(child(r, "resource-attributes > file-name")) || "file" + (EXT[mime] || "");
      media.set(md5(data), { path: out.file(`${book}/attachments/${/\.[a-z0-9]{2,5}$/i.test(fname) ? fname : fname + (EXT[mime] || "")}`, data), mime });
    }
    const html = new DOMParser().parseFromString(child(note, "content") || "", "text/html");
    const body = htmlToMd(html.body, {
      t,
      media: (hash, type) => {
        const m = media.get(String(hash || "").toLowerCase());
        if (!m) return "";
        const rel = linkPath(relative(dirOf(notePath), m.path));
        return /^image\//.test(type || m.mime) ? `\n![](${rel})\n` : `[${leaf(m.path)}](${rel})`;
      },
    });
    const tags = [...note.getElementsByTagName("tag")].map(x => x.textContent.trim()).filter(Boolean);
    const props = { created: stamp(enexDate(child(note, "created"))), updated: stamp(enexDate(child(note, "updated"))), tags, source: child(note, "note-attributes > source-url") };
    out.notes.push({ path: notePath, text: front(props) + body });
  }
}

function keep(files, out, t) {
  const usec = v => (v ? new Date(Number(v) / 1000) : null);
  for (const [k, bytes] of files) {
    if (!/\.json$/i.test(k)) continue;
    let j;
    try {
      j = JSON.parse(text(bytes));
    } catch {
      continue;
    }
    if (!j || typeof j !== "object" || !("isTrashed" in j) || j.isTrashed) continue;
    const firstLine = String(j.textContent || j.listContent?.[0]?.text || "").split("\n")[0].slice(0, 60);
    const title = safe(j.title) || safe(firstLine) || safe(t("Без названия"));
    const folder = j.isArchived ? safe(t("Архив")) + "/" : "";
    const notePath = out.unique(folder + title + ".md");
    let body = String(j.textContent || "");
    if (Array.isArray(j.listContent)) body = j.listContent.map(x => `- [${x.isChecked ? "x" : " "}] ${String(x.text || "").replace(/\n/g, " ")}`).join("\n");
    const dir = dirOf(k);
    for (const a of j.attachments || []) {
      const want = String(a.filePath || "");
      const base = want.replace(/\.[^.]+$/, "");
      const key = [...files.keys()].find(x => dirOf(x) === dir && (leaf(x) === want || leaf(x).replace(/\.[^.]+$/, "") === base) && !/\.json$/i.test(x));
      if (!key) continue;
      const p = out.file("attachments/" + (safe(leaf(key)) || "file"), files.get(key));
      const rel = linkPath(relative(dirOf(notePath), p));
      body += /^image\//.test(a.mimetype || "") || /\.(png|jpe?g|gif|webp)$/i.test(key) ? `\n\n![](${rel})` : `\n\n[${leaf(p)}](${rel})`;
    }
    for (const a of j.annotations || []) if (a.url) body += `\n\n[${a.title || a.url}](${a.url})`;
    const props = { created: stamp(usec(j.createdTimestampUsec)), updated: stamp(usec(j.userEditedTimestampUsec)), tags: (j.labels || []).map(l => l.name).filter(Boolean) };
    out.notes.push({ path: notePath, text: front(props) + body.trim() + "\n", pinned: !!j.isPinned });
  }
}

/* kind: notion | evernote | keep | folder; input: { name, bytes } или { name, files: Map(путь → байты) } */
export async function convert(kind, input, t = s => s) {
  const out = new Out();
  let files = input.files;
  if (!files && /\.zip$/i.test(input.name)) files = await unzip(input.bytes);
  if (kind === "evernote") {
    if (files) for (const [k, v] of files) { if (/\.enex$/i.test(k)) evernote(leaf(k), v, out, t); }
    else evernote(input.name, input.bytes, out, t);
  } else if (kind === "notion") await notion(files || new Map([[input.name, input.bytes]]), out);
  else if (kind === "keep") keep(files, out, t);
  else markdownFolder(files, out);
  return out;
}
