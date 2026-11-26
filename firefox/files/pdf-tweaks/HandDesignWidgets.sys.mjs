/* Виджеты новой вкладки Hand Design. Каждый: название, значок, размер по умолчанию,
   поля настроек и render(ctx). ctx: el, o (настройки), t, q (запрос к браузеру), save(o),
   every(fn, ms) — таймер, который снимается сам, h(tag, cls, text), icon(name), size(). */

const WMO = [
  [[0], "Ясно", "sun"], [[1], "Почти ясно", "sun-cloud"], [[2], "Переменная облачность", "sun-cloud"], [[3], "Пасмурно", "cloud"],
  [[45, 48], "Туман", "fog"], [[51, 53, 55, 56, 57], "Морось", "rain"], [[61, 63, 65, 66, 67], "Дождь", "rain"],
  [[71, 73, 75, 77], "Снег", "snow"], [[80, 81, 82], "Ливень", "rain"], [[85, 86], "Снегопад", "snow"], [[95, 96, 99], "Гроза", "storm"],
];
const wmo = c => WMO.find(w => w[0].includes(c)) || WMO[3];
const P = d => `<path d="${d}"/>`;
const SKY = {
  sun: '<circle cx="12" cy="12" r="4.2"/>' + P("M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"),
  moon: P("M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"),
  cloud: P("M7 18.5h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 10.6 4 4 0 0 0 7 18.5z"),
  "sun-cloud": P("M8.5 3.5v1.5M3.5 8.5H5M4.9 4.9l1 1M12.1 4.9l-1 1") + P("M5.6 11.2a3.4 3.4 0 0 1 6-2.9") + P("M9 19.5h8.5a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.4 13.5 3 3 0 0 0 9 19.5z"),
  rain: P("M7 15.5h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 7.6 4 4 0 0 0 7 15.5z") + P("M8.5 18.5l-1 2.5M12.5 18.5l-1 2.5M16.5 18.5l-1 2.5"),
  snow: P("M7 14.5h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 6.6 4 4 0 0 0 7 14.5z") + P("M8 18v.01M12 19.5v.01M16 18v.01M10 21.5v.01M14 21.5v.01"),
  storm: P("M7 14.5h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 6.6 4 4 0 0 0 7 14.5z") + P("M12.5 15l-2 3.5h3l-2 3.5"),
  fog: P("M4 9h16M6 13h12M4 17h16M8 21h8"),
};
export const skyIcon = (name, doc) => {
  const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("class", "hd-sky");
  s.innerHTML = SKY[name] || SKY.cloud;
  return s;
};

export const ZONES = [
  ["", "—"], ["Europe/Moscow", "Москва"], ["Europe/Kyiv", "Киев"], ["Europe/Minsk", "Минск"], ["Europe/Vilnius", "Вильнюс"], ["Europe/Warsaw", "Варшава"],
  ["Europe/Berlin", "Берлин"], ["Europe/Paris", "Париж"], ["Europe/London", "Лондон"], ["Europe/Madrid", "Мадрид"], ["Europe/Rome", "Рим"], ["Europe/Istanbul", "Стамбул"],
  ["Asia/Tbilisi", "Тбилиси"], ["Asia/Yerevan", "Ереван"], ["Asia/Dubai", "Дубай"], ["Asia/Almaty", "Алматы"], ["Asia/Tashkent", "Ташкент"], ["Asia/Yekaterinburg", "Екатеринбург"],
  ["Asia/Novosibirsk", "Новосибирск"], ["Asia/Vladivostok", "Владивосток"], ["Asia/Kolkata", "Дели"], ["Asia/Bangkok", "Бангкок"], ["Asia/Shanghai", "Пекин"], ["Asia/Singapore", "Сингапур"],
  ["Asia/Tokyo", "Токио"], ["Asia/Seoul", "Сеул"], ["Australia/Sydney", "Сидней"], ["America/New_York", "Нью-Йорк"], ["America/Chicago", "Чикаго"], ["America/Denver", "Денвер"],
  ["America/Los_Angeles", "Лос-Анджелес"], ["America/Sao_Paulo", "Сан-Паулу"], ["America/Mexico_City", "Мехико"], ["UTC", "UTC"],
];

const pad = n => String(n).padStart(2, "0");
const lineText = s => String(s).replace(/[*_`~]|\[\[([^\]|]*)(\|[^\]]*)?\]\]|\[([^\]]*)\]\([^)]*\)/g, (m, a, b, c) => a || c || "");

/* разметка заметки без библиотеки: заголовки, задачи, списки, абзацы */
function noteBody(ctx, text, onToggle) {
  const { h } = ctx;
  const box = h("div", "hd-note-body");
  const lines = String(text || "").replace(/^﻿/, "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").split(/\r?\n/);
  lines.forEach((raw, i) => {
    const l = raw.trimEnd();
    if (!l.trim()) {
      return;
    }
    let m;
    if ((m = l.match(/^(#{1,6})\s+(.*)/))) {
      box.append(h("div", "hd-note-h", lineText(m[2])));
    } else if ((m = l.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)/))) {
      const row = h("label", "hd-note-task");
      const cb = h("input");
      cb.type = "checkbox";
      cb.checked = m[2] !== " ";
      cb.addEventListener("change", () => onToggle(i, cb.checked));
      row.append(cb, h("span", "", lineText(m[3])));
      row.toggleAttribute("data-done", cb.checked);
      box.append(row);
    } else if ((m = l.match(/^\s*([-*+]|\d+[.)])\s+(.*)/))) {
      box.append(h("div", "hd-note-li", lineText(m[2])));
    } else if (!/^[-=|: ]+$/.test(l) && !l.startsWith("```")) {
      box.append(h("div", "hd-note-p", lineText(l.replace(/^>\s?/, ""))));
    }
  });
  return box;
}

const fmtNum = (n, d = 2) => new Intl.NumberFormat(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n);

