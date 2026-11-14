#!/usr/bin/env python3
"""Hand Design for Chrome — генератор тем.

Берёт палитры из Firefox-версии (../../firefox/tools/gen_themes.py, словарь THEMES)
и делает из них:
  1. files/extension/shared/themes.js — данные 24 тем для страниц расширения
     (новая вкладка, быстрая панель, Studio, PDF, Now Bar);
  2. files/themes/<id>/manifest.json (+ <id>-light для тем со светлым вариантом) —
     тема-пакеты Chrome: цвета рамки, вкладок, адресной строки.

Запуск:  python tools/gen_chrome_themes.py  [путь к gen_themes.py Firefox-версии]
Новая тема в Firefox-версии появляется здесь после повторного запуска.
"""
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FX = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "..", "firefox", "tools", "gen_themes.py")
if not os.path.exists(FX):
    sys.exit("не найден gen_themes.py Firefox-версии: " + FX + "\nукажите путь: python tools/gen_chrome_themes.py <путь к gen_themes.py>")

spec = importlib.util.spec_from_file_location("fxthemes", FX)
fx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fx)

ORDER = ["oneui", "ios", "material", "fluent", "macos", "nothing", "nightdrive", "aero", "retro", "terminal",
         "paper", "cyber", "arctic", "sakura", "mint", "latte", "midnight", "fjord", "ember", "forest", "ocean",
         "rose", "synthwave", "contrast"]
# группы фильтра — как GROUPS в FloorpModernThemes.sys.mjs
GROUPS = {
    "oneui": "dark", "ios": "glass light dark", "material": "light dark", "fluent": "light dark strict",
    "macos": "light dark", "nothing": "dark strict", "nightdrive": "dark glass", "aero": "glass retro",
    "retro": "retro light", "terminal": "retro dark", "paper": "light", "cyber": "bright dark",
    "arctic": "light", "sakura": "light bright", "mint": "light", "latte": "light", "midnight": "dark glass",
    "fjord": "dark strict", "ember": "dark retro", "forest": "dark", "ocean": "dark glass", "rose": "dark",
    "synthwave": "bright dark retro", "contrast": "dark strict bright",
}
WIN_ACCENT = "#4C9AFF"  # если акцент Windows неизвестен (в Chrome нет AccentColor)

SEGOE = '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif'

