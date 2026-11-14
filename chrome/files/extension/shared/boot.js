/* Самый первый скрипт страницы (обычный, не модуль): пока грузятся модули,
   ставит прошлые цвета темы из кэша — чтобы новая вкладка не мигала белым. */
(function () {
  try {
    var css = localStorage.getItem("hd-boot-style");
    var attrs = JSON.parse(localStorage.getItem("hd-boot-attrs") || "{}");
    var root = document.documentElement;
    if (css) {
      root.setAttribute("style", css);
    }
    for (var k in attrs) {
      root.setAttribute(k, attrs[k]);
    }
  } catch (e) {}
})();
