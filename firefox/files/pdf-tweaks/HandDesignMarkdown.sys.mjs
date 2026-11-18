/* Hand Design — просмотр и правка Markdown-файлов, открытых в браузере.
 * Сырой HTML из файла не выполняется: всё экранируется, ссылки проходят проверку схемы. */

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function safeUrl(url, image) {
  const u = String(url).trim().replace(/^<|>$/g, "");
  if (/^(https?:|mailto:|#|\/|\.{1,2}\/)/i.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u)) {
    return u;
  }
  if (image && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(u)) {
    return u;
  }
  return "";
}

function slugify(text, used) {
  const base = String(text).toLowerCase().replace(/<[^>]*>/g, "").replace(/&[a-z#0-9]+;/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-") || "section";
  let slug = base;
  for (let i = 2; used.has(slug); i++) {
    slug = `${base}-${i}`;
  }
  used.add(slug);
  return slug;
}

/* ---------------------------- строчная разметка ---------------------------- */

function inline(src, refs) {
  const store = [];
  const keep = html => `\u0000${store.push(html) - 1}\u0000`;
  let s = String(src);

  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => keep(`<code>${esc(code.replace(/^ (.+) $/, "$1"))}</code>`));
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|~<>])/g, (_, ch) => keep(esc(ch)));
  s = s.replace(/<((?:https?:\/\/|mailto:)[^\s<>]+)>/g, (_, url) => {
    const href = safeUrl(url);
    return href ? keep(`<a href="${esc(href)}">${esc(url.replace(/^mailto:/, ""))}</a>`) : esc(url);
  });

  const link = (img, text, url, title) => {
    const href = safeUrl(url, img);
    const t = title ? ` title="${esc(title)}"` : "";
    if (img) {
      return href ? keep(`<img src="${esc(href)}" alt="${esc(text)}"${t} loading="lazy">`) : esc(text);
    }
    const inner = inline(text, refs);
    return href ? keep(`<a href="${esc(href)}"${t}>${inner}</a>`) : keep(inner);
  };
  s = s.replace(/(!?)\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(\s*(<[^>]*>|[^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:\s+(?:"([^"]*)"|'([^']*)'))?\s*\)/g,
    (_, bang, text, url, t1, t2) => link(!!bang, text, url, t1 ?? t2));
  s = s.replace(/(!?)\[((?:[^\[\]]|\[[^\[\]]*\])*)\](?:\[([^\]]*)\])?/g, (m, bang, text, ref) => {
    const r = refs.get((ref || text).trim().toLowerCase());
    return r ? link(!!bang, text, r.url, r.title) : m;
  });

  s = esc(s);
  s = s.replace(/(^|[\s(])((?:https?:\/\/|www\.)[^\s<]*[^\s<.,:;"')\]!?])/g, (_, pre, url) =>
    pre + keep(`<a href="${esc((url.startsWith("www.") ? "https://" + url : url).replace(/&amp;/g, "&"))}">${url}</a>`));
  s = s.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, (m, mark, text, off, all) =>
    mark === "__" && /\w/.test(all[off - 1] || "") ? m : `<strong>${text}</strong>`);
  s = s.replace(/(^|[^*\w])\*(?=[^\s*])([\s\S]*?[^\s*])\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?![_\w])/g, "$1<em>$2</em>");
  s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");
  s = s.replace(/(?: {2,}|\\)\n/g, "<br>\n");

  while (/\u0000\d+\u0000/.test(s)) {
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => store[+i]);
  }
  return s;
}

/* ----------------------------- блочная разметка ---------------------------- */

const RE = {
  align: /^\s*<(div|p)\s+align=["']?(center|right|left)["']?\s*>\s*$/i,
  fence: /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/,
  heading: /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/,
  hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/,
  quote: /^ {0,3}> ?/,
  list: /^( *)([-*+]|\d{1,9}[.)])([ \t]+|$)/,
  ref: /^ {0,3}\[([^\]]+)\]:\s*<?(\S+?)>?(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*$/,
  tableSep: /^ *\|? *:?-{1,}:? *(\| *:?-{1,}:? *)*\|? *$/,
};

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|"));
}

export function parseTable(lines) {
  const head = splitRow(lines[0]);
  const marks = splitRow(lines[1]);
  const align = head.map((_, k) => {
    const m = marks[k] || "";
    return /^:-*:$/.test(m) ? "center" : /^-*:$/.test(m) ? "right" : /^:-*$/.test(m) ? "left" : "";
  });
  const rows = [head, ...lines.slice(2).map(splitRow)].map(r => head.map((_, k) => r[k] ?? ""));
  return { align, rows };
}

const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|\p{Extended_Pictographic}/u;
const width = s => [...s].reduce((w, ch) => w + (WIDE.test(ch) ? 2 : 1), 0);

export function formatTable({ align, rows }) {
  const cells = rows.map(r => r.map(c => c.trim().replace(/\\?\|/g, "\\|")));
  const w = align.map((_, k) => Math.max(3, ...cells.map(r => width(r[k]))));
  const line = r => "| " + r.map((c, k) => c + " ".repeat(w[k] - width(c))).join(" | ") + " |";
  const sep = "| " + align.map((a, k) => {
    const d = "-".repeat(w[k] - (a === "center" ? 2 : a ? 1 : 0));
    return a === "center" ? `:${d}:` : a === "left" ? `:${d}` : a === "right" ? `${d}:` : d;
  }).join(" | ") + " |";
  return [line(cells[0]), sep, ...cells.slice(1).map(line)];
}

