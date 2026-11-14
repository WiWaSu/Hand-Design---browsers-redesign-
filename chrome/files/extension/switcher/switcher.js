/* Переключатель вкладок: окно открывает фоновый скрипт по Alt+Q.
   Alt+Q ещё раз (или Tab / стрелки) — следующая, отпустили Alt или Enter — перейти, Esc — закрыть. */
import { load } from "../shared/settings.js";
import { applyTheme } from "../shared/apply.js";
import { T, setLang } from "../shared/i18n.js";

const $ = s => document.querySelector(s);
const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const win = Number(new URLSearchParams(location.search).get("win"));
const me = (await chrome.windows.getCurrent()).id;
let tabs = [];
let shown = [];
let sel = 1;
let done = false;

const S = await load();
setLang(S.lang || "");
applyTheme(document.documentElement, S);
document.documentElement.setAttribute("sw", S.switcherStyle || "ios");
document.title = T("Вкладки", "Tabs");
$("#filter").placeholder = T("Найти вкладку…", "Find a tab…");
const help = $("#help");
for (const [k, ru, en] of [["Alt+Q / Tab", "следующая", "next"], ["←→↑↓", "выбрать", "move"], ["Enter", "перейти", "open"], ["Del", "закрыть вкладку", "close tab"], ["Esc", "отмена", "cancel"]]) {
  const s = mk("span");
  s.append(mk("kbd", "", k), " " + T(ru, en));
  help.append(s);
}

const data = await chrome.runtime.sendMessage({ type: "hd:switcher-data", win });
tabs = data?.tabs || [];
sel = tabs.length > 1 ? 1 : 0;
draw();

function draw() {
  const q = $("#filter").value.trim().toLowerCase();
  shown = q ? tabs.filter(t => (t.title + " " + t.url).toLowerCase().includes(q)) : tabs;
  if (sel >= shown.length) sel = Math.max(0, shown.length - 1);
  const grid = $("#grid");
  grid.replaceChildren();
  if (!shown.length) grid.append(mk("div", "empty", T("Ничего не нашлось", "Nothing found")));
  shown.forEach((t, i) => {
    const b = mk("button", "it");
    b.style.setProperty("--i", Math.min(i, 20));
    b.setAttribute("role", "option");
    b.title = t.url;
    const shot = mk("div", "shot");
    if (t.thumb) shot.style.backgroundImage = `url("${t.thumb}")`;
    else {
      const big = mk("img", "big");
      big.src = favicon(t);
      big.alt = "";
      shot.append(big);
    }
    const cap = mk("div", "cap");
    const ic = mk("img");
    ic.src = favicon(t);
    ic.alt = "";
    cap.append(ic, mk("span", "", t.title || t.url));
    if (t.audible) cap.append(mk("span", "snd", "♪"));
    const x = mk("span", "x", "×");
    x.title = T("Закрыть вкладку", "Close tab");
    x.addEventListener("click", e => {
      e.stopPropagation();
      closeTab(t);
    });
    b.append(x, shot, cap);
    b.addEventListener("click", () => pick(t));
    b.addEventListener("mousemove", () => {
      if (sel !== i) {
        sel = i;
        mark();
      }
    });
    grid.append(b);
  });
  $("#count").textContent = shown.length + " / " + tabs.length;
  mark();
}
function favicon(t) {
  return `/_favicon/?pageUrl=${encodeURIComponent(t.url || "")}&size=32`;
}
function mark() {
  const items = $("#grid").querySelectorAll(".it");
  items.forEach((b, i) => b.toggleAttribute("sel", i === sel));
  items[sel]?.scrollIntoView({ block: "nearest" });
}
function cols() {
  const items = $("#grid").querySelectorAll(".it");
  if (items.length < 2) return 1;
  const y = items[0].offsetTop;
  let n = 0;
  for (const b of items) {
    if (b.offsetTop !== y) break;
    n++;
  }
  return Math.max(1, n);
}
function move(d) {
  if (!shown.length) return;
  sel = (sel + d + shown.length) % shown.length;
  mark();
}
function pick(t) {
  if (done || !t) return;
  done = true;
  chrome.runtime.sendMessage({ type: "hd:switcher-pick", tabId: t.id, switcherWin: me });
}
function cancel() {
  if (done) return;
  done = true;
  chrome.runtime.sendMessage({ type: "hd:switcher-pick", tabId: null, switcherWin: me });
}
function closeTab(t) {
  chrome.runtime.sendMessage({ type: "hd:switcher-close-tab", tabId: t.id });
  tabs = tabs.filter(x => x.id !== t.id);
  draw();
}

let typed = false;
document.addEventListener("keydown", e => {
  if (e.key === "Escape") return cancel();
  if (e.key === "Enter") return pick(shown[sel]);
  if (e.key === "Tab") {
    e.preventDefault();
    return move(e.shiftKey ? -1 : 1);
  }
  if (e.key === "ArrowRight") return move(1);
  if (e.key === "ArrowLeft") return move(-1);
  if (e.key === "ArrowDown") {
    e.preventDefault();
    return move(cols());
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    return move(-cols());
  }
  if (e.key === "Delete" && document.activeElement !== $("#filter")) return shown[sel] && closeTab(shown[sel]);
  if (e.key.length === 1 && !e.altKey && !e.ctrlKey && document.activeElement !== $("#filter")) {
    typed = true;
    $("#filter").focus();
  }
});
// как Alt+Tab: отпустили Alt — переходим (если пользователь не начал искать)
document.addEventListener("keyup", e => {
  if (e.key === "Alt" && !typed) pick(shown[sel]);
});
$("#filter").addEventListener("input", () => {
  typed = true;
  sel = 0;
  draw();
});
chrome.runtime.onMessage.addListener(msg => {
  if (msg?.type === "hd:switcher-next") move(1);
});
// ушли в другое окно — закрываемся
window.addEventListener("blur", () => setTimeout(() => !document.hasFocus() && cancel(), 150));
