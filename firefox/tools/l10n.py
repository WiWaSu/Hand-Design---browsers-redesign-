#!/usr/bin/env python3
"""Hand Design — переводы интерфейса.

  python3 tools/l10n.py keys    — собрать все русские строки (src/l10n/_keys.json)
  python3 tools/l10n.py check   — какие строки не переведены в src/l10n/<код>.json
  python3 tools/l10n.py build   — собрать files/pdf-tweaks/l10n/<код>.sys.mjs из src/l10n/<код>.json

Строки в коде — русские и сами являются ключами: t("Тема") в браузере, T "по-русски" "in English" в установщике.
"""
import os, sys, re, json, html
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LANGS = ["en", "uk", "de", "fr", "es", "pt", "pl", "tr", "zh"]
KEYS = "src/l10n/_keys.json"

def cmd_keys():
    cyr=re.compile('[А-Яа-яЁё]')
    def lits(fn):
        s=open(fn,encoding='utf-8').read()
        i=0;n=len(s);out=[]
        while i<n:
            c=s[i]
            if s.startswith('//',i):
                j=s.find('\n',i); i=n if j<0 else j; continue
            if s.startswith('/*',i):
                j=s.find('*/',i+2); i=j+2; continue
            if c in '"\'`':
                j=i+1
                while j<n and s[j]!=c:
                    if s[j]=='\\': j+=1
                    j+=1
                lit=s[i+1:j]
                ls=s.rfind('\n',0,i)+1; le=s.find('\n',i); line=s[ls:le]
                out.append((lit,line,c)); i=j+1; continue
            i+=1
        return out
    B='files/pdf-tweaks/'
    files=['FloorpModernStudio.sys.mjs','FloorpModernThemes.sys.mjs','FloorpModernUpdate.sys.mjs','FloorpPdfTweaksChild.sys.mjs','floorp-modern.uc.js','studio.js']
    keys={}
    skip_line=re.compile(r'\blog\(|bootLog|msg:|console\.|writeLog|log\.push')
    for f in files:
        for lit,line,q in lits(B+f):
            if not cyr.search(lit) or q=='`': continue
            if skip_line.search(line): continue
            if lit.startswith('/*') or '{\n' in lit or '\\n' in lit and '{' in lit: continue
            lit=lit.replace('\\"','"')
            keys.setdefault(lit,{'src':f})
    # studio.html text nodes and titles
    h=open(B+'studio.html',encoding='utf-8').read()
    for m in re.finditer(r'>([^<>]+)<',h):
        t=m.group(1).strip()
        if cyr.search(t): keys.setdefault(html.unescape(t),{'src':'studio.html'})
    for m in re.finditer(r'title="([^"]+)"',h):
        if cyr.search(m.group(1)): keys.setdefault(html.unescape(m.group(1)),{'src':'studio.html'})
    # installer pairs T "ru" "en"
    inst=open('files/installer.ps1',encoding='utf-8-sig').read()
    pairs=re.findall(r'\bT\s+"((?:[^"`]|`.)*)"\s*`?\s*\r?\n?\s*"((?:[^"`]|`.)*)"',inst)
    for ru,en in pairs:
        if cyr.search(ru): keys.setdefault(ru,{'src':'installer'})['en']=en
    json.dump(keys,open(KEYS,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    from collections import Counter
    print(len(keys), Counter(v['src'] for v in keys.values()))


def cmd_check():
    keys = json.load(open(KEYS, encoding="utf-8"))
    for c in LANGS:
        p = f"src/l10n/{c}.json"
        d = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
        miss = [k for k in keys if k not in d]
        print(c, "не переведено:", len(miss))
        for k in miss[:15]:
            print("   ", k)

def cmd_build():
    keys = json.load(open(KEYS, encoding="utf-8"))
    out = "files/pdf-tweaks/l10n"
    os.makedirs(out, exist_ok=True)
    for c in LANGS:
        d = json.load(open(f"src/l10n/{c}.json", encoding="utf-8"))
        res = {}
        for k in keys:
            if k not in d:
                continue
            v = d[k]
            res[k] = v
            if "`n" in k:  # строки установщика: PowerShell превращает `n в перевод строки
                res[k.replace("`n", "\n")] = v.replace("`n", "\n")
        # формат «по паре на строку» — его читает и установщик (PowerShell)
        open(f"{out}/{c}.sys.mjs", "w", encoding="utf-8", newline="\n").write("export default " + json.dumps(res, ensure_ascii=False, indent=1) + ";\n")
        print(c, len(res))

{"keys": cmd_keys, "check": cmd_check, "build": cmd_build}[sys.argv[1] if len(sys.argv) > 1 else "check"]()