function parseBlocks(lines, ctx, nums = null) {
  const out = [];
  let i = 0;
  let para = [];
  const flush = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join("\n").trim(), ctx.refs)}</p>`);
      para = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      flush();
      i++;
      continue;
    }
    let m;
    if ((m = line.match(RE.align))) {
      flush();
      const tag = m[1].toLowerCase();
      const open = new RegExp(`^\\s*<${tag}\\b`, "i");
      const close = new RegExp(`^\\s*</${tag}>\\s*$`, "i");
      const body = [];
      const bodyNums = [];
      let depth = 1;
      i++;
      while (i < lines.length) {
        if (open.test(lines[i])) depth++;
        if (close.test(lines[i]) && --depth === 0) break;
        body.push(lines[i]);
        bodyNums.push(nums?.[i]);
        i++;
      }
      i++;
      out.push(`<div class="hd-md-align" data-align="${m[2].toLowerCase()}">${parseBlocks(body, ctx, nums && bodyNums)}</div>`);
      continue;
    }
    if ((m = line.match(RE.fence))) {
      flush();
      const mark = m[1];
      const lang = m[2];
      const body = [];
      i++;
      while (i < lines.length && !new RegExp(`^ {0,3}${mark[0]}{${mark.length},}\\s*$`).test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre${lang ? ` data-lang="${esc(lang)}"` : ""}><code>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    if ((m = line.match(RE.heading))) {
      flush();
      const level = m[1].length;
      const html = inline(m[2] || "", ctx.refs);
      const id = slugify(html, ctx.ids);
      ctx.headings.push({ level, id, text: html.replace(/<[^>]*>/g, "") });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      i++;
      continue;
    }
    if (para.length && /^ {0,3}(=+|-+)\s*$/.test(line)) {
      const level = line.trim()[0] === "=" ? 1 : 2;
      const html = inline(para.join("\n").trim(), ctx.refs);
      para = [];
      const id = slugify(html, ctx.ids);
      ctx.headings.push({ level, id, text: html.replace(/<[^>]*>/g, "") });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      i++;
      continue;
    }
    if (RE.hr.test(line)) {
      flush();
      out.push("<hr>");
      i++;
      continue;
    }
    if (RE.quote.test(line)) {
      flush();
      const body = [];
      while (i < lines.length && lines[i].trim() && (RE.quote.test(lines[i]) || body.length)) {
        if (!RE.quote.test(lines[i]) && (RE.fence.test(lines[i]) || RE.heading.test(lines[i]) || RE.list.test(lines[i]))) break;
        body.push(lines[i].replace(RE.quote, ""));
        i++;
      }
      out.push(`<blockquote>${parseBlocks(body, ctx)}</blockquote>`);
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && RE.tableSep.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      flush();
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map(c => c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "");
      const cell = (tag, text, k) => `<${tag}${align[k] ? ` data-align="${align[k]}"` : ""}>${inline(text, ctx.refs)}</${tag}>`;
      let html = `<thead><tr>${head.map((c, k) => cell("th", c, k)).join("")}</tr></thead><tbody>`;
      const first = i;
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        const row = splitRow(lines[i]);
        html += `<tr>${head.map((_, k) => cell("td", row[k] ?? "", k)).join("")}</tr>`;
        i++;
      }
      const src = nums && nums[i - 1] - nums[first] === i - 1 - first ? ` data-src="${nums[first]}:${nums[i - 1] + 1}"` : "";
      out.push(`<div class="hd-md-table"${src}><table>${html}</tbody></table></div>`);
      continue;
    }
    if ((m = line.match(RE.list)) && (!para.length || m[2] === "-" || m[2] === "*" || m[2] === "+" || /^1[.)]/.test(m[2]))) {
      flush();
      const ordered = /\d/.test(m[2]);
      const start = ordered ? parseInt(m[2], 10) : 1;
      const base = m[1].length;
      const items = [];
      while (i < lines.length) {
        const lm = lines[i].match(RE.list);
        if (!lm || lm[1].length !== base || /\d/.test(lm[2]) !== ordered) break;
        const indent = base + lm[2].length + Math.min(lm[3].length || 1, 4);
        const body = [lines[i].slice(base + lm[2].length + lm[3].length)];
        i++;
        let blank = false;
        while (i < lines.length) {
          const l = lines[i];
          if (!l.trim()) {
            blank = true;
            body.push("");
            i++;
            continue;
          }
          const lead = l.match(/^ */)[0].length;
          if (lead >= indent || (lead > base && RE.list.test(l))) {
            body.push(l.slice(Math.min(lead, indent)));
            blank = false;
            i++;
            continue;
          }
          if (!blank && lead > base && !RE.list.test(l) && !RE.heading.test(l) && !RE.fence.test(l)) {
            body.push(l.trim());
            i++;
            continue;
          }
          if (!blank && !RE.list.test(l) && !RE.heading.test(l) && !RE.fence.test(l) && !RE.quote.test(l) && !RE.hr.test(l)) {
            body.push(l.trim());
            i++;
            continue;
          }
          break;
        }
        while (body.length && !body[body.length - 1].trim()) body.pop();
        items.push(body);
        if (blank && !(i < lines.length && (lines[i].match(RE.list) || [])[1]?.length === base)) break;
      }
      const html = items.map(body => {
        let task = "";
        const tm = body[0].match(/^\[([ xX])\][ \t]+/);
        if (tm) {
          task = tm[1] === " " ? "todo" : "done";
          body[0] = body[0].slice(tm[0].length);
        }
        const index = task ? ctx.tasks++ : -1;
        let inner = parseBlocks(body, ctx);
        const tight = !body.some((l, k) => !l.trim() && k < body.length - 1);
        if (tight) inner = inner.replace(/^<p>([\s\S]*?)<\/p>/, "$1");
        if (task) {
          const done = task === "done" ? " data-done" : "";
          return `<li class="hd-md-task" data-task="${index}"${done}><span class="hd-md-check" role="checkbox" aria-checked="${!!done}"${done}></span><span>${inner}</span></li>`;
        }
        return `<li>${inner}</li>`;
      }).join("");
      out.push(ordered ? `<ol${start !== 1 ? ` start="${start}"` : ""}>${html}</ol>` : `<ul>${html}</ul>`);
      continue;
    }
    if (!para.length && /^( {4}|\t)/.test(line)) {
      const body = [];
      while (i < lines.length && (/^( {4}|\t)/.test(lines[i]) || !lines[i].trim())) {
        body.push(lines[i].replace(/^( {4}|\t)/, ""));
        i++;
      }
      while (body.length && !body[body.length - 1].trim()) body.pop();
      out.push(`<pre><code>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    para.push(line);
    i++;
  }
  flush();
  return out.join("\n");
}

