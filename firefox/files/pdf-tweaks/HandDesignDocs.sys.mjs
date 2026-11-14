/* Hand Design — страница «Документы»: новый файл, открыть, недавние. Файлы открываются в редакторе Markdown. */

export function mountDocs(win, doc, { t, list, create, open, openRecent, forget }) {
  doc.documentElement.setAttribute("data-hd-md", "");
  doc.title = t("Документы");
  doc.body.innerHTML = `
    <main class="hd-docs">
      <header class="hd-docs-head">
        <span class="hd-md-icon">MD</span>
        <div>
          <h1></h1>
          <p class="hd-docs-sub"></p>
        </div>
      </header>
      <div class="hd-docs-actions">
        <button type="button" class="hd-docs-card" data-act="new"><span class="hd-docs-glyph" data-glyph="new"></span><b></b><small></small></button>
        <button type="button" class="hd-docs-card" data-act="open"><span class="hd-docs-glyph" data-glyph="open"></span><b></b><small></small></button>
      </div>
      <section class="hd-docs-recent">
        <h2></h2>
        <ol></ol>
        <p class="hd-docs-empty" hidden></p>
      </section>
    </main>`;
  const $ = sel => doc.querySelector(sel);
  $("h1").textContent = t("Документы");
  $(".hd-docs-sub").textContent = t("Можно просто перетащить файл .md в окно браузера.");
  const [cNew, cOpen] = doc.querySelectorAll(".hd-docs-card");
  cNew.querySelector("b").textContent = t("Новый документ");
  cNew.querySelector("small").textContent = t("Выберите, где сохранить, и начинайте писать");
  cOpen.querySelector("b").textContent = t("Открыть файл");
  cOpen.querySelector("small").textContent = t("Файл .md с компьютера");
  $(".hd-docs-recent h2").textContent = t("Недавние");
  $(".hd-docs-empty").textContent = t("Здесь появятся файлы, которые вы открывали.");
  cNew.addEventListener("click", () => create());
  cOpen.addEventListener("click", () => open());

  const ol = $(".hd-docs-recent ol");
  const fmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const split = path => {
    const i = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
    return [path.slice(i + 1), path.slice(0, i)];
  };

  const draw = async () => {
    const items = (await list()) || [];
    ol.textContent = "";
    $(".hd-docs-empty").hidden = items.length > 0;
    for (const it of items) {
      const [name, folder] = split(it.path);
      const li = doc.createElement("li");
      li.className = "hd-docs-item";
      li.toggleAttribute("data-missing", !it.exists);
      li.innerHTML = `<button type="button" class="hd-docs-open"><span class="hd-docs-file"></span><span class="hd-docs-names"><b></b><small></small></span><time></time></button><button type="button" class="hd-docs-forget">✕</button>`;
      li.querySelector("b").textContent = name;
      li.querySelector("small").textContent = folder;
      li.querySelector("small").title = it.path;
      li.querySelector("time").textContent = !it.exists ? t("Файл не найден") : it.time ? fmt.format(new Date(it.time)) : "";
      const del = li.querySelector(".hd-docs-forget");
      del.title = t("Убрать из списка");
      li.querySelector(".hd-docs-open").addEventListener("click", async () => {
        const r = await openRecent(it.path);
        if (!r?.ok) draw();
      });
      del.addEventListener("click", async () => {
        await forget(it.path);
        draw();
      });
      ol.append(li);
    }
  };
  draw();
  win.addEventListener("focus", draw);
}
