/* Hand Design — работает внутри страницы (world: MAIN), раньше скриптов сайта.
   Now Bar: следит за <audio>/<video> и navigator.mediaSession (включая «невидимые» плееры
   new Audio() в Telegram, VK и т. п. — подмена HTMLMediaElement.play, как в Firefox-версии).
   Плашка звонка: запоминает дорожки getUserMedia (микрофон, камера), умеет их выключать и включать.
   Наружу — только window.postMessage({ __hd: "up" }); команды приходят как { __hd: "down" }. */
(() => {
  if (window.__hdHook) return;
  Object.defineProperty(window, "__hdHook", { value: true });

  const post = (type, data) => {
    try {
      window.postMessage({ __hd: "up", type, data }, "*");
    } catch {}
  };

  /* ---------------------------------------------------------------- музыка и видео */
  const medias = new Set(); // WeakRef<HTMLMediaElement>
  let lastPlayed = null; // WeakRef
  const handlers = Object.create(null); // действия mediaSession, которые поставил сайт
  const P = HTMLMediaElement.prototype;
  const origPlay = P.play;

  function track(el) {
    if (!el || el.__hdTracked) return;
    try {
      Object.defineProperty(el, "__hdTracked", { value: true });
    } catch {
      return;
    }
    if (medias.size > 300) medias.clear();
    medias.add(new WeakRef(el));
    for (const ev of ["play", "playing", "pause", "ended", "emptied", "loadedmetadata"]) {
      el.addEventListener(ev, () => {
        if (ev === "play" || ev === "playing") lastPlayed = new WeakRef(el);
        reportMediaSoon();
      });
    }
    // «настоящий» звук: играл со звуком дольше 2 секунд. Беззвучные превью, заставки
    // и короткие звуки сайтов (как на google.com) в Now Bar не попадают.
    el.addEventListener("timeupdate", () => {
      if (!el.__hdHeard && !el.paused && !el.muted && el.volume > 0 && el.currentTime > 2 && (el.duration > 8 || el.duration === Infinity)) {
        try {
          Object.defineProperty(el, "__hdHeard", { value: true });
        } catch {}
        reportMediaSoon();
      }
    });
  }
  P.play = function play() {
    try {
      track(this);
      lastPlayed = new WeakRef(this);
    } catch {}
    return origPlay.apply(this, arguments);
  };
  // элементы в разметке: событие play не всплывает, но ловится на захвате
  document.addEventListener("play", e => e.target instanceof HTMLMediaElement && track(e.target), true);

  const ms = navigator.mediaSession;
  if (ms) {
    const origSet = ms.setActionHandler.bind(ms);
    ms.setActionHandler = (action, h) => {
      handlers[action] = h || null;
      reportMediaSoon();
      return origSet(action, h);
    };
    const desc = Object.getOwnPropertyDescriptor(MediaSession.prototype, "metadata");
    if (desc && desc.set) {
      Object.defineProperty(ms, "metadata", {
        configurable: true,
        get() {
          return desc.get.call(ms);
        },
        set(v) {
          desc.set.call(ms, v);
          reportMediaSoon();
        },
      });
    }
  }

  function liveMedias() {
    const out = [];
    for (const r of medias) {
      const el = r.deref();
      if (!el) {
        medias.delete(r);
        continue;
      }
      out.push(el);
    }
    return out;
  }
  // «главный» плеер: играющий со звуком, иначе последний запущенный
  function mainMedia() {
    const list = liveMedias();
    const audible = list.filter(el => el.__hdHeard && !el.paused && !el.muted && el.volume > 0);
    if (audible.length) return audible[audible.length - 1];
    const last = lastPlayed?.deref();
    if (last && last.__hdHeard && (last.currentSrc || last.srcObject)) return last;
    return null;
  }

  let mediaTimer = 0;
  let lastSent = "";
  function reportMediaSoon() {
    clearTimeout(mediaTimer);
    mediaTimer = setTimeout(reportMedia, 250);
  }
  function reportMedia() {
    const el = mainMedia();
    // видео без звука (фоновые ролики на сайтах) — не музыка
    if (!el || (el.tagName === "VIDEO" && el.muted)) {
      if (lastSent !== "none") {
        lastSent = "none";
        post("media", { playing: false, gone: true });
      }
      return;
    }
    const md = ms && ms.metadata;
    let artwork = "";
    try {
      const arts = (md && md.artwork) || [];
      const best = [...arts].sort((a, b) => parseInt(b.sizes || "0") - parseInt(a.sizes || "0"))[0];
      if (best && best.src) artwork = new URL(best.src, location.href).href;
    } catch {}
    const data = {
      playing: !el.paused && !el.ended,
      title: (md && md.title) || (top === window ? document.title : "") || "",
      artist: (md && md.artist) || "",
      album: (md && md.album) || "",
      artwork,
      hasNext: !!handlers.nexttrack,
      hasPrev: !!handlers.previoustrack,
      video: el.tagName === "VIDEO",
    };
    const key = JSON.stringify(data);
    if (key === lastSent) return;
    lastSent = key;
    post("media", data);
  }

  function mediaAction(action) {
    const el = mainMedia();
    const playing = el && !el.paused;
    if (action === "toggle") action = playing ? "pause" : "play";
    const map = { play: "play", pause: "pause", next: "nexttrack", prev: "previoustrack" };
    const h = handlers[map[action]];
    try {
      if (h) {
        h({ action: map[action] });
        return;
      }
    } catch {}
    if (!el) return;
    if (action === "play") el.play().catch(() => {});
    else if (action === "pause") el.pause();
    else if (action === "next" && isFinite(el.duration)) el.currentTime = Math.min(el.duration - 0.1, el.currentTime + 10);
    else if (action === "prev") el.currentTime = Math.max(0, el.currentTime - 10);
  }

  /* ---------------------------------------------------------------- звонки */
  const tracks = new Set(); // MediaStreamTrack (живые)
  function register(t) {
    if (!t || tracks.has(t) || (t.kind !== "audio" && t.kind !== "video")) return;
    // демонстрация экрана — не камера
    try {
      const s = t.getSettings ? t.getSettings() : {};
      if (s.displaySurface) return;
    } catch {}
    tracks.add(t);
    t.addEventListener("ended", () => {
      tracks.delete(t);
      reportCall();
    });
    reportCall();
  }
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async function getUserMedia(c) {
      const s = await orig(c);
      try {
        s.getTracks().forEach(register);
      } catch {}
      return s;
    };
  }
  const T = window.MediaStreamTrack && MediaStreamTrack.prototype;
  if (T) {
    const origClone = T.clone;
    T.clone = function clone() {
      const c = origClone.apply(this, arguments);
      if (tracks.has(this)) register(c);
      return c;
    };
    const origStop = T.stop;
    T.stop = function stop() {
      const r = origStop.apply(this, arguments);
      if (tracks.delete(this)) reportCall();
      return r;
    };
  }
  function stateOf(kind) {
    let has = false;
    let on = false;
    for (const t of tracks) {
      if (t.readyState !== "live") {
        tracks.delete(t);
        continue;
      }
      if (t.kind !== kind) continue;
      has = true;
      if (t.enabled && !t.muted) on = true;
    }
    return has ? (on ? "on" : "off") : "none";
  }
  let lastCall = "";
  let pollTimer = 0;
  function reportCall() {
    const data = { mic: stateOf("audio"), cam: stateOf("video") };
    const key = data.mic + data.cam;
    if (key !== lastCall) {
      lastCall = key;
      post("call", data);
    }
    // сайты сами выключают дорожки (кнопки Meet, Телемоста) — смотрим каждые 1,5 с, пока звонок идёт
    clearInterval(pollTimer);
    if (tracks.size) pollTimer = setInterval(reportCall, 1500);
  }

  /* сайт отпустил камеру/микрофон целиком (Meet, Телемост) — нажимаем его собственную кнопку.
     Ищем по подписи: «Включить камеру», «Turn on camera», «Unmute»… */
  const WORDS = {
    mic: { on: /(включить|включи|unmute|turn on).*(микрофон|звук|microphone|mic)|^unmute|включить звук/i, off: /(выключить|отключить|mute|turn off).*(микрофон|звук|microphone|mic)|^mute/i },
    cam: { on: /(включить|turn on|start).*(камер|видео|camera|video)/i, off: /(выключить|отключить|turn off|stop).*(камер|видео|camera|video)/i },
  };
  function siteButton(kind, want) {
    const re = WORDS[kind][want];
    const cands = document.querySelectorAll("button, [role=button], [aria-label], [data-tooltip], [title]");
    for (const b of cands) {
      const label = [b.getAttribute("aria-label"), b.getAttribute("data-tooltip"), b.getAttribute("title"), b.textContent].filter(Boolean).join(" ").trim().slice(0, 120);
      if (label && re.test(label) && b.offsetParent !== null) {
        b.click();
        return true;
      }
    }
    return false;
  }
  function callAction(kind, want) {
    const k = kind === "mic" ? "audio" : "video";
    const live = [...tracks].filter(t => t.kind === k && t.readyState === "live");
    if (live.length) {
      live.forEach(t => (t.enabled = want === "on"));
      // сайт мог держать свой переключатель — пробуем и его, чтобы его кнопка показывала правду
      siteButton(kind, want);
    } else if (!siteButton(kind, want)) {
      post("call-hint", { kind, want });
    }
    setTimeout(reportCall, 300);
  }

  /* ---------------------------------------------------------------- команды от расширения */
  window.addEventListener("message", e => {
    if (e.source !== window || !e.data || e.data.__hd !== "down") return;
    const d = e.data;
    if (d.what === "media") mediaAction(d.action);
    else if (d.what === "call") callAction(d.kind, d.want);
    else if (d.what === "ping") {
      lastSent = "";
      lastCall = "";
      reportMedia();
      reportCall();
    }
  });
})();