export function render(text) {
  const refs = new Map();
  const lines = [];
  const nums = [];
  let fence = null;
  String(text).replace(/\r\n?/g, "\n").split("\n").forEach((line, n) => {
    const f = line.match(RE.fence);
    if (f) fence = fence ? (line.trim().startsWith(fence) ? null : fence) : f[1];
    const r = !fence && line.match(RE.ref);
    if (r) {
      refs.set(r[1].trim().toLowerCase(), { url: r[2], title: r[3] ?? r[4] ?? r[5] });
      return;
    }
    lines.push(line.replace(/\t/g, "    "));
    nums.push(n);
  });
  const ctx = { refs, ids: new Set(), headings: [], tasks: 0 };
  return { html: parseBlocks(lines, ctx, nums), headings: ctx.headings };
}

/* ------------------------- подсветка исходного текста ----------------------- */

const span = (cls, html) => `<span class="hl-${cls}">${html}</span>`;
const INLINE = /(`+)[^`\n]*?\1|!?\[[^\]\n]*\]\([^)\n]*\)|<(?:https?:\/\/|mailto:)[^>\s]+>|https?:\/\/[^\s<>()]+[^\s<>().,:;!?"']|(\*\*|__)(?=\S)[^\n]*?\S\2|(\*|_)(?=[^\s*_])[^*_\n]*?[^\s*_]\3|~~(?=\S)[^\n]*?\S~~|\\[\\`*_{}\[\]()#+\-.!|~<>]|<\/?[a-zA-Z][^>\n]*>/g;

function hlInline(text) {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    out += esc(text.slice(last, m.index));
    const s = m[0];
    let lm;
    if (m[1]) {
      out += span("code", esc(s));
    } else if ((lm = s.match(/^(!?\[)([^\]]*)(\]\()([^)]*)(\))$/))) {
      out += span("mark", esc(lm[1])) + span("link", esc(lm[2])) + span("mark", esc(lm[3])) + span("url", esc(lm[4])) + span("mark", ")");
    } else if (m[2] || m[3]) {
      const n = m[2] ? 2 : 1;
      out += span("mark", esc(s.slice(0, n))) + span(m[2] ? "strong" : "em", esc(s.slice(n, -n))) + span("mark", esc(s.slice(-n)));
    } else if (s.startsWith("~~")) {
      out += span("mark", "~~") + span("del", esc(s.slice(2, -2))) + span("mark", "~~");
    } else if (s.startsWith("\\") || (s.startsWith("<") && !/^<(https?:|mailto:)/.test(s))) {
      out += span("mark", esc(s));
    } else {
      out += span("url", esc(s));
    }
    last = m.index + s.length;
  }
  return out + esc(text.slice(last));
}

export function highlight(src) {
  let fence = null;
  const out = String(src).split("\n").map(line => {
    const f = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !line.trim().slice(f[1].length).trim()) {
        fence = null;
        return span("fence", esc(line));
      }
      return span("code", esc(line));
    }
    if (f) {
      fence = f[1];
      return span("fence", esc(line));
    }
    let m;
    if ((m = line.match(/^( {0,3})(#{1,6})((?:[ \t].*)?)$/))) {
      return esc(m[1]) + span("mark", m[2]) + span("h", hlInline(m[3]));
    }
    if (/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(line) || /^ {0,3}(=+|-+)\s*$/.test(line)) {
      return span("mark", esc(line));
    }
    if ((m = line.match(/^( {0,3}\[[^\]]+\]:)(\s*)(\S*)(.*)$/))) {
      return span("mark", esc(m[1])) + esc(m[2]) + span("url", esc(m[3])) + span("mark", esc(m[4]));
    }
    let lead = "";
    if ((m = line.match(/^( {0,3}(?:>[ \t]?)+)/))) {
      lead = span("quote", esc(m[1]));
      line = line.slice(m[1].length);
    }
    if ((m = line.match(/^(\s*)([-*+]|\d{1,9}[.)])([ \t]+)(\[[ xX]\][ \t])?(.*)$/))) {
      return lead + esc(m[1]) + span("list", esc(m[2])) + esc(m[3]) + (m[4] ? span("list", esc(m[4])) : "") + hlInline(m[5]);
    }
    if (/^\s*\|/.test(line) || /^ *\|? *:?-+:? *\|/.test(line)) {
      return lead + hlInline(line).replace(/\|(?![^<]*>)/g, span("mark", "|"));
    }
    return lead + hlInline(line);
  });
  return out.join("\n") + "\n ";
}

/* позиция символа в квадратных скобках n-й задачи «- [ ]» в исходном тексте */
function findTask(src, n) {
  let fence = null;
  let k = 0;
  let pos = 0;
  for (const line of src.split("\n")) {
    const f = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
    } else if (f) {
      fence = f[1];
    } else {
      const m = line.match(/^((?: {0,3}>[ \t]?)*\s*(?:[-*+]|\d{1,9}[.)])[ \t]+\[)[ xX]\][ \t]/);
      if (m) {
        if (k === n) return pos + m[1].length;
        k++;
      }
    }
    pos += line.length + 1;
  }
  return -1;
}

/* --------------------------------- редактор -------------------------------- */

