/* Общее для страниц документов (заметки, Markdown, картинки, CSV): тема, акцент и язык Hand Design. */
import { load, onChange } from "../shared/settings.js";
import { applyTheme, onColor } from "../shared/apply.js";
import { setLang, t } from "../shared/i18n.js";

export { t };

function paint(s) {
  const root = document.documentElement;
  const th = applyTheme(root, s, { page: false });
  const acc = s.accent || th.accentDefault || "#4C9AFF";
  root.style.setProperty("--fm-user-accent", acc);
  root.style.setProperty("--fm-user-on-accent", onColor(acc));
}

export async function initPage() {
  const s = await load();
  await setLang(s.lang || "");
  paint(s);
  onChange(next => {
    if ((next.lang || "") !== (s.lang || "")) location.reload();
    else paint(next);
  });
  return s;
}