# One UI и iOS в Firefox-версии собираются отдельными генераторами (gen_css.py, gen_ios.py) —
# их значения перенесены сюда вручную из floorp-modern-content.css и gen_ios.py.
MANUAL = {
    "oneui": dict(
        name="One UI",
        accent="light-dark(var(--fm-user-accent, AccentColor), color-mix(in srgb, var(--fm-user-accent, AccentColor) 62%, white))",
        on_accent="light-dark(#ffffff, color-mix(in srgb, var(--fm-user-accent, AccentColor) 22%, black))",
        frame="light-dark(#f2f3f5, #000000)", bar="light-dark(#ffffff, #17181a)", field="light-dark(#ffffff, #1f2022)",
        menu="light-dark(rgb(255 255 255 / .96), rgb(36 37 40 / .96))",
        ink="light-dark(#111214, #f2f2f3)", muted="light-dark(#6b6f76, #9a9da3)",
        line="light-dark(rgb(0 0 0 / .07), rgb(255 255 255 / .07))",
        hover="light-dark(rgb(0 0 0 / .05), rgb(255 255 255 / .08))", press="light-dark(rgb(0 0 0 / .10), rgb(255 255 255 / .14))",
        radius="22px", r_item="14px", r_tab="999px", r_btn="999px", font=SEGOE,
        newtab_bg="#04050a",
        wall="radial-gradient(38% 46% at 22% 28%, color-mix(in srgb, var(--fm-user-accent, AccentColor) 92%, transparent), transparent 70%), "
             "radial-gradient(34% 42% at 78% 22%, rgb(150 90 255 / .72), transparent 70%), "
             "radial-gradient(40% 50% at 62% 82%, rgb(0 200 255 / .5), transparent 70%), "
             "radial-gradient(30% 36% at 18% 86%, rgb(255 80 170 / .38), transparent 70%), #04050a",
        live=True,
        clock=dict(weight="300", size="clamp(100px, 12vw, 180px)", color="#ffffff", spacing="0", shadow="0 4px 40px rgb(0 0 0 / .35)"),
        date=dict(color="rgb(255 255 255 / .8)", size="18px", weight="500"), date_above=False,
        search=dict(radius="999px", bg="rgb(255 255 255 / .12)", border="1px solid rgb(255 255 255 / .16)", blur="blur(22px) saturate(1.5)", shadow="0 16px 40px rgb(0 0 0 / .35)"),
        swatch=["#0f1012", "#1c1d21", "#3e91ff", "#f2f3f5"], scheme="both",
    ),
    "ios": dict(
        name="iOS Liquid Glass",
        accent="var(--fm-user-accent, light-dark(#007AFF, #0A84FF))", on_accent="#ffffff",
        frame="light-dark(#e9eef8, #05060b)", bar="light-dark(rgb(255 255 255 / .72), rgb(28 28 30 / .72))",
        field="light-dark(rgb(255 255 255 / .85), rgb(44 44 46 / .8))",
        menu="light-dark(rgb(255 255 255 / .72), rgb(30 30 32 / .66))",
        ink="light-dark(#000000, #ffffff)", muted="light-dark(rgb(60 60 67 / .6), rgb(235 235 245 / .6))",
        line="light-dark(rgb(0 0 0 / .08), rgb(255 255 255 / .12))",
        hover="light-dark(rgb(0 0 0 / .05), rgb(255 255 255 / .09))", press="light-dark(rgb(0 0 0 / .1), rgb(255 255 255 / .16))",
        radius="26px", r_item="12px", r_tab="999px", r_btn="999px", font='"SF Pro Display", ' + SEGOE,
        newtab_bg="#050611", glass=True,
        wall="radial-gradient(60% 55% at 18% 18%, rgb(64 156 255 / .95), transparent 62%), "
             "radial-gradient(55% 60% at 88% 12%, rgb(120 86 255 / .9), transparent 64%), "
             "radial-gradient(70% 55% at 75% 95%, rgb(255 92 140 / .75), transparent 62%), "
             "radial-gradient(45% 45% at 8% 92%, rgb(255 170 90 / .55), transparent 66%), "
             "radial-gradient(45% 40% at 50% 58%, rgb(70 80 220 / .55), transparent 70%), #070a24",
        clock=dict(weight="600", size="clamp(110px, 14vw, 200px)", color="rgb(255 255 255 / .82)", spacing="-0.03em",
                   shadow="0 2px 30px rgb(0 0 0 / .2)", glass=True),
        date=dict(color="rgb(255 255 255 / .9)", size="21px", weight="600"), date_above=True,
        search=dict(radius="999px", bg="rgb(255 255 255 / .16)", border="0", blur="blur(28px) saturate(1.8)",
                    shadow="inset 0 0 0 .5px rgb(255 255 255 / .35), 0 16px 40px rgb(0 0 0 / .3)"),
        swatch=["#05060b", "#1c1c1e", "#0a84ff", "#ffffff"], scheme="both",
    ),
}


def rule(css, sel_re):
    """первое правило, чей селектор подходит под регулярку → словарь свойств"""
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        if re.search(sel_re, m.group(1)):
            props = {}
            for p in re.finditer(r"([a-z-]+)\s*:\s*([^;]+?)\s*(?:!important)?\s*(?:;|$)", m.group(2), re.S):
                props[p.group(1)] = re.sub(r"\s+", " ", p.group(2)).strip()
            return props
    return {}


def from_fx(tid):
    t = fx.THEMES[tid]
    nt = re.sub(r"/\*.*?\*/", "", t.get("newtab", ""), flags=re.S)
    html = rule(nt, r"^\s*html\s*$")
    wall = rule(nt, r"#root::before").get("background", "")
    clock = rule(nt, r"\.tabular-nums\s*$")
    date = rule(nt, r"\.flex-col\.text-right > div")
    srch = rule(nt, r"has\(input\[readonly\]\)\s*$")
    t2 = dict(
        name=t["name"], accent=t["accent"], on_accent=t["on_accent"], frame=t["frame"], bar=t["bar"],
        field=t["field"], menu=t["menu"], ink=t["ink"], muted=t["muted"], line=t["line"], hover=t["hover"],
        press=t["press"], radius=t["radius"], r_item=t["r_item"], r_tab=t["r_tab"], r_btn=t.get("r_btn", "999px"),
        font=t["font"], newtab_bg=html.get("background", t["frame"]), wall=wall or t["frame"],
        clock=dict(weight=clock.get("font-weight", "300"), size=clock.get("font-size", "clamp(100px, 12vw, 180px)"),
                   color=clock.get("color", t["ink"]), spacing=clock.get("letter-spacing", "0"),
                   shadow=clock.get("text-shadow", "none"), family=clock.get("font-family", ""),
                   # прозрачные цифры (Nothing): рисунок — это фон, обрезанный по тексту
                   **({"fill": clock["background"]} if clock.get("color") == "transparent" and clock.get("background") else {})),
        date=dict(color=date.get("color", t["muted"]), size=date.get("font-size", "18px"), weight=date.get("font-weight", "500")),
        date_above="column-reverse" in nt,
        search=dict(radius=srch.get("border-radius", t.get("r_url", "14px")), bg=srch.get("background", "rgb(255 255 255 / .1)"),
                    border=srch.get("border", "0"), blur=srch.get("backdrop-filter", "none"), shadow=srch.get("box-shadow", "none")),
        glass="backdrop-filter" in t.get("chrome_extra", ""),
    )
    return t2


