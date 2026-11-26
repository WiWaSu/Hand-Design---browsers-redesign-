/* Hand Design — паки значков в браузере.
 *  - значки браузера (файлы chrome://…/*.svg) подменяются через chrome.manifest «override»
 *    на resource://hdicons/<имя>.svg; в каждом файле все паки, нужный включает pref floorp.modern.icons;
 *  - наши кнопки и страницы берут значки из переменных --fm-ic-<имя> (лист стилей пака);
 *  - файлы собираются из hd-icons.mjs при первом запуске и лежат в pdf-tweaks/icons-cache.
 * Пак — «Как в теме» (пак текущей темы) или любой другой из Studio → Значки. */

import { renderAll, cssVars, ICON_NAMES, PACKS, GEO, GEO_ALT, BASE_PACK } from "resource://pdftweaks/hd-icons.mjs";

const { FileUtils } = ChromeUtils.importESModule("resource://gre/modules/FileUtils.sys.mjs");

export const PREF = "floorp.modern.icons";
const THEME_PREF = "floorp.modern.theme";
const STUDIO_PREF = "floorp.modern.studio";

const B = "chrome://browser/skin/", G = "chrome://global/skin/icons/", M = "chrome://global/skin/media/";
const N = B + "notification-icons/", T = B + "tabbrowser/", F = B + "fxa/", X = "chrome://mozapps/skin/extensions/";
const L = "chrome://noraneko-skin/content/lepton/icons/";
const map = (base, pairs) => Object.fromEntries(Object.entries(pairs).map(([f, n]) => [base + f + ".svg", n]));
export const MAP = {
  ...map(B, {
    "add-circle-fill": "plusCircle", "subtract-circle-fill": "minusCircle", back: "back", forward: "forward",
    "bookmark-hollow": "star", bookmark: "starOn", "bookmark-12": "starOn", "bookmark-star-on-tray": "library", "bookmarks-toolbar": "toolbar",
    "calendar-24": "calendar", "canvas-blocked": "canvasOff", characterEncoding: "text", "closed-tabs": "restore", customize: "customize",
    "device-desktop": "monitor", "device-phone": "smartphone", "device-tablet": "tablet", "device-tv": "tv", "device-vr": "xr",
    "drm-icon": "drm", "edit-cut": "cut", "edit-paste": "paste", fingerprint: "fingerprint", "firefox-view": "firefoxView",
    forget: "broom", "fullscreen-exit": "fullscreenExit", fullscreen: "fullscreen", "grid-sparkle": "ai", "history-20": "history", history: "history",
    home: "home", import: "import", "labs-16": "flask", library: "library", "lightning-bolt": "bolt", login: "key", mail: "email",
    menu: "menu", "menu-badged": "menu", "new-tab": "tabNew", "open-tabs": "tabs", open: "external", "payment-methods-16": "card",
    permissions: "permissions", "personal-info-16": "idCard", "pin-12": "pin", pin: "pin", privateBrowsing: "private", "reader-mode": "reader",
    "remote-control": "devices", save: "save", screenshot: "screenshot", "search-tabs": "search", "send-tab": "sendDevice", share: "share",
    "sidebar-collapsed": "sidebarCollapsed", "sidebar-collapsed-right": "sidebarRight", "sidebar-expanded": "sidebar", "sidebar-expanded-right": "sidebarRight",
    sidebars: "sidebar", "sidebars-right": "sidebarRight", sort: "sort", "split-view-left-16": "split", "split-view-right-16": "split",
    sync: "sync", "synced-tabs": "devices", "tab-crashed": "crash", tab: "tab", tabs: "tabs", "taskbar-tabs-add-tab": "app", "taskbar-tabs-move-tab": "external",
    "thumb-down": "thumbDown", topsites: "grid", "tracking-protection": "shield", "tracking-protection-active": "shieldCheck", "tracking-protection-disabled": "shieldOff",
    translations: "translate", "trust-icon-active": "shieldCheck", "trust-icon-disabled": "shieldOff", "trust-icon-insecure": "unlock", "trust-icon-warning": "warning",
    "window-firefox": "window", window: "window", "smart-window-simplified": "ai", contrast: "themeAuto",
  }),
  ...map(N, {
    "autoplay-media": "autoplay", "autoplay-media-blocked": "autoplayOff", camera: "camera", "camera-blocked": "cameraOff",
    "desktop-notification": "notification", "desktop-notification-blocked": "notificationOff", geo: "location", "geo-blocked": "locationOff",
    "local-host-blocked": "networkOff", "local-network": "network", "local-network-blocked": "networkOff", microphone: "mic", "microphone-blocked": "micOff",
    midi: "midi", minimize: "minimize", "persistent-storage": "storage", "persistent-storage-blocked": "storageOff", popup: "popup",
    screen: "screen", "screen-blocked": "screenOff", serial: "serial", speaker: "speaker", xr: "xr", "xr-blocked": "xrOff",
  }),
  ...map(T, { "tab-audio-muted-small": "mute", "tab-audio-playing-small": "sound", "tab-audio-blocked-small": "play", "tab-audio-blocked-circle-12": "play", "tab-groups": "grid", crashed: "crash" }),
  ...map(F, { "avatar-empty": "userCircle", "avatar-empty-circle": "userCircle", avatar: "userCircle", "avatar-color": "userCircle", "send-to-device": "sendDevice", send: "send", "sync-devices": "devices", monitor: "shield" }),
  ...map(B + "downloads/", { downloads: "downloads" }),
  ...map(B + "places/", { bookmarksMenu: "bookmark", bookmarksToolbar: "toolbar", "folder-smart": "folder", tag: "tag" }),
  ...map(B + "controlcenter/", { "3rdpartycookies": "cookie", cryptominers: "bolt", dashboard: "dashboard", "tracking-protection": "shield" }),
  ...map(B + "preferences/", { "category-general": "settings", "category-privacy-security": "lock", "category-search": "search", "category-sync": "sync", "category-accessibility": "a11y" }),
  ...map(G, {
    "arrow-counterclockwise-16": "undo", "arrow-down-12": "chevronDown", "arrow-down": "arrowDown", "arrow-left-12": "chevronLeft", "arrow-left": "chevronLeft",
    "arrow-right-12": "chevronRight", "arrow-right": "chevronRight", "arrow-up-12": "chevronUp", "arrow-up": "arrowUp", "arrows-updown": "updown",
    block: "blocked", blocked: "blocked", canvas: "canvas", "check-filled": "checkCircle", check: "check", chevron: "chevrons", clipboard: "paste",
    "close-fill": "closeCircle", close: "close", "color-picker-20": "pipette", "comment-24": "comment", "cursor-arrow": "cursor", defaultFavicon: "globe",
    delete: "delete", developer: "code", "edit-copy": "copy", "edit-outline": "edit", edit: "edit", error: "closeCircle", experiments: "flask",
    "eye-slash": "eyeOff", eye: "eye", "find-in-page-24": "fileSearch", folder: "folder", heart: "heart", help: "help", "highlighter-24": "marker",
    "indicator-private-browsing": "private", "info-filled": "info", info: "info", lightbulb: "lightbulb", link: "link", "local-host": "network",
    "menu-check": "check", minus: "minus", moon: "moon", more: "more", "move-16": "move", newsfeed: "rss", "odd-spreads-24": "spreadOdd",
    "open-in-new": "external", "organizational-unit": "network", pdf: "pdf", performance: "performance", plugin: "puzzle", "plus-20": "plus", plus: "plus",
    "presentation-mode-24": "presentation", print: "print", "rating-star": "starOn", reload: "reload", "search-glass": "search", "search-textbox": "search",
    "security-broken": "unlock", "security-warning": "warning", security: "lock", settings: "settings", "shaft-arrow-down": "arrowDown",
    "shaft-arrow-left": "back", "shaft-arrow-right": "forward", "shaft-arrow-up": "arrowUp", "signature-24": "signature", "sort-arrow": "chevronDown",
    sun: "sun", "swap-horizontal-20": "swap", "tab-notes-12": "note", "tab-notes": "note", "thumbs-down-20": "thumbDown", "thumbs-up-20": "thumbUp",
    trending: "chart", trophy: "trophy", undo: "undo", "update-icon": "download", users: "users", "warning-fill-12": "warning", warning: "warning",
  }),
  ...map(M, {
    "audio-muted": "mute", audio: "sound", "fullscreenEnterButton": "fullscreen", "fullscreenExitButton": "fullscreenExit", "pause-fill": "pause",
    "picture-in-picture-closed": "pipClose", "picture-in-picture-open": "pip", "play-fill": "play", "playback-speed-button": "speed",
    "picture-in-picture-seekBackward-button": "prev", "picture-in-picture-seekForward-button": "next",
  }),
  ...map(X, { extension: "puzzle", extensionGeneric: "puzzle", "category-extensions": "puzzle", "category-plugins": "puzzle", "category-recent": "history", "category-available": "plusCircle", dictionaryGeneric: "book", themeGeneric: "palette", "kit-themes": "palette", "kit-addons": "puzzle", "category-sitepermission": "permissions" }),
  ...map("chrome://browser/content/ipprotection/assets/toolbaricons/", { "ipprotection-off": "vpn", "ipprotection-on": "vpnOn", "ipprotection-paused": "vpnPaused", "ipprotection-excluded": "shieldOff", "ipprotection-included": "vpnOn", "ipprotection-error": "warning", "ipprotection-info": "info" }),
  ...map("chrome://browser/content/sharing/", { "share-alt": "send" }),
  "chrome://mozapps/skin/extensions/category-discover.svg": "ai",
  "chrome://browser/skin/privatebrowsing/pbm-logo.svg": "private",
  "chrome://browser/content/profiles/assets/16_heart.svg": "heart",
  "chrome://devtools/skin/images/debugging-workers.svg": "bug",
  "chrome://browser/skin/canvas.svg": "canvas",
  "chrome://browser/skin/addons/addon-install-blocked.svg": "puzzle",
  "chrome://global/skin/icons/content-analysis.svg": "shieldCheck",
  "chrome://browser/content/aiwindow/assets/ask-icon.svg": "chatAi",
  ...map("resource://usercontext-content/", { briefcase: "briefcase", cart: "cart", chill: "chill", circle: "circleDot", dollar: "dollar", fence: "fence", fingerprint: "fingerprint", food: "food", fruit: "fruit", gift: "gift", pet: "pet", tree: "tree", vacation: "vacation" }),
  ...map("chrome://browser/content/logos/", { vpn: "vpn", lockwise: "key", monitor: "shield", "tracking-protection": "shield", "tracking-protection-dark-theme": "shield" }),
  ...map(B + "protections/", { "resolved-breach": "checkCircle", "resolved-breach-gray": "checkCircle" }),
  ...map("chrome://browser/content/aboutlogins/icons/", { "breached-website": "warning", "vulnerable-password": "warning" }),
  ...map("chrome://global/skin/tree/", { "sort-asc": "chevronUp", "sort-dsc": "chevronDown" }),
  "chrome://global/skin/icons/highlights.svg": "ai",
  "chrome://browser/skin/sidebar/firefox.svg": "info",
  "chrome://global/skin/icons/security-custom-root.svg": "lock",
  "chrome://browser/skin/update-badge.svg": "download",
  "chrome://devtools/skin/images/globe.svg": "globe",
  "chrome://browser/skin/flame.svg": "broom",
  "chrome://global/skin/icons/page-portrait.svg": "file",
  "chrome://global/skin/icons/page-landscape.svg": "file",
  "chrome://global/skin/icons/columnpicker.svg": "columns",
  "chrome://mozapps/skin/extensions/category-themes.svg": "palette",
  "chrome://mozapps/skin/extensions/category-dictionaries.svg": "book",
  "chrome://mozapps/skin/extensions/category-languages.svg": "translate",
  "chrome://noraneko-skin/content/lepton/icons/fluid.svg": "app",
  ...map(L, {
    "add-device": "devices", "arrow-repeat-all": "loop", "arrow-sort-down-lines": "sort", "arrow-swap": "swap", "book-add": "bookAdd", book: "book",
    "bookmark-multiple": "library", "bookmarks-toolbar-alt": "toolbar", "bookmarks-toolbar": "toolbar", "bookmarksMenu-open": "bookmark", "bookmarksMenu-open2": "bookmark",
    "bookmarksToolbar-open-alt": "toolbar", "bookmarksToolbar-open": "toolbar", broom: "broom", bug: "bug", "calendar-agenda": "calendar", characterEncoding: "text",
    "chat-sparkle": "chatAi", "checkmark-circle": "checkCircle", "close-duplicate-tabs-photon": "closeTabs", "close-duplicate-tabs": "closeTabs",
    "close-tab-photon": "tabClose", "close-tab": "tabClose", "close-window": "close", "code-text": "code", code: "code", "command-console": "code",
    "command-eyedropper": "pipette", "command-frames": "frames", "command-pick": "pick", "command-responsivemode": "smartphone", "container-openin-16": "container",
    "content-view": "eye", "copy-select": "copy", dashboard: "dashboard", datarestore: "restore", datastore: "storage", developer: "code",
    "device-desktop": "monitor", "device-phone": "smartphone", "device-tablet": "tablet", "device-tv": "tv", "device-vr": "xr", "dismiss-filled": "close",
    "document-css": "fileCode", "document-endnote": "fileText", "document-landscape-split-hint": "split", "document-search": "fileSearch",
    "drawer-arrow-download": "downloads", "edit-active": "editDoc", "edit-copy": "copy", "edit-cut": "cut", "edit-paste-go": "paste", "edit-paste-search": "paste",
    "edit-paste": "paste", "enter-fullscreen": "fullscreen", eraser: "eraser", "exit-fullscreen": "fullscreenExit", "eye-hide": "eyeOff", "eye-show": "eye",
    "eye-tracking-off": "eyeOff", "filter-dismiss": "filter", "filter-reload": "filter", "find-again": "search", "firefox-view": "firefoxView", flame: "broom",
    "folder-globe": "folder", "folder-open": "folder", folder: "folder", forget: "broom", highlight: "marker", "history-reverse": "history",
    "horizon-night": "moon", "horizon-sunrise": "sun", "image-add": "imageAdd", "image-alt-text": "imageText", "image-arrow-counterclockwise": "imageReload",
    "image-copy": "imageCopy", image: "image", "import-export": "swap", import: "import", "key-multiple": "keys", link: "link", "link-no-tracking": "linkOff",
    "link-square": "external", "lock-closed": "lock", "mail-inbox-all": "inbox", "mail-inbox": "inbox", mail: "email", "menu-check": "check", merge: "merge",
    "movetowindow-16": "window", "new-tab-forward-photon": "tabNew", "new-tab-forward": "tabNew", "new-tab-multiple-photon": "tabs", "new-tab-multiple": "tabs",
    "new-tab-photon": "tabNew", "new-tab-skip-forward-photon": "tabNew", "new-tab-skip-forward": "tabNew", "new-tab": "tabNew", "no-search-results": "search",
    "organization-horizontal": "network", password: "password", "password-hide": "eyeOff", "paste-text": "paste", "paste-url": "paste", paste: "paste",
    performance: "performance", "pin-tab": "pin", "play-fill": "play", play: "play", "plug-disconnected": "plug", "private-favicon": "private",
    "profiler-stopwatch": "timer", "pulse-square": "performance", "pwa-install": "app", "pwa-launch": "external", "pwa-manage": "appManage", "pwa-remove": "delete",
    quit: "power", radio: "radio", redo: "redo", "refresh-cw": "restart", "relay-logo": "email", "reload-auto": "reload", reload: "reload",
    "resize-image": "image", resize: "zoomReset", "restore-session": "restore", "screenshot-1": "screenshot", screenshot: "screenshot",
    "select-all-on": "selectAll", "send-to-device": "sendDevice", send: "send", share: "share", "shield-task": "shieldCheck", "sign-out": "signOut",
    sort: "sort", "star-line-horizontal": "star", "synced-tabs": "devices", "tab-audio-blocked-circle-12": "play", "tab-audio-muted-small": "mute",
    "tab-audio-playing-small": "sound", "tab-copy-photon": "tabCopy", "tab-copy": "tabCopy", "tab-desktop-multiple-bottom": "tabs", "tab-desktop-multiple": "tabs",
    "tab-multiple": "tabs", "tab-photon": "tab", "tab-unload-photon": "tabSleep", "tab-unload": "tabSleep", tab: "tab", "tag-open": "tag", tag: "tag",
    "text-direction-horizontal-ltr": "textDir", "text-number-format": "number", "text-proofing-tools": "proofing", "text-sort-ascending": "sortAsc",
    "time-picker": "speed", timer10: "timer", "tool-accessibility": "a11y", toolbar: "toolbar", "toolbarButton-download": "download",
    "toolbarButton-editorHighlight": "marker", "toolbarButton-upload": "upload", toolbox: "wrench", translations: "translate", undo: "undo",
    "unpin-tab": "unpin", "update-circle": "download", "vertical-line": "separator", "video-clip": "video", "video-snapshot": "videoShot", video: "video",
    whatsnew: "gift", "window-dev-tools": "inspect", window: "window", "wrench-filled": "wrench",
  }),
};