const P = d => `<path d="${d}"/>`;
const ICONS = {
  heading: P("M6 5v14M18 5v14M6 12h12"),
  bold: P("M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"),
  italic: P("M10 5h8M6 19h8M14 5l-4 14"),
  strike: P("M16.5 7.5C15.7 6 14.2 5 12 5c-2.8 0-4.8 1.4-4.8 3.6 0 1.3.7 2.3 2.2 3M7.5 16.5C8.3 18 9.8 19 12 19c2.8 0 4.8-1.4 4.8-3.6 0-.5-.1-1-.4-1.4M4 12h16"),
  code: P("M9 8l-4 4 4 4M15 8l4 4-4 4"),
  link: P("M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"),
  list: P("M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"),
  ordered: P("M10 6h10M10 12h10M10 18h10M4 4.5l1.5-1V9M3.5 13.3c.4-.8 2.2-.8 2.2.4 0 1-2.2 1.8-2.2 3h2.4"),
  task: `<rect x="3.5" y="4.5" width="6" height="6" rx="1.5"/>` + P("M4 16.5l1.8 1.8 3.4-3.6M13 7.5h7.5M13 16.5h7.5"),
  quote: P("M6 7h4v4.5c0 2.5-1.3 4.2-3.5 5M14 7h4v4.5c0 2.5-1.3 4.2-3.5 5"),
  table: `<rect x="3.5" y="4.5" width="17" height="15" rx="2"/>` + P("M3.5 10h17M3.5 15h17M10 4.5v15"),
  codeblock: `<rect x="3.5" y="4.5" width="17" height="15" rx="2"/>` + P("M10 10l-2 2 2 2M14 10l2 2-2 2"),
  hr: P("M4 12h16M7 7.5h10M7 16.5h10"),
};
const TABLE_ICONS = {
  rowAdd: `<rect x="4" y="4.5" width="16" height="9" rx="2"/>` + P("M12 16.5v5M9.5 19h5"),
  colAdd: `<rect x="4.5" y="4" width="9" height="16" rx="2"/>` + P("M16.5 12h5M19 9.5v5"),
  rowDel: `<rect x="4" y="4.5" width="16" height="9" rx="2"/>` + P("M9.5 19h5"),
  colDel: `<rect x="4.5" y="4" width="9" height="16" rx="2"/>` + P("M16.5 12h5"),
  left: P("M4 6h16M4 10h10M4 14h16M4 18h10"),
  center: P("M4 6h16M7 10h10M4 14h16M7 18h10"),
  right: P("M4 6h16M10 10h10M4 14h16M10 18h10"),
};
const TABLE_BAR = [["rowAdd", "colAdd"], ["rowDel", "colDel"], ["left", "center", "right"]]
  .map(g => g.map(k => `<button type="button" data-tact="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${TABLE_ICONS[k]}</svg></button>`).join(""))
  .join("<i></i>");
const TOOLS = [["heading"], ["bold", "italic", "strike", "code", "link"], ["list", "ordered", "task", "quote"], ["table", "codeblock", "hr"]]
  .map(g => g.map(k => `<button type="button" data-act="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg></button>`).join(""))
  .join("<i></i>");


const MD_ICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2032%2032'%3E%3Cdefs%3E%3ClinearGradient%20id='g'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='%238b6cff'/%3E%3Cstop%20offset='1'%20stop-color='%233e8bff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='32'%20height='32'%20rx='8'%20fill='url(%23g)'/%3E%3Cg%20fill='none'%20stroke='white'%20stroke-width='3'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M7.5%2022V10l5%206%205-6v12M23.5%2010v11.5M20%2018.5l3.5%203.5%203.5-3.5'/%3E%3C/g%3E%3C/svg%3E";

const MODES = ["read", "split", "edit"];

