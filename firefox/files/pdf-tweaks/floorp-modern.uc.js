/* Hand Design (бывш. Floorp Modern) — новые функции окна браузера.
 * Загружается в каждое окно Floorp загрузчиком из папки программы (config.js).
 *
 *  1. Полоска загрузки страницы под панелью (цвет акцента).
 *  2. Всплывающие уведомления в стиле One UI («тосты»).
 *  3. Alt+Shift+C — скопировать адрес страницы.
 *  4. Уведомление о завершённой загрузке файла.
 *  5. Кнопка быстрой смены темы: Авто / Светлая / Тёмная.
 *  6. «Now Bar»: музыка играет в другой вкладке — плашка внизу с паузой и звуком.
 *  7. Уведомления о масштабе страницы и о выключенном звуке вкладки.
 *  8. Alt+Shift+D — закрыть повторяющиеся вкладки.
 *  9. Alt+Shift+Z — режим фокуса (прячет закладки и боковые панели).
 * 10. Плашка звонка: звонок в другой вкладке, микрофон / камера (Alt+Shift+M).
 * 11. Alt+Shift+T — спрятать / показать вкладки целиком.
 */
(function () {
  "use strict";
  const win = window;
  const doc = document;
  if (win.__floorpModern) {
    return;
  }
  win.__floorpModern = true;

  const HTML = "http://www.w3.org/1999/xhtml";
  const el = (tag, cls) => {
    const e = doc.createElementNS(HTML, tag);
    if (cls) {
      e.className = cls;
    }
    return e;
  };
  const onUnload = [];

  /* перевод: строки в коде русские, язык — pref floorp.modern.lang (FloorpModernL10n.sys.mjs) */
  let l10n = null;
  const T = (s, ...a) => {
    try {
      l10n = l10n || ChromeUtils.importESModule("resource://pdftweaks/FloorpModernL10n.sys.mjs");
      return l10n.t(s, ...a);
    } catch (e) {
      return a.length ? String(s).replace(/\{(\d)\}/g, (m, i) => a[i] ?? "") : s;
    }
  };

  /* журнал: ошибки пишутся в pdf-tweaks/fm-log.json, чтобы их можно было прочитать */
  const LOG = [];
  const logDir = (() => {
    try {
      return PathUtils.join(Services.dirsvc.get("UChrm", Ci.nsIFile).path, "pdf-tweaks");
    } catch (e) {
      return null;
    }
  })();
  let logTimer = 0;
  const log = (what, err) => {
    LOG.push({ t: new Date().toISOString(), what, err: err ? String(err && err.stack || err) : null });
    if (!logDir) return;
    win.clearTimeout(logTimer);
    logTimer = win.setTimeout(() => {
      IOUtils.writeJSON(PathUtils.join(logDir, "fm-log.json"), LOG).catch(() => {});
    }, 500);
  };
  log("скрипт загружен в окно");
  const safe = (name, fn) => {
    try {
      fn();
      log(name + ": ok");
    } catch (e) {
      log(name + ": ОШИБКА", e);
    }
  };
  win.addEventListener("unload", () => onUnload.forEach(f => {
    try { f(); } catch (e) {}
  }), { once: true });

  /* ------------------------------ тосты ------------------------------ */
  const host = el("div", "fm-toasts");
  try {
    (doc.getElementById("browser") || doc.documentElement).append(host);
    log("toasts: ok");
  } catch (e) {
    log("toasts: ОШИБКА", e);
  }

  function toast(text, kind = "info") {
    const t = el("div", "fm-toast");
    t.dataset.kind = kind;
    const dot = el("span", "fm-toast-dot");
    const label = el("span", "fm-toast-text");
    label.textContent = text;
    t.append(dot, label);
    host.append(t);
    win.requestAnimationFrame(() => t.classList.add("fm-in"));
    win.setTimeout(() => {
      t.classList.remove("fm-in");
      t.classList.add("fm-out");
      win.setTimeout(() => t.remove(), 300);
    }, 2400);
  }
  win.FloorpModernToast = toast;

  safe("progress bar", () => {
    /* ----------------------- полоска загрузки ------------------------- */
    const bar = el("div", "fm-progress");
    const fill = el("div", "fm-progress-fill");
    bar.append(fill);
    const toolbox = doc.getElementById("navigator-toolbox");
    if (toolbox) {
      toolbox.append(bar);
    }
    let hideTimer = 0;
    const setProgress = value => {
      win.clearTimeout(hideTimer);
      bar.classList.add("fm-active");
      fill.style.transform = `scaleX(${Math.max(0.04, Math.min(1, value))})`;
      if (value >= 1) {
        hideTimer = win.setTimeout(() => {
          bar.classList.remove("fm-active");
          hideTimer = win.setTimeout(() => (fill.style.transform = "scaleX(0)"), 250);
        }, 350);
      }
    };
    const progressListener = {
      QueryInterface: ChromeUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
      onStateChange(webProgress, request, flags) {
        if (!webProgress?.isTopLevel) {
          return;
        }
        const WPL = Ci.nsIWebProgressListener;
        if (flags & WPL.STATE_IS_NETWORK) {
          if (flags & WPL.STATE_START) {
            setProgress(0.08);
          } else if (flags & WPL.STATE_STOP) {
            setProgress(1);
          }
        }
      },
      onProgressChange(webProgress, request, curSelf, maxSelf, curTotal, maxTotal) {
        if (webProgress?.isTopLevel && maxTotal > 0) {
          setProgress(0.08 + 0.87 * (curTotal / maxTotal));
        }
      },
      onLocationChange() {},
      onStatusChange() {},
      onSecurityChange() {},
      onContentBlockingEvent() {},
    };
    if (win.gBrowser) {
      win.gBrowser.addProgressListener(progressListener);
      onUnload.push(() => win.gBrowser.removeProgressListener(progressListener));
      win.gBrowser.tabContainer.addEventListener("TabSelect", () => {
        const busy = win.gBrowser.selectedTab.hasAttribute("busy");
        if (!busy) {
          win.clearTimeout(hideTimer);
          bar.classList.remove("fm-active");
          fill.style.transform = "scaleX(0)";
        }
      });
    }

  });
  safe("copy url", () => {
    /* -------------------- Alt+Shift+C: копировать адрес ------------------- */
    win.addEventListener("keydown", e => {
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyC") {
        e.preventDefault();
        e.stopPropagation();
        try {
          const uri = win.gBrowser.currentURI;
          const url = uri?.displaySpec || uri?.spec;
          if (url) {
            Cc["@mozilla.org/widget/clipboardhelper;1"]
              .getService(Ci.nsIClipboardHelper)
              .copyString(url);
            toast(T("Ссылка скопирована"), "ok");
          }
        } catch (err) {
          toast(T("Не получилось скопировать ссылку"), "warn");
        }
      }
    }, true);

  });
  safe("download toast", () => {
    /* -------------------- уведомление о загрузке файла -------------------- */
    (async () => {
      try {
        const { Downloads } = ChromeUtils.importESModule("resource://gre/modules/Downloads.sys.mjs");
        const list = await Downloads.getList(Downloads.ALL);
        const done = new WeakSet();
        const view = {
          onDownloadChanged(d) {
            if (!d.succeeded || done.has(d)) {
              return;
            }
            done.add(d);
            const topWin = Services.wm.getMostRecentWindow("navigator:browser");
            if (topWin !== win) {
              return;
            }
            const name = (d.target?.path || "").split(/[\\/]/).pop() || T("файл");
            toast(T("Загружено: {0}", name), "ok");
          },
          onDownloadAdded(d) {
            if (d.succeeded) {
              done.add(d);
            }
          },
        };
        await list.addView(view);
        onUnload.push(() => list.removeView(view));
      } catch (e) {
        console.error("[floorp-modern] downloads:", e);
      }
    })();

  });
  safe("theme button", () => {
    /* ---------------------- кнопка смены темы ---------------------- */
    const THEME_PREFS = ["browser.theme.toolbar-theme", "browser.theme.content-theme"];
    // 0 = тёмная, 1 = светлая, 2 = как в системе
    const ORDER = [2, 1, 0];
    const NAMES = { 0: T("Тёмная"), 1: T("Светлая"), 2: T("Авто") };
    const currentTheme = () => {
      try {
        return Services.prefs.getIntPref(THEME_PREFS[0], 2);
      } catch (e) {
        return 2;
      }
    };
    const CustomizableUI = win.CustomizableUI;
    const WIDGET = "fm-theme-button";
    if (CustomizableUI.getWidget(WIDGET)?.provider !== CustomizableUI.PROVIDER_API) {
      try {
        CustomizableUI.createWidget({
          id: WIDGET,
          type: "button",
          defaultArea: CustomizableUI.AREA_NAVBAR,
          label: T("Тема"),
          tooltiptext: T("Тема: Авто / Светлая / Тёмная"),
          onCreated(node) {
            node.setAttribute("fm-theme", String(currentTheme()));
          },
          onCommand(event) {
            const now = currentTheme();
            const next = ORDER[(ORDER.indexOf(now) + 1) % ORDER.length];
            for (const p of THEME_PREFS) {
              Services.prefs.setIntPref(p, next);
            }
            const w = event.target.ownerGlobal;
            w.FloorpModernToast?.(T("Тема: ") + NAMES[next], "info");
          },
        });
      } catch (e) {
        // виджет уже создан в другом окне
      }
    }
    const syncThemeButton = () => {
      const node = doc.getElementById(WIDGET);
      if (node) {
        node.setAttribute("fm-theme", String(currentTheme()));
      }
    };
    const prefObserver = { observe: syncThemeButton };
    Services.prefs.addObserver(THEME_PREFS[0], prefObserver);
    onUnload.push(() => Services.prefs.removeObserver(THEME_PREFS[0], prefObserver));
    syncThemeButton();

  });
  safe("studio", () => {
    /* ------- Hand Design Studio: тонкая настройка дизайна -------
       Кнопка «Дизайн» на панели, пункт в меню ☰ и Alt+Shift+S. */
    const studio = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernStudio.sys.mjs");
    studio.init();
    // проверяем, что стили Studio дошли до этого окна; если нет — подключаем их прямо к окну
    let windowSheet = "";
    const verify = () => {
      win.setTimeout(() => {
        try {
          const wu = win.windowUtils;
          if (windowSheet) {
            try {
              wu.removeSheetUsingURIString(windowSheet, wu.USER_SHEET);
            } catch (e) {}
            windowSheet = "";
          }
          if (!studio.hasConfig()) {
            return;
          }
          const ok = win.getComputedStyle(doc.documentElement).getPropertyValue("--fm-studio-ok").trim() === "1";
          if (!ok) {
            const spec = studio.currentSheet();
            if (spec) {
              wu.loadSheetUsingURIString(spec, wu.USER_SHEET);
              windowSheet = spec;
              const ok2 = win.getComputedStyle(doc.documentElement).getPropertyValue("--fm-studio-ok").trim() === "1";
              log("studio: стили подключены к окну напрямую, " + (ok2 ? "работает" : "НЕ работает"));
            }
          }
        } catch (e) {
          log("studio: проверка стилей", e);
        }
      }, 250);
    };
    const studioObs = { observe: verify };
    Services.prefs.addObserver("floorp.modern.studio", studioObs);
    onUnload.push(() => Services.prefs.removeObserver("floorp.modern.studio", studioObs));
    verify();
    // адрес chrome://fmstudio/ для страницы настроек (страница браузера с полными правами)
    try {
      Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry)
        .convertChromeURL(Services.io.newURI("chrome://fmstudio/content/studio.html"));
    } catch (e) {
      try {
        const manifest = Services.dirsvc.get("UChrm", Ci.nsIFile);
        manifest.append("pdf-tweaks");
        manifest.append("chrome.manifest");
        Components.manager.QueryInterface(Ci.nsIComponentRegistrar).autoRegister(manifest);
      } catch (e2) {
        log("studio: chrome:// не зарегистрирован: " + e2, e2);
      }
    }
    // второй актор: заходит и на страницы браузера (новая вкладка Floorp — chrome://noraneko-newtab)
    try {
      ChromeUtils.registerWindowActor("FloorpModernNT", {
        parent: { esModuleURI: "resource://pdftweaks/FloorpPdfTweaksParent.sys.mjs" },
        child: {
          esModuleURI: "resource://pdftweaks/FloorpPdfTweaksChild.sys.mjs",
          events: { DOMContentLoaded: {} },
        },
        includeChrome: true,
        allFrames: true,
      });
    } catch (e) {
      // уже зарегистрирован другим окном
      if (!String(e).includes("NotSupportedError") && !String(e).includes("already")) {
        log("newtab actor", e);
      }
    }
    const open = w => {
      try {
        const how = ChromeUtils.importESModule("resource://pdftweaks/FloorpPdfTweaksParent.sys.mjs").openStudio(w);
        log("studio: вкладка настроек — " + how);
      } catch (e) {
        log("studio open: ОШИБКА", e);
        try {
          const t = w.gBrowser.addTrustedTab("resource://pdftweaks/studio.html", {
            triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
          });
          w.gBrowser.selectedTab = t;
        } catch (e2) {
          log("studio open (запасной путь): ОШИБКА", e2);
          w.FloorpModernToast?.(T("Не получилось открыть настройки: ") + e2, "warn");
        }
      }
    };
    let lastOpen = 0;
    const openOnce = w => {
      if (Date.now() - lastOpen < 600) {
        return;
      }
      lastOpen = Date.now();
      log("studio: открываю настройки");
      open(w);
    };

    /* ---------- темы: смена прямо в браузере ---------- */
    let themes = null;
    try {
      themes = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernThemes.sys.mjs");
      themes.init();
      const syncAttr = () => doc.documentElement.setAttribute("fm-theme", themes.current());
      syncAttr();
      const tObs = { observe: syncAttr };
      Services.prefs.addObserver("floorp.modern.theme", tObs);
      onUnload.push(() => Services.prefs.removeObserver("floorp.modern.theme", tObs));
      log("темы: текущая " + themes.current());
    } catch (e) {
      log("темы: ОШИБКА", e);
    }

    /* ---------- скрыть вкладки целиком (Alt+Shift+T) ---------- */
    const LAST_HIDE = "floorp.modern.tabs.lastHide";
    win.FloorpModernToggleTabs = () => {
      const cfg = studio.readConfig();
      if (cfg.tabsHide) {
        try {
          Services.prefs.setStringPref(LAST_HIDE, cfg.tabsHide);
        } catch (e) {}
        delete cfg.tabsHide;
        toast(T("Вкладки снова видны"), "info");
      } else {
        let mode = "edge";
        try {
          mode = Services.prefs.getStringPref(LAST_HIDE, "edge") === "always" ? "always" : "edge";
        } catch (e) {}
        cfg.tabsHide = mode;
        toast(mode === "edge" ? T("Вкладки спрятаны — подведите мышь к краю окна") : T("Вкладки спрятаны (Alt+Shift+T — вернуть)"), "info");
      }
      studio.save(cfg);
      return !!cfg.tabsHide;
    };
    win.addEventListener("keydown", e => {
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyT") {
        e.preventDefault();
        e.stopPropagation();
        win.FloorpModernToggleTabs();
      }
    }, true);
    // при переключении вкладок с клавиатуры, пока они спрятаны, — коротко показываем список
    let peekTimer = 0;
    const peek = () => {
      if (!studio.readConfig().tabsHide) {
        return;
      }
      doc.documentElement.setAttribute("fm-tabs-peek", "true");
      win.clearTimeout(peekTimer);
      peekTimer = win.setTimeout(() => doc.documentElement.removeAttribute("fm-tabs-peek"), 1400);
    };
    win.addEventListener("keydown", e => {
      if (e.ctrlKey && (e.key === "Tab" || e.key === "PageDown" || e.key === "PageUp")) {
        // Ctrl+Tab с окном превью — показываем только окно, без выезжающих вкладок (иначе всё накладывается)
        let previews = false;
        try {
          previews = e.key === "Tab" && Services.prefs.getBoolPref("browser.ctrlTab.sortByRecentlyUsed", false);
        } catch (err) {}
        if (!previews) {
          win.setTimeout(peek, 0);
        }
      }
    }, true);

    /* ---------- проверка обновлений (раз в сутки) ---------- */
    let update = null;
    try {
      update = ChromeUtils.importESModule("resource://pdftweaks/FloorpModernUpdate.sys.mjs");
    } catch (e) {
      log("обновления: модуль", e);
    }
    // красная точка на кнопке «Дизайн», пока есть непросмотренное обновление
    function markUpdate() {
      const k = update?.known();
      const on = !!k && !update.skipped(k.version);
      doc.getElementById("fm-studio-button")?.toggleAttribute("fm-update", on);
    }
    if (update) {
      win.setTimeout(() => {
        update.check(win).then(r => {
          if (r.error) {
            log("обновления: " + r.error);
          }
          markUpdate();
          if (r.newer && !r.cached && !update.skipped(r.latest.version)) {
            toast(T("Доступна Hand Design {0} — нажмите кнопку «Дизайн»", r.latest.version), "info");
            log("обновления: доступна " + r.latest.version + " (" + r.latest.source + ")");
          }
        });
      }, 8000);
    }

    /* ---------- быстрая панель по кнопке «Дизайн» ---------- */
    const QP_CSS = `
      #fm-quick-panel { --arrowpanel-padding: 0; }
      #fm-quick-panel .fm-qp { display: flex; flex-direction: column; gap: 12px; width: 344px; padding: 14px; box-sizing: border-box;
        font: menu; font-size: 13px; color: var(--fm-ink, var(--arrowpanel-color, CanvasText)); }
      #fm-quick-panel .fm-qp-head { display: flex; align-items: center; gap: 8px; }
      #fm-quick-panel .fm-qp-title { font-weight: 700; font-size: 15px; flex: 1; }
      #fm-quick-panel .fm-qp-cap { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .6; margin: 2px 2px -4px; }
      #fm-quick-panel .fm-qp-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; justify-items: center; }
      #fm-quick-panel .fm-qp-dotth { all: unset; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
        box-shadow: inset 0 0 0 1px rgb(128 128 128 / .45); transition: scale calc(.3s * var(--fm-k, 1)) var(--fm-spring, ease); }
      #fm-quick-panel .fm-qp-dotth:hover { scale: 1.18; }
      #fm-quick-panel .fm-qp-dotth[on] { box-shadow: 0 0 0 2px var(--fm-menu, Canvas), 0 0 0 4px var(--fm-accent, AccentColor); }
      #fm-quick-panel .fm-qp-capname { opacity: .9; text-transform: none; letter-spacing: 0; font-weight: 700; }
      #fm-quick-panel .fm-qp-theme { all: unset; display: flex; flex-direction: column; gap: 5px; padding: 5px; border-radius: 12px; cursor: pointer;
        border: 1.5px solid transparent; transition: scale calc(.3s * var(--fm-k, 1)) var(--fm-spring, ease), background-color .2s, border-color .2s; }
      #fm-quick-panel .fm-qp-theme:hover { background: var(--fm-hover, rgb(128 128 128 / .12)); scale: 1.04; }
      #fm-quick-panel .fm-qp-theme:active { scale: .95; }
      #fm-quick-panel .fm-qp-theme[on] { border-color: var(--fm-accent, AccentColor); background: var(--fm-soft, rgb(128 128 128 / .12)); }
      #fm-quick-panel .fm-qp-pv { position: relative; height: 42px; border-radius: 8px; overflow: hidden; background: var(--a);
        box-shadow: inset 0 0 0 1px rgb(128 128 128 / .25); }
      #fm-quick-panel .fm-qp-pv > span { position: absolute; display: block; }
      #fm-quick-panel .fm-qp-pv > span:nth-child(1) { inset: 5px 5px auto 5px; height: 8px; border-radius: 4px; background: var(--b); }
      #fm-quick-panel .fm-qp-pv > span:nth-child(2) { inset: 17px 5px 5px 5px; border-radius: 5px; background: var(--b); opacity: .7; }
      #fm-quick-panel .fm-qp-pv > span:nth-child(3) { left: 10px; bottom: 9px; width: 22px; height: 6px; border-radius: 3px; background: var(--c); }
      #fm-quick-panel .fm-qp-name { font-size: 11.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-inline: 2px; }
      #fm-quick-panel .fm-qp-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px;
        background: var(--fm-hover, rgb(128 128 128 / .1)); cursor: pointer; }
      #fm-quick-panel .fm-qp-row > span:first-child { flex: 1; font-weight: 600; }
      #fm-quick-panel .fm-qp-sw { width: 38px; height: 22px; border-radius: 11px; background: rgb(128 128 128 / .45); position: relative; transition: background-color .2s; }
      #fm-quick-panel .fm-qp-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 8px; background: #fff;
        transition: translate calc(.3s * var(--fm-k, 1)) var(--fm-spring, ease); }
      #fm-quick-panel .fm-qp-sw[on] { background: var(--fm-accent, AccentColor); }
      #fm-quick-panel .fm-qp-sw[on]::after { translate: 16px 0; }
      #fm-quick-panel .fm-qp-seg { display: flex; gap: 4px; padding: 3px; border-radius: 12px; background: var(--fm-hover, rgb(128 128 128 / .1)); }
      #fm-quick-panel .fm-qp-seg > button { all: unset; flex: 1; text-align: center; padding: 6px 0; border-radius: 9px; cursor: pointer; font-weight: 600; }
      #fm-quick-panel .fm-qp-seg > button[on] { background: var(--fm-accent, AccentColor); color: var(--fm-on-accent, #fff); }
      #fm-quick-panel .fm-qp-dots { display: flex; gap: 8px; flex-wrap: wrap; padding-inline: 2px; }
      #fm-quick-panel .fm-qp-dot { all: unset; width: 24px; height: 24px; border-radius: 12px; cursor: pointer; background: var(--c);
        box-shadow: inset 0 0 0 1px rgb(128 128 128 / .35); transition: scale calc(.3s * var(--fm-k, 1)) var(--fm-spring, ease); }
      #fm-quick-panel .fm-qp-dot:hover { scale: 1.15; }
      #fm-quick-panel .fm-qp-dot[on] { box-shadow: 0 0 0 2px var(--fm-menu, Canvas), 0 0 0 4px var(--c); }
      #fm-quick-panel .fm-qp-dot.auto { background: conic-gradient(#ff5c5c, #ffd25c, #5cff8a, #5cc8ff, #a35cff, #ff5c5c); }
      #fm-quick-panel .fm-qp-more { all: unset; text-align: center; padding: 10px; border-radius: 12px; cursor: pointer; font-weight: 700;
        background: var(--fm-accent, AccentColor); color: var(--fm-on-accent, #fff); transition: scale calc(.3s * var(--fm-k, 1)) var(--fm-spring, ease); }
      #fm-quick-panel .fm-qp-more:hover { scale: 1.02; }
      #fm-quick-panel .fm-qp-upd { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 14px;
        background: var(--fm-soft, rgb(128 128 128 / .15)); border: 1px solid var(--fm-accent, AccentColor); }
      #fm-quick-panel .fm-qp-upd[hidden] { display: none; }
      #fm-quick-panel .fm-qp-upd b { font-size: 13.5px; }
      #fm-quick-panel .fm-qp-upd-btns { display: flex; gap: 6px; }
      #fm-quick-panel .fm-qp-upd-btns > button { all: unset; flex: 1; text-align: center; padding: 7px 0; border-radius: 10px; cursor: pointer; font-weight: 600;
        background: var(--fm-hover, rgb(128 128 128 / .15)); }
      #fm-quick-panel .fm-qp-upd-btns > button:first-child { background: var(--fm-accent, AccentColor); color: var(--fm-on-accent, #fff); }
      #fm-quick-panel .fm-qp-foot { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; opacity: .65; padding: 0 2px; }
      #fm-quick-panel .fm-qp-links { display: flex; gap: 10px; }
      #fm-quick-panel .fm-qp-links > button { all: unset; cursor: pointer; text-decoration: underline; }
      #fm-quick-panel .fm-qp-links > button:hover { opacity: 1; color: var(--fm-accent, AccentColor); }
      #fm-studio-button[fm-update] .toolbarbutton-icon {
        background-image: radial-gradient(circle at 82% 18%, #ff4d5e 3.2px, transparent 3.8px) !important; }
      #fm-quick-panel .fm-qp-more:active { scale: .97; }
    `;
    try {
      win.windowUtils.loadSheetUsingURIString("data:text/css;charset=utf-8," + encodeURIComponent(QP_CSS), win.windowUtils.AUTHOR_SHEET);
    } catch (e) {
      log("быстрая панель: стили", e);
    }
    const ACCENTS = ["#3E91FF", "#8E6BFF", "#FF5C8A", "#FF7A45", "#FFB020", "#2FBF71", "#14B8C4", "#9AA0A6"];
    let panel = null;
    let fill = null;
    const buildPanel = () => {
      panel = doc.createXULElement("panel");
      panel.id = "fm-quick-panel";
      panel.setAttribute("type", "arrow");
      panel.setAttribute("role", "dialog");
      panel.setAttribute("noautofocus", "true");
      const box = el("div", "fm-qp");
      panel.append(box);
      (doc.getElementById("mainPopupSet") || doc.documentElement).append(panel);

      const head = el("div", "fm-qp-head");
      const title = el("div", "fm-qp-title");
      title.textContent = "Hand Design";
      head.append(title);
      box.append(head);
      // карточка «есть обновление»
      const upd = el("div", "fm-qp-upd");
      const updText = el("b");
      const updBtns = el("div", "fm-qp-upd-btns");
      const updGet = el("button");
      updGet.textContent = T("Скачать");
      const updNotes = el("button");
      updNotes.textContent = T("Что нового");
      const updLater = el("button");
      updLater.textContent = T("Позже");
      updBtns.append(updGet, updNotes, updLater);
      upd.append(updText, updBtns);
      upd.hidden = true;
      box.append(upd);
      const openLink = url => {
        panel.hidePopup();
        try {
          win.openWebLinkIn(url, "tab");
        } catch (e) {
          win.gBrowser.selectedTab = win.gBrowser.addTrustedTab(url, { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });
        }
      };
      updGet.addEventListener("click", () => update && update.known() && openLink(update.known().zip));
      updNotes.addEventListener("click", () => update && update.known() && openLink(update.known().notes));
      updLater.addEventListener("click", () => {
        const k = update?.known();
        if (k) {
          update.skip(k.version);
        }
        markUpdate();
        upd.hidden = true;
      });

      const cap = text => {
        const c = el("div", "fm-qp-cap");
        c.textContent = text;
        box.append(c);
      };
      // темы: компактная сетка кружков, название — в подписи и подсказке
      const tcap = el("div", "fm-qp-cap");
      tcap.textContent = T("Тема · ");
      const tname = el("span", "fm-qp-capname");
      tcap.append(tname);
      box.append(tcap);
      const grid = el("div", "fm-qp-grid");
      box.append(grid);
      const nameOf = id => (themes ? themes.THEMES.find(t => t[0] === id)?.[1] : "") || "";
      for (const [id, name, sw] of (themes ? themes.THEMES : [])) {
        const b = el("button", "fm-qp-dotth");
        b.dataset.id = id;
        b.title = name;
        b.style.background = `conic-gradient(from 200deg, ${sw[2]} 0 25%, ${sw[1]} 0 62%, ${sw[0]} 0)`;
        b.addEventListener("mouseenter", () => (tname.textContent = name));
        b.addEventListener("mouseleave", () => (tname.textContent = nameOf(themes.current())));
        b.addEventListener("click", () => {
          for (const x of grid.children) x.toggleAttribute("on", x === b);
          tname.textContent = name;
          themes.setTheme(id).then(ok => {
            log("темы: выбрана " + id + (ok ? "" : " (файлы не обновлены: " + themes.lastErrors().join("; ") + ")"));
            toast(T("Тема: ") + name, "info");
          }, e => {
            log("темы: ОШИБКА", e);
            toast(T("Не получилось сменить тему"), "warn");
          });
        });
        grid.append(b);
      }
      // без скруглений
      const sq = el("div", "fm-qp-row");
      const sqLabel = el("span");
      sqLabel.textContent = T("Без скруглений (совсем)");
      const sqSw = el("span", "fm-qp-sw");
      sq.append(sqLabel, sqSw);
      sq.addEventListener("click", () => {
        const cfg = studio.readConfig();
        if (cfg.square) {
          delete cfg.square;
        } else {
          cfg.square = true;
        }
        studio.save(cfg);
        sqSw.toggleAttribute("on", !!cfg.square);
        thSw.toggleAttribute("on", !!cfg.tabsHide);
        const k = update?.known();
        upd.hidden = !k || update.skipped(k.version);
        if (k) {
          updText.textContent = T("Доступна версия {0} (у вас {1})", k.version, update.APP_VERSION);
        }
        verText.textContent = "Hand Design " + (update ? update.APP_VERSION : "");
        toast(cfg.square ? T("Скругления убраны") : T("Скругления как в теме"), "info");
      });
      box.append(sq);
      // скрыть вкладки целиком
      const th = el("div", "fm-qp-row");
      const thLabel = el("span");
      thLabel.textContent = T("Скрыть вкладки");
      const thSw = el("span", "fm-qp-sw");
      th.append(thLabel, thSw);
      th.addEventListener("click", () => {
        const on = win.FloorpModernToggleTabs?.();
        thSw.toggleAttribute("on", !!on);
      });
      box.append(th);
      // светлая / тёмная
      cap(T("Оформление"));
      const seg = el("div", "fm-qp-seg");
      for (const [v, label] of [[2, T("Авто")], [1, T("Светлое")], [0, T("Тёмное")]]) {
        const b = el("button");
        b.textContent = label;
        b.dataset.v = String(v);
        b.addEventListener("click", () => {
          Services.prefs.setIntPref("browser.theme.toolbar-theme", v);
          Services.prefs.setIntPref("browser.theme.content-theme", v);
          for (const x of seg.children) x.toggleAttribute("on", x === b);
        });
        seg.append(b);
      }
      box.append(seg);
      // акцент
      cap(T("Акцент"));
      const dots = el("div", "fm-qp-dots");
      const auto = el("button", "fm-qp-dot auto");
      auto.title = T("Как в теме / Windows");
      auto.dataset.c = "";
      dots.append(auto);
      for (const c of ACCENTS) {
        const d = el("button", "fm-qp-dot");
        d.style.setProperty("--c", c);
        d.dataset.c = c;
        d.title = c;
        dots.append(d);
      }
      dots.addEventListener("click", e => {
        const d = e.target.closest?.(".fm-qp-dot");
        if (!d) {
          return;
        }
        const cfg = studio.readConfig();
        if (d.dataset.c) {
          cfg.accent = d.dataset.c;
        } else {
          delete cfg.accent;
        }
        studio.save(cfg);
        for (const x of dots.children) x.toggleAttribute("on", x === d);
      });
      box.append(dots);
      // все настройки
      const more = el("button", "fm-qp-more");
      more.textContent = T("Все настройки дизайна…");
      more.addEventListener("click", () => {
        panel.hidePopup();
        openOnce(win);
      });
      box.append(more);
      const docs = el("button", "fm-qp-more");
      docs.textContent = T("Документы");
      docs.addEventListener("click", () => {
        panel.hidePopup();
        ChromeUtils.importESModule("resource://pdftweaks/FloorpPdfTweaksParent.sys.mjs").openDocs(win);
      });
      box.append(docs);
      // версия и ручная проверка обновлений
      const foot = el("div", "fm-qp-foot");
      const verText = el("span");
      const checkBtn = el("button");
      checkBtn.textContent = T("Проверить обновления");
      // ссылка на GitHub проекта
      const ghBtn = el("button");
      ghBtn.textContent = "GitHub";
      ghBtn.title = T("Открыть страницу Hand Design на GitHub");
      ghBtn.addEventListener("click", () => openLink(update ? update.PAGE : "https://github.com/WiWaSu/Hand-Design---browsers-redesign-"));
      const links = el("span", "fm-qp-links");
      links.append(ghBtn, checkBtn);
      foot.append(verText, links);
      box.append(foot);
      checkBtn.addEventListener("click", () => {
        if (!update) {
          return;
        }
        checkBtn.textContent = T("Проверяю…");
        update.check(win, { force: true }).then(r => {
          checkBtn.textContent = T("Проверить обновления");
          if (r.error) {
            toast(T("Не получилось проверить обновления: ") + T(String(r.error)), "warn");
          } else if (r.newer) {
            Services.prefs.setStringPref("floorp.modern.update.skip", "");
            toast(T("Доступна версия ") + r.latest.version, "info");
          } else {
            toast(T("У вас последняя версия — ") + update.APP_VERSION, "info");
          }
          markUpdate();
          fill();
        });
      });

      fill = () => {
        const cur = themes ? themes.current() : "";
        for (const x of grid.children) x.toggleAttribute("on", x.dataset.id === cur);
        tname.textContent = nameOf(cur);
        const cfg = studio.readConfig();
        sqSw.toggleAttribute("on", !!cfg.square);
        thSw.toggleAttribute("on", !!cfg.tabsHide);
        let mode = 2;
        try {
          mode = Services.prefs.getIntPref("browser.theme.toolbar-theme", 2);
        } catch (e) {}
        for (const x of seg.children) x.toggleAttribute("on", x.dataset.v === String(mode));
        for (const x of dots.children) x.toggleAttribute("on", (x.dataset.c || "") === (cfg.accent || ""));
      };
      panel.addEventListener("popupshowing", () => fill());
      panel.addEventListener("popuphidden", () => (lastHidden = Date.now()));
    };
    let lastToggle = 0;
    let lastHidden = 0;
    const togglePanel = node => {
      // нажатие на кнопку при открытой панели: панель уже закрылась от этого же нажатия
      if (Date.now() - lastToggle < 400 || Date.now() - lastHidden < 300) {
        return;
      }
      lastToggle = Date.now();
      try {
        if (!panel) {
          buildPanel();
        }
        if (panel.state === "open" || panel.state === "showing") {
          panel.hidePopup();
          return;
        }
        let anchor = node && node.isConnected && node.getBoundingClientRect().width ? node : null;
        anchor = anchor?.querySelector?.(".toolbarbutton-icon") || anchor || doc.getElementById("PanelUI-menu-button");
        panel.openPopup(anchor, "bottomright topright", 0, 0, false, false);
        log("быстрая панель: открыта");
      } catch (e) {
        log("быстрая панель: ОШИБКА — открываю вкладку настроек", e);
        openOnce(win);
      }
    };

    const CustomizableUI = win.CustomizableUI;
    const WIDGET = "fm-studio-button";
    const hook = node => {
      if (!node || node._fmHooked) {
        return;
      }
      node._fmHooked = true;
      node.addEventListener("click", e => {
        if (e.button === 0) {
          e.stopPropagation();
          e.preventDefault();
          node.ownerGlobal.FloorpModernQuickPanel?.(node);
        }
      });
      node.addEventListener("command", e => {
        e.stopPropagation();
        node.ownerGlobal.FloorpModernQuickPanel?.(node);
      });
    };
    win.FloorpModernQuickPanel = togglePanel;
    if (CustomizableUI.getWidget(WIDGET)?.provider !== CustomizableUI.PROVIDER_API) {
      try {
        CustomizableUI.createWidget({
          id: WIDGET,
          type: "button",
          defaultArea: CustomizableUI.AREA_NAVBAR,
          label: T("Дизайн"),
          tooltiptext: T("Hand Design — тема, скругления, акцент (Alt+Shift+S — все настройки)"),
          onCreated(node) {
            hook(node);
          },
        });
      } catch (e) {}
    }
    hook(doc.getElementById(WIDGET));
    // пункт в главном меню ☰ (меню создаётся при первом открытии)
    const addMenuItem = () => {
      const anchor = doc.getElementById("appMenu-settings-button");
      if (!anchor || doc.getElementById("appMenu-fm-studio")) {
        return;
      }
      const item = doc.createXULElement("toolbarbutton");
      item.id = "appMenu-fm-studio";
      item.className = "subviewbutton";
      item.setAttribute("label", T("Дизайн (Hand Design)"));
      item.addEventListener("command", () => {
        win.PanelUI?.hide();
        openOnce(win);
      });
      anchor.before(item);
    };
    addMenuItem();
    doc.getElementById("appMenu-popup")?.addEventListener("popupshowing", addMenuItem);
    win.addEventListener("keydown", e => {
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyS") {
        e.preventDefault();
        e.stopPropagation();
        openOnce(win);
      }
    }, true);
  });
  safe("now bar", () => {
    /* ------------- «Now Bar»: что играет в другой вкладке ------------- */
    const gB = win.gBrowser;
    if (!gB) {
      return;
    }
    // плашку можно выключить в установщике (Настройка → Плеер Now Bar)
    try {
      if (!Services.prefs.getBoolPref("floorp.modern.nowbar", true)) {
        return;
      }
    } catch (e) {}
    const bar = el("div", "fm-nowbar");
    const eq = el("div", "fm-nowbar-eq");
    eq.append(el("span"), el("span"), el("span"));
    // обложка трека поверх эквалайзера (если сайт её даёт)
    const art = el("img", "fm-nowbar-art");
    art.alt = "";
    art.addEventListener("error", () => art.removeAttribute("src"));
    eq.append(art);
    // тонкая полоска прогресса по низу плашки
    const progress = el("div", "fm-nowbar-progress");
    const progressFill = el("div", "fm-nowbar-progress-fill");
    progress.append(progressFill);
    const title = el("div", "fm-nowbar-title");
    const prev = el("div", "fm-nowbar-btn fm-nowbar-prev");
    const play = el("div", "fm-nowbar-btn fm-nowbar-play");
    const next = el("div", "fm-nowbar-btn fm-nowbar-next");
    const mute = el("div", "fm-nowbar-btn fm-nowbar-mute");
    const close = el("div", "fm-nowbar-btn fm-nowbar-close");
    prev.title = T("Назад");
    next.title = T("Вперёд");
    play.title = T("Пауза / продолжить");
    mute.title = T("Звук вкладки");
    close.title = T("Скрыть");
    bar.append(eq, title, prev, play, next, mute, close, progress);
    host.after(bar);

    let current = null;      // вкладка, которую показывает плашка
    let pausedByUs = false;  // мы поставили на паузу — плашку не прячем
    const dismissed = new WeakSet();

    const controller = tab => {
      try {
        return tab.linkedBrowser.browsingContext.mediaController;
      } catch (e) {
        return null;
      }
    };
    // во вкладке идёт звонок (микрофон / камера) — это работа для плашки звонка
    const inCall = tab => {
      const w = tab._sharingState?.webRTC;
      return !!(w && (w.microphone || w.camera)) || /camera|microphone/.test(tab.getAttribute("sharing") || "");
    };
    // значок звука у вкладки гаснет с задержкой ~3 с; «уже тихо» видно по soundplaying-scheduledremoval
    const audible = tab => tab.hasAttribute("soundplaying") && !tab.hasAttribute("soundplaying-scheduledremoval");
    const pick = () => {
      if (current && current.isConnected && !inCall(current) && (current.hasAttribute("soundplaying") || pausedByUs)) {
        return current;
      }
      pausedByUs = false;
      mutedByUs = false;
      return [...gB.tabs].reverse().find(t => t.hasAttribute("soundplaying") && !dismissed.has(t) && !inCall(t)) || null;
    };
    // появилась / пропала плашка звонка — перерисовать плеер
    try {
      const callObs = new win.MutationObserver(() => win.setTimeout(() => render(), 0));
      callObs.observe(doc.documentElement, { attributes: true, attributeFilter: ["fm-callbar"] });
      onUnload.push(() => callObs.disconnect());
    } catch (e) {}
    const render = () => {
      current = pick();
      // пока сверху плашка звонка — плеер прячем, чтобы не мешал
      const callShown = doc.documentElement.hasAttribute("fm-callbar");
      const show = !!current && current !== gB.selectedTab && !dismissed.has(current) && !callShown;
      bar.classList.toggle("fm-in", show);
      doc.documentElement.toggleAttribute("fm-nowbar", show);
      if (!current) {
        delete bar.dataset.seen;
        if (bar._shown) {
          bar._shown = false;
          pollTitle(false);
        }
        return;
      }
      if (!title.textContent || bar.dataset.tab !== String(current.linkedPanel)) {
        title.textContent = current.label || T("Музыка");
        bar.dataset.tab = String(current.linkedPanel);
      }
      bar.toggleAttribute("data-paused", pausedByUs);
      bar.toggleAttribute("data-muted", current.hasAttribute("muted"));
      if (show !== bar._shown) {
        bar._shown = show;
        if (show) {
          bar.classList.toggle("fm-mini", bar.dataset.seen === bar.dataset.tab);
          bar.dataset.seen = bar.dataset.tab;
        }
        pollTitle(show);
      }
      if (show) {
        placeSaved();
      }
    };

    /* ---- перетаскивание плашки; место запоминается ---- */
    const POS_PREF = "floorp.modern.nowbar.pos";
    const area = () => (doc.getElementById("browser") || doc.documentElement).getBoundingClientRect();
    const placeAt = (x, y) => {
      const a = area();
      const maxX = Math.max(8, a.width - bar.offsetWidth - 8);
      const maxY = Math.max(8, a.height - bar.offsetHeight - 8);
      bar.style.left = a.left + Math.min(maxX, Math.max(8, x)) + "px";
      bar.style.top = a.top + Math.min(maxY, Math.max(8, y)) + "px";
      bar.style.bottom = "auto";
      bar.setAttribute("data-moved", "true");
    };
    function placeSaved() {
      let saved = "";
      try {
        saved = Services.prefs.getStringPref(POS_PREF, "");
      } catch (e) {}
      const m = /^([\d.]+),([\d.]+)$/.exec(saved);
      if (!m) {
        return;
      }
      const a = area();
      placeAt(+m[1] * a.width, +m[2] * a.height);
    }
    let drag = null;
    bar.addEventListener("pointerdown", e => {
      if (e.button !== 0 || e.target.closest(".fm-nowbar-btn")) {
        return;
      }
      const r = bar.getBoundingClientRect();
      const pr = area();
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left + pr.left, dy: e.clientY - r.top + pr.top, moved: false };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) {
        return;
      }
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) {
        return;
      }
      drag.moved = true;
      bar.classList.add("fm-dragging");
      placeAt(e.clientX - drag.dx, e.clientY - drag.dy);
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) {
        return;
      }
      if (drag.moved) {
        const a = area();
        const x = (parseFloat(bar.style.left) - a.left) / a.width;
        const y = (parseFloat(bar.style.top) - a.top) / a.height;
        try {
          Services.prefs.setStringPref(POS_PREF, `${x.toFixed(4)},${y.toFixed(4)}`);
        } catch (err) {}
        // после перетаскивания клик по названию не должен переключать вкладку
        bar.addEventListener("click", ev => ev.stopPropagation(), { capture: true, once: true });
      }
      bar.classList.remove("fm-dragging");
      drag = null;
    };
    bar.addEventListener("pointerup", endDrag);
    bar.addEventListener("pointercancel", endDrag);
    // двойной клик по пустому месту — вернуть плашку вниз по центру
    bar.addEventListener("dblclick", e => {
      if (e.target.closest(".fm-nowbar-btn")) {
        return;
      }
      try {
        Services.prefs.clearUserPref(POS_PREF);
      } catch (err) {}
      bar.removeAttribute("data-moved");
      bar.style.left = bar.style.top = bar.style.bottom = "";
    });
    win.addEventListener("resize", () => bar.classList.contains("fm-in") && placeSaved());

    title.addEventListener("click", () => current && (gB.selectedTab = current));
    /* ---- управление звуком в странице ----
       1) MediaController Firefox — работает там, где сайт сам сообщает о плеере (YouTube).
       2) Если не помогло — просим страницу (через наш actor) поставить на паузу
          сами <audio>/<video> (так работает Telegram и другие сайты без Media Session).
       3) Если звук всё равно играет — выключаем звук вкладки, чтобы «стоп» сработал всегда. */
    let mutedByUs = false;
    const pageMedia = async (tab, data) => {
      const out = [];
      try {
        for (const bc of tab.linkedBrowser.browsingContext.getAllBrowsingContextsInSubtree()) {
          const actor = bc.currentWindowGlobal?.getActor("FloorpPdfTweaks");
          if (actor) {
            out.push(actor.sendQuery("FM:media", data).catch(() => null));
          }
        }
      } catch (e) {
        log("now bar: страница недоступна", e);
      }
      return (await Promise.all(out)).filter(Boolean);
    };
    const wait = ms => new Promise(r => win.setTimeout(r, ms));
    // играет ли ещё что-то: спрашиваем саму страницу (видит и «невидимые» плееры Telegram),
    // если страница не ответила — смотрим на значок звука вкладки
    const stillPlaying = async tab => {
      if (!tab.isConnected) {
        return false;
      }
      const info = await pageMedia(tab, { action: "info" });
      return info.some(x => x.playing) || audible(tab);
    };

    play.addEventListener("click", async () => {
      const tab = current;
      if (!tab) {
        return;
      }
      const mc = controller(tab);
      if (pausedByUs) {
        pausedByUs = false;
        if (mutedByUs && tab.hasAttribute("muted")) {
          tab.toggleMuteAudio();
        }
        mutedByUs = false;
        try { mc?.play(); } catch (e) {}
        await pageMedia(tab, { action: "play" });
        render();
        return;
      }
      pausedByUs = true;
      render();
      // 1) кнопка паузы самого сайта (Media Session) — так сайт видит паузу у себя в интерфейсе
      try { mc?.pause(); } catch (e) {}
      await wait(350);
      // 2) ставим на паузу сами звуки страницы, в том числе невидимые (Telegram)
      if (await stillPlaying(tab)) {
        const r = await pageMedia(tab, { action: "pause" });
        log("now bar: пауза на странице — " + r.map(x => x.count).join(","));
        await wait(500);
        // 3) не вышло — выключаем звук вкладки, чтобы «стоп» срабатывал всегда
        if (await stillPlaying(tab) && !tab.hasAttribute("muted")) {
          tab.toggleMuteAudio();
          mutedByUs = true;
          log("now bar: страница не остановилась, звук вкладки выключен");
        }
      }
      render();
    });
    const mediaKey = async (main, alt, delta) => {
      const tab = current;
      const mc = tab && controller(tab);
      if (!tab) {
        return;
      }
      let keys = [];
      try {
        keys = [...(mc?.supportedKeys || [])];
      } catch (e) {}
      try {
        if (keys.includes(main)) {
          main === "previoustrack" ? mc.prevTrack() : mc.nextTrack();
        } else if (keys.includes(alt)) {
          alt === "seekbackward" ? mc.seekBackward(10) : mc.seekForward(10);
        } else {
          // сайт не сообщает о плеере: перематываем сам звук на 10 секунд
          const r = await pageMedia(tab, { action: "seek", delta });
          if (!r.some(x => x.count)) {
            toast(T("Этот сайт не даёт переключать треки"), "warn");
          }
        }
      } catch (e) {
        log("now bar: назад/вперёд не сработало", e);
      }
      win.setTimeout(refreshTitle, 600);
    };
    prev.addEventListener("click", () => mediaKey("previoustrack", "seekbackward", -10));
    next.addEventListener("click", () => mediaKey("nexttrack", "seekforward", 10));

    /* ---- название трека: Media Session сайта или сам плеер на странице ---- */
    let titleTimer = 0;
    let tick = 0;
    const bigArt = list => {
      const arr = [...(list || [])].filter(a => a?.src);
      const size = a => Math.max(0, ...String(a.sizes || "").split(/\s+/).map(x => parseInt(x, 10) || 0));
      arr.sort((x, y) => size(y) - size(x));
      return arr[0]?.src || "";
    };
    async function refreshTitle() {
      const tab = current;
      if (!tab) {
        return;
      }
      tick++;
      let name = "", cover = "";
      try {
        const md = controller(tab)?.getMetadata?.();
        if (md?.title && md.title !== tab.label) {
          name = md.artist ? `${md.title} — ${md.artist}` : md.title;
        }
        cover = bigArt(md?.artwork);
      } catch (e) {}
      let pos = null;
      for (const r of await pageMedia(tab, { action: "info" })) {
        if (!name && r.title) {
          name = r.artist ? `${r.title} — ${r.artist}` : r.title;
        }
        if (!cover && r.artwork) {
          cover = r.artwork;
        }
        if (!pos && r.duration > 0) {
          pos = r;
        }
      }
      if (tab !== current) {
        return;
      }
      title.textContent = name || tab.label || T("Музыка");
      title.title = (name ? name + "\n" : "") + (tab.label || "");
      // обложка: картинка сайта, иначе значок вкладки
      const src = /^(https?|data|blob):/.test(cover) ? cover : (tab.image || "");
      if (src && art.getAttribute("src") !== src) {
        art.setAttribute("src", src);
      }
      bar.toggleAttribute("data-art", !!src);
      bar.toggleAttribute("data-progress", !!pos);
      if (pos) {
        progressFill.style.transform = `scaleX(${Math.min(1, Math.max(0, pos.position / pos.duration)).toFixed(4)})`;
      }
    }
    const pollTitle = on => {
      win.clearInterval(titleTimer);
      if (on) {
        refreshTitle();
        titleTimer = win.setInterval(refreshTitle, 1000);
        if (!bar.classList.contains("fm-mini")) {
          scheduleMini();
        }
      }
    };

    /* ---- мини-режим: через 5 с плашка сворачивается в кружок с обложкой,
       при наведении снова раскрывается (как Dynamic Island) ---- */
    let miniTimer = 0;
    function scheduleMini() {
      win.clearTimeout(miniTimer);
      miniTimer = win.setTimeout(() => {
        if (!bar.matches(":hover") && !drag) {
          bar.classList.add("fm-mini");
        }
      }, 5000);
    }
    bar.addEventListener("mouseenter", () => {
      win.clearTimeout(miniTimer);
      bar.classList.remove("fm-mini");
    });
    bar.addEventListener("mouseleave", scheduleMini);

    /* ---- медиа-клавиши клавиатуры, пока окно браузера активно ---- */
    win.addEventListener("keydown", e => {
      if (!current || !bar.classList.contains("fm-in")) {
        return;
      }
      const map = { MediaPlayPause: () => play.click(), MediaTrackNext: () => next.click(), MediaTrackPrevious: () => prev.click() };
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        e.stopPropagation();
        fn();
      }
    }, true);
    mute.addEventListener("click", () => {
      current?.toggleMuteAudio();
      render();
    });
    close.addEventListener("click", () => {
      if (current) {
        dismissed.add(current);
      }
      pausedByUs = false;
      render();
    });

    const tc = gB.tabContainer;
    const onAttr = e => {
      const changed = e.detail?.changed || [];
      if (changed.includes("soundplaying") || changed.includes("muted") || changed.includes("label")) {
        if (changed.includes("soundplaying") && e.target.hasAttribute("soundplaying")) {
          dismissed.delete(e.target);
          if (e.target === current) {
            pausedByUs = false;
          }
        }
        render();
      }
    };
    tc.addEventListener("TabAttrModified", onAttr);
    tc.addEventListener("TabSelect", render);
    tc.addEventListener("TabClose", () => win.setTimeout(render, 0));
    onUnload.push(() => {
      tc.removeEventListener("TabAttrModified", onAttr);
      tc.removeEventListener("TabSelect", render);
    });
  });

  /* ------- меню без серых углов -------
     Windows 11: Firefox/Floorp подкладывают под каждое меню системный фон Mica
     (серый прямоугольник со своими маленькими скруглениями). Из-за него за нашими
     круглыми углами видны «уши». Выключаем подложку — меню становятся прозрачными
     окнами, и видно только наше скругление. Действует на новые меню (после перезапуска — на все). */
  safe("popup corners", () => {
    const P = "widget.windows.mica.popups";
    if (Services.prefs.getIntPref(P, 2) !== 0) {
      Services.prefs.setIntPref(P, 0);
      log("меню: системная подложка Mica выключена (" + P + " = 0)");
    }
  });

  safe("menu check", () => {
    /* Диагностика меню правой кнопки: один раз за запуск записываем в журнал,
       какие правила CSS реально применились к пункту меню (чтобы понять, почему стиль из Studio не виден). */
    const menu = doc.getElementById("contentAreaContextMenu");
    if (!menu) {
      return;
    }
    let done = false;
    menu.addEventListener("popupshown", () => {
      if (done) {
        return;
      }
      done = true;
      try {
        const item = [...menu.children].find(x => x.localName === "menuitem" && !x.hidden);
        const cs = item && win.getComputedStyle(item);
        const pcs = win.getComputedStyle(menu);
        const info = {
          item: item ? item.id + " parent=" + item.parentNode.localName : T("нет"),
          minHeight: cs?.minHeight, radius: cs?.borderRadius, font: cs?.fontSize, pad: cs?.paddingBlock,
          panelRadius: pcs.getPropertyValue("--panel-border-radius"), panelBg: pcs.getPropertyValue("--panel-background").slice(0, 60),
          studioOk: pcs.getPropertyValue("--fm-studio-ok"), appearance: cs?.appearance,
        };
        const rules = [];
        try {
          const fn = InspectorUtils.getMatchingCSSRules || InspectorUtils.getCSSStyleRules;
          for (const r of fn.call(InspectorUtils, item)) {
            const href = String(r.parentStyleSheet?.href || "inline").slice(0, 40);
            let layer = "";
            for (let p = r.parentRule; p; p = p.parentRule) {
              if (p.name !== undefined && p.constructor?.name?.includes("Layer")) {
                layer = p.name;
              }
            }
            if (/radius|height|font-size/.test(r.style.cssText)) {
              rules.push(`${r.selectorText.slice(0, 70)} | ${href}${layer ? " | layer " + layer : ""} | ${r.style.cssText.slice(0, 90)}`);
            }
          }
        } catch (e) {
          rules.push("InspectorUtils: " + e);
        }
        log("меню: " + JSON.stringify(info));
        const sb = doc.getElementById("sidebar-main");
        if (sb) {
          const scs = win.getComputedStyle(sb);
          log("боковая панель: фон " + scs.backgroundColor + " / " + scs.backgroundImage.slice(0, 80) + ", атрибуты: " + [...sb.attributes].map(a => a.name).join(" "));
        }
        for (const r of rules.slice(-14)) {
          log("меню правило: " + r);
        }
      } catch (e) {
        log("меню: ОШИБКА", e);
      }
    });
  });

  safe("call bar", () => {
    /* ------------- плашка звонка: микрофон / камера заняты в другой вкладке -------------
       Сверху по центру, как «островок» на телефоне: сайт, время звонка,
       выключить микрофон / камеру, перейти к звонку. */
    const gB = win.gBrowser;
    if (!gB) {
      return;
    }
    const CSS = `
      .fm-callbar { position: fixed; left: 50%; top: 10px; z-index: 1002; display: flex; align-items: center; gap: 4px;
        width: max-content; max-width: min(520px, calc(100vw - 40px)); padding: 5px 6px 5px 6px; border-radius: 999px;
        background: var(--fm-bar, #1c1d21); color: var(--fm-ink, #f2f3f5); border: 1px solid var(--fm-line, rgb(255 255 255 / .1));
        box-shadow: 0 10px 30px rgb(0 0 0 / .35); font: 500 13px var(--fm-font, system-ui);
        opacity: 0; translate: -50% -14px; scale: .94; pointer-events: none;
        transition: opacity .25s ease, translate calc(.45s * var(--fm-k, 1)) var(--fm-spring, ease), scale calc(.45s * var(--fm-k, 1)) var(--fm-spring, ease), padding .3s; }
      .fm-callbar.fm-in { opacity: 1; translate: -50% 0; scale: 1; pointer-events: auto; }
      .fm-callbar-dot { flex: none; width: 30px; height: 30px; border-radius: 50%; position: relative; background: #2fbf71 center / 16px no-repeat;
        -moz-context-properties: fill; fill: #fff;
        background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='context-fill'><path d='M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z'/></svg>"); }
      .fm-callbar[data-kind="camera"] .fm-callbar-dot { background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='context-fill'><rect x='2.5' y='6' width='13' height='12' rx='3'/><path d='M17 10.2l4.1-2.6a.6.6 0 0 1 .9.5v7.8a.6.6 0 0 1-.9.5L17 13.8z'/></svg>"); }
      .fm-callbar-dot::after { content: ""; position: absolute; inset: -3px; border-radius: 50%; border: 2px solid #2fbf71; animation: fm-call-ring 1.6s ease-out infinite; }
      .fm-callbar[data-mic-off] .fm-callbar-dot { background-color: #e5484d; }
      .fm-callbar[data-mic-off] .fm-callbar-dot::after { border-color: #e5484d; }
      @keyframes fm-call-ring { from { opacity: .8; scale: .9; } to { opacity: 0; scale: 1.5; } }
      .fm-callbar-text { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 0 8px; cursor: pointer; line-height: 1.2; }
      .fm-callbar-site { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
      .fm-callbar-time { font-size: 11.5px; opacity: .7; font-variant-numeric: tabular-nums; }
      .fm-callbar-text:hover .fm-callbar-site { color: var(--fm-accent, AccentColor); }
      .fm-callbar-btn { flex: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; background: center / 17px no-repeat;
        -moz-context-properties: fill; fill: currentColor; transition: background-color .2s, scale calc(.3s * var(--fm-k, 1)) var(--fm-spring, ease); }
      .fm-callbar-btn:hover { background-color: var(--fm-hover, rgb(128 128 128 / .15)); }
      .fm-callbar-btn:active { scale: .9; }
      .fm-callbar-btn[hidden] { display: none; }
      .fm-callbar-btn[data-off] { background-color: #e5484d; fill: #fff; }
      .fm-callbar-mic { background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='context-fill' stroke-width='2' stroke-linecap='round'><rect x='9' y='3' width='6' height='11' rx='3' fill='context-fill'/><path d='M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21'/></svg>"); }
      .fm-callbar-mic[data-off] { background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='context-fill' stroke-width='2' stroke-linecap='round'><rect x='9' y='3' width='6' height='11' rx='3' fill='context-fill'/><path d='M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M4 4l16 16'/></svg>"); }
      .fm-callbar-cam { background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='context-fill'><rect x='2.5' y='6' width='13' height='12' rx='3'/><path d='M17 10.2l4.1-2.6a.6.6 0 0 1 .9.5v7.8a.6.6 0 0 1-.9.5L17 13.8z'/></svg>"); }
      .fm-callbar-cam[data-off] { background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='context-fill' stroke='context-fill' stroke-width='2' stroke-linecap='round'><rect x='2.5' y='6' width='13' height='12' rx='3' stroke='none'/><path d='M17 10.2l4.1-2.6a.6.6 0 0 1 .9.5v7.8a.6.6 0 0 1-.9.5L17 13.8z' stroke='none'/><path d='M3 3l18 18' fill='none'/></svg>"); }
      .fm-callbar-go { background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='context-fill' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'/></svg>"); }
      .fm-callbar-hide { background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='context-fill' stroke-width='2' stroke-linecap='round'><path d='M7 7l10 10M17 7L7 17'/></svg>"); background-size: 14px; opacity: .7; }
      .fm-callbar.fm-mini { padding: 4px 12px 4px 4px; }
      .fm-callbar.fm-mini .fm-callbar-btn, .fm-callbar.fm-mini .fm-callbar-site { display: none; }
      .fm-callbar.fm-mini .fm-callbar-dot { width: 24px; height: 24px; background-size: 13px; }
      .fm-callbar.fm-mini .fm-callbar-time { font-size: 12.5px; opacity: 1; font-weight: 600; }
      /* перетаскивание: за кружок или текст; позиция запоминается */
      .fm-callbar[data-moved] { translate: 0 0; transition: opacity .25s ease, scale calc(.45s * var(--fm-k, 1)) var(--fm-spring, ease), padding .3s; }
      .fm-callbar[data-moved]:not(.fm-in) { translate: 0 -8px; }
      .fm-callbar.fm-drag { transition: none !important; cursor: grabbing; scale: 1.03; box-shadow: 0 18px 40px rgb(0 0 0 / .45); }
      .fm-callbar-dot { cursor: grab; }
      .fm-callbar-btn.fm-callbar-mic:not([data-off]), .fm-callbar-btn.fm-callbar-cam:not([data-off]) { background-color: rgb(128 128 128 / .14); }
    `;
    try {
      win.windowUtils.loadSheetUsingURIString("data:text/css;charset=utf-8," + encodeURIComponent(CSS), win.windowUtils.AUTHOR_SHEET);
    } catch (e) {
      log("call bar: стили", e);
    }
    const bar = el("div", "fm-callbar");
    const dot = el("div", "fm-callbar-dot");
    const text = el("div", "fm-callbar-text");
    const site = el("div", "fm-callbar-site");
    const time = el("div", "fm-callbar-time");
    text.append(site, time);
    const mic = el("div", "fm-callbar-btn fm-callbar-mic");
    const cam = el("div", "fm-callbar-btn fm-callbar-cam");
    const go = el("div", "fm-callbar-btn fm-callbar-go");
    const hide = el("div", "fm-callbar-btn fm-callbar-hide");
    mic.title = T("Микрофон: нажмите, чтобы выключить / включить (Alt+Shift+M)");
    cam.title = T("Камера: нажмите, чтобы выключить / включить");
    go.title = T("Перейти к звонку");
    hide.title = T("Скрыть до конца звонка (насовсем — Studio → Показать / скрыть → Плашка звонка)");
    bar.append(dot, text, mic, cam, go, hide);
    host.after(bar);

    const started = new WeakMap();   // вкладка → когда начался звонок
    const lastSeen = new WeakMap();  // вкладка → когда последний раз видели звонок
    const muted = new WeakMap();     // вкладка → { mic, cam } выключены нами
    const dismissed = new WeakSet();
    let current = null;

    // Firefox: 0 — нет, 1 — включено, 2 — выключено (на паузе), но устройство всё ещё у вкладки
    const DISABLED = Ci.nsIMediaManagerService?.STATE_CAPTURE_DISABLED ?? 2;
    // потоки из webrtcUI (то же, что видит индикатор доступа Firefox): там состояние микрофона
    // и камеры есть и тогда, когда атрибут sharing у вкладки показывает только камеру или экран
    let rtcUI = null;
    const streamsOf = tab => {
      try {
        rtcUI = rtcUI || ChromeUtils.importESModule("resource:///modules/webrtcUI.sys.mjs").webrtcUI;
        const b = tab.linkedBrowser;
        return rtcUI.getActiveStreams(true, true, true, true).filter(st => st.browser === b || st.topBrowsingContext === b.browsingContext);
      } catch (e) {
        return [];
      }
    };
    const rtcLogged = new WeakMap();
    const state = tab => {
      const w = tab._sharingState?.webRTC || {};
      const attr = tab.getAttribute("sharing") || "";
      const streams = streamsOf(tab);
      // все известные значения: 1 — включено, 2 — на паузе (выключено), true — «есть» без подробностей
      const vals = key => [w[key], ...streams.map(st => st.types?.[key] ?? st.state?.[key] ?? st[key])].filter(v => v !== undefined && v !== null && v !== 0 && v !== false && v !== "");
      const micVals = vals("microphone");
      const camVals = vals("camera");
      const r = {
        mic: micVals.length > 0 || attr.includes("microphone"),
        cam: camVals.length > 0 || attr.includes("camera"),
        screen: !!w.screen || attr.includes("screen") || streams.some(st => st.types?.screen || st.state?.screen),
        // выключено — только если ВСЕ источники говорят «пауза»; хоть одно «включено» — включено
        micOff: micVals.length > 0 && micVals.every(v => v === DISABLED),
        camOff: camVals.length > 0 && camVals.every(v => v === DISABLED),
      };
      // журнал для отладки плашки: что именно сообщает браузер (пишется при изменении)
      try {
        const raw = JSON.stringify({ w: { microphone: w.microphone, camera: w.camera, screen: w.screen, sharing: w.sharing, paused: w.paused }, attr,
          streams: streams.map(st => ({ mic: st.types?.microphone ?? st.state?.microphone, cam: st.types?.camera ?? st.state?.camera, devices: (st.devices || []).map(d => d.mediaSource || d.type || "").join(",") })) });
        if (rtcLogged.get(tab) !== raw) {
          rtcLogged.set(tab, raw);
          log("call bar: состояние " + raw);
        }
      } catch (e) {}
      return r;
    };
    const host_ = tab => {
      try {
        return tab.linkedBrowser.currentURI.host.replace(/^www\./, "");
      } catch (e) {
        return "";
      }
    };
    const fmt = ms => {
      const t = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
      const p = n => String(n).padStart(2, "0");
      return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
    };
    // команды микрофону / камере — тем же способом, что и кнопки Firefox в индикаторе доступа
    const send = (tab, name) => {
      let n = 0;
      try {
        for (const bc of tab.linkedBrowser.browsingContext.getAllBrowsingContextsInSubtree()) {
          const actor = bc.currentWindowGlobal?.getActor("WebRTC");
          if (actor) {
            actor.sendAsyncMessage(name);
            n++;
          }
        }
      } catch (e) {
        log("call bar: " + name, e);
      }
      return n;
    };

    let timer = 0;
    let miniTimer = 0;
    const render = () => {
      const now = Date.now();
      const calls = [...gB.tabs].filter(t => {
        const st = state(t);
        const m = muted.get(t);
        // выключили микрофон/камеру — звонок всё равно идёт, плашку не прячем
        if (st.mic || st.cam || (m && (m.mic || m.cam))) {
          if (!started.has(t)) {
            started.set(t, now);
          }
          lastSeen.set(t, now);
          return true;
        }
        // сайт на миг отпустил микрофон (смена устройства, переподключение) —
        // время звонка не сбрасываем, ждём 30 секунд
        if (started.has(t) && now - (lastSeen.get(t) || 0) < 30000) {
          return false;
        }
        started.delete(t);
        lastSeen.delete(t);
        muted.delete(t);
        dismissed.delete(t);
        return false;
      });
      current = calls.find(t => t === current) || calls[calls.length - 1] || null;
      const show = !!current && current !== gB.selectedTab && !dismissed.has(current);
      if (show && !bar.classList.contains("fm-in")) {
        win.requestAnimationFrame(() => place());
      }
      bar.classList.toggle("fm-in", show);
      doc.documentElement.toggleAttribute("fm-callbar", show);
      win.clearInterval(timer);
      if (!current) {
        return;
      }
      const st = state(current);
      const m = muted.get(current) || {};
      // настоящее состояние из браузера важнее нашей памяти (выключили на самом сайте — тоже видно)
      if (!(m.pendUntil > Date.now())) {
        // выключено = браузер поставил на паузу. Если сайт вообще не держит микрофон,
        // считаем его выключенным, только если его выключили отсюда (иначе — «включён», как было)
        m.mic = st.mic ? st.micOff : !!m.micByUs;
        m.cam = !st.cam || st.camOff;
      }
      muted.set(current, m);
      bar.dataset.kind = st.cam ? "camera" : "phone";
      site.textContent = (st.cam ? T("Видеозвонок · ") : T("Звонок · ")) + (host_(current) || current.label);
      site.title = current.label;
      // обе кнопки всегда на месте — микрофон и камера управляются независимо
      mic.hidden = false;
      cam.hidden = false;
      mic.toggleAttribute("data-off", !!m.mic);
      cam.toggleAttribute("data-off", !!m.cam);
      bar.toggleAttribute("data-mic-off", !!m.mic);
      const tick = () => {
        if (current) {
          time.textContent = fmt(Date.now() - (started.get(current) || Date.now())) + (m.mic ? " · " + T("микрофон выкл.") : "") + (m.cam && st.cam !== undefined && bar.dataset.kind === "camera" ? " · " + T("камера выкл.") : "");
        }
      };
      tick();
      if (show) {
        timer = win.setInterval(tick, 1000);
      }
    };
    const scheduleMini = () => {
      win.clearTimeout(miniTimer);
      miniTimer = win.setTimeout(() => {
        if (!bar.matches(":hover")) {
          bar.classList.add("fm-mini");
        }
      }, 6000);
    };
    bar.addEventListener("mouseenter", () => {
      win.clearTimeout(miniTimer);
      bar.classList.remove("fm-mini");
    });
    bar.addEventListener("mouseleave", scheduleMini);

    /* Микрофон и камера — каждый сам по себе.
       1) Устройство уже у сайта → пауза / продолжение средствами Firefox (как в его индикаторе доступа).
       2) Сайт сам выключил устройство (Телемост, Meet, Zoom выключают камеру целиком) →
          просим страницу нажать её собственную кнопку «Включить камеру / микрофон». */
    const pageButton = async (tab, kind, want) => {
      const out = [];
      try {
        for (const bc of tab.linkedBrowser.browsingContext.getAllBrowsingContextsInSubtree()) {
          const actor = bc.currentWindowGlobal?.getActor("FloorpPdfTweaks");
          if (actor) {
            out.push(actor.sendQuery("FM:callbtn", { kind, want }).catch(() => null));
          }
        }
      } catch (e) {
        log("call bar: кнопка сайта", e);
      }
      return (await Promise.all(out)).find(r => r && r.clicked) || null;
    };
    const toggle = async (kind, onMsg, offMsg) => {
      const tab = current;
      if (!tab) {
        return;
      }
      const st = state(tab);
      const m = muted.get(tab) || {};
      const turnOff = !m[kind];
      const shared = kind === "mic" ? st.mic : st.cam;
      let ok = false;
      if (shared) {
        ok = send(tab, turnOff ? onMsg : offMsg) > 0;
      }
      if (!ok) {
        const r = await pageButton(tab, kind, turnOff ? "off" : "on");
        ok = !!r;
        if (r) {
          log(`call bar: нажата кнопка сайта «${r.label}»`);
        }
      }
      if (!ok) {
        toast(kind === "mic" ? T("Микрофон: сайт не даёт переключить его отсюда — открываю звонок") : T("Камера: сайт не даёт переключить её отсюда — открываю звонок"), "warn");
        gB.selectedTab = tab;
        return;
      }
      m[kind] = turnOff;
      if (kind === "mic") {
        m.micByUs = turnOff;
      }
      // пока браузер не подтвердил новое состояние — показываем то, что нажали
      m.pendUntil = Date.now() + (shared ? 1500 : 4000);
      win.setTimeout(render, shared ? 1600 : 4100);
      muted.set(tab, m);
      toast(kind === "mic" ? T(turnOff ? "Микрофон выключен" : "Микрофон включен") : T(turnOff ? "Камера выключена" : "Камера включена"), "info");
      render();
    };
    mic.addEventListener("click", () => toggle("mic", "webrtc:MuteMicrophone", "webrtc:UnmuteMicrophone"));
    cam.addEventListener("click", () => toggle("cam", "webrtc:MuteCamera", "webrtc:UnmuteCamera"));
    const goTo = () => {
      if (current) {
        gB.selectedTab = current;
      }
    };
    go.addEventListener("click", goTo);
    let dragged = false;
    text.addEventListener("click", () => {
      if (!dragged) {
        goTo();
      }
    });

    /* ---- перетаскивание плашки (за кружок или надпись), позиция запоминается.
       Двойной щелчок по кружку — вернуть наверх по центру. */
    const POS = "floorp.modern.callbar.pos";
    const area = () => (doc.getElementById("browser") || doc.documentElement).getBoundingClientRect();
    const place = () => {
      let p = null;
      try {
        p = JSON.parse(Services.prefs.getStringPref(POS, ""));
      } catch (e) {}
      const a = area();
      if (!p) {
        bar.removeAttribute("data-moved");
        bar.style.left = "";
        bar.style.top = Math.round(a.top + 10) + "px";
        return;
      }
      const bw = bar.offsetWidth || 300, bh = bar.offsetHeight || 44;
      bar.setAttribute("data-moved", "");
      bar.style.left = Math.round(a.left + Math.max(6, Math.min(p.x * a.width, a.width - bw - 6))) + "px";
      bar.style.top = Math.round(a.top + Math.max(6, Math.min(p.y * a.height, a.height - bh - 6))) + "px";
    };
    const startDrag = e => {
      if (e.button !== 0) {
        return;
      }
      const pr = area();
      const r = bar.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      const sx = e.clientX, sy = e.clientY;
      dragged = false;
      const move = ev => {
        if (!dragged && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) {
          return;
        }
        if (!dragged) {
          dragged = true;
          bar.classList.add("fm-drag");
          bar.setAttribute("data-moved", "");
        }
        const x = Math.max(6, Math.min(ev.clientX - pr.left - dx, pr.width - r.width - 6));
        const y = Math.max(6, Math.min(ev.clientY - pr.top - dy, pr.height - r.height - 6));
        bar.style.left = pr.left + x + "px";
        bar.style.top = pr.top + y + "px";
      };
      const up = () => {
        win.removeEventListener("mousemove", move, true);
        win.removeEventListener("mouseup", up, true);
        bar.classList.remove("fm-drag");
        if (dragged) {
          const x = (parseFloat(bar.style.left) - pr.left) / pr.width, y = (parseFloat(bar.style.top) - pr.top) / pr.height;
          Services.prefs.setStringPref(POS, JSON.stringify({ x: +x.toFixed(4), y: +y.toFixed(4) }));
          win.setTimeout(() => (dragged = false), 0);
        }
      };
      win.addEventListener("mousemove", move, true);
      win.addEventListener("mouseup", up, true);
    };
    dot.addEventListener("mousedown", startDrag);
    text.addEventListener("mousedown", startDrag);
    dot.addEventListener("dblclick", () => {
      Services.prefs.clearUserPref(POS);
      place();
      toast(T("Плашка звонка — снова сверху по центру"), "info");
    });
    dot.title = T("Перетащите, чтобы передвинуть. Двойной щелчок — вернуть на место");
    win.addEventListener("resize", place);
    place();
    hide.addEventListener("click", () => {
      if (current) {
        dismissed.add(current);
      }
      render();
    });
    // Alt+Shift+M — микрофон в звонке (из любой вкладки)
    win.addEventListener("keydown", e => {
      if (e.altKey && e.shiftKey && !e.ctrlKey && e.code === "KeyM" && current) {
        e.preventDefault();
        e.stopPropagation();
        toggle("mic", "webrtc:MuteMicrophone", "webrtc:UnmuteMicrophone");
      }
    }, true);

    const tc = gB.tabContainer;
    const onAttr = e => {
      const changed = e.detail?.changed || [];
      if (changed.includes("sharing") || changed.includes("label") || changed.includes("busy")) {
        render();
      }
    };
    const onSelect = () => {
      render();
      if (bar.classList.contains("fm-in")) {
        bar.classList.remove("fm-mini");
        scheduleMini();
      }
    };
    tc.addEventListener("TabAttrModified", onAttr);
    tc.addEventListener("TabSelect", onSelect);
    tc.addEventListener("TabClose", () => win.setTimeout(render, 0));
    // запасная проверка: не во всех сборках вкладка сообщает об изменении доступа
    const poll = win.setInterval(render, 4000);
    onUnload.push(() => {
      tc.removeEventListener("TabAttrModified", onAttr);
      tc.removeEventListener("TabSelect", onSelect);
      win.clearInterval(poll);
      win.clearInterval(timer);
    });
    render();
  });

  safe("zoom and mute toasts", () => {
    /* ---------------- масштаб страницы и звук вкладки ---------------- */
    const gB = win.gBrowser;
    if (!gB) {
      return;
    }
    let lastBrowser = gB.selectedBrowser;
    const zoomOf = b => {
      try {
        return Math.round(win.ZoomManager.getZoomForBrowser(b) * 100);
      } catch (e) {
        return 0;
      }
    };
    let lastZoom = zoomOf(lastBrowser);
    let zoomTimer = 0;
    win.addEventListener("FullZoomChange", () => {
      win.clearTimeout(zoomTimer);
      zoomTimer = win.setTimeout(() => {
        const b = gB.selectedBrowser;
        const z = zoomOf(b);
        if (b === lastBrowser && z && z !== lastZoom) {
          toast(T("Масштаб {0}%", z), "info");
        }
        lastBrowser = b;
        lastZoom = z;
      }, 120);
    }, true);
    gB.tabContainer.addEventListener("TabSelect", () => {
      lastBrowser = gB.selectedBrowser;
      lastZoom = zoomOf(lastBrowser);
    });
    gB.tabContainer.addEventListener("TabAttrModified", e => {
      if (e.target === gB.selectedTab && (e.detail?.changed || []).includes("muted")) {
        toast(e.target.hasAttribute("muted") ? T("Звук вкладки выключен") : T("Звук вкладки включён"), "info");
      }
    });
  });

  safe("shortcuts", () => {
    /* ------------ Alt+Shift+D — дубли, Alt+Shift+Z — режим фокуса ------------ */
    win.addEventListener("keydown", e => {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) {
        return;
      }
      if (e.code === "KeyD") {
        e.preventDefault();
        e.stopPropagation();
        const gB = win.gBrowser;
        const seen = new Set();
        const extra = [];
        // выбранная вкладка остаётся, закрываем её копии
        for (const t of [gB.selectedTab, ...gB.tabs]) {
          if (t.pinned) {
            continue;
          }
          const url = t.linkedBrowser?.currentURI?.spec;
          if (!url || url === "about:blank") {
            continue;
          }
          if (seen.has(url)) {
            if (t !== gB.selectedTab) {
              extra.push(t);
            }
          } else {
            seen.add(url);
          }
        }
        const uniq = [...new Set(extra)];
        if (uniq.length) {
          gB.removeTabs(uniq);
          toast(T("Закрыто одинаковых вкладок: {0}", uniq.length), "ok");
        } else {
          toast(T("Одинаковых вкладок нет"), "info");
        }
      } else if (e.code === "KeyZ") {
        e.preventDefault();
        e.stopPropagation();
        const on = !doc.documentElement.hasAttribute("fm-focus");
        doc.documentElement.toggleAttribute("fm-focus", on);
        toast(on ? T("Режим фокуса: Alt+Shift+Z — выйти") : T("Режим фокуса выключен"), "info");
      }
    }, true);
  });
  safe("gpu switch", () => {
    /* ---- переключение видеокарты (встроенная ↔ дискретная) ----
       Windows сбрасывает графику, и открытые PDF остаются с пустыми страницами.
       Ловим сброс и просим все открытые PDF перерисоваться (сейчас и ещё раз чуть позже). */
    const gB = win.gBrowser;
    if (!gB) {
      return;
    }
    const refreshAll = () => {
      for (const tab of gB.tabs) {
        try {
          for (const bc of tab.linkedBrowser.browsingContext.getAllBrowsingContextsInSubtree()) {
            bc.currentWindowGlobal?.getActor("FloorpPdfTweaks")?.sendAsyncMessage("FM:pdf-refresh");
          }
        } catch (e) {}
      }
    };
    let lastReset = 0;
    const observer = {
      observe(subject, topic) {
        const now = Date.now();
        if (now - lastReset < 3000) {
          return;
        }
        lastReset = now;
        log("сброс графики: " + topic);
        win.setTimeout(refreshAll, 1200);
        win.setTimeout(refreshAll, 4000);
      },
    };
    const topics = ["compositor-reinitialized", "graphics-device-reset", "gpu-process-crashed"];
    for (const t of topics) {
      Services.obs.addObserver(observer, t);
    }
    onUnload.push(() => topics.forEach(t => {
      try { Services.obs.removeObserver(observer, t); } catch (e) {}
    }));
  });
})();