def adapt(v):
    """переменные Firefox-версии → переменные расширения (в Chrome нет AccentColor)"""
    if not isinstance(v, str):
        return v
    v = v.replace("var(--fm-user-accent, AccentColor)", "var(--hd-ua, var(--hd-sys-accent))")
    v = re.sub(r"var\(--fm-user-accent,\s*", "var(--hd-ua, ", v)
    v = v.replace("AccentColor", "var(--hd-sys-accent)").replace("var(--fm-accent)", "var(--hd-accent)")
    return v


# ---------------------------------------------------------------- вычисление цветов для тема-пакета
def parse_color(s):
    s = s.strip()
    m = re.fullmatch(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", s)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return [int(h[i:i + 2], 16) for i in (0, 2, 4)] + [1.0]
    m = re.fullmatch(r"rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)", s)
    if m:
        a = m.group(4)
        a = 1.0 if a is None else (float(a[:-1]) / 100 if a.endswith("%") else float(a))
        return [float(m.group(1)), float(m.group(2)), float(m.group(3)), a]
    named = {"white": [255, 255, 255, 1.0], "black": [0, 0, 0, 1.0], "transparent": [0, 0, 0, 0.0]}
    if s in named:
        return named[s]
    return None


def split_args(s):
    out, depth, cur = [], 0, ""
    for ch in s:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    out.append(cur.strip())
    return out


def evaluate(s, dark, accent):
    s = s.strip()
    if s == "AccentColor":
        return parse_color(accent)
    c = parse_color(s)
    if c:
        return c
    m = re.fullmatch(r"var\(--[\w-]+(?:,\s*(.*))?\)", s, re.S)
    if m:
        name = re.match(r"var\((--[\w-]+)", s).group(1)
        if name in ("--hd-sys-accent", "--hd-accent"):
            return parse_color(accent)
        return evaluate(m.group(1), dark, accent) if m.group(1) else parse_color(accent)
    m = re.fullmatch(r"light-dark\((.*)\)", s, re.S)
    if m:
        a, b = split_args(m.group(1))
        return evaluate(b if dark else a, dark, accent)
    m = re.fullmatch(r"color-mix\(in srgb,(.*)\)", s, re.S)
    if m:
        a, b = split_args(m.group(1))
        def part(x):
            mm = re.fullmatch(r"(.*?)\s+([\d.]+)%", x, re.S)
            return (mm.group(1), float(mm.group(2)) / 100) if mm else (x, None)
        ca, pa = part(a)
        cb, pb = part(b)
        if pa is None and pb is None:
            pa = pb = .5
        elif pa is None:
            pa = 1 - pb
        elif pb is None:
            pb = 1 - pa
        A, B = evaluate(ca, dark, accent), evaluate(cb, dark, accent)
        tot = pa + pb
        pa, pb = pa / tot, pb / tot
        alpha = A[3] * pa + B[3] * pb
        if alpha == 0:
            return [0, 0, 0, 0.0]
        rgb = [(A[i] * A[3] * pa + B[i] * B[3] * pb) / alpha for i in range(3)]
        return rgb + [alpha]
    raise ValueError("не разобрать цвет: " + s)


def solid(s, dark, accent, under=(0, 0, 0)):
    c = evaluate(s, dark, accent)
    a = c[3]
    return [round(c[i] * a + under[i] * (1 - a)) for i in range(3)]


def first_accent_hex(t):
    m = re.search(r"#[0-9a-fA-F]{6}", t["accent"])
    return m.group(0) if m else WIN_ACCENT


def lum(rgb):
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]


