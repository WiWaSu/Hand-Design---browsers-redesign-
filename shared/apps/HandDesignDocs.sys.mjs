/* Hand Design — страница «Документы»: поиск, новый файл, открыть, закреплённые и недавние
   (Markdown, таблицы, PDF, картинки). pin, reveal и search есть не во всех браузерах —
   без них кнопки не показываются, поиск идёт только по именам. */
import { ensureIcons } from "./hd-icons.mjs";

const KINDS = [
  ["md", "MD", /\.(md|markdown|mdown|mkd|mkdn)$/i],
  ["csv", "CSV", /\.(csv|tsv)$/i],
  ["pdf", "PDF", /\.pdf$/i],
  ["img", "IMG", /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i],
];
const kindOf = name => KINDS.find(k => k[2].test(name)) || KINDS[0];

export function mountDocs(win, doc, api) {
  const { t, list, create, createCsv, createImage, options, open, openRecent, forget, pin, reveal, search } = api;
  doc.documentElement.setAttribute("data-hd-md", "");
  doc.title = t("Документы");
  try {
    ensureIcons(doc);
  } catch {}
  doc.body.innerHTML = `
    <main class="hd-docs hd-hub">
      <header class="hd-docs-head">
        <span class="hd-md-icon">MD</span>
        <div>
          <h1></h1>
          <p class="hd-docs-sub"></p>
        </div>
      </header>
      <label class="hd-hub-find"><i class="hd-ic" style="--i: var(--fm-ic-search)"></i><input type="search" autocomplete="off" spellcheck="false"><kbd>Ctrl+K</kbd></label>
      <div class="hd-docs-actions">
        <button type="button" class="hd-docs-card" data-act="new"><span class="hd-docs-glyph" data-glyph="new"></span><b></b><small></small></button>
        <button type="button" class="hd-docs-card" data-act="csv"><span class="hd-docs-glyph" data-glyph="table"></span><b></b><small></small></button>
        <button type="button" class="hd-docs-card" data-act="image" hidden><span class="hd-docs-glyph" data-glyph="image"></span><b></b><small></small></button>
        <button type="button" class="hd-docs-card" data-act="open"><span class="hd-docs-glyph" data-glyph="open"></span><b></b><small></small></button>
      </div>
      <section class="hd-hub-pins" hidden><h2></h2><div class="hd-hub-pingrid"></div></section>
      <section class="hd-docs-recent">
        <div class="hd-hub-filters"></div>
        <div class="hd-hub-list"></div>
        <p class="hd-docs-empty" hidden></p>
      </section>
      <section class="hd-hub-hits" hidden><h2></h2><ol></ol></section>
    </main>`;
  const $ = sel => doc.querySelector(sel);
  const el = (tag, cls, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const icon = name => {
    const i = el("i", "hd-ic");
    i.style.setProperty("--i", `var(--fm-ic-${name})`);
    return i;
  };
  $("h1").textContent = t("Документы");
  $(".hd-docs-sub").textContent = t("Markdown, таблицы, PDF и картинки, которые вы открывали. Файл можно просто перетащить в окно.");
  const input = $(".hd-hub-find input");
  input.placeholder = t(search ? "Искать по имени и по тексту .md и .csv" : "Искать по имени");
  const [cNew, cCsv, cImg, cOpen] = doc.querySelectorAll(".hd-docs-card");
  cNew.querySelector("b").textContent = t("Новый документ");
  cNew.querySelector("small").textContent = t("Выберите, где сохранить, и начинайте писать");
  cCsv.querySelector("b").textContent = t("Новая таблица");
  cCsv.querySelector("small").textContent = t("Файл .csv: открывается в Excel и Google Таблицах");
  cImg.querySelector("b").textContent = t("Картинка");
  cImg.querySelector("small").textContent = t("Обрезать, подписать, размыть, сжать");
  options().then(o => (cImg.hidden = !o?.image));
  cOpen.querySelector("b").textContent = t("Открыть файл");
  cOpen.querySelector("small").textContent = t("Документ, таблица, PDF или картинка с компьютера");
  $(".hd-hub-pins h2").textContent = t("Закреплённые");
  $(".hd-hub-hits h2").textContent = t("Найдено в тексте");
  cNew.addEventListener("click", () => create());
  cCsv.addEventListener("click", () => createCsv());
  cImg.addEventListener("click", () => createImage());
  cOpen.addEventListener("click", () => open());

  let filter = "all";
  const filters = $(".hd-hub-filters");
  for (const [id, label] of [["all", "Все"], ["md", "Markdown"], ["csv", "Таблицы"], ["pdf", "PDF"], ["img", "Картинки"]]) {
    const b = el("button", "hd-hub-chip", t(label));
    b.type = "button";
    b.dataset.f = id;
    b.addEventListener("click", () => {
      filter = id;
      render();
    });
    filters.append(b);
  }

  const lang = doc.documentElement.lang || undefined;
  const fmtTime = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" });
  const fmtDate = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });
  const split = path => {
    const i = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
    return [path.slice(i + 1), path.slice(0, i)];
  };
  const dayStart = (back = 0) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime() - back * 864e5;
  };
  const groupOf = time => (!time ? "" : time >= dayStart() ? "Сегодня" : time >= dayStart(1) ? "Вчера" : time >= dayStart(6) ? "На этой неделе" : "Раньше");

  let items = [];
  const norm = s => s.toLowerCase().replace(/ё/g, "е");

  const badge = name => {
    const [kind, label] = kindOf(name);
    const b = el("span", "hd-docs-file");
    b.dataset.kind = label;
    b.dataset.k = kind;
    return b;
  };
  const sub = (it, folder) => {
    if (!it.exists) return t("Файл не найден");
    return it.page && it.pages ? `${folder} · ${t("стр. {0} из {1}", it.page, it.pages)}` : folder;
  };
  const openItem = async it => {
    const r = await openRecent(it.path);
    if (!r?.ok) draw();
  };
  const tool = (name, title, fn) => {
    const b = el("button", "hd-docs-forget");
    b.type = "button";
    b.title = t(title);
    b.append(icon(name));
    b.addEventListener("click", fn);
    return b;
  };

  const row = it => {
    const [name, folder] = split(it.path);
    const li = el("div", "hd-docs-item");
    li.toggleAttribute("data-missing", !it.exists);
    const btn = el("button", "hd-docs-open");
    btn.type = "button";
    const names = el("span", "hd-docs-names");
    const small = el("small", "", sub(it, folder));
    small.title = it.path;
    names.append(el("b", "", name), small);
    const when = el("time", "", it.time ? (it.time >= dayStart() ? fmtTime : fmtDate).format(new Date(it.time)) : "");
    btn.append(badge(name), names, when);
    btn.addEventListener("click", () => openItem(it));
    li.append(btn);
    if (pin && it.exists) {
      const p = tool(it.pinned ? "unpin" : "pin", it.pinned ? "Открепить" : "Закрепить", async () => {
        await pin(it.path, !it.pinned);
        draw();
      });
      p.toggleAttribute("data-on", !!it.pinned);
      li.append(p);
    }
    if (reveal && it.exists) li.append(tool("folder", "Показать в папке", () => reveal(it.path)));
    li.append(tool("close", "Убрать из списка", async () => {
      await forget(it.path);
      draw();
    }));
    return li;
  };

  const pinCard = it => {
    const [name, folder] = split(it.path);
    const c = el("div", "hd-hub-pin");
    c.toggleAttribute("data-missing", !it.exists);
    const btn = el("button", "hd-docs-open");
    btn.type = "button";
    const names = el("span", "hd-docs-names");
    names.append(el("b", "", name), el("small", "", sub(it, folder)));
    btn.append(badge(name), names);
    btn.title = it.path;
    btn.addEventListener("click", () => openItem(it));
    const off = tool("unpin", "Открепить", async () => {
      await pin(it.path, false);
      draw();
    });
    c.append(btn, off);
    return c;
  };

  const render = () => {
    const q = norm(input.value.trim());
    for (const b of filters.children) b.toggleAttribute("on", b.dataset.f === filter);
    const match = it => (filter === "all" || kindOf(it.path)[0] === filter) && (!q || norm(split(it.path)[0]).includes(q));
    const pins = items.filter(it => it.pinned && match(it));
    const grid = $(".hd-hub-pingrid");
    grid.textContent = "";
    for (const it of pins) grid.append(pinCard(it));
    $(".hd-hub-pins").hidden = !pins.length;

    const box = $(".hd-hub-list");
    box.textContent = "";
    const rest = items.filter(it => !it.pinned && match(it));
    let group = null;
    let ol = null;
    for (const it of rest) {
      const g = groupOf(it.time);
      if (g !== group || !ol) {
        group = g;
        if (g) box.append(el("h2", "", t(g)));
        ol = el("div", "hd-hub-group");
        box.append(ol);
      }
      ol.append(row(it));
    }
    const empty = $(".hd-docs-empty");
    empty.hidden = rest.length > 0 || pins.length > 0;
    empty.textContent = q || filter !== "all" ? t("Ничего не нашлось") : t("Здесь появятся файлы, которые вы открывали.");
  };

  let hitSeq = 0;
  const findText = async () => {
    const q = input.value.trim();
    const sec = $(".hd-hub-hits");
    const n = ++hitSeq;
    if (!search || q.length < 2) {
      sec.hidden = true;
      return;
    }
    const hits = (await search(q)) || [];
    if (n !== hitSeq) return;
    const ol = sec.querySelector("ol");
    ol.textContent = "";
    const qn = norm(q);
    for (const h of hits) {
      const [name, folder] = split(h.path);
      const li = el("li", "hd-docs-item");
      const btn = el("button", "hd-docs-open");
      btn.type = "button";
      const names = el("span", "hd-docs-names");
      const snip = el("small", "hd-hub-snip");
      const at = norm(h.snippet).indexOf(qn);
      if (at >= 0) {
        snip.append(h.snippet.slice(0, at), el("mark", "", h.snippet.slice(at, at + q.length)), h.snippet.slice(at + q.length));
      } else {
        snip.textContent = h.snippet;
      }
      names.append(el("b", "", name), snip);
      btn.title = folder;
      btn.append(badge(name), names);
      btn.addEventListener("click", () => openItem(h));
      li.append(btn);
      ol.append(li);
    }
    sec.hidden = !hits.length;
    if (hits.length) $(".hd-docs-empty").hidden = true;
  };
  let timer = 0;
  input.addEventListener("input", () => {
    render();
    win.clearTimeout(timer);
    timer = win.setTimeout(findText, 250);
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Escape" && input.value) {
      input.value = "";
      render();
      findText();
    }
  });
  doc.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === "KeyK") {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  const draw = async () => {
    items = (await list()) || [];
    render();
  };
  draw();
  win.addEventListener("focus", draw);
}
