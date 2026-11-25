/* Недавние документы: доступ к каждому файлу (FileSystemFileHandle) хранится в IndexedDB,
   поэтому файл, открытый через «Документы», сохраняется на месте по Ctrl+S. */
import * as fs from "./fs.js";
import { t } from "./page.js";

export const MD_RE = /\.(md|markdown|mdown|mkd|mkdn)$/i;
export const CSV_RE = /\.(csv|tsv)$/i;
export const IMG_RE = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;
export const IMG_MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif", bmp: "image/bmp" };

export const pageFor = name => (CSV_RE.test(name) ? "csv.html" : IMG_RE.test(name) ? "image.html" : "md.html");
export const params = new URLSearchParams(location.search);

export async function recent() {
  return (await fs.kvGet("recent").catch(() => null)) || [];
}
export async function remember(handle) {
  const list = await recent();
  let item = null;
  for (const x of list) {
    if (await x.handle.isSameEntry(handle).catch(() => false)) item = x;
  }
  if (item) {
    item.time = Date.now();
    item.name = handle.name;
  } else {
    item = { id: crypto.randomUUID(), name: handle.name, time: Date.now(), handle };
    list.push(item);
  }
  list.sort((a, b) => b.time - a.time);
  await fs.kvSet("recent", list.slice(0, 30));
  return item.id;
}
export async function byId(id) {
  return (await recent()).find(x => x.id === id) || null;
}
export async function forget(id) {
  await fs.kvSet("recent", (await recent()).filter(x => x.id !== id));
}
export async function openHandle(handle) {
  const id = await remember(handle);
  location.href = `${pageFor(handle.name)}?doc=${id}`;
}

/* доступ к файлу после перезапуска браузера подтверждается щелчком */
export async function gate(handle, write = true) {
  if (await fs.permitted(handle, write)) return true;
  document.documentElement.setAttribute("data-hd-md", "");
  document.body.innerHTML = `<main class="hd-docs"><header class="hd-docs-head"><span class="hd-md-icon">MD</span><div><h1></h1><p class="hd-docs-sub"></p></div></header><div class="hd-docs-actions"><button type="button" class="hd-docs-card"><b></b><small></small></button></div></main>`;
  document.querySelector("h1").textContent = handle.name;
  document.querySelector(".hd-docs-sub").textContent = t("Браузер спрашивает разрешение открыть файл после перезапуска.");
  document.querySelector(".hd-docs-card b").textContent = t("Открыть файл");
  document.querySelector(".hd-docs-card small").textContent = t("Разрешить чтение и сохранение");
  return new Promise(resolve => {
    document.querySelector(".hd-docs-card").addEventListener("click", async () => {
      if (await fs.ask(handle, write)) resolve(true);
    });
  });
}

/* файл по адресу file:// (открыт из проводника): прочитать можно, сохранить — через «Сохранить как» */
export async function fetchFile(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r;
}
export function fileParts(url) {
  const path = decodeURIComponent(new URL(url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
  const cut = path.lastIndexOf("/");
  const win = /^[A-Za-z]:/.test(path);
  return { name: path.slice(cut + 1), folder: path.slice(0, cut).replace(/\//g, win ? "\\" : "/") || "/" };
}

export const PICK = {
  md: { description: "Markdown", accept: { "text/markdown": [".md", ".markdown", ".mdown", ".mkd", ".mkdn"] } },
  csv: { description: "CSV", accept: { "text/csv": [".csv", ".tsv"] } },
  img: { description: t("Картинка"), accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp"] } },
};
export async function saveAsHandle(name, type) {
  try {
    return await showSaveFilePicker({ id: "hd-docs", suggestedName: name, types: [PICK[type]] });
  } catch {
    return null;
  }
}