def theme_pack(tid, t, dark, version):
    acc = first_accent_hex(t)
    base = (0, 0, 0) if dark else (255, 255, 255)
    frame = solid(t["frame"], dark, acc, base)
    bar = solid(t["bar"], dark, acc, frame)
    field = solid(t["field"], dark, acc, bar)
    ink = solid(t["ink"], dark, acc, bar)
    muted = solid(t["muted"], dark, acc, frame)
    ntp = solid(t["newtab_bg"], dark, acc, base) if t.get("newtab_bg") else frame
    accent = solid(t["accent"], dark, acc, bar)
    name = t["name"] + ("" if dark or t.get("scheme") == "light" else " · светлая")
    return {
        "manifest_version": 3,
        "name": "Hand Design — " + name,
        "version": version,
        "description": "Цвета рамки браузера для темы Hand Design «" + t["name"] + "». Theme colors for Hand Design.",
        "theme": {
            "colors": {
                "frame": frame, "frame_inactive": frame, "frame_incognito": frame, "frame_incognito_inactive": frame,
                "toolbar": bar, "toolbar_text": ink, "toolbar_button_icon": ink,
                "tab_text": ink, "tab_background_text": muted, "tab_background_text_inactive": muted,
                "bookmark_text": ink, "ntp_background": ntp, "ntp_text": ink, "ntp_link": accent,
                "omnibox_background": field, "omnibox_text": ink, "button_background": [0, 0, 0, 0],
            },
            "properties": {"ntp_background_alignment": "bottom"},
        },
    }


def hexs(rgb):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(v))) for v in rgb[:3])


def vivaldi_css(tid, t, dark):
    """CSS для Vivaldi (vivaldi://experiments → CSS modifications). Опытный режим: Vivaldi меняет
    разметку от версии к версии — перекрашиваем через его собственные переменные цветов."""
    acc = first_accent_hex(t)
    base = (0, 0, 0) if dark else (255, 255, 255)
    frame = solid(t["frame"], dark, acc, base)
    bar = solid(t["bar"], dark, acc, frame)
    field = solid(t["field"], dark, acc, bar)
    ink = solid(t["ink"], dark, acc, bar)
    muted = solid(t["muted"], dark, acc, frame)
    accent = solid(t["accent"], dark, acc, bar)
    on_acc = "#000000" if lum(accent) > 160 else "#ffffff"
    r = t["radius"]
    rt = t["r_tab"] if t["r_tab"] != "999px" else "14px"
    ri = t["r_item"]
    return f"""/* Hand Design for Vivaldi — тема «{t['name']}»{'' if dark else ' (светлая)'}.
   Сгенерировано tools/gen_chrome_themes.py. Опытная функция: Vivaldi меняет разметку от версии к версии.
   Подключение: vivaldi://experiments → «Allow for using CSS modifications»,
   Настройки → Внешний вид → «Пользовательские изменения интерфейса» → папка с этим файлом. */
#browser {{
  --colorBg: {hexs(frame)}; --colorBgDark: {hexs(frame)}; --colorBgDarker: {hexs(frame)};
  --colorBgLight: {hexs(bar)}; --colorBgLighter: {hexs(field)}; --colorBgIntense: {hexs(field)};
  --colorFg: {hexs(ink)}; --colorFgFaded: {hexs(muted)}; --colorFgFadedMore: {hexs(muted)}; --colorFgIntense: {hexs(ink)};
  --colorTabBar: {hexs(frame)}; --colorAccentBg: {hexs(bar)}; --colorAccentBgDark: {hexs(frame)}; --colorAccentFg: {hexs(ink)};
  --colorHighlightBg: {hexs(accent)}; --colorHighlightFg: {on_acc}; --colorHighlightBgAlpha: {hexs(accent)}40;
  --radius: {ri};
}}
/* вкладки и адресная строка — формы темы */
#tabs-container .tab-position .tab {{ border-radius: {rt} !important; }}
#tabs-container .tab-position .tab.active {{ box-shadow: inset 0 0 0 1px {hexs(accent)}55 !important; }}
.UrlBar-AddressField, .toolbar-mainbar .UrlBar-AddressField {{ border-radius: {ri} !important; }}
.UrlBar-AddressField:focus-within {{ box-shadow: 0 0 0 2px {hexs(accent)}88 !important; }}
/* меню и панели — скругление темы */
.menu-container, .vivaldi-menu, .context-menu {{ border-radius: {r} !important; overflow: hidden; }}
#webview-container {{ border-radius: {min(int(r.rstrip('px') or 0), 14)}px; overflow: hidden; }}
"""


