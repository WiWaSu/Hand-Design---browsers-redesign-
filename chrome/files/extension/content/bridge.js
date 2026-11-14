/* Hand Design — мост между страницей (page-hook.js, world: MAIN) и расширением.
   Работает во всех фреймах: звук часто играет во встроенном плеере (YouTube в iframe). */
(() => {
  if (window.__hdBridge) return;
  window.__hdBridge = true;
  window.addEventListener("message", e => {
    if (e.source !== window || !e.data || e.data.__hd !== "up") return;
    const { type, data } = e.data;
    if (type !== "media" && type !== "call" && type !== "call-hint") return;
    try {
      chrome.runtime.sendMessage({ type: "hd:" + type, data }).catch(() => {});
    } catch {
      // расширение обновили — старый мост больше не работает
    }
  });
  chrome.runtime.onMessage.addListener(msg => {
    if (msg && msg.type === "hd:cmd") window.postMessage({ __hd: "down", what: msg.what, action: msg.action, kind: msg.kind, want: msg.want }, "*");
  });
  // если скрипт добавили в уже открытую вкладку — попросить текущее состояние
  window.postMessage({ __hd: "down", what: "ping" }, "*");
})();
