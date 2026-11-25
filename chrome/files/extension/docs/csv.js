/* Мост для редактора таблиц (../apps/csv-app.mjs). Источник — как у Markdown: ?doc=<id> или ?file=file:///… */
import { initPage, t } from "./page.js";
import * as fs from "./fs.js";
import { byId, remember, gate, fetchFile, fileParts, saveAsHandle, params } from "./files.js";

await initPage();
let handle = null;
let source = null;
if (params.get("doc")) {
  const item = await byId(params.get("doc"));
  if (item) {
    handle = item.handle;
    await gate(handle);
  }
} else if (params.get("file")) {
  source = params.get("file");
}

let cp1251 = null;
function encode1251(text) {
  if (!cp1251) {
    cp1251 = new Map();
    const dec = new TextDecoder("windows-1251");
    for (let b = 0x80; b <= 0xff; b++) cp1251.set(dec.decode(new Uint8Array([b])), b);
  }
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    out[i] = c < 0x80 ? c : cp1251.get(text[i]) ?? 0x3f;
  }
  return out;
}
function decode(bytes) {
  const bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bom ? bytes.subarray(3) : bytes), encoding: "utf-8", bom };
  } catch {
    return { text: new TextDecoder("windows-1251").decode(bytes), encoding: "windows-1251", bom };
  }
}

const OPS = {
  home() {
    location.href = "docs.html";
    return null;
  },
  async stat() {
    return handle ? { ok: true, mtime: (await handle.getFile()).lastModified } : { ok: true, mtime: 0 };
  },
  async read() {
    if (handle) {
      const f = await handle.getFile();
      return { ok: true, ...decode(new Uint8Array(await f.arrayBuffer())), mtime: f.lastModified, name: f.name, folder: t("Документы Hand Design") };
    }
    if (source) {
      const r = await fetchFile(source);
      return { ok: true, ...decode(new Uint8Array(await r.arrayBuffer())), mtime: 0, ...fileParts(source) };
    }
    return { ok: false, error: t("Файл не найден") };
  },
  async save(data) {
    if (!handle) {
      const h = await saveAsHandle(source ? fileParts(source).name : t("Таблица") + ".csv", "csv");
      if (!h) return { ok: false, error: t("Отменено") };
      handle = h;
      history.replaceState(null, "", `csv.html?doc=${await remember(h)}`);
    } else if (data?.mtime && (await handle.getFile()).lastModified !== data.mtime) {
      return { ok: false, conflict: true };
    }
    const text = String(data?.text ?? "");
    let bytes;
    if (data?.encoding === "windows-1251") bytes = encode1251(text);
    else {
      const body = new TextEncoder().encode(text);
      bytes = data?.bom ? new Uint8Array([0xef, 0xbb, 0xbf, ...body]) : body;
    }
    await fs.write(handle, bytes);
    return { ok: true, mtime: (await handle.getFile()).lastModified };
  },
};

window.hdCsv = {
  t,
  call(op, json, done) {
    let data = null;
    try {
      data = JSON.parse(json);
    } catch {}
    Promise.resolve()
      .then(() => (OPS[op] ? OPS[op](data) : null))
      .catch(e => ({ ok: false, error: e?.message || String(e) }))
      .then(r => done(JSON.stringify(r ?? null)));
  },
};
window.dispatchEvent(new CustomEvent("hd-csv-ready"));