const io = () => Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
const sss = () => Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
const cacheDir = () => PathUtils.join(Services.dirsvc.get("UChrm", Ci.nsIFile).path, "pdf-tweaks", "icons-cache");
const filesDir = () => PathUtils.join(cacheDir(), "files");
const varsPath = pack => PathUtils.join(cacheDir(), `vars-${pack}.css`);
const fileUri = path => Services.io.newFileURI(new FileUtils.File(path));
// меняется вместе с рисунками и стилями — тогда файлы пересобираются
const STAMP = (() => {
  let h = 0;
  for (const ch of "v3" + JSON.stringify(PACKS) + JSON.stringify(GEO_ALT) + Object.values(GEO).join("") + Object.keys(MAP).join("")) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return String(h >>> 0);
})();

function readStudio() {
  try {
    return JSON.parse(Services.prefs.getStringPref(STUDIO_PREF, "{}")) || {};
  } catch (e) {
    return {};
  }
}
export function effective() {
  const own = readStudio().iconPack;
  const pick = own && PACKS[own] ? own : Services.prefs.getStringPref(THEME_PREF, BASE_PACK);
  return PACKS[pick] ? pick : BASE_PACK;
}

// синхронная запись: config.js собирает значки до появления окон
function writeSync(path, text) {
  const out = FileUtils.openFileOutputStream(new FileUtils.File(path));
  const conv = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
  conv.init(out, "UTF-8");
  conv.writeString(text);
  conv.close();
}
const exists = path => new FileUtils.File(path).exists();
const stampPath = () => PathUtils.join(cacheDir(), "stamp-" + STAMP);
// файлы значков для браузера: в каждом все паки сразу, вариант выбирает pref внутри SVG
function buildFiles() {
  if (exists(stampPath())) {
    return;
  }
  const dir = new FileUtils.File(cacheDir());
  if (dir.exists()) {
    dir.remove(true);
  }
  new FileUtils.File(filesDir()).create(Ci.nsIFile.DIRECTORY_TYPE, 0o755);
  for (const n of ICON_NAMES) {
    writeSync(PathUtils.join(filesDir(), n + ".svg"), renderAll(n, PREF));
  }
  writeSync(PathUtils.join(cacheDir(), "icons.manifest"), Object.entries(MAP).map(([url, name]) => `override ${url} resource://hdicons/${name}.svg`).join("\n") + "\n");
  writeSync(stampPath(), "");
}
// переменные --fm-ic-* для наших кнопок и страниц — свой файл на каждый пак
function buildVars(pack) {
  if (!exists(varsPath(pack))) {
    writeSync(varsPath(pack), cssVars(pack));
  }
}