export function mount(win, doc, { text, mtime = 0, name, folder, t, save, stat, read, home, cssUrl }) {
  const root = doc.documentElement;
  for (const el of doc.querySelectorAll("style, link[rel~='stylesheet'], script")) {
    el.remove();
  }
  root.setAttribute("data-hd-md", "");
  doc.title = name;
  if (cssUrl) {
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    doc.head.append(link);
  }
  const icon = doc.createElement("link");
  icon.rel = "icon";
  icon.href = MD_ICON;
  doc.head.append(icon);
  doc.body.innerHTML = `
    <div class="hd-md">
      <header class="hd-md-bar">
        <div class="hd-md-file">
          <button type="button" class="hd-md-icon">MD</button>
          <span class="hd-md-names"><span class="hd-md-name"></span><span class="hd-md-path"></span></span>
          <span class="hd-md-dirty" hidden></span>
        </div>
        <nav class="hd-md-modes">
          <button type="button" data-mode="read"></button>
          <button type="button" data-mode="split"></button>
          <button type="button" data-mode="edit"></button>
        </nav>
        <div class="hd-md-actions">
          <span class="hd-md-state"></span>
          <button type="button" class="hd-md-save" disabled></button>
        </div>
      </header>
      <div class="hd-md-notice" hidden>
        <span class="hd-md-notice-text"></span>
        <button type="button" class="hd-md-notice-main"></button>
        <button type="button" class="hd-md-notice-alt"></button>
      </div>
      <div class="hd-md-body">
        <aside class="hd-md-outline"><div class="hd-md-outline-title"></div><ol></ol></aside>
        <section class="hd-md-editor">
          <div class="hd-md-tools">${TOOLS}</div>
          <div class="hd-md-code"><pre class="hd-md-hl" aria-hidden="true"></pre><textarea spellcheck="false"></textarea></div>
        </section>
        <article class="hd-md-doc"><div class="hd-md-page"></div></article>
      </div>
    </div>`;
  const $ = sel => doc.querySelector(sel);
  const app = $(".hd-md");
  const area = $(".hd-md-editor textarea");
  const hl = $(".hd-md-hl");
  const page = $(".hd-md-page");
  const docBox = $(".hd-md-doc");
  const outline = $(".hd-md-outline ol");
  const saveBtn = $(".hd-md-save");
  const state = $(".hd-md-state");
  const dirtyDot = $(".hd-md-dirty");
  const notice = $(".hd-md-notice");

  $(".hd-md-name").textContent = name;
  $(".hd-md-path").textContent = folder;
  $(".hd-md-path").title = folder;
  $(".hd-md-outline-title").textContent = t("Содержание");
  const labels = { read: t("Просмотр"), split: t("Рядом"), edit: t("Текст") };
  for (const b of app.querySelectorAll(".hd-md-modes button")) {
    b.textContent = labels[b.dataset.mode];
  }
  saveBtn.textContent = t("Сохранить");
  const homeBtn = $(".hd-md-icon");
  homeBtn.title = t("Все документы");
  homeBtn.disabled = !home;
  homeBtn.addEventListener("click", () => home?.());
  dirtyDot.title = t("Есть несохранённые изменения");
  area.value = text;
  area.setSelectionRange(0, 0);

  let saved = text;
  let diskTime = mtime;
  let busy = false;
  let headingEls = [];

  const words = s => (s.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
  const setState = (msg, kind = "") => {
    state.textContent = msg;
    state.dataset.kind = kind;
  };
  const showCount = () => {
    const n = words(area.value);
    setState(t("Слов: {0} · {1} мин чтения", n.toLocaleString(), Math.max(1, Math.round(n / 200))));
  };

  const draw = () => {
    const { html, headings } = render(area.value);
    page.innerHTML = html || `<p class="hd-md-empty">${esc(t("Файл пустой. Откройте «Текст», чтобы начать писать."))}</p>`;
    outline.innerHTML = headings.filter(h => h.level <= 4)
      .map(h => `<li><a href="#${h.id}" data-level="${h.level}">${h.text}</a></li>`).join("");
    app.dataset.outline = headings.length > 1 ? "" : "none";
    headingEls = [...page.querySelectorAll("h1[id], h2[id], h3[id], h4[id]")];
    markCurrent();
  };
  const markCurrent = () => {
    const top = docBox.getBoundingClientRect().top + 32;
    let cur = headingEls[0];
    for (const h of headingEls) {
      if (h.getBoundingClientRect().top <= top) cur = h;
      else break;
    }
    for (const a of outline.querySelectorAll("a")) {
      a.setAttribute("aria-current", String(!!cur && a.getAttribute("href") === "#" + cur.id));
    }
  };

  const dirty = () => area.value !== saved;
  const syncDirty = () => {
    const d = dirty();
    dirtyDot.hidden = !d;
    saveBtn.disabled = !d || busy;
    doc.title = (d ? "• " : "") + name;
  };

  const setMode = mode => {
    if (!MODES.includes(mode)) return;
    app.dataset.mode = mode;
    for (const b of app.querySelectorAll(".hd-md-modes button")) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    }
    if (mode !== "read") area.focus();
  };

  const ask = (msg, main, onMain, alt, onAlt) => {
    $(".hd-md-notice-text").textContent = msg;
    const b1 = $(".hd-md-notice-main");
    const b2 = $(".hd-md-notice-alt");
    b1.textContent = main;
    b2.textContent = alt;
    noticeMain = onMain;
    noticeAlt = onAlt;
    notice.hidden = false;
  };
  let noticeMain = null;
  let noticeAlt = null;
  $(".hd-md-notice-main").addEventListener("click", () => { notice.hidden = true; noticeMain?.(); });
  $(".hd-md-notice-alt").addEventListener("click", () => { notice.hidden = true; noticeAlt?.(); });

  const reload = async () => {
    const r = await read();
    if (!r?.ok) return;
    edit = null;
    tableBar.remove();
    const top = docBox.scrollTop;
    const pos = Math.min(area.selectionStart, r.text.length);
    area.value = r.text;
    area.setSelectionRange(pos, pos);
    saved = r.text;
    diskTime = r.mtime;
    notice.hidden = true;
    draw();
    paint();
    syncDirty();
    docBox.scrollTop = top;
    setState(t("Обновлено с диска"));
  };

  const doSave = async (force = false) => {
    if (busy || !dirty()) return;
    busy = true;
    syncDirty();
    setState(t("Сохраняю…"));
    const value = area.value;
    let res;
    try {
      res = await save(value, { mtime: force ? 0 : diskTime });
    } catch (e) {
      res = { ok: false, error: String(e) };
    }
    busy = false;
    if (res?.ok) {
      saved = value;
      diskTime = res.mtime;
      notice.hidden = true;
      setState(t("Сохранено"));
      win.setTimeout(() => !busy && !dirty() && showCount(), 1600);
    } else if (res?.conflict) {
      showCount();
      ask(t("Файл на диске изменился после открытия."), t("Перезаписать"), () => doSave(true), t("Загрузить с диска"), reload);
    } else {
      setState(t("Не удалось сохранить: {0}", res?.error || "?"), "error");
    }
    syncDirty();
  };

  let checking = false;
  const check = async () => {
    if (checking || busy || doc.hidden || !notice.hidden) return;
    checking = true;
    try {
      const r = await stat();
      if (r?.ok && diskTime && r.mtime !== diskTime) {
        if (dirty()) {
          ask(t("Файл изменён в другой программе."), t("Загрузить с диска"), reload, t("Оставить мою версию"), () => (diskTime = r.mtime));
        } else {
          await reload();
        }
      }
    } catch {}
    checking = false;
  };

  const insert = s => {
    if (!doc.execCommand("insertText", false, s)) {
      area.setRangeText(s, area.selectionStart, area.selectionEnd, "end");
      area.dispatchEvent(new win.Event("input"));
    }
  };
  const wrap = (left, right = left) => {
    const { selectionStart: a, selectionEnd: b, value } = area;
    const sel = value.slice(a, b);
    if (value.slice(a - left.length, a) === left && value.slice(b, b + right.length) === right) {
      area.setSelectionRange(a - left.length, b + right.length);
      insert(sel);
      area.setSelectionRange(a - left.length, b - left.length);
      return;
    }
    insert(left + sel + right);
    area.setSelectionRange(a + left.length, a + left.length + sel.length);
  };
  const replaceLines = fn => {
    const [a, b] = lineBounds();
    const lines = area.value.slice(a, b).split("\n");
    const next = fn(lines).join("\n");
    area.setSelectionRange(a, b);
    insert(next);
    area.setSelectionRange(a, a + next.length);
  };
  const LIST = /^(\s*)(?:[-*+] \[[ xX]\] |[-*+] |\d{1,9}[.)] |> )?/;
  const togglePrefix = (make, test) => replaceLines(lines => {
    const all = lines.every(l => !l.trim() || test.test(l));
    let n = 0;
    return lines.map(l => {
      if (!l.trim()) return l;
      const m = l.match(LIST);
      const body = l.slice(m[0].length);
      return all ? m[1] + body : m[1] + make(++n) + body;
    });
  });
  const block = (before, after) => {
    const [a, b] = lineBounds();
    const v = area.value;
    const pre = a > 0 && v[a - 1] !== "\n" ? "\n" : "";
    const text = v.slice(a, b);
    area.setSelectionRange(a, b);
    insert(pre + before + text + after);
    if (before) {
      const at = a + pre.length + before.length;
      area.setSelectionRange(at, at + text.length);
    }
  };
  const actions = {
    heading: () => replaceLines(lines => lines.map(l => {
      const m = l.match(/^(#{0,6})\s*/);
      const level = m[1].length >= 3 ? 0 : m[1].length + 1;
      return (level ? "#".repeat(level) + " " : "") + l.slice(m[0].length);
    })),
    bold: () => wrap("**"),
    italic: () => wrap("*"),
    strike: () => wrap("~~"),
    code: () => wrap("`"),
    link: () => {
      const sel = area.value.slice(area.selectionStart, area.selectionEnd);
      const at = area.selectionStart;
      insert(`[${sel}](url)`);
      area.setSelectionRange(at + sel.length + 3, at + sel.length + 6);
    },
    list: () => togglePrefix(() => "- ", /^\s*[-*+] (?!\[[ xX]\] )/),
    ordered: () => togglePrefix(n => `${n}. `, /^\s*\d{1,9}[.)] /),
    task: () => togglePrefix(() => "- [ ] ", /^\s*[-*+] \[[ xX]\] /),
    quote: () => togglePrefix(() => "> ", /^\s*> /),
    table: () => {
      const c = t("Столбец");
      block("", `${area.value.slice(...lineBounds()).trim() ? "\n\n" : ""}| ${c} 1 | ${c} 2 |\n| --- | --- |\n|  |  |\n`);
    },
    codeblock: () => block("```\n", "\n```"),
    hr: () => block("", `${area.value.slice(...lineBounds()).trim() ? "\n\n" : ""}---\n`),
  };
  const toolTitles = {
    heading: t("Заголовок: каждое нажатие меняет уровень"),
    bold: t("Жирный") + " (Ctrl+B)",
    italic: t("Курсив") + " (Ctrl+I)",
    strike: t("Зачёркнутый"),
    code: t("Код в строке"),
    link: t("Ссылка") + " (Ctrl+K)",
    list: t("Список"),
    ordered: t("Нумерованный список"),
    task: t("Задача"),
    quote: t("Цитата"),
    table: t("Таблица"),
    codeblock: t("Блок кода"),
    hr: t("Разделитель"),
  };
  for (const b of doc.querySelectorAll(".hd-md-tools button")) {
    b.title = toolTitles[b.dataset.act];
    b.setAttribute("aria-label", toolTitles[b.dataset.act]);
    b.addEventListener("mousedown", e => e.preventDefault());
    b.addEventListener("click", () => {
      area.focus();
      actions[b.dataset.act]();
    });
  }
  const lineBounds = () => {
    const v = area.value;
    const a = v.lastIndexOf("\n", area.selectionStart - 1) + 1;
    let b = v.indexOf("\n", area.selectionEnd);
    if (b < 0) b = v.length;
    return [a, b];
  };
  const indent = back => {
    const [a, b] = lineBounds();
    const block = area.value.slice(a, b);
    const next = back ? block.replace(/^( {1,4}|\t)/gm, "") : block.replace(/^/gm, "    ");
    area.setSelectionRange(a, b);
    insert(next);
    area.setSelectionRange(a, a + next.length);
  };
  const continueList = () => {
    const v = area.value;
    const a = v.lastIndexOf("\n", area.selectionStart - 1) + 1;
    const line = v.slice(a, area.selectionStart);
    const end = v.indexOf("\n", area.selectionStart);
    if (v.slice(area.selectionStart, end < 0 ? v.length : end).trim()) return false;
    const m = line.match(/^(\s*)([-*+]|\d+[.)])(\s+)(\[[ xX]\]\s+)?/);
    if (!m) return false;
    if (line.trim() === m[0].trim()) {
      area.setSelectionRange(a, area.selectionStart);
      insert("");
      return true;
    }
    const num = m[2].match(/^(\d+)([.)])$/);
    const marker = num ? `${+num[1] + 1}${num[2]}` : m[2];
    insert(`\n${m[1]}${marker}${m[3]}${m[4] ? "[ ] " : ""}`);
    return true;
  };

  /* таблицы: правка ячеек прямо в документе */
  const tableBar = doc.createElement("div");
  tableBar.className = "hd-md-tablebar";
  tableBar.innerHTML = TABLE_BAR;
  const tableTitles = {
    rowAdd: t("Строка ниже") + " (Enter)",
    colAdd: t("Столбец справа"),
    rowDel: t("Удалить строку"),
    colDel: t("Удалить столбец"),
    left: t("По левому краю"),
    center: t("По центру"),
    right: t("По правому краю"),
  };
  for (const b of tableBar.querySelectorAll("button")) {
    b.title = tableTitles[b.dataset.tact];
    b.setAttribute("aria-label", tableTitles[b.dataset.tact]);
  }
  tableBar.addEventListener("mousedown", e => e.preventDefault());

  let edit = null;
  let applying = false;
  const tables = () => [...page.querySelectorAll(".hd-md-table[data-src]")];
  const lineOffset = (v, n) => {
    let at = 0;
    for (let k = 0; k < n; k++) at = v.indexOf("\n", at) + 1;
    return at;
  };
  let tableTime = 0;
  const putText = (a, b, s) => {
    applying = true;
    tableTime = Date.now();
    if (app.dataset.mode !== "read") area.focus({ preventScroll: true });
    if (doc.activeElement === area) {
      area.setSelectionRange(a, b);
      insert(s);
    } else {
      area.setRangeText(s, a, b, "end");
    }
    applying = false;
    win.clearTimeout(drawTimer);
    paint();
    syncDirty();
    showCount();
  };
  const applyTable = () => {
    const { model, start, end } = edit;
    const v = area.value;
    const a = lineOffset(v, start);
    let b = lineOffset(v, end) - 1;
    if (b < a) b = v.length;
    const text = formatTable(model).join("\n");
    if (v.slice(a, b) !== text) putText(a, b, text);
    edit.end = start + model.rows.length + 1;
  };
  const readCell = () => {
    if (edit) edit.model.rows[edit.r][edit.c] = edit.cell.textContent.replace(/\s*\n\s*/g, " ").trim();
  };
  const openCell = (index, r, c, keep = false) => {
    const box = tables()[index];
    if (!box) return;
    const [start, end] = box.dataset.src.split(":").map(Number);
    const model = parseTable(area.value.split("\n").slice(start, end));
    r = Math.max(0, Math.min(r, model.rows.length - 1));
    c = Math.max(0, Math.min(c, model.align.length - 1));
    const cell = box.querySelector("table").rows[r]?.cells[c];
    if (!cell) return;
    edit = { index, start, end, model, r, c, cell, box };
    box.dataset.editing = "";
    cell.dataset.edit = "";
    cell.contentEditable = "plaintext-only";
    cell.textContent = model.rows[r][c];
    page.append(tableBar);
    const gap = tableBar.offsetHeight + 10;
    box.style.marginTop = `${gap}px`;
    if (!keep) docBox.scrollTop += gap;
    edit.gap = gap;
    tableBar.style.top = `${box.offsetTop - gap + 2}px`;
    tableBar.style.left = `${box.offsetLeft}px`;
    tableBar.querySelector("[data-tact=rowDel]").disabled = r === 0;
    tableBar.querySelector("[data-tact=colDel]").disabled = model.align.length < 2;
    for (const k of ["left", "center", "right"]) {
      tableBar.querySelector(`[data-tact=${k}]`).setAttribute("aria-pressed", String((model.align[c] || "left") === k));
    }
    cell.focus({ preventScroll: true });
    const range = doc.createRange();
    range.selectNodeContents(cell);
    range.collapse(false);
    win.getSelection().removeAllRanges();
    win.getSelection().addRange(range);
    cell.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  const goCell = (fn, r, c) => {
    readCell();
    fn?.(edit.model);
    applyTable();
    const index = edit.index;
    edit = null;
    draw();
    openCell(index, r, c, true);
  };
  const leaveCell = () => {
    if (!edit) return;
    readCell();
    applyTable();
    const { gap } = edit;
    edit = null;
    tableBar.remove();
    draw();
    docBox.scrollTop -= gap;
  };
  const blank = n => Array(n).fill("");
  const tableActs = {
    rowAdd: () => goCell(m => m.rows.splice(edit.r + 1, 0, blank(m.align.length)), edit.r + 1, edit.c),
    colAdd: () => goCell(m => {
      m.rows.forEach(row => row.splice(edit.c + 1, 0, ""));
      m.align.splice(edit.c + 1, 0, "");
    }, edit.r, edit.c + 1),
    rowDel: () => edit.r > 0 && goCell(m => m.rows.splice(edit.r, 1), edit.r - 1, edit.c),
    colDel: () => edit.model.align.length > 1 && goCell(m => {
      m.rows.forEach(row => row.splice(edit.c, 1));
      m.align.splice(edit.c, 1);
    }, edit.r, edit.c - (edit.c > 0 ? 1 : 0)),
    left: () => goCell(m => (m.align[edit.c] = "left"), edit.r, edit.c),
    center: () => goCell(m => (m.align[edit.c] = "center"), edit.r, edit.c),
    right: () => goCell(m => (m.align[edit.c] = "right"), edit.r, edit.c),
  };
  tableBar.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b && edit) tableActs[b.dataset.tact]();
  });
  const cellKey = e => {
    const { r, c, model } = edit;
    const rows = model.rows.length;
    const cols = model.align.length;
    const mod = e.ctrlKey || e.metaKey || e.altKey;
    if (e.key === "Tab" && !mod) {
      e.preventDefault();
      if (e.shiftKey) {
        if (r > 0 || c > 0) goCell(null, c > 0 ? r : r - 1, c > 0 ? c - 1 : cols - 1);
      } else if (c < cols - 1) {
        goCell(null, r, c + 1);
      } else if (r < rows - 1) {
        goCell(null, r + 1, 0);
      } else {
        goCell(m => m.rows.push(blank(cols)), r + 1, 0);
      }
    } else if (e.key === "Enter" && !mod) {
      e.preventDefault();
      if (e.shiftKey) doc.execCommand("insertText", false, "<br>");
      else if (r < rows - 1) goCell(null, r + 1, c);
      else goCell(m => m.rows.push(blank(cols)), r + 1, c);
    } else if ((e.key === "ArrowUp" && r > 0) || (e.key === "ArrowDown" && r < rows - 1)) {
      if (mod || e.shiftKey) return;
      e.preventDefault();
      goCell(null, r + (e.key === "ArrowUp" ? -1 : 1), c);
    } else if (e.key === "Escape") {
      e.preventDefault();
      leaveCell();
    }
  };
  page.addEventListener("keydown", e => {
    if (edit && e.target === edit.cell) cellKey(e);
  });
  page.addEventListener("mousedown", e => {
    if (e.button !== 0 || e.target.closest("a")) return;
    const cell = e.target.closest(".hd-md-table[data-src] :is(td, th)");
    if (!cell || cell === edit?.cell) return;
    e.preventDefault();
    const index = tables().indexOf(cell.closest(".hd-md-table"));
    const r = cell.parentElement.rowIndex;
    const c = cell.cellIndex;
    const keep = !!edit;
    if (edit) {
      readCell();
      applyTable();
      edit = null;
      draw();
    }
    openCell(index, r, c, keep);
  });
  page.addEventListener("focusout", () => {
    win.setTimeout(() => {
      if (edit && !applying && doc.activeElement !== edit.cell) leaveCell();
    }, 0);
  });
  const tableTab = back => {
    const v = area.value;
    const pos = area.selectionStart;
    const lines = v.split("\n");
    const ln = v.slice(0, pos).split("\n").length - 1;
    const isRow = l => /^\s*\|/.test(l);
    if (!isRow(lines[ln])) return false;
    let s = ln;
    while (s > 0 && isRow(lines[s - 1])) s--;
    let e = ln + 1;
    while (e < lines.length && isRow(lines[e])) e++;
    if (e - s < 2 || !RE.tableSep.test(lines[s + 1])) return false;
    const model = parseTable(lines.slice(s, e));
    const cols = model.align.length;
    const before = lines[ln].slice(0, pos - lineOffset(v, ln));
    const col = Math.min(cols - 1, Math.max(0, (before.match(/(?<!\\)\|/g) || []).length - 1));
    const d = ln - s;
    let r = d < 2 ? 0 : d - 1;
    let c = col + (back ? -1 : 1);
    if (c >= cols) {
      c = 0;
      r++;
    } else if (c < 0) {
      c = cols - 1;
      r--;
    }
    if (r < 0) {
      r = 0;
      c = 0;
    }
    if (r >= model.rows.length) model.rows.push(blank(cols));
    const out = formatTable(model);
    const a = lineOffset(v, s);
    let b = lineOffset(v, e) - 1;
    if (b < a) b = v.length;
    area.setSelectionRange(a, b);
    insert(out.join("\n"));
    const li = r === 0 ? 0 : r + 1;
    const row = out[li];
    const base = a + out.slice(0, li).join("\n").length + (li ? 1 : 0);
    const pipes = [...row.matchAll(/(?<!\\)\|/g)].map(m => m.index);
    const from = pipes[c] + 2;
    const to = Math.max(from, row.slice(0, pipes[c + 1]).trimEnd().length);
    area.setSelectionRange(base + from, base + to);
    return true;
  };

  let hlFrame = 0;
  const paint = () => {
    hlFrame = 0;
    hl.innerHTML = highlight(area.value);
    hl.scrollTop = area.scrollTop;
  };
  let drawTimer = 0;
  area.addEventListener("input", () => {
    syncDirty();
    hlFrame ||= win.requestAnimationFrame(paint);
    win.clearTimeout(drawTimer);
    drawTimer = win.setTimeout(() => {
      draw();
      if (!busy) showCount();
    }, 120);
  });
  area.addEventListener("scroll", () => {
    hl.scrollTop = area.scrollTop;
    hl.scrollLeft = area.scrollLeft;
    if (app.dataset.mode !== "split" || Date.now() - tableTime < 400) return;
    const max = area.scrollHeight - area.clientHeight;
    docBox.scrollTop = max > 0 ? (area.scrollTop / max) * (docBox.scrollHeight - docBox.clientHeight) : 0;
  });
  area.addEventListener("keydown", e => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "Tab" && !mod && !e.altKey) {
      e.preventDefault();
      if (!area.value.slice(area.selectionStart, area.selectionEnd).includes("\n") && tableTab(e.shiftKey)) return;
      if (e.shiftKey || area.selectionStart !== area.selectionEnd) indent(e.shiftKey);
      else insert("    ");
    } else if (e.key === "Enter" && !mod && !e.shiftKey && !e.altKey && area.selectionStart === area.selectionEnd) {
      if (continueList()) e.preventDefault();
    } else if (mod && !e.altKey && !e.shiftKey && (e.code === "KeyB" || e.code === "KeyI")) {
      e.preventDefault();
      actions[e.code === "KeyB" ? "bold" : "italic"]();
    } else if (mod && !e.altKey && !e.shiftKey && e.code === "KeyK") {
      e.preventDefault();
      actions.link();
    }
  });

  doc.addEventListener("keydown", e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey && e.code === "KeyS") {
      e.preventDefault();
      if (edit) goCell(null, edit.r, edit.c);
      doSave();
    } else if (mod && !e.altKey && !e.shiftKey && e.code === "KeyE") {
      e.preventDefault();
      leaveCell();
      setMode(app.dataset.mode === "read" ? "edit" : "read");
    } else if (mod && e.altKey && /^Digit[123]$/.test(e.code)) {
      e.preventDefault();
      leaveCell();
      setMode(MODES[+e.code.slice(5) - 1]);
    }
  }, true);
  for (const b of app.querySelectorAll(".hd-md-modes button")) {
    b.addEventListener("click", () => setMode(b.dataset.mode));
  }
  saveBtn.addEventListener("click", () => doSave());
  page.addEventListener("click", e => {
    const li = e.target.closest(".hd-md-check")?.closest("[data-task]");
    if (!li) return;
    const i = findTask(area.value, +li.dataset.task);
    if (i < 0) return;
    area.setRangeText(area.value[i] === " " ? "x" : " ", i, i + 1, "preserve");
    win.clearTimeout(drawTimer);
    draw();
    paint();
    syncDirty();
    showCount();
  });
  win.addEventListener("focus", check);
  doc.addEventListener("visibilitychange", check);
  win.setInterval(check, 4000);
  outline.addEventListener("click", e => {
    const a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();
    doc.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({ block: "start" });
  });
  docBox.addEventListener("scroll", () => markCurrent(), { passive: true });
  win.addEventListener("beforeunload", e => {
    if (dirty()) e.preventDefault();
  });

  draw();
  paint();
  showCount();
  syncDirty();
  setMode(text.trim() ? "read" : "edit");
  return { setMode, save: doSave };
}
