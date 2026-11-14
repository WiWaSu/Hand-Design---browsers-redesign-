/* Применить тему и настройки к странице расширения: CSS-переменные --hd-* на <html>.
   Цвета тем хранятся как в Firefox-версии (light-dark(), color-mix()) — браузер считает их сам,
   светлый или тёмный вариант выбирается свойством color-scheme. */
import { THEMES } from "./themes.js";

export const themeById = id => THEMES.find(t => t.id === id) || THEMES[0];

const FONTS = {
  segoe: '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
  inter: 'Inter, "Segoe UI", system-ui, sans-serif',
  roboto: 'Roboto, "Segoe UI", system-ui, sans-serif',
  system: "system-ui, sans-serif",
  mono: '"Cascadia Code", "JetBrains Mono", Consolas, monospace',
};
const SPRING = {
  apple: "cubic-bezier(.2, .9, .25, 1.15)",
  smooth: "cubic-bezier(.25, .8, .25, 1)",
  system: "cubic-bezier(.1, .9, .2, 1)",
  off: "linear",
};

/* схема: dark | light — что реально показано сейчас */
export function schemeOf(t, s) {
  if (t.scheme !== "both") {
    return t.scheme;
  }
  if (s.mode === "light" || s.mode === "dark") {
    return s.mode;
  }
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(root, s, { page = true } = {}) {
  const t = themeById(s.theme);
  const st = root.style;
  const set = (k, v) => (v === undefined || v === null || v === "" ? st.removeProperty(k) : st.setProperty(k, v));
  root.dataset.theme = t.id;
  root.dataset.scheme = schemeOf(t, s);
  // color-scheme: «как в Windows» — light dark; иначе выбранный вариант
  set("color-scheme", t.scheme !== "both" ? t.scheme : s.mode === "auto" ? "light dark" : s.mode);
  set("--hd-sys-accent", s.sysAccent || "#4C9AFF");
  set("--hd-ua", s.accent || null);
  const v = t.vars;
  set("--hd-accent", v.accent);
  set("--hd-on-accent", s.accent ? onColor(s.accent) : v.on_accent);
  set("--hd-frame", s.frame || v.frame);
  set("--hd-bar", s.bar || v.bar);
  set("--hd-field", v.field);
  set("--hd-menu", s.bar || v.menu);
  set("--hd-ink", s.ink || v.ink);
  set("--hd-muted", s.ink ? `color-mix(in srgb, ${s.ink} 62%, transparent)` : v.muted);
  set("--hd-line", v.line);
  set("--hd-hover", v.hover);
  set("--hd-press", v.press);
  set("--hd-soft", "color-mix(in srgb, var(--hd-accent) 18%, transparent)");
  const sq = s.square;
  set("--hd-radius", sq ? "0px" : s.radius !== undefined ? s.radius + "px" : t.radius);
  set("--hd-r-item", sq ? "0px" : s.rItem !== undefined ? s.rItem + "px" : t.rItem);
  set("--hd-r-tab", sq ? "0px" : t.rTab);
  set("--hd-r-btn", sq ? "0px" : s.rItem !== undefined ? s.rItem + "px" : t.rBtn);
  const font = s.font === "custom" && s.fontCustom ? `"${s.fontCustom}", ${t.font}` : FONTS[s.font] || t.font;
  set("--hd-font", font);
  if (page) {
    set("--hd-font-size", (s.fontSize || 14) + "px");
  }
  const off = s.motion === "off" || (s.motion === "system" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  set("--hd-k", off ? "0.001" : String(s.speed || 1));
  set("--hd-spring", SPRING[s.motion] || SPRING.apple);
  root.toggleAttribute("hd-square", !!sq);
  root.toggleAttribute("hd-glass", !!t.glass);
  root.toggleAttribute("hd-nomotion", off);
  return t;
}

/* текст на цвете: белый или чёрный */
export function onColor(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#000000" : "#FFFFFF";
}

/* плитка темы: кружок из 3 цветов (как в Studio Firefox-версии) */
export function swatchCss(t) {
  const sw = t.swatch;
  return `conic-gradient(from 200deg, ${sw[2]} 0 25%, ${sw[1]} 0 62%, ${sw[0]} 0)`;
}
