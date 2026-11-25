/* «Документы»: новый документ или таблица, открыть файл, недавние (общий ../apps/HandDesignDocs.sys.mjs). */
import { initPage, t } from "./page.js";
import { mountDocs } from "../apps/HandDesignDocs.sys.mjs";
import * as fs from "./fs.js";
import { recent, forget, openHandle, saveAsHandle, PICK } from "./files.js";

await initPage();
const byPath = new Map();

async function create(type, name, body) {
  const h = await saveAsHandle(name, type);
  if (!h) return;
  if (!(await h.getFile()).size) await fs.write(h, body(h.name));
  openHandle(h);
}

mountDocs(window, document, {
  t,
  async list() {
    byPath.clear();
    const seen = new Map();
    return (await recent()).map(x => {
      const n = (seen.get(x.name) || 0) + 1;
      seen.set(x.name, n);
      const path = x.name + "​".repeat(n - 1);
      byPath.set(path, x);
      return { path, time: x.time, exists: true };
    });
  },
  create: () => create("md", t("Без названия") + ".md", n => `# ${n.replace(/\.[^.]+$/, "")}\n\n`),
  createCsv: () => create("csv", t("Таблица") + ".csv", () => `﻿${t("Столбец")} 1;${t("Столбец")} 2;${t("Столбец")} 3\r\n;;\r\n`),
  createImage: () => (location.href = "image.html"),
  options: async () => ({ image: true }),
  async open() {
    try {
      const [h] = await showOpenFilePicker({ id: "hd-docs", types: [PICK.md, PICK.csv, PICK.img], excludeAcceptAllOption: false });
      if (h) openHandle(h);
    } catch {}
  },
  async openRecent(path) {
    const x = byPath.get(path);
    if (!x) return { ok: false };
    openHandle(x.handle);
    return { ok: true };
  },
  async forget(path) {
    const x = byPath.get(path);
    if (x) await forget(x.id);
  },
});
