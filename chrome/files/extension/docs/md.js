/* Редактор Markdown (общий ../apps/HandDesignMarkdown.sys.mjs). Источник: ?doc=<id> — файл из «Документов»,
   ?file=file:///… — файл, открытый из проводника; его первое сохранение идёт через «Сохранить как». */
import { initPage, t } from "./page.js";
import { mount } from "../apps/HandDesignMarkdown.sys.mjs";
import * as fs from "./fs.js";
import { byId, remember, gate, fetchFile, fileParts, saveAsHandle, params } from "./files.js";

await initPage();
let handle = null;
let name = "";
let folder = "";
let text = "";
let mtime = 0;

try {
  if (params.get("doc")) {
    const item = await byId(params.get("doc"));
    if (!item) throw new Error(t("Файл убран из списка недавних"));
    handle = item.handle;
    await gate(handle);
    const r = await fs.readText(handle);
    ({ text, mtime } = r);
    name = handle.name;
    folder = t("Документы Hand Design");
  } else if (params.get("file")) {
    const url = params.get("file");
    ({ name, folder } = fileParts(url));
    text = (await (await fetchFile(url)).text()).replace(/^﻿/, "");
  }
} catch (e) {
  text = `# ${t("Не удалось открыть файл")}\n\n${e?.message || e}`;
  name ||= "Markdown";
}

async function save(value, opts) {
  if (!handle) {
    const h = await saveAsHandle(name || t("Без названия") + ".md", "md");
    if (!h) return { ok: false, error: t("Отменено") };
    handle = h;
    const id = await remember(h);
    history.replaceState(null, "", `md.html?doc=${id}`);
    await fs.write(h, value);
    return { ok: true, mtime: (await h.getFile()).lastModified };
  }
  return fs.writeMd(handle, value, opts?.mtime || 0);
}

mount(window, document, {
  text,
  mtime,
  name,
  folder,
  t,
  cssUrl: "../apps/markdown.css",
  save,
  stat: async () => (handle ? { ok: true, mtime: (await handle.getFile()).lastModified } : { ok: true, mtime: 0 }),
  read: async () => {
    if (!handle) return { ok: false };
    const r = await fs.readText(handle);
    return { ok: true, text: r.text, mtime: r.mtime };
  },
  home: () => (location.href = "docs.html"),
});