let manifestDone = false;
function registerFiles() {
  if (manifestDone) {
    return;
  }
  io().setSubstitution("hdicons", fileUri(filesDir()));
  Components.manager.QueryInterface(Ci.nsIComponentRegistrar).autoRegister(new FileUtils.File(PathUtils.join(cacheDir(), "icons.manifest")));
  manifestDone = true;
}

let sheet = null;
let current = "";
function useVars(pack) {
  const uri = fileUri(varsPath(pack));
  if (sheet && sheet.spec !== uri.spec && sss().sheetRegistered(sheet, sss().USER_SHEET)) {
    sss().unregisterSheet(sheet, sss().USER_SHEET);
  }
  if (!sss().sheetRegistered(uri, sss().USER_SHEET)) {
    sss().loadAndRegisterSheet(uri, sss().USER_SHEET);
  }
  sheet = uri;
  current = pack;
}

/* подключить пак: при запуске (config.js) — до первого окна, потом — при смене темы или выбора в Studio.
   pref переключает вариант внутри уже загруженных SVG, поэтому значки браузера меняются сразу */
export function apply() {
  const pack = effective();
  if (pack === current && manifestDone) {
    return pack;
  }
  buildFiles();
  buildVars(pack);
  Services.prefs.setStringPref(PREF, pack);
  registerFiles();
  useVars(pack);
  return pack;
}
export function startup() {
  try {
    apply();
  } catch (e) {
    console.error(e);
  }
}

let watching = false;
export function init() {
  startup();
  if (watching) {
    return;
  }
  watching = true;
  const onPref = () => effective() !== current && startup();
  Services.prefs.addObserver(THEME_PREF, onPref);
  Services.prefs.addObserver(STUDIO_PREF, onPref);
}

// для Studio: значки пака как url(data:…) — образцы на карточках и в предпросмотре
export { cssVars };
