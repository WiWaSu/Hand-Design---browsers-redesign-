/* Файлы на диске через File System Access API. Разрешения на папки и файлы хранятся в IndexedDB:
   после перезапуска браузера доступ подтверждается одним щелчком (requestPermission). */
const DB = "hd-files";

function db() {
  return new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((ok, no) => {
    const t = d.transaction("kv", mode);
    const req = fn(t.objectStore("kv"));
    t.oncomplete = () => ok(req?.result);
    t.onerror = () => no(t.error);
  });
}
export const kvGet = k => tx("readonly", s => s.get(k));
export const kvSet = (k, v) => tx("readwrite", s => s.put(v, k));
export const kvDel = k => tx("readwrite", s => s.delete(k));

const mode = write => ({ mode: write ? "readwrite" : "read" });
export async function permitted(h, write = true) {
  try {
    return (await h.queryPermission(mode(write))) === "granted";
  } catch {
    return false;
  }
}
export async function ask(h, write = true) {
  if (await permitted(h, write)) return true;
  try {
    return (await h.requestPermission(mode(write))) === "granted";
  } catch {
    return false;
  }
}

export const cleanName = s => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "").slice(0, 120);

/* rel — путь внутри корня через «/»; скрытые части и выход наверх запрещены */
export function safeRel(rel, allowEmpty = true) {
  rel = String(rel ?? "");
  if (!rel) return allowEmpty ? "" : null;
  const parts = rel.split("/");
  if (/^[A-Za-z]:|^[\\/]|\\/.test(rel) || parts.some(p => !p || p === "." || p === ".." || p.startsWith("."))) return null;
  return rel;
}
export async function dirAt(root, rel, create = false) {
  let d = root;
  for (const p of rel ? rel.split("/") : []) d = await d.getDirectoryHandle(p, { create });
  return d;
}
export const splitRel = rel => {
  const i = rel.lastIndexOf("/");
  return i < 0 ? ["", rel] : [rel.slice(0, i), rel.slice(i + 1)];
};
export async function fileAt(root, rel, create = false) {
  const [dir, name] = splitRel(rel);
  return (await dirAt(root, dir, create)).getFileHandle(name, { create });
}
export async function entryAt(root, rel) {
  const [dir, name] = splitRel(rel);
  const d = await dirAt(root, dir);
  try {
    return await d.getFileHandle(name);
  } catch {
    return d.getDirectoryHandle(name);
  }
}
export async function has(dir, name) {
  for await (const n of dir.keys()) if (n.toLowerCase() === name.toLowerCase()) return true;
  return false;
}
export async function freeName(dir, base, ext = ".md") {
  for (let n = 1; ; n++) {
    const name = (n === 1 ? base : `${base} ${n}`) + ext;
    if (!(await has(dir, name))) return name;
  }
}
export async function write(fh, data) {
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}
export async function readText(fh) {
  const f = await fh.getFile();
  return { text: (await f.text()).replace(/^﻿/, ""), mtime: f.lastModified, size: f.size };
}
/* запись .md: не затирает чужие правки (mtime), сохраняет CRLF и BOM файла */
export async function writeMd(fh, text, mtime) {
  let old = null;
  try {
    const f = await fh.getFile();
    if (mtime && f.lastModified !== mtime) return { ok: false, conflict: true };
    old = await f.text();
  } catch {}
  let out = old?.includes("\r\n") ? text.replace(/\r?\n/g, "\r\n") : text;
  if (old?.charCodeAt(0) === 0xfeff) out = "﻿" + out;
  await write(fh, out);
  return { ok: true, mtime: (await fh.getFile()).lastModified };
}
async function copyInto(h, dest, name) {
  if (h.kind === "file") {
    await write(await dest.getFileHandle(name, { create: true }), await h.getFile());
    return;
  }
  const nd = await dest.getDirectoryHandle(name, { create: true });
  for await (const [n, c] of h.entries()) await copyInto(c, nd, n);
}
/* переместить или переименовать; move() есть не везде — тогда копия и удаление */
export async function move(srcDir, name, destDir, newName) {
  const h = await srcDir.getFileHandle(name).catch(() => srcDir.getDirectoryHandle(name));
  if (typeof h.move === "function") {
    try {
      if (name !== newName && name.toLowerCase() === newName.toLowerCase() && (await srcDir.isSameEntry(destDir))) {
        const tmp = newName + ".hd-move";
        await h.move(destDir, tmp);
        await h.move(destDir, newName);
      } else {
        await h.move(destDir, newName);
      }
      return;
    } catch (e) {
      if (!["NotSupportedError", "InvalidModificationError", "TypeError", "NotAllowedError"].includes(e?.name)) throw e;
    }
  }
  await copyInto(h, destDir, newName);
  await srcDir.removeEntry(name, { recursive: true });
}
export function fromB64(b64) {
  const bin = atob(String(b64 || ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export async function toB64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
}
