/* Мост для редактора картинок (../apps/image-app.mjs).
   Источник: ?doc=<id> — файл из «Документов»; ?u=<адрес> — картинка со страницы (пункт меню правой кнопки);
   ?file=file:///… — файл с компьютера; без параметров — пустой редактор. */
import { initPage, t } from "./page.js";
import * as fs from "./fs.js";
import { byId, remember, gate, fetchFile, fileParts, saveAsHandle, openHandle, params, IMG_RE, IMG_MIME, PICK } from "./files.js";

await initPage();
let handle = null;
const web = params.get("u") || params.get("file") || "";
if (params.get("doc")) {
  const item = await byId(params.get("doc"));
  if (item) {
    handle = item.handle;
    await gate(handle);
  }
}

const OPS = {
  home() {
    location.href = "docs.html";
    return null;
  },
  async read() {
    if (handle) {
      const f = await handle.getFile();
      if (f.size > 80 * 1024 * 1024) return { ok: false, error: t("Файл слишком большой") };
      const ext = (f.name.match(IMG_RE) || [])[1]?.toLowerCase();
      return { ok: true, data: await fs.toB64(f), mime: IMG_MIME[ext] || f.type, name: f.name, folder: t("Документы Hand Design"), path: f.name, mtime: f.lastModified };
    }
    if (web) {
      const r = await fetchFile(web);
      const blob = await r.blob();
      const mime = blob.type || "image/png";
      const src = new URL(web);
      let name = "";
      try {
        name = decodeURIComponent(src.pathname.split("/").pop() || "");
      } catch {}
      name = fs.cleanName(name) || t("Картинка");
      if (!/\.[a-z0-9]{2,5}$/i.test(name)) name += "." + (mime.split("/")[1] || "png").replace("jpeg", "jpg").replace(/\+.*/, "");
      const folder = src.protocol === "file:" ? fileParts(web).folder : src.host;
      return { ok: true, data: await fs.toB64(blob), mime, name, folder, path: "", mtime: 0 };
    }
    return { ok: false, empty: true };
  },
  async save(data) {
    if (!handle) return { ok: false, error: "no file" };
    if (data?.mtime && (await handle.getFile()).lastModified !== data.mtime) return { ok: false, conflict: true };
    await fs.write(handle, fs.fromB64(data?.data));
    return { ok: true, mtime: (await handle.getFile()).lastModified };
  },
  async saveAs(data) {
    const ext = ["png", "jpg", "webp"].includes(data?.ext) ? data.ext : "png";
    const h = await saveAsHandle((fs.cleanName(data?.name || "") || t("Картинка")) + "." + ext, "img");
    if (!h) return { ok: false, cancel: true };
    await fs.write(h, fs.fromB64(data?.data));
    handle = h;
    history.replaceState(null, "", `image.html?doc=${await remember(h)}`);
    const f = await h.getFile();
    return { ok: true, path: f.name, name: f.name, folder: t("Документы Hand Design"), mtime: f.lastModified };
  },
  async copy(data) {
    const blob = new Blob([fs.fromB64(data?.data)], { type: "image/png" });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return { ok: true };
  },
  async open() {
    try {
      const [h] = await showOpenFilePicker({ id: "hd-docs", types: [PICK.img] });
      if (h) openHandle(h);
    } catch {}
    return null;
  },
};

window.hdImg = {
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
window.dispatchEvent(new CustomEvent("hd-img-ready"));