def main():
    version = open(os.path.join(ROOT, "VERSION"), encoding="utf-8").read().strip()
    # цвета плиток выбора темы — те же, что в Firefox-версии (themes.json рядом с генератором)
    swatches = {}
    for cand in (os.path.join(os.path.dirname(FX), "..", "files", "pdf-tweaks", "themes", "themes.json"),):
        if os.path.exists(cand):
            swatches = {x["id"]: x["swatch"] for x in json.load(open(cand, encoding="utf-8"))}
            break
    themes = []
    for tid in ORDER:
        t = MANUAL[tid] if tid in MANUAL else from_fx(tid)
        both = any("light-dark(" in str(t.get(k, "")) for k in ("frame", "bar", "ink"))
        scheme = t.get("scheme") or ("both" if both else ("light" if lum(solid(t["frame"], False, first_accent_hex(t), (255, 255, 255))) > 140 else "dark"))
        t["scheme"] = scheme
        acc = first_accent_hex(t)
        dark_default = scheme != "light"
        swatch = swatches.get(tid) or t.get("swatch") or ["#%02x%02x%02x" % tuple(solid(t[k], dark_default, acc)) for k in ("frame", "bar", "accent", "ink")]
        themes.append(dict(
            id=tid, name=t["name"], groups=GROUPS[tid].split(), scheme=scheme, swatch=swatch, accentDefault=acc,
            glass=bool(t.get("glass")), live=bool(t.get("live")),
            vars={k: adapt(t[k]) for k in ("accent", "on_accent", "frame", "bar", "field", "menu", "ink", "muted", "line", "hover", "press")},
            radius=t["radius"], rItem=t["r_item"], rTab=t["r_tab"], rBtn=t.get("r_btn", "999px"), font=t["font"],
            newtabBg=adapt(t["newtab_bg"]), wall=adapt(t["wall"]),
            clock={k: adapt(v) for k, v in t["clock"].items()}, date=t["date"], dateAbove=t["date_above"],
            search={k: adapt(v) for k, v in t["search"].items()},
        ))
        # тема-пакеты: тёмный (или единственный) вариант и, если есть, светлый
        packs = []
        if scheme == "light":
            packs.append((tid, False))
        else:
            packs.append((tid, True))
            if scheme == "both":
                packs.append((tid + "-light", False))
        for pid, dark in packs:
            vd = os.path.join(ROOT, "files", "vivaldi")
            os.makedirs(vd, exist_ok=True)
            with open(os.path.join(vd, pid + ".css"), "w", encoding="utf-8", newline="\n") as f:
                f.write(vivaldi_css(tid, t, dark))
            d = os.path.join(ROOT, "files", "themes", pid)
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, "manifest.json"), "w", encoding="utf-8", newline="\n") as f:
                json.dump(theme_pack(tid, t, dark, version), f, ensure_ascii=False, indent=2)

    # список тем для установщика (PowerShell): плитки, вариант, группы
    with open(os.path.join(ROOT, "files", "themes", "themes.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump([dict(id=x["id"], name=x["name"], scheme=x["scheme"], swatch=x["swatch"], groups=x["groups"]) for x in themes], f, ensure_ascii=False, indent=1)
    out = os.path.join(ROOT, "files", "extension", "shared", "themes.js")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* Сгенерировано tools/gen_chrome_themes.py из палитр Firefox-версии — не править руками. */\n")
        f.write("export const GROUPS = [[\"all\", \"Все\", \"All\"], [\"dark\", \"Тёмные\", \"Dark\"], [\"light\", \"Светлые\", \"Light\"], "
                "[\"glass\", \"Стекло\", \"Glass\"], [\"bright\", \"Яркие\", \"Bright\"], [\"strict\", \"Строгие\", \"Strict\"], [\"retro\", \"Ретро\", \"Retro\"]];\n")
        f.write("export const THEMES = " + json.dumps(themes, ensure_ascii=False, indent=1) + ";\n")
        f.write("export const THEME_IDS = THEMES.map(t => t.id);\n")
    print("тем:", len(themes), "→", os.path.relpath(out, ROOT))
    print("тема-пакетов:", len([x for x in os.listdir(os.path.join(ROOT, "files", "themes")) if not x.endswith(".json")]))
    print("CSS для Vivaldi:", len(os.listdir(os.path.join(ROOT, "files", "vivaldi"))))


if __name__ == "__main__":
    main()