export const WIDGETS = {
  weather: {
    title: "Погода", icon: "sun", desc: "Сейчас, по часам и на неделю", w: 300, h: 190, net: "Погода приходит с Open-Meteo по названию города, не чаще раза в 30 минут.",
    fields: [
      { id: "city", type: "text", label: "Город", placeholder: "Москва" },
      { id: "units", type: "select", label: "Температура", options: [["c", "°C"], ["f", "°F"]] },
    ],
    async render(ctx) {
      const { el, o, t, h, q } = ctx;
      if (!o.city) {
        el.append(ctx.empty(t("Укажите город в настройках виджета")));
        return;
      }
      const d = await q("weather", { city: o.city, units: o.units || "c" });
      if (!d || d.error) {
        el.append(ctx.empty(d?.error === "notfound" ? t("Город не найден") : t("Не удалось получить погоду")));
        return;
      }
      const c = d.current || {};
      const [, desc, sky] = wmo(c.weather_code);
      const night = c.is_day === 0 && sky === "sun";
      const head = h("div", "hd-wx-head");
      const big = h("div", "hd-wx-now");
      big.append(skyIcon(night ? "moon" : sky, ctx.doc), h("b", "hd-wx-t", Math.round(c.temperature_2m) + "°"));
      const info = h("div", "hd-wx-info");
      info.append(h("div", "hd-wx-place", d.place), h("div", "hd-wx-desc", t(desc)));
      const day = d.daily || {};
      info.append(h("div", "hd-wx-sub", `${t("ощущается")} ${Math.round(c.apparent_temperature)}° · ${Math.round(day.temperature_2m_max?.[0])}° / ${Math.round(day.temperature_2m_min?.[0])}°`));
      head.append(big, info);
      el.append(head);
      const { w, hh } = ctx.size();
      if (hh > 150) {
        const now = Date.now();
        const hrs = h("div", "hd-wx-hours");
        const times = d.hourly?.time || [];
        let start = times.findIndex(x => new Date(x).getTime() >= now - 3600e3);
        if (start < 0) start = 0;
        const n = w > 380 ? 8 : 6;
        const temps = d.hourly.temperature_2m.slice(start, start + n * 2).filter((_, i) => i % 2 === 0);
        const lo = Math.min(...temps), hi = Math.max(...temps);
        temps.forEach((tp, i) => {
          const idx = start + i * 2;
          const cell = h("div", "hd-wx-hour");
          const bar = h("i", "hd-wx-bar");
          bar.style.setProperty("--k", hi === lo ? 0.5 : (tp - lo) / (hi - lo));
          cell.append(h("span", "", new Date(times[idx]).getHours() + ":00"), bar, h("b", "", Math.round(tp) + "°"));
          const pr = d.hourly.precipitation_probability?.[idx];
          if (pr >= 30) cell.append(h("small", "", pr + "%"));
          hrs.append(cell);
        });
        el.append(hrs);
      }
      if (hh > 280) {
        const days = h("div", "hd-wx-days");
        const fmt = new Intl.DateTimeFormat(ctx.lang, { weekday: "short" });
        (day.time || []).slice(1, 7).forEach((x, i) => {
          const r = h("div", "hd-wx-day");
          r.append(h("span", "", fmt.format(new Date(x))), skyIcon(wmo(day.weather_code[i + 1])[2], ctx.doc), h("b", "", `${Math.round(day.temperature_2m_max[i + 1])}°`), h("small", "", `${Math.round(day.temperature_2m_min[i + 1])}°`));
          days.append(r);
        });
        el.append(days);
      }
      ctx.every(() => ctx.rerender(), 30 * 60e3);
    },
  },

  clocks: {
    title: "Часы мира", icon: "globe", desc: "Время в нескольких городах", w: 260, h: 170,
    fields: ["Город 1", "Город 2", "Город 3", "Город 4"].map((label, i) => ({ id: "z" + (i + 1), type: "select", label, options: ZONES })),
    defaults: { z1: "Europe/London", z2: "America/New_York", z3: "Asia/Tokyo" },
    render(ctx) {
      const { el, o, t, h } = ctx;
      const zones = [o.z1, o.z2, o.z3, o.z4].filter(Boolean);
      if (!zones.length) {
        el.append(ctx.empty(t("Выберите города в настройках")));
        return;
      }
      const list = h("div", "hd-clocks");
      const rows = zones.map(z => {
        const r = h("div", "hd-clock-row");
        const name = h("span", "hd-clock-city", t((ZONES.find(x => x[0] === z) || [z, z])[1]));
        const time = h("b", "hd-clock-time");
        const diff = h("small", "hd-clock-diff");
        r.append(name, diff, time);
        list.append(r);
        return { z, time, diff, r };
      });
      el.append(list);
      const tick = () => {
        const now = new Date();
        for (const x of rows) {
          let parts;
          try {
            parts = new Intl.DateTimeFormat("en-GB", { timeZone: x.z, hour: "2-digit", minute: "2-digit", hour12: false, day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(now);
          } catch {
            continue;
          }
          const g = k => parts.find(p => p.type === k)?.value;
          x.time.textContent = `${g("hour")}:${g("minute")}`;
          const there = Date.UTC(+g("year"), +g("month") - 1, +g("day"), +g("hour") % 24, +g("minute"));
          const here = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
          const dh = Math.round((there - here) / 36e5);
          x.diff.textContent = dh === 0 ? t("как у вас") : (dh > 0 ? "+" : "") + dh + " " + t("ч");
          const hr = +g("hour") % 24;
          x.r.toggleAttribute("data-night", hr < 7 || hr >= 21);
        }
      };
      tick();
      ctx.every(tick, 15e3);
    },
  },

  calendar: {
    title: "Календарь", icon: "calendar", desc: "Месяц и события по дням", w: 280, h: 340,
    fields: [
      { id: "weekStart", type: "select", label: "Неделя начинается с", options: [["mon", "Понедельник"], ["sun", "Воскресенье"]] },
      { id: "weekNums", type: "toggle", label: "Номера недель" },
    ],
    defaults: { weekStart: "mon", weekNums: false },
    render(ctx) {
      const { el, h, t } = ctx;
      const o = { events: {}, ...ctx.o };
      const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const same = (a, b) => a.toDateString() === b.toDateString();
      const isoWeek = d => {
        const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
        return Math.ceil(((x - Date.UTC(x.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
      };
      const rel = new Intl.RelativeTimeFormat(ctx.lang, { numeric: "auto" });
      const fmtDay = new Intl.DateTimeFormat(ctx.lang, { weekday: "short", day: "numeric", month: "long" });
      const fmtShort = new Intl.DateTimeFormat(ctx.lang, { day: "numeric", month: "short" });
      const sun = o.weekStart === "sun";
      let now = new Date();
      let view = new Date(now.getFullYear(), now.getMonth(), 1);
      let sel = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const store = () => ctx.save({ ...o }, true);
      const go = n => {
        view = new Date(view.getFullYear(), view.getMonth() + n, 1);
        draw();
      };
      const pick = d => {
        sel = d;
        if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1);
        draw();
      };
      const draw = () => {
        now = new Date();
        el.textContent = "";
        const head = h("div", "hd-cal-head");
        const name = new Intl.DateTimeFormat(ctx.lang, { month: "long", year: "numeric" }).format(view);
        const title = h("b", "hd-cal-title", name.charAt(0).toUpperCase() + name.slice(1));
        const away = view.getMonth() !== now.getMonth() || view.getFullYear() !== now.getFullYear() || !same(sel, now);
        head.append(ctx.btn("chevronLeft", t("Назад"), () => go(-1)), title);
        if (away) {
          const today = h("button", "hd-cal-today", t("Сегодня"));
          today.addEventListener("click", () => pick(new Date(now.getFullYear(), now.getMonth(), now.getDate())));
          head.append(today);
        }
        head.append(ctx.btn("chevronRight", t("Вперёд"), () => go(1)));
        const grid = h("div", "hd-cal-grid");
        grid.toggleAttribute("data-weeks", !!o.weekNums);
        if (o.weekNums) grid.append(h("span", "hd-cal-wn"));
        const wd = new Intl.DateTimeFormat(ctx.lang, { weekday: "narrow" });
        for (let i = 0; i < 7; i++) grid.append(h("span", "hd-cal-wd", wd.format(new Date(2024, 0, (sun ? 0 : 1) + i))));
        const lead = (view.getDay() + (sun ? 7 : 6)) % 7;
        const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
        const weeks = Math.ceil((lead + days) / 7);
        for (let i = 0; i < weeks * 7; i++) {
          const dt = new Date(view.getFullYear(), view.getMonth(), 1 - lead + i);
          if (o.weekNums && i % 7 === 0) grid.append(h("span", "hd-cal-wn", String(isoWeek(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + (sun ? 1 : 0))))));
          const c = h("button", "hd-cal-d", String(dt.getDate()));
          c.toggleAttribute("data-out", dt.getMonth() !== view.getMonth());
          c.toggleAttribute("data-today", same(dt, now));
          c.toggleAttribute("data-sel", same(dt, sel));
          c.toggleAttribute("data-off", dt.getDay() === 0 || dt.getDay() === 6);
          const ev = o.events[key(dt)];
          c.toggleAttribute("data-ev", !!ev?.length);
          if (ev?.length) c.title = ev.join("\n");
          c.addEventListener("click", () => pick(dt));
          grid.append(c);
        }
        grid.addEventListener("wheel", e => {
          e.preventDefault();
          go(e.deltaY > 0 ? 1 : -1);
        }, { passive: false });
        // выбранный день: дата, события, поле для нового
        const day = h("div", "hd-cal-day");
        const diff = Math.round((sel - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
        const dh = h("div", "hd-cal-dh");
        dh.append(h("b", "", fmtDay.format(sel)), h("span", "", rel.format(diff, "day")));
        day.append(dh);
        const k = key(sel);
        const list = o.events[k] || [];
        for (const [i, text] of list.entries()) {
          const row = h("div", "hd-cal-ev");
          row.append(h("span", "", text));
          row.append(ctx.btn("close", t("Удалить"), () => {
            list.splice(i, 1);
            if (list.length) o.events[k] = list;
            else delete o.events[k];
            store();
            draw();
          }));
          day.append(row);
        }
        if (!list.length) {
          const next = Object.keys(o.events).filter(x => x > k && o.events[x]?.length).sort()[0];
          if (next) {
            const [y, m, d] = next.split("-").map(Number);
            const nd = new Date(y, m - 1, d);
            const nb = h("button", "hd-cal-next", `${t("Дальше:")} ${fmtShort.format(nd)} — ${o.events[next][0]}`);
            nb.addEventListener("click", () => pick(nd));
            day.append(nb);
          }
        }
        const input = h("input", "hd-cal-add");
        input.placeholder = t("Событие…");
        input.addEventListener("keydown", e => {
          if (e.key !== "Enter" || !input.value.trim()) return;
          o.events[k] = [...list, input.value.trim()].sort((a, b) => a.localeCompare(b, ctx.lang, { numeric: true }));
          store();
          draw();
          el.querySelector(".hd-cal-add")?.focus();
        });
        day.append(input);
        el.append(head, grid, day);
      };
      draw();
      ctx.every(() => {
        if (!same(now, new Date()) && !el.contains(ctx.doc.activeElement)) draw();
      }, 60e3);
    },
  },

  countdown: {
    title: "Обратный отсчёт", icon: "speed", desc: "Сколько осталось до даты", w: 230, h: 150,
    fields: [
      { id: "title", type: "text", label: "Название", placeholder: "Отпуск" },
      { id: "date", type: "date", label: "Дата" },
      { id: "time", type: "time", label: "Время" },
    ],
    render(ctx) {
      const { el, o, t, h } = ctx;
      if (!o.date) {
        el.append(ctx.empty(t("Укажите дату в настройках виджета")));
        return;
      }
      const end = new Date(`${o.date}T${o.time || "00:00"}`);
      const from = o.from || Date.now();
      if (!o.from) ctx.save({ ...o, from }, true);
      const title = h("div", "hd-cd-title", o.title || t("До даты"));
      const num = h("b", "hd-cd-num");
      const unit = h("div", "hd-cd-unit");
      const bar = h("div", "hd-progress");
      const fill = h("i");
      bar.append(fill);
      el.append(title, num, unit, bar);
      const tick = () => {
        const left = end - Date.now();
        if (left <= 0) {
          num.textContent = "🎉";
          unit.textContent = t("Наступило");
          fill.style.width = "100%";
          return;
        }
        const days = Math.floor(left / 864e5);
        if (days >= 2) {
          num.textContent = String(days);
          unit.textContent = t("дней");
        } else {
          const hr = Math.floor(left / 36e5), mi = Math.floor((left % 36e5) / 6e4);
          num.textContent = `${hr}:${pad(mi)}`;
          unit.textContent = t("часов и минут");
        }
        fill.style.width = Math.max(2, Math.min(100, ((Date.now() - from) / (end - from)) * 100)) + "%";
      };
      tick();
      ctx.every(tick, 30e3);
    },
  },

  note: {
    title: "Заметка", icon: "note", desc: "Заметка из Заметок: задачи, правка и новые строки прямо тут", w: 280, h: 260,
    fields: [
      { id: "rel", type: "note", label: "Заметка" },
      { id: "hideDone", type: "toggle", label: "Скрывать выполненные" },
    ],
    async render(ctx) {
      const { el, o, t, h, q } = ctx;
      if (!o.rel) {
        const r = await q("notes");
        if (!r?.dir) {
          el.append(ctx.empty(t("Сначала выберите папку в Заметках")));
          return;
        }
        const pick = h("div", "hd-note-pick");
        for (const n of (r.items || []).slice(0, 8)) {
          const b = h("button", "hd-note-pick-row", n.title);
          const folder = n.rel.includes("/") ? n.rel.slice(0, n.rel.lastIndexOf("/")) : "";
          if (folder) b.append(h("small", "", folder));
          b.title = n.rel;
          b.addEventListener("click", () => ctx.save({ ...o, rel: n.rel }));
          pick.append(b);
        }
        el.append(r.items?.length ? pick : ctx.empty(t("Заметок пока нет")));
        return;
      }
      const r = await q("note-read", { rel: o.rel });
      if (r?.text == null) {
        el.append(ctx.empty(t("Заметка не найдена")));
        return;
      }
      let text = r.text;
      let editing = false;
      const write = async next => {
        text = next;
        await q("note-write", { rel: o.rel, text });
      };
      const head = h("div", "hd-note-head");
      const title = h("button", "hd-note-title", o.rel.split("/").pop().replace(/\.md$/i, ""));
      title.title = t("Открыть в Заметках");
      title.addEventListener("click", () => {
        try {
          ctx.win.localStorage.setItem("hd-notes-last", o.rel);
        } catch {}
        q("note-open", { rel: o.rel });
      });
      const count = h("span", "hd-note-count");
      const editBtn = ctx.btn("edit", t("Править"), () => (editing ? finish(true) : startEdit()));
      head.append(title, count, editBtn);
      const slot = h("div", "hd-note-slot");
      const add = h("div", "hd-note-addrow");
      const mode = h("button", "hd-note-mode");
      let task = /^\s*[-*+]\s+\[[ xX]\]/m.test(text);
      const input = h("input", "hd-note-add");
      const paintMode = () => {
        mode.textContent = "";
        mode.append(ctx.icon(task ? "task" : "note"));
        mode.title = t(task ? "Добавлять задачей" : "Добавлять строкой");
        input.placeholder = t(task ? "Новая задача…" : "Новая строка…");
      };
      mode.addEventListener("click", () => {
        task = !task;
        paintMode();
      });
      paintMode();
      input.addEventListener("keydown", async e => {
        if (e.key !== "Enter" || !input.value.trim()) return;
        const line = (task ? "- [ ] " : "") + input.value.trim();
        input.value = "";
        const lines = text.replace(/\s*$/, "").split("\n");
        let at = lines.length;
        if (task) {
          for (let i = lines.length - 1; i >= 0; i--) {
            if (/^\s*[-*+]\s+\[[ xX]\]/.test(lines[i])) {
              at = i + 1;
              break;
            }
          }
        }
        lines.splice(at, 0, line);
        await write(lines.join("\n") + "\n");
        paint();
        slot.lastElementChild?.lastElementChild?.scrollIntoView({ block: "nearest" });
      });
      add.append(mode, input);
      const paint = () => {
        const all = [...text.matchAll(/^\s*[-*+]\s+\[([ xX])\]/gm)];
        const done = all.filter(m => m[1] !== " ").length;
        count.textContent = all.length ? `${done}/${all.length}` : "";
        const body = noteBody(ctx, text, async (i, on) => {
          const lines = text.split("\n");
          lines[i] = lines[i].replace(/\[([ xX])\]/, on ? "[x]" : "[ ]");
          await write(lines.join("\n"));
          paint();
        });
        const first = body.firstElementChild;
        if (first?.classList.contains("hd-note-h") && first.textContent.trim().toLowerCase() === title.textContent.trim().toLowerCase()) first.remove();
        if (o.hideDone) body.querySelectorAll(".hd-note-task[data-done]").forEach(x => x.remove());
        slot.replaceChildren(body);
      };
      let area = null;
      const startEdit = () => {
        editing = true;
        area = h("textarea", "hd-note-edit");
        area.value = text;
        area.addEventListener("keydown", e => {
          if (e.key === "Escape") finish(false);
          else if (e.key === "Enter" && e.ctrlKey) finish(true);
        });
        slot.replaceChildren(area);
        add.hidden = true;
        editBtn.toggleAttribute("data-on", true);
        area.focus();
      };
      const finish = async keep => {
        if (!editing) return;
        editing = false;
        editBtn.removeAttribute("data-on");
        add.hidden = false;
        if (keep && area.value !== text) await write(area.value);
        paint();
      };
      paint();
      el.append(head, slot, add);
      ctx.every(async () => {
        if (editing || el.contains(ctx.doc.activeElement)) return;
        const fresh = await q("note-read", { rel: o.rel });
        if (fresh?.text != null && fresh.text !== text) {
          text = fresh.text;
          paint();
        }
      }, 30e3);
    },
  },

  todo: {
    title: "Список дел", icon: "task", desc: "Быстрые задачи", w: 260, h: 230,
    fields: [{ id: "title", type: "text", label: "Название", placeholder: "Сегодня" }],
    render(ctx) {
      const { el, o, t, h } = ctx;
      const items = Array.isArray(o.items) ? o.items : [];
      const put = list => ctx.save({ ...o, items: list });
      el.append(h("div", "hd-todo-title", o.title || t("Список дел")));
      const ul = h("div", "hd-todo-list");
      items.forEach((it, i) => {
        const row = h("label", "hd-note-task");
        const cb = h("input");
        cb.type = "checkbox";
        cb.checked = !!it.done;
        cb.addEventListener("change", () => put(items.map((x, j) => (j === i ? { ...x, done: cb.checked } : x))));
        const del = ctx.btn("close", t("Удалить"), () => put(items.filter((_, j) => j !== i)));
        del.classList.add("hd-todo-del");
        row.append(cb, h("span", "", it.t), del);
        row.toggleAttribute("data-done", !!it.done);
        ul.append(row);
      });
      const add = h("input", "hd-todo-add");
      add.placeholder = t("Новая задача…");
      add.addEventListener("keydown", e => {
        if (e.key === "Enter" && add.value.trim()) {
          put([...items, { t: add.value.trim().slice(0, 200), done: false }]);
        }
      });
      el.append(ul, add);
      if (items.some(x => x.done)) {
        const clr = h("button", "hd-link", t("Убрать выполненные"));
        clr.addEventListener("click", () => put(items.filter(x => !x.done)));
        el.append(clr);
      }
    },
  },

  docs: {
    title: "Документы", icon: "file", desc: "Последние и закреплённые файлы", w: 280, h: 200,
    fields: [],
    async render(ctx) {
      const { el, t, h, q } = ctx;
      const list = ((await q("docs")) || []).filter(x => x.exists).sort((a, b) => b.pinned - a.pinned).slice(0, 8);
      if (!list.length) {
        el.append(ctx.empty(t("Здесь появятся файлы, которые вы открывали.")));
        return;
      }
      const box = h("div", "hd-docs-w");
      for (const it of list) {
        const name = it.path.split(/[\\/]/).pop();
        const kind = /\.(csv|tsv)$/i.test(name) ? ["csv", "CSV"] : /\.pdf$/i.test(name) ? ["pdf", "PDF"] : /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(name) ? ["img", "IMG"] : ["md", "MD"];
        const b = h("button", "hd-docs-w-row");
        const badge = h("span", "hd-kind", kind[1]);
        badge.dataset.k = kind[0];
        b.append(badge, h("span", "hd-docs-w-name", name));
        if (it.page && it.pages) b.append(h("small", "", t("стр. {0} из {1}", it.page, it.pages)));
        b.title = it.path;
        b.addEventListener("click", () => q("doc-open", { path: it.path }));
        box.append(b);
      }
      el.append(box);
    },
  },

  bookmarks: {
    title: "Папка закладок", icon: "bookmark", desc: "Закладки из выбранной папки плитками", w: 320, h: 170,
    fields: [{ id: "guid", type: "folder", label: "Папка" }],
    async render(ctx) {
      const { el, o, t, h, q } = ctx;
      const r = await q("bookmarks", { guid: o.guid || "" });
      if (!r?.items?.length) {
        el.append(ctx.empty(t("В папке нет закладок")));
        return;
      }
      ctx.setTitle(r.title);
      const grid = h("div", "hd-bm-grid");
      for (const b of r.items) {
        const a = h("a", "hd-bm");
        a.href = b.url;
        a.title = b.title;
        const ic = h("span", "hd-bm-ic");
        if (b.icon) {
          const img = h("img");
          img.src = b.icon;
          img.alt = "";
          ic.append(img);
        } else {
          ic.textContent = (b.title || "?").trim().charAt(0).toUpperCase();
        }
        a.append(ic, h("span", "hd-bm-t", b.title));
        grid.append(a);
      }
      el.append(grid);
    },
  },

  closed: {
    title: "Недавно закрытые", icon: "history", desc: "Вернуть вкладку в один щелчок", w: 280, h: 200,
    fields: [],
    async render(ctx) {
      const { el, t, h, q } = ctx;
      const list = (await q("closed")) || [];
      if (!list.length) {
        el.append(ctx.empty(t("Закрытых вкладок нет")));
        return;
      }
      const box = h("div", "hd-docs-w");
      for (const c of list.slice(0, 8)) {
        const b = h("button", "hd-docs-w-row");
        const ic = h("span", "hd-fav");
        if (c.icon) {
          const img = h("img");
          img.src = c.icon;
          img.alt = "";
          ic.append(img);
        }
        b.append(ic, h("span", "hd-docs-w-name", c.title));
        b.title = c.url;
        b.addEventListener("click", async () => {
          await q("reopen", { i: c.i });
          ctx.rerender();
        });
        box.append(b);
      }
      el.append(box);
      ctx.every(() => ctx.rerender(), 20e3);
    },
  },

  music: {
    title: "Музыка", icon: "sound", desc: "Что играет в любой вкладке, управление", w: 300, h: 140,
    fields: [],
    render(ctx) {
      const { el, t, h, q } = ctx;
      let key = null;
      const art = h("span", "hd-mu-art");
      const ttl = h("button", "hd-mu-title");
      const sub = h("div", "hd-mu-sub");
      const meta = h("div", "hd-mu-meta");
      meta.append(ttl, sub);
      const top = h("div", "hd-mu-top");
      top.append(art, meta);
      const prev = ctx.btn("prev", t("Назад"), () => key && q("media-act", { key, act: "prev" }).then(tick));
      const play = ctx.btn("play", t("Пауза"), () => key && q("media-act", { key, act: "toggle" }).then(tick));
      const next = ctx.btn("next", t("Вперёд"), () => key && q("media-act", { key, act: "next" }).then(tick));
      play.classList.add("hd-mu-play");
      const ctl = h("div", "hd-mu-ctl");
      ctl.append(prev, play, next);
      el.append(top, ctl);
      ttl.addEventListener("click", () => key && q("media-act", { key, act: "focus" }));
      const tick = async () => {
        const list = (await q("media")) || [];
        const m = list[0];
        el.toggleAttribute("data-idle", !m);
        if (!m) {
          key = null;
          ttl.textContent = t("Сейчас ничего не играет");
          sub.textContent = t("Включите музыку или видео в любой вкладке");
          art.style.removeProperty("background-image");
          return;
        }
        key = m.key;
        ttl.textContent = m.title;
        sub.textContent = [m.artist, m.site].filter(Boolean).join(" · ");
        if (m.art) art.style.backgroundImage = `url("${m.art.replace(/"/g, "")}")`;
        else art.style.removeProperty("background-image");
        play.querySelector(".hd-ic").style.setProperty("--i", `var(--fm-ic-${m.playing ? "pause" : "play"})`);
        prev.disabled = !m.keys.includes("previoustrack");
        next.disabled = !m.keys.includes("nexttrack");
        el.toggleAttribute("data-playing", m.playing);
      };
      tick();
      ctx.every(tick, 1500);
    },
  },

  timer: {
    title: "Таймер", icon: "timer", desc: "Любое время, быстрые кнопки, сигнал в конце", w: 260, h: 250,
    fields: [
      { id: "mode", type: "select", label: "Режим", options: [["timer", "Таймер"], ["pomo", "Помидор 25 + 5"]] },
      { id: "label", type: "text", label: "Подпись", placeholder: "Чай" },
      { id: "sound", type: "toggle", label: "Сигнал в конце" },
    ],
    defaults: { mode: "timer", sound: true, dur: 600e3 },
    render(ctx) {
      const { el, o, t, h } = ctx;
      const pomo = o.mode === "pomo";
      const dur = () => (pomo ? (o.rest ? 5 : 25) * 60e3 : Math.max(1000, Number(o.dur) || (Number(o.min) || 10) * 60e3));
      const elapsed = () => (o.run ? Date.now() - o.run : 0) + (o.acc || 0);
      const set = (patch, quiet) => {
        Object.assign(o, patch);
        ctx.save({ ...o }, quiet);
      };
      const idle = !o.run && !o.acc && !o.done;
      el.toggleAttribute("data-done", !!o.done);
      el.toggleAttribute("data-run", !!o.run);
      const ring = ctx.doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      ring.setAttribute("viewBox", "0 0 100 100");
      ring.setAttribute("class", "hd-tm-ring");
      ring.innerHTML = '<circle cx="50" cy="50" r="44" class="hd-tm-track"/><circle cx="50" cy="50" r="44" class="hd-tm-arc" pathLength="100"/>';
      const arc = ring.lastChild;
      const face = h("div", "hd-tm-face");
      const mid = h("div", "hd-tm-mid");
      face.append(ring, mid);
      const lab = h("small", "hd-tm-lab", o.label || t(pomo ? (o.rest ? "отдых" : "работа") : "таймер"));
      const row = h("div", "hd-tm-btns");
      const pill = (text, fn, ghost) => {
        const b = h("button", ghost ? "hd-pill hd-pill-ghost" : "hd-pill", text);
        b.addEventListener("click", fn);
        row.append(b);
        return b;
      };
      if (idle && !pomo) {
        // время задаётся прямо на виджете: часы, минуты, секунды
        const total = Math.round(dur() / 1000);
        const parts = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
        const edit = h("div", "hd-tm-edit");
        const inputs = parts.map((v, i) => {
          const inp = h("input", "hd-tm-in");
          inp.type = "number";
          inp.min = "0";
          inp.max = i ? "59" : "99";
          inp.value = pad(v);
          inp.title = t(["часы", "минуты", "секунды"][i]);
          const apply = () => {
            const [hh, mm, ss] = inputs.map(x => Math.max(0, Math.floor(Number(x.value) || 0)));
            set({ dur: Math.max(1, hh * 3600 + Math.min(mm, 59) * 60 + Math.min(ss, 59)) * 1000 }, true);
          };
          inp.addEventListener("change", () => {
            inp.value = pad(Math.min(Number(inp.max), Math.max(0, Math.floor(Number(inp.value) || 0))));
            apply();
          });
          inp.addEventListener("wheel", e => {
            e.preventDefault();
            const max = Number(inp.max);
            inp.value = pad((Number(inp.value) + (e.deltaY < 0 ? 1 : -1) + max + 1) % (max + 1));
            apply();
          }, { passive: false });
          inp.addEventListener("keydown", e => e.key === "Enter" && start());
          return inp;
        });
        edit.append(inputs[0], h("b", "", ":"), inputs[1], h("b", "", ":"), inputs[2]);
        mid.append(edit, lab);
        arc.style.strokeDasharray = "0 100";
        const presets = h("div", "hd-chips");
        for (const m of [1, 5, 10, 15, 30, 60]) {
          const c = h("button", "hd-chip", m < 60 ? `${m} ${t("мин")}` : `1 ${t("ч")}`);
          c.toggleAttribute("data-on", dur() === m * 60e3);
          c.addEventListener("click", () => set({ dur: m * 60e3 }));
          presets.append(c);
        }
        const start = () => set({ run: Date.now(), acc: 0, done: false });
        pill(t("Старт"), start);
        el.append(face, presets, row);
        return;
      }
      const time = h("b", "hd-tm-time");
      mid.append(time, lab);
      if (o.done) {
        time.textContent = "00:00";
        lab.textContent = o.label || t("Время вышло");
        arc.style.strokeDasharray = "100 100";
        pill(t("Стоп"), () => set({ run: 0, acc: 0, done: false }));
        el.append(face, row);
        return;
      }
      const go = pill("", () => (o.run ? set({ run: 0, acc: elapsed() }) : set({ run: Date.now() })));
      if (!pomo) pill("+1 " + t("мин"), () => set({ dur: dur() + 60e3 }), true);
      pill(t("Сброс"), () => set({ run: 0, acc: 0, done: false, rest: false }), true);
      el.append(face, row);
      const ring3 = () => {
        if (o.sound === false) return;
        ctx.beep();
        ctx.win.setTimeout(() => ctx.beep(), 700);
        ctx.win.setTimeout(() => ctx.beep(), 1400);
      };
      const draw = () => {
        const left = dur() - elapsed();
        if (left <= 0 && o.run) {
          ring3();
          if (pomo) set({ run: Date.now(), acc: 0, rest: !o.rest });
          else set({ run: 0, acc: dur(), done: true });
          return;
        }
        const s = Math.ceil(Math.max(0, left) / 1000);
        time.textContent = s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
        arc.style.strokeDasharray = `${((1 - left / dur()) * 100).toFixed(2)} 100`;
        go.textContent = t(o.run ? "Пауза" : "Дальше");
      };
      draw();
      ctx.every(draw, 200);
    },
  },

  stopwatch: {
    title: "Секундомер", icon: "speed", desc: "Точность до сотых, круги", w: 260, h: 250,
    fields: [],
    render(ctx) {
      const { el, o, t, h } = ctx;
      const laps = Array.isArray(o.laps) ? o.laps : [];
      const elapsed = () => (o.run ? Date.now() - o.run : 0) + (o.acc || 0);
      const set = patch => {
        Object.assign(o, patch);
        ctx.save({ ...o });
      };
      const fmt = (ms, cs = true) => {
        const s = Math.floor(ms / 1000);
        const head = s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
        return cs ? `${head}.${pad(Math.floor((ms % 1000) / 10))}` : head;
      };
      el.toggleAttribute("data-run", !!o.run);
      const time = h("div", "hd-sw-time");
      const main = h("b");
      const frac = h("small");
      time.append(main, frac);
      const row = h("div", "hd-tm-btns");
      const pill = (text, fn, ghost) => {
        const b = h("button", ghost ? "hd-pill hd-pill-ghost" : "hd-pill", text);
        b.addEventListener("click", fn);
        row.append(b);
        return b;
      };
      const e0 = elapsed();
      pill(t(o.run ? "Пауза" : e0 ? "Дальше" : "Старт"), () => (o.run ? set({ run: 0, acc: elapsed() }) : set({ run: Date.now() })));
      if (o.run) pill(t("Круг"), () => set({ laps: [...laps, elapsed()].slice(-99) }), true);
      else if (e0) pill(t("Сброс"), () => set({ run: 0, acc: 0, laps: [] }), true);
      el.append(time, row);
      if (laps.length) {
        const splits = laps.map((v, i) => v - (laps[i - 1] || 0));
        const best = Math.min(...splits), worst = Math.max(...splits);
        const list = h("div", "hd-sw-laps");
        for (let i = laps.length - 1; i >= 0; i--) {
          const r = h("div", "hd-sw-lap");
          if (laps.length > 2 && splits[i] === best) r.dataset.k = "best";
          if (laps.length > 2 && splits[i] === worst) r.dataset.k = "worst";
          r.append(h("span", "", `${t("Круг")} ${i + 1}`), h("b", "", fmt(splits[i])), h("small", "", fmt(laps[i])));
          list.append(r);
        }
        el.append(list);
      }
      const draw = () => {
        const ms = elapsed();
        main.textContent = fmt(ms, false);
        frac.textContent = "." + pad(Math.floor((ms % 1000) / 10));
      };
      draw();
      if (o.run) ctx.every(draw, 40);
    },
  },

  rss: {
    title: "Лента RSS", icon: "link", desc: "Новости любимых сайтов", w: 320, h: 260, net: "Лента загружается с адреса, который вы указали, не чаще раза в 20 минут.",
    fields: [{ id: "url", type: "text", label: "Адрес ленты (RSS или Atom)", placeholder: "https://…/feed" }],
    async render(ctx) {
      const { el, o, t, h, q } = ctx;
      if (!o.url) {
        el.append(ctx.empty(t("Укажите адрес ленты в настройках")));
        return;
      }
      const r = await q("rss", { url: o.url });
      if (!r?.text) {
        el.append(ctx.empty(t("Не удалось загрузить ленту")));
        return;
      }
      const xml = new ctx.win.DOMParser().parseFromString(r.text, "text/xml");
      const chan = xml.querySelector("channel > title, feed > title");
      if (chan) ctx.setTitle(chan.textContent.trim());
      const items = [...xml.querySelectorAll("item, entry")].slice(0, 12);
      const box = h("div", "hd-rss");
      const fmt = new Intl.DateTimeFormat(ctx.lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      for (const it of items) {
        const title = it.querySelector("title")?.textContent?.trim() || "";
        const link = it.querySelector("link")?.getAttribute("href") || it.querySelector("link")?.textContent?.trim() || "";
        const date = it.querySelector("pubDate, updated, published")?.textContent;
        const a = h("a", "hd-rss-item");
        if (/^https?:/.test(link)) a.href = link;
        a.append(h("span", "", title));
        const dt = date ? new Date(date) : null;
        if (dt && !isNaN(dt)) a.append(h("small", "", fmt.format(dt)));
        box.append(a);
      }
      el.append(box);
      ctx.every(() => ctx.rerender(), 20 * 60e3);
    },
  },

  rates: {
    title: "Курсы валют", icon: "chart", desc: "Выбранные валюты к базовой", w: 240, h: 190, net: "Курсы приходят с open.er-api.com, не чаще раза в 6 часов.",
    fields: [
      { id: "base", type: "text", label: "Базовая валюта", placeholder: "USD" },
      { id: "list", type: "text", label: "Валюты через запятую", placeholder: "EUR, RUB, GBP" },
    ],
    defaults: { base: "USD", list: "EUR, RUB, GBP" },
    async render(ctx) {
      const { el, o, t, h, q } = ctx;
      const base = String(o.base || "USD").toUpperCase();
      const r = await q("rates", { base });
      if (!r?.rates) {
        el.append(ctx.empty(t("Не удалось получить курсы")));
        return;
      }
      const box = h("div", "hd-rates");
      for (const cur of String(o.list || "").toUpperCase().split(/[\s,;]+/).filter(x => /^[A-Z]{3}$/.test(x)).slice(0, 8)) {
        const v = r.rates[cur];
        if (!v) continue;
        const row = h("div", "hd-rate");
        row.append(h("span", "hd-rate-cur", cur), h("b", "", fmtNum(v, v < 10 ? 4 : 2)), h("small", "", `1 ${cur} = ${fmtNum(1 / v, 4)} ${base}`));
        box.append(row);
      }
      el.append(box);
      el.append(h("div", "hd-foot", `1 ${base} · ${new Intl.DateTimeFormat(ctx.lang, { day: "numeric", month: "short" }).format(r.time)}`));
    },
  },

  text: {
    title: "Текст", icon: "text", desc: "Свой текст, цитата или напоминание", w: 260, h: 150,
    fields: [
      { id: "title", type: "text", label: "Заголовок" },
      { id: "text", type: "textarea", label: "Текст" },
      { id: "big", type: "toggle", label: "Крупный текст" },
    ],
    render(ctx) {
      const { el, o, t, h } = ctx;
      if (!o.text && !o.title) {
        el.append(ctx.empty(t("Напишите текст в настройках виджета")));
        return;
      }
      if (o.title) el.append(h("div", "hd-text-title", o.title));
      const body = noteBody(ctx, o.text || "", () => {});
      body.toggleAttribute("data-big", !!o.big);
      el.append(body);
    },
  },

  image: {
    title: "Картинка", icon: "image", desc: "Фото или картинка с компьютера", w: 260, h: 200,
    fields: [
      { id: "img", type: "image", label: "Картинка" },
      { id: "fit", type: "select", label: "Вписать", options: [["cover", "Заполнить"], ["contain", "Целиком"]] },
    ],
    async render(ctx) {
      const { el, o, t, h, q } = ctx;
      if (!o.img) {
        el.append(ctx.empty(t("Выберите картинку в настройках")));
        return;
      }
      const r = await q("file-read", { id: ctx.id, kind: o.img });
      if (!r?.url) {
        el.append(ctx.empty(t("Картинка не найдена")));
        return;
      }
      const img = h("img", "hd-img");
      img.src = r.url;
      img.alt = "";
      img.style.objectFit = o.fit || "cover";
      el.append(img);
    },
  },

  custom: {
    title: "Свой виджет", icon: "puzzle", desc: "Из файла .html: свой или от нейросети", w: 260, h: 170,
    fields: [],
  },
};

/* текст, который копирует кнопка «Скопировать задание» и который лежит в README */
export const AI_PROMPT = `Сделай виджет для новой вкладки браузера с Hand Design. Правила:

1. Виджет — ОДИН файл HTML: разметка, <style> и <script> внутри, без внешних файлов и библиотек.
2. В <head> обязательно описание в виде JSON (без комментариев):
   <meta name="hd-widget" content='{"name": "Название", "size": [260, 180], "network": [], "settings": []}'>
   - size — ширина и высота по умолчанию в пикселях (от 140 до 900);
   - network — адреса, куда виджет ходит за данными, например ["https://api.example.com"]; если не нужно — [];
   - settings — поля, которые человек заполнит сам: {"id": "city", "type": "text", "label": "Город"}.
     Типы: text, number, date, time, color, toggle, select (тогда добавь "options": [["значение", "подпись"], ...]).
3. Виджет работает в изолированной рамке: нет доступа к браузеру, cookies, localStorage и сети напрямую.
   Всё нужное даёт объект window.hd:
   - hd.settings — значения полей из settings; hd.onSettings(fn) — когда их поменяли;
   - await hd.store.get(key), await hd.store.set(key, value) — хранить свои данные (до 64 КБ);
   - await hd.fetch(url) — запрос только к адресам из network, ответ { ok, status, text, json };
   - hd.open(url) — открыть ссылку в новой вкладке;
   - hd.onTheme(fn) — тема сменилась (переменные ниже уже обновлены).
4. Оформление бери из переменных темы, свои цвета не задавай:
   --hd-card (фон карточки), --hd-ink (текст), --hd-muted (второстепенный текст), --hd-accent, --hd-on-accent,
   --hd-line (линии), --hd-radius (скругление), --hd-font, --hd-mono.
   Фон body прозрачный: карточку вокруг рисует Hand Design.
5. Размер рамки меняет человек. Верстай резиновой (flex или grid, единицы %, cqw, cqh),
   ничего не должно вылезать и обрезаться.
6. Без alert, prompt, всплывающих окон и автоматического звука.

Пришли только готовый файл целиком.

Мой виджет: `;
