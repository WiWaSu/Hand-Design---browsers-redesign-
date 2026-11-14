/* Быстрая панель «Дизайн»: тема, вариант, акцент, обои, переключатели, рамка браузера */
import { load, onChange, patch, VERSION } from "../shared/settings.js";
import { applyTheme, swatchCss } from "../shared/apply.js";
import { paintFrame } from "../shared/frame.js";
import { THEMES } from "../shared/themes.js";
import { WALLS } from "../shared/walls.js";
import { T, setLang } from "../shared/i18n.js";

const $ = s => document.querySelector(s);
const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const root = document.documentElement;
const ACCENTS = ["#0A84FF", "#5E5CE6", "#BF5AF2", "#FF4FD8", "#FF453A", "#FF9F0A", "#FFD60A", "#30D158", "#22C3E6"];
let S = null;
let built = false;

function build() {
  built = true;
  $("#ver").textContent = VERSION;
  $("#cap-theme").textContent = T("Тема", "Theme");
  $("#cap-accent").textContent = T("Акцент", "Accent");
  $("#cap-wall").textContent = T("Обои новой вкладки", "New tab wallpaper");
  $("#l-square").textContent = T("Без скруглений", "No rounded corners");
  $("#l-callbar").textContent = T("Плашка звонка", "Call bar");
  $("#l-pdf").textContent = T("Просмотр PDF", "PDF viewer");
  $("#frame-btn").textContent = T("Покрасить рамку", "Paint the frame");
  $("#frame-btn").title = T("Вкладки и адресная строка браузера — в цвет темы", "Browser tabs and address bar in theme colors");
  $("#studio").textContent = T("Все настройки…", "All settings…");

  const themes = $("#themes");
  for (const t of THEMES) {
    const b = mk("button", "th");
    b.dataset.id = t.id;
    b.title = t.name;
    b.style.background = swatchCss(t);
    b.style.boxShadow = `inset 0 0 0 1px ${t.swatch[3]}33`;
    b.addEventListener("click", () => patch({ theme: t.id }));
    themes.append(b);
  }
  const mode = $("#mode");
  for (const [v, ru, en] of [["auto", "Авто", "Auto"], ["light", "Светлая", "Light"], ["dark", "Тёмная", "Dark"]]) {
    const b = mk("button", "", T(ru, en));
    b.dataset.v = v;
    b.addEventListener("click", () => patch({ mode: v === "auto" ? null : v }));
    mode.append(b);
  }
  const acc = $("#accents");
  const th = mk("button", "ac ac-theme");
  th.dataset.c = "";
  th.title = T("Как в теме", "Theme accent");
  th.addEventListener("click", () => patch({ accent: null }));
  acc.append(th);
  for (const c of ACCENTS) {
    const b = mk("button", "ac");
    b.style.setProperty("--c", c);
    b.dataset.c = c;
    b.title = c;
    b.addEventListener("click", () => patch({ accent: c }));
    acc.append(b);
  }
  const own = mk("label", "ac ac-own", "+");
  own.title = T("Свой цвет", "Custom color");
  const input = mk("input");
  input.type = "color";
  input.addEventListener("change", () => patch({ accent: input.value.toUpperCase() }));
  own.append(input);
  acc.append(own);

  const walls = $("#walls");
  const addWall = (id, label, bg) => {
    const b = mk("button", "wl");
    b.dataset.id = id;
    b.title = label;
    b.style.background = bg;
    b.addEventListener("click", async () => {
      if (id === "custom" && !(await chrome.storage.local.get("hdWall")).hdWall) {
        chrome.tabs.create({}); // своя картинка выбирается на новой вкладке (кнопка внизу справа)
        return;
      }
      patch({ wall: id === "theme" ? null : id });
    });
    walls.append(b);
  };
  addWall("theme", T("Обои темы", "Theme wallpaper"), "var(--wall-theme)");
  for (const [id, ru, en, css] of WALLS.slice(0, 10)) addWall(id, T(ru, en), css);
  addWall("custom", T("Своя картинка — выберите на новой вкладке", "Own picture — pick it on the new tab"), "repeating-conic-gradient(rgb(127 127 127 / .25) 0 25%, transparent 0 50%) 0 0 / 10px 10px");

  for (const sw of document.querySelectorAll(".hd-switch")) {
    sw.addEventListener("click", () => patch({ [sw.dataset.key]: sw.getAttribute("aria-checked") !== "true" }));
  }
  $("#studio").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
  $("#frame-btn").addEventListener("click", paint);
}

function render(s) {
  S = s;
  setLang(s.lang || "");
  if (!built) build();
  const t = applyTheme(root, s);
  $("#theme-name").textContent = t.name;
  for (const b of $("#themes").children) b.toggleAttribute("on", b.dataset.id === t.id);
  $("#mode").hidden = t.scheme !== "both";
  for (const b of $("#mode").children) b.toggleAttribute("on", b.dataset.v === (s.mode || "auto"));
  for (const b of $("#accents").children) if (b.dataset.c !== undefined) b.toggleAttribute("on", (b.dataset.c || "") === (s.accent || ""));
  root.style.setProperty("--wall-theme", t.wall);
  for (const b of $("#walls").children) b.toggleAttribute("on", b.dataset.id === s.wall);
  for (const sw of document.querySelectorAll(".hd-switch")) sw.setAttribute("aria-checked", String(!!s[sw.dataset.key]));
}

function paint() {
  paintFrame(S, $("#frame-steps"), mk);
}

async function update() {
  const { hdUpdate } = await chrome.storage.local.get("hdUpdate");
  if (hdUpdate && hdUpdate.available) {
    const a = $("#update");
    a.hidden = false;
    a.href = hdUpdate.url;
    a.textContent = T(`Доступна версия ${hdUpdate.latest} — открыть`, `Version ${hdUpdate.latest} is available — open`);
  }
}

load().then(render);
onChange(render);
update();
