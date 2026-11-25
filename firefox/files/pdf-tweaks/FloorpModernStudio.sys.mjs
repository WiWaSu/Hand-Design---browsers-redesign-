/* Hand Design Studio — тонкая настройка оформления.
 *
 * Настройки лежат в pref "floorp.modern.studio" (JSON). Из них собирается
 * CSS и подключается как пользовательская таблица стилей ко всему браузеру
 * (окна, меню, новая вкладка) — изменения видны сразу, без перезапуска.
 *
 * Страница настроек: resource://handdesign/studio.html (импортирует SCHEMA
 * отсюда же, поэтому на верхнем уровне модуля нет обращений к Services).
 */

import { PARTS } from "resource://pdftweaks/themes/parts.sys.mjs";

export const PREF = "floorp.modern.studio";
// версия Hand Design — меняется вместе с VERSION (tools/build.sh проверяет)
export const APP_VERSION = "3.0.0";

/* Описание всех настроек: из него рисуется страница, проверяются значения
   и собирается CSS. null = «как в теме». */
/* цвета, которые сбрасываются при смене темы (они перекрывают тему целиком) */
export const THEME_COLOR_KEYS = ["accent", "frame", "bar", "menuBg", "ink", "onAccent", "field", "muted", "line", "hover", "press", "soft", "toggle", "tileColor", "pdfBar", "pdfWell", "menuAlpha", "menuBlur"];

const DETAIL_THEMES = [["none", "Без особенностей"], ["ios", "iOS Liquid Glass"], ["material", "Material You"], ["fluent", "Windows 11"], ["macos", "macOS"], ["nothing", "Nothing"], ["nightdrive", "Night Drive"], ["aero", "Aero"], ["retro", "Retro 98"], ["terminal", "Terminal"], ["paper", "Paper"], ["cyber", "Cyberpunk"], ["arctic", "Arctic"], ["sakura", "Sakura"], ["mint", "Mint"], ["latte", "Latte"], ["midnight", "Midnight"], ["fjord", "Fjord"], ["ember", "Ember"], ["forest", "Forest"], ["ocean", "Ocean"], ["rose", "Rosé"], ["synthwave", "Synthwave"], ["contrast", "High Contrast"]];

/* section — раздел в меню, icon — значок, area — что подсвечивает предпросмотр */
const PACK_OPTIONS = [["oneui", "One UI"], ...DETAIL_THEMES.filter(o => o[0] !== "none")];
export const SCHEMA = [
  /* ---------------- Внешний вид ---------------- */
  { group: "colors", section: "Внешний вид", icon: "palette", title: "Цвета", desc: "Главные цвета окна. Не выбрано — как в теме", area: "all", items: [
    { key: "accent", type: "color", label: "Акцент", hint: "Главный цвет: выбранная вкладка, кнопки, ползунки, выделение" },
    { key: "frame", type: "color", label: "Фон окна", hint: "Всё вокруг страницы: под вкладками, панелью и по краям", area: "toolbar" },
    { key: "bar", type: "color", label: "Адресная строка и поля", hint: "Строка адреса, поиск и поля ввода в меню", area: "url" },
    { key: "menuBg", type: "color", label: "Фон меню", hint: "Меню правой кнопки, главное меню ☰ и всплывающие панели", area: "menu" },
    { key: "ink", type: "color", label: "Текст", hint: "Названия вкладок, пункты меню, подписи кнопок" },
  ] },
  { group: "colorsMore", section: "Внешний вид", icon: "pipette", title: "Цвета: тонкая настройка", desc: "Оттенки, которые обычно подбирает тема сама", area: "all", items: [
    { key: "muted", type: "color", label: "Второстепенный текст", hint: "Подсказки, подписи, адреса под названиями" },
    { key: "onAccent", type: "color", label: "Текст на акценте", hint: "Надписи на кнопках цвета акцента. Не выбрано — чёрный или белый, смотря что читается лучше" },
    { key: "field", type: "color", label: "Поля ввода", hint: "Поиск и поля в меню и на страницах. Не выбрано — как адресная строка" },
    { key: "line", type: "color", label: "Линии и рамки", hint: "Разделители в меню и тонкие рамки вокруг панелей" },
    { key: "hover", type: "color", label: "Подсветка под мышью", hint: "Полупрозрачный фон кнопки или пункта, на который навели" },
    { key: "press", type: "color", label: "Нажатие", hint: "Фон кнопки в момент нажатия" },
    { key: "soft", type: "color", label: "Мягкий акцент", hint: "Бледный акцент: выбранная вкладка, выбранный пункт, строка в подсказках адреса", area: "tabs" },
    { key: "toggle", type: "color", label: "Переключатели", hint: "Включённые переключатели в меню и настройках браузера" },
  ] },
  { group: "shape", section: "Внешний вид", icon: "shape", title: "Форма", desc: "Скругления, отступы и размер кнопок", area: "page", items: [
    { key: "square", type: "bool", label: "Без скруглений", hint: "Убирает скругления везде: окно, вкладки, меню, кнопки, адресная строка, новая вкладка, PDF", area: "all" },
    { key: "radius", type: "range", label: "Скругление страницы", hint: "Углы области, где показывается сайт", min: 0, max: 36, step: 1, unit: "px" },
    { key: "gap", type: "range", label: "Отступ вокруг страницы", hint: "Расстояние между сайтом и краями окна. 0 — сайт во всю ширину", min: 0, max: 24, step: 1, unit: "px" },
    { key: "pageShadow", type: "range", label: "Тень под страницей", hint: "Насколько страница «приподнята» над фоном окна", min: 0, max: 100, step: 5, unit: "%" },
    { key: "buttonShape", type: "select", label: "Форма кнопок", hint: "Подсветка кнопок на панели при наведении", area: "toolbar", options: [["round", "Круглые"], ["rounded", "Скруглённые"], ["square", "Квадратные"]] },
    { key: "density", type: "select", label: "Размер кнопок", hint: "Крупно — удобнее на сенсорном экране, компактно — больше места сайту", area: "toolbar", options: [["compact", "Компактно"], ["normal", "Обычно"], ["touch", "Крупно"]] },
  ] },
  { group: "icons", section: "Внешний вид", icon: "star", title: "Значки", desc: "Как нарисованы все значки браузера и Hand Design", area: "toolbar", items: [
    { key: "iconPack", type: "packs", label: "Набор значков", hint: "У каждой темы свой набор: другая форма и стиль у всех значков на панели, во вкладках, меню, боковых панелях, заметках и PDF. Можно взять набор любой темы или нарисованный от руки", options: [...PACK_OPTIONS, ["sketch", "Набросок"], ["marker", "Маркер"], ["doodle", "Каракули"], ["brush", "Кисть"]] },
  ] },
  { group: "font", section: "Внешний вид", icon: "text", title: "Шрифт", desc: "Шрифт и размер текста интерфейса", area: "all", items: [
    { key: "font", type: "select", label: "Шрифт", hint: "Вкладки, меню, адресная строка и подписи", options: [["segoe", "Segoe UI Variable"], ["inter", "Inter"], ["roboto", "Roboto"], ["system", "Системный"], ["arial", "Arial"], ["mono", "Моноширинный"], ["custom", "Свой…"]] },
    { key: "fontCustom", type: "text", label: "Свой шрифт", hint: "Точное название шрифта, установленного в Windows", placeholder: "например, JetBrains Mono" },
    { key: "fontSize", type: "range", label: "Размер текста", hint: "Текст интерфейса. Сайты не меняются", min: 11, max: 17, step: 0.5, unit: "px" },
  ] },
  { group: "motion", section: "Внешний вид", icon: "speed", title: "Анимации", desc: "Скорость и характер движения", area: "all", items: [
    { key: "speed", type: "range", label: "Скорость", hint: "Меньше — быстрее. 1× — как задумано в теме", min: 0.3, max: 2, step: 0.1, unit: "×" },
    { key: "bounce", type: "select", label: "Пружинка", hint: "Меню и плашки слегка проскакивают и возвращаются, как в телефоне", options: [["none", "Без пружинки"], ["soft", "Чуть-чуть"], ["ios", "Как в iOS"], ["strong", "Сильно"]] },
  ] },
  { group: "details", section: "Внешний вид", icon: "customize", title: "Детали тем", desc: "Взять отдельную часть оформления у другой темы", area: "tabs", items: [
    { key: "dWindow", type: "details", part: "window", label: "Вкладки и меню", hint: "Выделенная вкладка, пункты меню, плитки главного меню, кнопки окна. Не выбрано — как в текущей теме", options: DETAIL_THEMES },
    { key: "dClock", type: "details", part: "clock", label: "Часы на новой вкладке", hint: "Шрифт и вид часов: точки Nothing, окно Retro 98, фосфор Terminal, неон", area: "newtab", options: DETAIL_THEMES },
    { key: "dWall", type: "details", part: "wall", label: "Фон новой вкладки", hint: "Огни Night Drive, сетка Nothing, бумага, неоновая сетка. Свои обои остаются поверх", area: "newtab", options: DETAIL_THEMES },
    { key: "dSearch", type: "details", part: "search", label: "Поиск и ярлыки", hint: "Строка поиска и плитки сайтов на новой вкладке", area: "newtab", options: DETAIL_THEMES },
  ] },

  /* ---------------- Окно браузера ---------------- */
  { group: "tabs", section: "Окно браузера", icon: "tab", title: "Вкладки", desc: "Как выглядят и ведут себя вкладки", area: "tabs", items: [
    { key: "tabShape", type: "select", label: "Форма", hint: "Очертание каждой вкладки", options: [["pill", "Таблетки"], ["rounded", "Скруглённые"], ["square", "Прямые"], ["underline", "Подчёркивание"], ["card", "Карточки"], ["chrome", "Как в Chrome"]] },
    { key: "tabSelected", type: "select", label: "Открытая вкладка", hint: "Чем вкладка, которую вы сейчас смотрите, отличается от остальных", options: [["soft", "Мягкий акцент"], ["accent", "Залита акцентом"], ["outline", "Обводка"], ["glass", "Стекло"], ["contrast", "Контрастная"], ["none", "Ничем"]] },
    { key: "tabHeight", type: "range", label: "Высота", hint: "Ниже — компактнее, выше — легче попасть мышью", min: 26, max: 48, step: 1, unit: "px" },
    { key: "tabMinWidth", type: "range", label: "Самая узкая вкладка", hint: "Уже этого вкладки не сжимаются: когда их много, появляется прокрутка", min: 40, max: 260, step: 10, unit: "px" },
    { key: "tabClose", type: "select", label: "Крестик закрытия", hint: "Когда показывать крестик на вкладке", options: [["always", "Всегда"], ["hover", "При наведении"], ["never", "Никогда"]] },
    { key: "tabWeight", type: "range", label: "Жирность названия", hint: "Толщина шрифта в названиях вкладок", min: 300, max: 800, step: 100 },
    { key: "tabsHide", type: "select", label: "Прятать вкладки", hint: "«У края» — вкладки выезжают, когда мышь у края окна. «Совсем» — их не видно, показать можно Alt+Shift+T", options: [["edge", "У края"], ["always", "Совсем"]] },
    { key: "tabPreview", type: "cards", label: "Превью при наведении", hint: "Что появляется, если задержать мышь на вкладке", options: [
      ["card", "Карточка", "Миниатюра, под ней название и адрес"],
      ["compact", "Компактное", "Только название и адрес"],
      ["wide", "Крупное", "Большая миниатюра"],
    ] },
  ] },
  { group: "urlbar", section: "Окно браузера", icon: "link", title: "Адресная строка", desc: "Строка с адресом сайта и поиском", area: "url", items: [
    { key: "urlHeight", type: "range", label: "Высота", min: 28, max: 52, step: 1, unit: "px" },
    { key: "urlRadius", type: "range", label: "Скругление углов", hint: "0 — прямоугольная, больше — таблетка", min: 0, max: 26, step: 1, unit: "px" },
    { key: "urlAlign", type: "select", label: "Где адрес", hint: "Положение адреса, пока вы не начали печатать", options: [["center", "По центру"], ["start", "Слева"]] },
    { key: "urlBorder", type: "select", label: "Рамка", options: [["glow", "Мягкое свечение"], ["line", "Тонкая линия"], ["none", "Без рамки"]] },
  ] },
  { group: "toolbar", section: "Окно браузера", icon: "toolbar", title: "Панель и кнопки", desc: "Какие кнопки и панели видны", area: "toolbar", items: [
    { key: "showBookmarks", type: "bool", label: "Панель закладок", hint: "Ряд закладок под адресной строкой", area: "bookmarks" },
    { key: "showSidebarButton", type: "bool", label: "Кнопка боковой панели" },
    { key: "showTabList", type: "bool", label: "Кнопка «Все вкладки»", hint: "Стрелка со списком всех открытых вкладок", area: "tabs" },
    { key: "showNewTabButton", type: "bool", label: "Кнопка «Новая вкладка»", hint: "Плюс рядом с вкладками", area: "tabs" },
    { key: "showExtensions", type: "bool", label: "Кнопка расширений", hint: "Значок-пазл со списком дополнений" },
  ] },
  { group: "menus", section: "Окно браузера", icon: "menu", title: "Меню", desc: "Меню правой кнопки и всплывающие панели", area: "menu", items: [
    { key: "menuStyle", type: "cards", label: "Стиль меню", options: [
      ["oneui", "One UI", "Крупные пункты-таблетки"],
      ["glass", "Стекло iOS", "Полупрозрачное, с размытием"],
      ["fluent", "Windows 11", "Компактное, полоска акцента"],
      ["macos", "macOS", "Синяя подсветка, плотное"],
      ["touch", "Сенсор", "Очень крупные пункты"],
      ["nothing", "Nothing", "Монохром и красная точка"],
      ["neon", "Неон", "Тёмное со свечением акцента"],
    ] },
    { key: "menuItemHeight", type: "range", label: "Высота пункта", min: 22, max: 52, step: 1, unit: "px" },
    { key: "menuFont", type: "range", label: "Размер текста", min: 11, max: 17, step: 0.5, unit: "px" },
    { key: "menuIcons", type: "bool", label: "Значки у пунктов", hint: "Маленький значок слева от каждого пункта" },
    { key: "menuRadius", type: "range", label: "Скругление меню", hint: "Углы самого меню", min: 0, max: 32, step: 1, unit: "px" },
    { key: "menuItemRadius", type: "range", label: "Скругление пунктов", hint: "Углы подсветки пункта под мышью", min: 0, max: 24, step: 1, unit: "px" },
    { key: "menuAlpha", type: "range", label: "Прозрачность", hint: "0 — меню сплошное, больше — сквозь него видно страницу", min: 0, max: 60, step: 5, unit: "%" },
    { key: "menuBlur", type: "range", label: "Размытие под меню", hint: "Заметно, только если меню прозрачное", min: 0, max: 40, step: 2, unit: "px" },
  ] },
  { group: "appmenu", section: "Окно браузера", icon: "dashboard", title: "Главное меню ☰", desc: "Меню за кнопкой с тремя полосками", area: "toolbar", items: [
    { key: "tileShape", type: "select", label: "Подложка под значками", hint: "Цветные плитки за значками пунктов", options: [["circle", "Круги"], ["rounded", "Скруглённые"], ["square", "Квадраты"], ["none", "Без подложки"]] },
    { key: "tileColor", type: "color", label: "Цвет подложки", hint: "Не выбрано — у каждого пункта свой цвет из темы" },
  ] },
  { group: "ctrltab", section: "Окно браузера", icon: "tabs", title: "Переключение Ctrl+Tab", desc: "Как переключаться между вкладками с клавиатуры", area: "tabs", items: [
    { key: "ctrlTabPreview", type: "bool", label: "Окно с миниатюрами", hint: "Ctrl+Tab листает вкладки в порядке, в каком вы их открывали, и показывает миниатюры. Выкл. — просто следующая вкладка" },
    { key: "ctrlTabStyle", type: "cards", label: "Вид окна", options: [
      ["ios", "iOS", "Большие карточки на размытом фоне"],
      ["windows", "Windows 11", "Как Alt+Tab: акрил и рамка"],
      ["list", "Список", "Только названия, без миниатюр"],
      ["neon", "Неон", "Тёмный, выбранная светится"],
    ] },
  ] },
  { group: "bars", section: "Окно браузера", icon: "sound", title: "Плашки и полоски", desc: "Now Bar, плашка звонка и полоска загрузки", area: "nowbar", items: [
    { key: "showNowBar", type: "bool", label: "Now Bar", hint: "Плашка внизу, когда музыка или видео играют в другой вкладке: пауза, назад, вперёд, звук" },
    { key: "showCallBar", type: "bool", label: "Плашка звонка", hint: "Сверху по центру, когда в другой вкладке идёт звонок: микрофон и камера в один щелчок", area: "toolbar" },
    { key: "showProgress", type: "bool", label: "Полоска загрузки", hint: "Тонкая полоска под панелью, пока открывается страница", area: "progress" },
    { key: "loadBar", type: "select", label: "Вид полоски загрузки", hint: "У каждой темы своя: блоки Retro 98, волна Ocean, огонь Ember и другие. Не выбрано — как в теме", area: "progress", options: PACK_OPTIONS },
  ] },

  /* ---------------- Новая вкладка ---------------- */
  { group: "newtab", section: "Новая вкладка", icon: "home", title: "Новая вкладка", desc: "Часы, поиск, ярлыки и обои", area: "newtab", items: [
    { key: "clockPos", type: "select", label: "Часы", options: [["top", "Сверху"], ["center", "По центру"], ["hidden", "Не показывать"]] },
    { key: "clockSize", type: "range", label: "Размер часов", min: 40, max: 220, step: 4, unit: "px" },
    { key: "clockWeight", type: "range", label: "Толщина цифр", min: 100, max: 900, step: 100 },
    { key: "clockFont", type: "select", label: "Шрифт часов", options: [["ui", "Как интерфейс"], ["serif", "С засечками"], ["mono", "Моноширинный"], ["rounded", "Округлый"]] },
    { key: "showDate", type: "bool", label: "Дата под часами" },
    { key: "searchWidth", type: "range", label: "Ширина поиска", hint: "Доля ширины окна", min: 30, max: 90, step: 5, unit: "%" },
    { key: "tiles", type: "bool", label: "Ярлыки сайтов", hint: "Плитки часто открываемых сайтов под поиском" },
    { key: "wallBlur", type: "range", label: "Размытие обоев", hint: "Обои меняются кнопкой слева внизу на самой новой вкладке", min: 0, max: 40, step: 2, unit: "px" },
  ] },

  /* ---------------- Функции ---------------- */
  { group: "passwords", section: "Функции", icon: "key", title: "Пароли", desc: "Окно сохранённых паролей", area: "page", items: [
    { key: "passwordsPanel", type: "bool", label: "Компактное окно паролей", hint: "Пароли открываются небольшим окном у края, со стороны кнопки, а не отдельной вкладкой. Кнопка «Развернуть» открывает полный менеджер" },
  ] },
  { group: "docs", section: "Функции", icon: "file", title: "Файлы", desc: "Что открывается прямо в браузере, без программ", area: "page", items: [
    { key: "mdEditor", type: "bool", label: "Markdown (.md)", hint: "Файлы открываются оформленными: просмотр, правка рядом, сохранение по Ctrl+S" },
    { key: "csvEditor", type: "bool", label: "Таблицы (.csv, .tsv)", hint: "Открываются таблицей, а не скачиваются: правка ячеек, сортировка, поиск, Ctrl+S" },
    { key: "imgEditor", type: "bool", label: "Редактор картинок", hint: "Обрезка, поворот, стрелки, рамки, текст, размытие, сжатие. В меню правой кнопки по картинке появляется «Редактировать картинку»" },
  ] },
  { group: "pdf", section: "Функции", icon: "pdf", title: "PDF: просмотр", desc: "Вид просмотрщика и кнопки на его панели", area: "page", items: [
    { key: "pdfUi", type: "select", label: "Оформление", options: [["auto", "Как в системе"], ["light", "Светлое"], ["dark", "Тёмное"]] },
    { key: "pdfPage", type: "select", label: "Цвет страниц", hint: "Бумага и сепия мягче для глаз, ночь — для темноты", options: [["auto", "Как в файле"], ["paper", "Бумага"], ["sepia", "Сепия"], ["night", "Ночь"]] },
    { key: "pdfBar", type: "color", label: "Цвет панели" },
    { key: "pdfWell", type: "color", label: "Фон групп кнопок", hint: "Подложка под кнопками инструментов на панели" },
    { key: "pdfResume", type: "bool", label: "Открывать там, где остановились", hint: "Документ открывается на той же странице. Начнёт работать после перезагрузки PDF" },
    { key: "pdfBookmarks", type: "bool", label: "Закладки страниц", hint: "Кнопка на панели и Ctrl+B" },
    { key: "pdfThemeButton", type: "bool", label: "Кнопка цвета страниц", hint: "Быстрый переход между бумагой, сепией и ночью" },
    { key: "pdfAnim", type: "bool", label: "Анимации панелей" },
  ] },
  { group: "pdfink", section: "Функции", icon: "pen", title: "PDF: рисование и текст", desc: "Карандаш, текст и как собираются рисунки", area: "page", items: [
    { key: "pdfAutoParams", type: "bool", label: "Настройки инструмента сразу", hint: "Выбрали карандаш или текст — сразу открываются толщина и цвет. Выкл. — они по стрелочке ▾ рядом" },
    { key: "pdfSteppers", type: "bool", label: "Кнопки − и + у толщины", hint: "И готовые размеры рядом с ползунком" },
    { key: "pdfColors", type: "bool", label: "Своя палитра цветов", hint: "Выкл. — открывается системное окно выбора цвета Windows" },
    { key: "pdfClear", type: "bool", label: "Кнопка «Очистить»", hint: "Убирает все рисунки или всё сразу" },
    { key: "pdfQuickText", type: "bool", label: "Быстрый текст", hint: "Двойной щелчок по пустому месту или по «……» сразу создаёт поле для текста. После перезагрузки PDF" },
    { key: "pdfShiftLine", type: "bool", label: "Ровная линия с Shift", hint: "Как в Paint: зажмите Shift, пока рисуете" },
    { key: "pdfShiftStep", type: "select", label: "Углы ровной линии", options: [["45", "Через 45°"], ["15", "Через 15°"], ["90", "Только по горизонтали и вертикали"]] },
    { key: "pdfInkSelect", type: "bool", label: "Выделять нарисованное", hint: "После рисования рисунок выделяется и появляется панелька. Выкл. — чтобы выделить, щёлкните по рисунку" },
    { key: "pdfInkGroup", type: "bool", label: "Собирать штрихи в один рисунок", hint: "Буква или слово из нескольких штрихов двигается и удаляется целиком. Выкл. — каждый штрих отдельно" },
    { key: "pdfInkIdle", type: "range", label: "Пауза до нового рисунка", hint: "Не рисовали дольше — следующий штрих начнёт новый рисунок", min: 150, max: 3000, step: 50, unit: " мс", def: 900 },
    { key: "pdfInkGap", type: "range", label: "Расстояние до нового рисунка", hint: "Штрих дальше этого от прошлого начнёт новый рисунок", min: 4, max: 150, step: 2, unit: " px", def: 28 },
    { key: "pdfInkMaxW", type: "range", label: "Самый широкий рисунок", hint: "Примерно одно слово. Шире — начинается новый", min: 60, max: 1200, step: 20, unit: " px", def: 260 },
    { key: "pdfInkMaxH", type: "range", label: "Самый высокий рисунок", min: 40, max: 800, step: 10, unit: " px", def: 140 },
    { key: "pdfGrab", type: "range", label: "Как точно наводить на линию", hint: "Насколько близко к линии надо навести мышь, чтобы её выделить", min: 2, max: 24, step: 1, unit: " px", def: 5 },
    { key: "pdfHoldDelay", type: "range", label: "Задержка перед повтором − и +", hint: "Через сколько начинает повторяться нажатие, если держать кнопку", min: 150, max: 1000, step: 50, unit: " мс", def: 380 },
    { key: "pdfHoldSpeed", type: "range", label: "Скорость повтора − и +", min: 30, max: 300, step: 10, unit: " мс", def: 70 },
  ] },
  { group: "notes", section: "Функции", icon: "note", title: "Заметки: работа", desc: "Как ведёт себя редактор заметок", area: "page", items: [
    { key: "notesLive", type: "bool", label: "Оформленный текст", hint: "Вместо знаков #, ** и [ ] сразу виден заголовок, жирный текст и галочки. Выкл. — исходный Markdown" },
    { key: "notesMarks", type: "bool", label: "Знаки разметки в строке с курсором", hint: "Как в Obsidian: в строке, где стоит курсор, видны # и **. Выкл. — знаков не видно нигде" },
    { key: "notesToolbar", type: "bool", label: "Панель кнопок сверху", hint: "Жирный, курсив, списки, таблица и другие кнопки над текстом" },
    { key: "notesSelBar", type: "bool", label: "Панелька при выделении", hint: "Выделили текст — рядом появляются жирный, курсив, цвет, код, ссылка" },
    { key: "notesSlash", type: "bool", label: "Меню по «/»", hint: "Наберите / в начале строки: заголовок, список, задача, таблица, шаблон" },
    { key: "notesMenu", type: "bool", label: "Своё меню правой кнопки", hint: "Выкл. — обычное меню браузера" },
    { key: "notesSpell", type: "bool", label: "Проверка орфографии" },
    { key: "notesTitle", type: "bool", label: "Название над заметкой", hint: "Это имя файла: поменяете — файл переименуется" },
    { key: "notesWords", type: "bool", label: "Счётчик слов" },
    { key: "notesAutosave", type: "range", label: "Сохранять через", hint: "Сколько ждать после последней правки", min: 300, max: 5000, step: 100, unit: " мс", def: 600 },
    { key: "notesNewName", type: "select", label: "Имя новой заметки", options: [["untitled", "«Без названия»"], ["date", "Дата и время"]] },
    { key: "notesAttach", type: "select", label: "Куда класть картинки", hint: "Вставленные Ctrl+V и перетащенные в заметку", options: [["root", "В папку attachments"], ["near", "Рядом с заметкой"]] },
  ] },
  { group: "notesList", section: "Функции", icon: "folder", title: "Заметки: список и папки", desc: "Список заметок, заметка дня и шаблоны", area: "page", items: [
    { key: "notesSort", type: "select", label: "Порядок в списке", options: [["modified", "Недавно изменённые"], ["name", "По имени"], ["created", "Недавно созданные"]] },
    { key: "notesPreview", type: "bool", label: "Начало текста в списке", hint: "Под названием видна первая строка заметки" },
    { key: "notesCompact", type: "bool", label: "Компактный список" },
    { key: "notesSide", type: "range", label: "Ширина списка", min: 200, max: 460, step: 10, unit: " px", def: 300 },
    { key: "notesDaily", type: "text", label: "Папка заметок дня", placeholder: "например, Дневник", hint: "Кнопка с календарём открывает заметку на сегодня. Пусто — в корне папки заметок" },
    { key: "notesDailyFormat", type: "select", label: "Имя заметки дня", options: [["ymd", "2026-11-17"], ["dmy", "17.11.2026"], ["long", "17 ноября 2026"]] },
    { key: "notesTemplates", type: "text", label: "Папка шаблонов", placeholder: "например, Шаблоны", hint: "Заметки из неё вставляются через «/» → «Шаблон». {{title}}, {{date}} и {{time}} заменяются на название, дату и время" },
    { key: "notesDailyTemplate", type: "text", label: "Шаблон заметки дня", placeholder: "название шаблона", hint: "С него начнётся каждая новая заметка дня" },
  ] },
  { group: "notesLook", section: "Функции", icon: "edit", title: "Заметки: оформление", desc: "Шрифт, цвета и вид блоков в заметках", area: "page", items: [
    { key: "notesFont", type: "select", label: "Шрифт текста", options: [["ui", "Обычный"], ["serif", "С засечками"], ["mono", "Моноширинный"], ["custom", "Свой…"]] },
    { key: "notesFontCustom", type: "text", label: "Свой шрифт текста", hint: "Точное название шрифта, установленного в Windows" },
    { key: "notesSize", type: "range", label: "Размер текста", min: 13, max: 24, step: 0.5, unit: " px", def: 16.5 },
    { key: "notesLine", type: "range", label: "Расстояние между строками", min: 1.2, max: 2.2, step: 0.05, unit: "", def: 1.7 },
    { key: "notesWidth", type: "select", label: "Ширина текста", options: [["narrow", "Узко"], ["normal", "Обычно"], ["wide", "Широко"], ["full", "Во всю ширину"]] },
    { key: "notesHeadFont", type: "select", label: "Шрифт заголовков", options: [["head", "Как в интерфейсе"], ["text", "Как текст"], ["serif", "С засечками"], ["mono", "Моноширинный"]] },
    { key: "notesHeadScale", type: "range", label: "Размер заголовков", min: 80, max: 140, step: 5, unit: "%", def: 100 },
    { key: "notesTitleSize", type: "range", label: "Размер названия", min: 20, max: 56, step: 1, unit: " px", def: 34 },
    { key: "notesAccent", type: "color", label: "Акцент заметок", hint: "Ссылки, теги, галочки, курсор, выделение" },
    { key: "notesText", type: "color", label: "Цвет текста" },
    { key: "notesHead", type: "color", label: "Цвет заголовков" },
    { key: "notesBg", type: "select", label: "Фон", options: [["theme", "Как в теме"], ["paper", "Бумага"], ["dark", "Тёмный"]] },
    { key: "notesBgColor", type: "color", label: "Свой цвет фона", hint: "Важнее, чем «Фон»" },
    { key: "notesSideColor", type: "color", label: "Фон списка" },
    { key: "notesRadius", type: "range", label: "Скругления", hint: "Таблицы, код, выноски, картинки, свойства", min: 0, max: 24, step: 1, unit: " px", def: 12 },
    { key: "notesCheck", type: "select", label: "Галочки задач", options: [["round", "Круглые"], ["square", "Квадратные"]] },
    { key: "notesBullet", type: "select", label: "Значок списка", options: [["dot", "Точка"], ["dash", "Тире"], ["square", "Квадрат"]] },
    { key: "notesTags", type: "select", label: "Теги", options: [["pill", "Плашкой"], ["plain", "Цветом"]] },
    { key: "notesCallout", type: "select", label: "Выноски [!note]", options: [["fill", "С фоном"], ["line", "Полоса слева"]] },
    { key: "notesTable", type: "select", label: "Таблицы", options: [["lines", "Линии"], ["zebra", "Полосами"], ["minimal", "Без рамок"]] },
  ] },

  /* ---------------- Система ---------------- */
  { group: "update", section: "Система", icon: "download", title: "Обновления", desc: "Новые версии Hand Design", area: "all", items: [
    { key: "checkUpdates", type: "bool", label: "Проверять при запуске", hint: "Раз за запуск браузера смотрит на GitHub, есть ли новая версия, и сообщает. Сам ничего не скачивает" },
  ] },
];

/* Готовые наборы: меняют сразу много настроек */
export const PRESETS = [
  ["clean", "Чистый", { radius: 14, gap: 6, menuStyle: "fluent", tabShape: "rounded", tabSelected: "soft", bounce: "soft", menuAlpha: 0, urlBorder: "line" }],
  ["bubble", "Пузыри", { radius: 30, gap: 10, menuStyle: "oneui", tabShape: "pill", tabSelected: "accent", bounce: "strong", menuRadius: 28, urlRadius: 26, buttonShape: "round" }],
  ["glass", "Стекло", { radius: 26, gap: 10, menuStyle: "glass", tabShape: "pill", tabSelected: "glass", menuAlpha: 35, menuBlur: 24, bounce: "ios", ctrlTabStyle: "ios" }],
  ["sharp", "Острый", { radius: 0, gap: 0, menuRadius: 4, urlRadius: 4, buttonShape: "square", tabShape: "square", tabSelected: "contrast", menuStyle: "fluent", bounce: "none", speed: 0.7 }],
  ["neon", "Неон", { accent: "#00E5FF", frame: "#05060A", menuBg: "#0B0D14", menuStyle: "neon", tabShape: "underline", tabSelected: "outline", ctrlTabStyle: "neon", urlBorder: "glow" }],
  ["mac", "Как Mac", { menuStyle: "macos", tabShape: "card", tabSelected: "contrast", radius: 12, gap: 6, urlRadius: 8, buttonShape: "rounded", font: "system", ctrlTabStyle: "windows" }],
];

const COLOR = /^#[0-9a-fA-F]{6}$/;
const FONT_TEXT = /^[\p{L}\p{N} ._-]{1,60}$/u;

/* оставить только известные ключи с правильными значениями */
export function sanitize(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") {
    return out;
  }
  for (const g of SCHEMA) {
    for (const it of g.items) {
      const v = raw[it.key];
      if (v === null || v === undefined || v === "") {
        continue;
      }
      if (it.type === "color" && typeof v === "string" && COLOR.test(v)) {
        out[it.key] = v.toUpperCase();
      } else if (it.type === "range" && typeof v === "number" && isFinite(v)) {
        out[it.key] = Math.min(it.max, Math.max(it.min, v));
      } else if ((it.type === "select" || it.type === "cards" || it.type === "details" || it.type === "packs") && it.options.some(o => o[0] === v)) {
        out[it.key] = v;
      } else if (it.type === "bool" && typeof v === "boolean") {
        out[it.key] = v;
      } else if (it.type === "text" && typeof v === "string" && FONT_TEXT.test(v.trim())) {
        out[it.key] = v.trim();
      }
    }
  }
  return out;
}

const SPRINGS = {
  none: ["cubic-bezier(.2, .8, .2, 1)", "cubic-bezier(.2, .8, .2, 1)"],
  soft: ["cubic-bezier(.2, .9, .25, 1.08)", "cubic-bezier(.2, .8, .2, 1)"],
  ios: [
    "linear(0, 0.0385, 0.135, 0.2646, 0.4078, 0.5501, 0.6814, 0.7955, 0.8894, 0.9626, 1.016, 1.0519, 1.073, 1.0823, 1.0828, 1.0772, 1.0676, 1.0561, 1.0441, 1.0325, 1.0222, 1.0134, 1.0063, 1.0009, 0.9972, 0.9948, 0.9935, 0.9931, 0.9934, 0.9941, 0.995, 0.9961, 0.9971, 0.998, 0.9987, 0.9993, 0.9997, 1)",
    "linear(0, 0.0661, 0.2032, 0.3554, 0.4963, 0.6161, 0.7127, 0.7881, 0.8454, 0.8883, 0.9199, 0.9429, 0.9596, 0.9715, 0.98, 0.986, 0.9902, 0.9932, 0.9953, 0.9967, 0.9978, 0.9985, 0.9989, 0.9993, 1)",
  ],
  strong: [
    "linear(0, 0.06, 0.21, 0.4, 0.6, 0.79, 0.95, 1.07, 1.15, 1.18, 1.17, 1.13, 1.08, 1.03, 0.99, 0.96, 0.95, 0.95, 0.96, 0.98, 0.99, 1.005, 1.01, 1.01, 1.005, 1)",
    "linear(0, 0.0661, 0.2032, 0.3554, 0.4963, 0.6161, 0.7127, 0.7881, 0.8454, 0.8883, 0.9199, 0.9429, 0.9596, 0.9715, 0.98, 0.986, 0.9902, 0.9932, 0.9953, 0.9967, 0.9978, 0.9985, 0.9989, 0.9993, 1)",
  ],
};
export const FONTS = {
  segoe: '"Segoe UI Variable Display", "Segoe UI Variable Text", "Segoe UI", sans-serif',
  inter: '"Inter", "Inter Variable", "Segoe UI", sans-serif',
  roboto: '"Roboto", "Roboto Flex", "Segoe UI", sans-serif',
  system: "system-ui, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  mono: '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
};
export const CLOCK_FONTS = {
  serif: '"Georgia", "Times New Roman", serif',
  mono: '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
  rounded: '"Nunito", "Varela Round", "Segoe UI Variable Display", sans-serif',
};

/* меню правой кнопки: стили */
const MENU_STYLES = {
  oneui: `
    menupopup::part(content) { border-radius: 26px !important; padding: 8px !important; }
    menupopup :is(menuitem, menu) { border-radius: 16px !important; padding-inline: 14px !important; }`,
  glass: `
    menupopup::part(content) {
      background-color: color-mix(in srgb, var(--fm-menu, #1c1d20) 62%, transparent) !important;
      backdrop-filter: blur(26px) saturate(1.8) !important;
      border: 1px solid light-dark(rgb(255 255 255 / .6), rgb(255 255 255 / .14)) !important;
      box-shadow: inset 0 1px 0 light-dark(rgb(255 255 255 / .8), rgb(255 255 255 / .12)), 0 18px 50px rgb(0 0 0 / .35) !important;
      border-radius: 24px !important;
    }
    menupopup :is(menuitem, menu) { border-radius: 12px !important; }
    menupopup :is(menuitem, menu):is([_moz-menuactive], :hover):not([disabled]) {
      background-color: light-dark(rgb(0 0 0 / .07), rgb(255 255 255 / .12)) !important;
    }`,
  fluent: `
    menupopup::part(content) { border-radius: 8px !important; padding: 4px !important; }
    menupopup :is(menuitem, menu) {
      border-radius: 4px !important; min-height: 30px !important; padding-block: 3px !important;
      margin-inline: 0 !important; position: relative;
    }
    menupopup :is(menuitem, menu):is([_moz-menuactive]):not([disabled])::before {
      content: ""; position: absolute; inset-inline-start: 0; top: 25%; height: 50%; width: 3px;
      border-radius: 3px; background: var(--fm-accent);
    }
    menupopup menuseparator { margin-inline: 0 !important; }`,
  macos: `
    menupopup::part(content) { border-radius: 10px !important; padding: 5px !important; }
    menupopup :is(menuitem, menu) {
      border-radius: 5px !important; min-height: 24px !important; padding-block: 2px !important;
      margin-inline: 0 !important; font-size: 13px !important;
    }
    menupopup :is(menuitem, menu):is([_moz-menuactive], :hover):not([disabled]) {
      background-color: var(--fm-accent) !important; color: var(--fm-on-accent, #fff) !important;
    }
    menupopup :is(menuitem, menu):is([_moz-menuactive]):not([disabled]) :is(.menu-accel, .menu-icon) { color: inherit !important; fill: currentColor !important; }`,
  touch: `
    menupopup::part(content) { border-radius: 30px !important; padding: 10px !important; }
    menupopup :is(menuitem, menu) {
      border-radius: 20px !important; min-height: 48px !important; padding-inline: 18px !important; font-size: 15px !important;
    }
    menupopup :is(menuitem, menu) > .menu-icon { width: 20px !important; height: 20px !important; }`,
  nothing: `
    menupopup::part(content) {
      border-radius: 18px !important; padding: 6px !important;
      background-color: light-dark(#f4f4f4, #0c0c0c) !important; border: 1px solid light-dark(#d6d6d6, #2a2a2a) !important;
    }
    menupopup :is(menuitem, menu) {
      border-radius: 10px !important; font-family: "Cascadia Mono", Consolas, monospace !important;
      font-size: 12.5px !important; letter-spacing: .02em; text-transform: uppercase; position: relative;
    }
    menupopup :is(menuitem, menu):is([_moz-menuactive]):not([disabled]) {
      background-color: light-dark(#e8e8e8, #1c1c1c) !important; color: inherit !important;
    }
    menupopup :is(menuitem, menu):is([_moz-menuactive]):not([disabled])::after {
      content: ""; position: absolute; inset-inline-end: 12px; top: calc(50% - 3px);
      width: 6px; height: 6px; border-radius: 50%; background: #ff2d2d;
    }`,
  neon: `
    menupopup::part(content) {
      border-radius: 18px !important; padding: 6px !important;
      background-color: #0b0d14 !important; color: #e8f6ff !important;
      border: 1px solid color-mix(in srgb, var(--fm-accent) 55%, transparent) !important;
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--fm-accent) 20%, transparent), 0 0 28px color-mix(in srgb, var(--fm-accent) 35%, transparent), 0 18px 50px rgb(0 0 0 / .6) !important;
    }
    menupopup :is(menuitem, menu) { border-radius: 10px !important; color: #e8f6ff !important; }
    menupopup :is(menuitem, menu):is([_moz-menuactive]):not([disabled]) {
      background-color: color-mix(in srgb, var(--fm-accent) 18%, transparent) !important;
      color: #fff !important; text-shadow: 0 0 8px var(--fm-accent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fm-accent) 50%, transparent);
    }
    menupopup menuseparator { border-color: color-mix(in srgb, var(--fm-accent) 30%, transparent) !important; }`,
};

/* Ctrl+Tab: стили */
const CTRLTAB_BASE = `
  /* само окно — прозрачное и без системной тени: иначе вокруг нашего скругления
     виден квадрат, а свечение «Неона» обрезается краем окна */
  #ctrlTab-panel { --panel-padding: 22px 18px 18px !important; font-weight: 600 !important;
    appearance: none !important; background: transparent !important; border: 0 !important;
    --panel-background: transparent; -moz-window-shadow: none !important; }
  #ctrlTab-panel::part(content) { margin: 30px !important; animation: fm-ct-in calc(.42s * var(--fm-k, 1)) var(--fm-spring, ease) both;
    box-shadow: 0 18px 50px rgb(0 0 0 / .45) !important; }
  .ctrlTab-preview { position: relative; }
  .ctrlTab-preview:focus { z-index: 1; }
  /* у Firefox выбранная миниатюра обводится квадратной рамкой фокуса — убираем,
     выделение рисует только наш стиль (иначе получается «рамка в рамке») */
  .ctrlTab-preview, .ctrlTab-preview:is(:focus, :focus-visible, :hover) {
    outline: none !important; border: 0 !important; box-shadow: none !important; background: none !important;
  }
  @keyframes fm-ct-in { from { opacity: 0; scale: .92; } }
  .ctrlTab-preview, #ctrlTab-showAll { text-shadow: none !important; }
  .ctrlTab-preview-inner { transition: scale calc(.3s * var(--fm-k, 1)) var(--fm-spring, ease), background-color .2s ease, border-color .2s ease !important; }
  .ctrlTab-preview:focus > .ctrlTab-preview-inner { scale: 1; }
  .ctrlTab-canvas { box-shadow: 0 6px 18px rgb(0 0 0 / .35) !important; }
  .ctrlTab-favicon[src] { border-radius: 12px !important; border: 0 !important; box-shadow: 0 4px 12px rgb(0 0 0 / .35); }`;
const CTRLTAB_STYLES = {
  ios: `
    #ctrlTab-panel::part(content) {
      background-color: rgb(20 20 24 / .55) !important; backdrop-filter: blur(30px) saturate(1.8) !important;
      border: 1px solid rgb(255 255 255 / .14) !important; border-radius: 34px !important; color: #fff !important;
    }
    .ctrlTab-preview-inner { border-radius: 24px !important; border: 0 !important; padding: 10px !important; }
    .ctrlTab-canvas, .ctrlTab-canvas > :is(img, canvas) { border-radius: 18px !important; overflow: hidden; }
    .ctrlTab-preview:focus > .ctrlTab-preview-inner { background-color: rgb(255 255 255 / .16) !important; }
    #ctrlTab-showAll { border-radius: 999px !important; border: 0 !important; background: rgb(255 255 255 / .14) !important; }`,
  windows: `
    #ctrlTab-panel::part(content) {
      background-color: light-dark(rgb(243 243 243 / .82), rgb(32 32 32 / .82)) !important; backdrop-filter: blur(40px) saturate(1.4) !important;
      border: 1px solid light-dark(rgb(0 0 0 / .1), rgb(255 255 255 / .1)) !important; border-radius: 12px !important;
      color: light-dark(#1b1b1b, #fff) !important;
    }
    .ctrlTab-preview-inner { border-radius: 8px !important; border: 2px solid transparent !important; }
    .ctrlTab-canvas, .ctrlTab-canvas > :is(img, canvas) { border-radius: 6px !important; }
    .ctrlTab-preview:focus > .ctrlTab-preview-inner { background: transparent !important; border-color: light-dark(#1b1b1b, #fff) !important; scale: 1 !important; }
    .ctrlTab-preview-inner { flex-direction: column-reverse !important; }
    .ctrlTab-label { text-align: start !important; font-weight: 500 !important; margin-bottom: 6px; }
    #ctrlTab-showAll { border-radius: 6px !important; border: 0 !important; }`,
  list: `
    #ctrlTab-panel::part(content) {
      background-color: var(--fm-menu, #1c1d20) !important; border: 1px solid var(--fm-line, rgb(255 255 255 / .1)) !important;
      border-radius: 22px !important; color: var(--fm-ink, #fff) !important;
    }
    #ctrlTab-previews { grid-template-columns: 1fr !important; row-gap: 4px !important; min-width: 340px; }
    .ctrlTab-canvas, .ctrlTab-placeholder { display: none !important; }
    .ctrlTab-favicon-container { order: -1; }
    .ctrlTab-favicon[src] { width: 22px !important; height: 22px !important; margin: 0 10px 0 0 !important; padding: 2px !important; box-shadow: none; }
    .ctrlTab-preview-inner { flex-direction: row !important; align-items: center !important; margin: 0 !important; padding: 8px 14px !important; border: 0 !important; border-radius: 14px !important; }
    .ctrlTab-label { text-align: start !important; font-weight: 500 !important; }
    .ctrlTab-preview:focus > .ctrlTab-preview-inner { background-color: var(--fm-soft, rgb(255 255 255 / .12)) !important; scale: 1 !important; }`,
  neon: `
    #ctrlTab-panel::part(content) {
      background-color: rgb(6 8 14 / .92) !important; border: 1px solid color-mix(in srgb, var(--fm-accent) 45%, transparent) !important;
      border-radius: 24px !important; color: #e8f6ff !important;
      box-shadow: 0 0 34px color-mix(in srgb, var(--fm-accent) 35%, transparent) !important;
    }
    .ctrlTab-preview-inner {
      border-radius: 18px !important; border: 1.5px solid transparent !important; background: transparent !important;
      padding: 8px !important; box-shadow: none !important; outline: none !important;
    }
    .ctrlTab-canvas, .ctrlTab-canvas > :is(img, canvas) { border-radius: 12px !important; box-shadow: none !important; border: 0 !important; outline: none !important; }
    .ctrlTab-preview:focus > .ctrlTab-preview-inner {
      background: color-mix(in srgb, var(--fm-accent) 12%, transparent) !important;
      border-color: var(--fm-accent) !important;
      box-shadow: 0 0 18px color-mix(in srgb, var(--fm-accent) 55%, transparent), inset 0 0 12px color-mix(in srgb, var(--fm-accent) 25%, transparent) !important;
    }
    .ctrlTab-preview:focus .ctrlTab-label { text-shadow: 0 0 10px var(--fm-accent) !important; color: #fff !important; }
    #ctrlTab-showAll { border-radius: 999px !important; border: 1px solid color-mix(in srgb, var(--fm-accent) 45%, transparent) !important; background: transparent !important; color: #e8f6ff !important; outline: none !important; }
    #ctrlTab-showAll:is(:focus, :hover) { background: color-mix(in srgb, var(--fm-accent) 16%, transparent) !important; border-color: var(--fm-accent) !important; }`,
};

/* вкладки: форма */
const TAB_SHAPES = {
  pill: ".tabbrowser-tab > .tab-stack > .tab-background { border-radius: 999px !important; }",
  rounded: ".tabbrowser-tab > .tab-stack > .tab-background { border-radius: 10px !important; }",
  square: ".tabbrowser-tab > .tab-stack > .tab-background { border-radius: 2px !important; }",
  underline: `
    .tabbrowser-tab > .tab-stack > .tab-background { border-radius: 0 !important; background: transparent !important; box-shadow: none !important; outline: none !important; }
    .tabbrowser-tab > .tab-stack > .tab-background::after {
      content: ""; position: absolute; inset: auto 22% 2px; height: 3px; border-radius: 3px;
      background: var(--fm-accent); scale: 0 1; transition: scale calc(.35s * var(--fm-k, 1)) var(--fm-spring, ease);
    }
    .tabbrowser-tab > .tab-stack > .tab-background { position: relative; }
    .tabbrowser-tab[selected] > .tab-stack > .tab-background::after { scale: 1 1; }
    /* вертикальные вкладки: полоска слева */
    #tabbrowser-tabs[orient="vertical"] .tabbrowser-tab > .tab-stack > .tab-background::after { inset: 22% auto 22% 3px; width: 3px; height: auto; scale: 1 0; }
    #tabbrowser-tabs[orient="vertical"] .tabbrowser-tab[selected] > .tab-stack > .tab-background::after { scale: 1 1; }`,
  card: `
    .tabbrowser-tab > .tab-stack > .tab-background { border-radius: 10px 10px 0 0 !important; margin-bottom: 0 !important; }`,
  chrome: `
    .tabbrowser-tab > .tab-stack > .tab-background { border-radius: 12px 12px 0 0 !important; margin-block: 4px 0 !important; }
    .tabbrowser-tab[selected] > .tab-stack > .tab-background { background: var(--fm-bar, #2a2b2f) !important; }`,
};
const TAB_SELECTED = {
  soft: `.tabbrowser-tab:is([selected], [multiselected]) > .tab-stack > .tab-background { background: var(--fm-soft) !important; box-shadow: none !important; }
         .tabbrowser-tab[selected] .tab-label { color: var(--fm-accent) !important; }`,
  accent: `.tabbrowser-tab:is([selected], [multiselected]) > .tab-stack > .tab-background { background: var(--fm-accent) !important; box-shadow: 0 4px 14px color-mix(in srgb, var(--fm-accent) 40%, transparent) !important; }
           .tabbrowser-tab[selected] :is(.tab-label, .tab-close-button) { color: var(--fm-on-accent, #fff) !important; fill: currentColor !important; }`,
  outline: `.tabbrowser-tab:is([selected], [multiselected]) > .tab-stack > .tab-background { background: transparent !important; outline: 1.5px solid var(--fm-accent) !important; outline-offset: -1.5px !important; box-shadow: none !important; }
            .tabbrowser-tab[selected] .tab-label { color: var(--fm-accent) !important; }`,
  glass: `.tabbrowser-tab:is([selected], [multiselected]) > .tab-stack > .tab-background {
            background: light-dark(rgb(255 255 255 / .7), rgb(255 255 255 / .1)) !important;
            box-shadow: inset 0 1px 0 light-dark(#fff, rgb(255 255 255 / .2)), 0 4px 14px rgb(0 0 0 / .18) !important;
            backdrop-filter: blur(12px); }
          .tabbrowser-tab[selected] .tab-label { color: inherit !important; }`,
  none: `.tabbrowser-tab:is([selected], [multiselected]) > .tab-stack > .tab-background { background: transparent !important; box-shadow: none !important; outline: none !important; }
         .tabbrowser-tab > .tab-stack > .tab-background::before { display: none !important; }
         .tabbrowser-tab[selected] .tab-label { color: inherit !important; }`,
  contrast: `.tabbrowser-tab:is([selected], [multiselected]) > .tab-stack > .tab-background { background: var(--fm-ink) !important; box-shadow: none !important; }
             .tabbrowser-tab[selected] :is(.tab-label, .tab-close-button) { color: var(--fm-frame, #000) !important; fill: currentColor !important; }`,
};

/* «Без скруглений»: тот же CSS, что в square-chrome.css / square-content.css
   (обновляется командой python3 tools/pack_themes.py) */
// SQUARE-CSS BEGIN
const SQUARE_CHROME = "/* Hand Design: «Без скруглений» — окна браузера (LAYER заменяется на имя слоя) */\n@-moz-document url-prefix(\"chrome://\") {\n@layer LAYER {\n:root, menupopup, panel, tooltip, #urlbar, .urlbarView {\n  --fm-radius: 0px !important; --panel-border-radius: 0px !important; --arrowpanel-border-radius: 0px !important;\n  --menuitem-border-radius: 0px !important; --arrowpanel-menuitem-border-radius: 0px !important;\n  --urlbarview-border-radius: 0px !important; --urlbar-border-radius: 0px !important;\n  --toolbarbutton-border-radius: 0px !important; --tab-border-radius: 0px !important;\n  --border-radius-small: 0px !important; --border-radius-medium: 0px !important;\n  --border-radius-large: 0px !important; --border-radius-xlarge: 0px !important; --button-border-radius: 0px !important;\n}\n:not(#fm-q1#fm-q2#fm-q3):not(radio, checkbox, .radio-check, .checkbox-check, input[type=\"radio\"], input[type=\"checkbox\"], .toggle-button, moz-toggle),\n:not(#fm-q1#fm-q2#fm-q3)::before, :not(#fm-q1#fm-q2#fm-q3)::after { border-radius: 0 !important; }\n:not(#fm-q1#fm-q2#fm-q3):is(menupopup, panel, tooltip)::part(content) { border-radius: 0 !important; }\n/* части внутри элементов (кнопки боковой панели, поля, меню новых версий Firefox) */\n:not(#fm-q1#fm-q2#fm-q3)::part(button), :not(#fm-q1#fm-q2#fm-q3)::part(content), :not(#fm-q1#fm-q2#fm-q3)::part(arrowscrollbox),\n:not(#fm-q1#fm-q2#fm-q3)::part(input), :not(#fm-q1#fm-q2#fm-q3)::part(label), :not(#fm-q1#fm-q2#fm-q3)::part(icon) { border-radius: 0 !important; }\n:is(menupopup, panel, tooltip, #sidebar-main, sidebar-main) { --panel-border-radius: 0px !important; --border-radius-circle: 0px !important; }\n#tabbrowser-tabpanels .browserContainer, #tabbrowser-tabbox, #browser, #sidebar-box, #sidebar-main { border-radius: 0 !important; }\n}\n}\n";
const SQUARE_CONTENT = "/* Hand Design: «Без скруглений» — страницы браузера, новая вкладка, PDF (LAYER заменяется на имя слоя) */\n@-moz-document url-prefix(\"about:\"), url-prefix(\"chrome://\"), url-prefix(\"resource://\") {\n@layer LAYER {\n:root {\n  --fm-radius: 0px !important; --x-radius: 0px !important; --card-border-radius: 0px !important;\n  --box-border-radius: 0px !important; --button-border-radius: 0px !important; --input-text-border-radius: 0px !important;\n  --select-border-radius: 0px !important; --page-nav-button-border-radius: 0px !important;\n  --border-radius-small: 0px !important; --border-radius-medium: 0px !important;\n  --border-radius-large: 0px !important; --border-radius-xlarge: 0px !important;\n}\n:not(#fm-q1#fm-q2#fm-q3):not(input[type=\"radio\"], input[type=\"checkbox\"], .toggle-button),\n:not(#fm-q1#fm-q2#fm-q3)::before, :not(#fm-q1#fm-q2#fm-q3)::after { border-radius: 0 !important; }\n}\n}\n@layer LAYER {\n:root:has(#outerContainer #viewerContainer) { --x-radius: 0px !important; }\n:root:has(#outerContainer #viewerContainer) :not(#fm-q1#fm-q2#fm-q3),\n:root:has(#outerContainer #viewerContainer) :not(#fm-q1#fm-q2#fm-q3)::before,\n:root:has(#outerContainer #viewerContainer) :not(#fm-q1#fm-q2#fm-q3)::after { border-radius: 0 !important; }\n}\n";
// SQUARE-CSS END

const px = n => `${n}px`;
const TILE_SEL = "#appMenu-new-tab-button2, #appMenu-new-window-button2, #appMenu-new-classic-window-button, #appMenu-new-private-window-button2, #appMenu-history-button, #appMenu-bookmarks-button, #appMenu-downloads-button, #appMenu-passwords-button, #appMenu-extensions-themes-button, #appMenu-unified-extensions-button, #appMenu-print-button2, #appMenu-save-file-button2, #appMenu-translate-button, #appMenu-find-button2, #appMenu-settings-button, #appMenu-more-button2, #appMenu-help-button2, #appMenu-profiles-button, #appMenu-create-profile-button, #appMenu-tab-groups-button, #appMenu-quit-button2, #appMenu-fullscreen-button2";

/* Слои CSS (@layer) внутри @-moz-document браузер учитывает не всегда, и тогда правила
   темы с более «сильными» селекторами перебивали Studio (особенно iOS — у неё правил больше всего).
   Поэтому каждый селектор Studio дополнительно усиливаем: :not(#a#b#c#d) добавляет вес четырёх id,
   больше, чем у любого правила темы. */
const BOOST = ":not(#fm-s1#fm-s2#fm-s3#fm-s4)";
function boostSelector(sel) {
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of sel) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map(x => {
    const t = x.trim();
    if (!t) return t;
    if (t.startsWith(":root")) return ":root" + BOOST + t.slice(5);
    if (/^html(?![\w-])/.test(t)) return ":root" + BOOST + t.slice(4);
    return ":root" + BOOST + " " + t;
  }).join(", ");
}
export function boost(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = "", i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) {
      out += css.slice(i);
      break;
    }
    let depth = 1, j = open + 1;
    while (j < css.length && depth) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const prelude = css.slice(i, open).trim();
    const body = css.slice(open + 1, j - 1);
    out += (prelude.startsWith("@") ? prelude : boostSelector(prelude)) + " {" + body + "}\n";
    i = j;
  }
  return out;
}

/* В новых версиях Firefox у меню и панелей нет внутренней части ::part(content) —
   фон, скругление и отступы берутся из переменных --panel-* самого меню.
   Поэтому к каждому правилу с ::part(content) добавляем такое же правило-переменные. */
const PART_VARS = {
  "border-radius": "--panel-border-radius",
  "padding": "--panel-padding",
  "background-color": "--panel-background",
  "background": "--panel-background",
  "color": "--panel-color",
  "box-shadow": "--panel-shadow",
};
function withPanelVars(css) {
  return css.replace(/([^{}]*?)::part\(content\)([^{}]*?)\{([^{}]*)\}/g, (all, before, after, body) => {
    const vars = [];
    for (const decl of body.split(";")) {
      const m = /^\s*([a-z-]+)\s*:\s*([\s\S]+?)\s*$/.exec(decl);
      if (m && PART_VARS[m[1]]) {
        vars.push(`${PART_VARS[m[1]]}: ${m[2].replace(/\s*!important/, "")} !important;`);
      }
      const b = /^\s*border\s*:\s*\S+\s+\S+\s+([\s\S]+?)\s*(!important)?\s*$/.exec(decl);
      if (b) {
        vars.push(`--panel-border-color: ${b[1]} !important;`);
      }
    }
    if (!vars.length || after.trim()) {
      return all;
    }
    return `${all}\n${before.trim()} { ${vars.join(" ")} }`;
  });
}

/* собрать CSS из настроек */
export function buildCss(cfgRaw) {
  const c = sanitize(cfgRaw);
  const has = k => c[k] !== undefined;
  const root = [];
  const chrome = [];
  const newtab = [];

  // «Детали тем»: особенности окна и новой вкладки из любой темы (по умолчанию — из текущей)
  let theme = "oneui";
  try {
    theme = Services.prefs.getStringPref("floorp.modern.theme", "oneui");
  } catch (e) {}
  const detail = (key, part) => (c[key] === "none" ? "" : PARTS[part][c[key] || theme] || "");
  chrome.push(detail("dWindow", "window"));
  newtab.push(detail("dWall", "wall"), detail("dClock", "clock"), detail("dSearch", "search"));

  // ---- цвета и общие переменные (действуют и в окне, и на новой вкладке)
  if (has("accent")) {
    const r = parseInt(c.accent.slice(1, 3), 16), g = parseInt(c.accent.slice(3, 5), 16), b = parseInt(c.accent.slice(5, 7), 16);
    const on = 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#000000" : "#ffffff";
    root.push(`--fm-user-accent: ${c.accent} !important; --fm-user-on-accent: ${on} !important;`);
  }
  if (has("onAccent")) {
    root.push(`--fm-user-on-accent: ${c.onAccent} !important; --fm-on-accent: ${c.onAccent} !important; --button-text-color-primary: ${c.onAccent} !important;`);
  }
  for (const [key, prop] of [["field", "--fm-field"], ["muted", "--fm-muted"], ["line", "--fm-line"]]) {
    if (has(key)) {
      root.push(`${prop}: ${c[key]} !important;`);
    }
  }
  for (const [key, prop, pct] of [["hover", "--fm-hover", 12], ["press", "--fm-press", 20], ["soft", "--fm-soft", 24]]) {
    if (has(key)) {
      root.push(`${prop}: color-mix(in srgb, ${c[key]} ${pct}%, transparent) !important;`);
    }
  }
  if (has("toggle")) {
    root.push(`--toggle-background-color-pressed: ${c.toggle} !important;`);
    chrome.push(`moz-toggle { --toggle-background-color-pressed: ${c.toggle} !important; }`);
  }
  if (has("speed")) {
    root.push(`--fm-k: ${c.speed} !important;`);
  }
  if (has("bounce")) {
    root.push(`--fm-spring: ${SPRINGS[c.bounce][0]} !important; --fm-ease: ${SPRINGS[c.bounce][1]} !important;`);
  }
  let fontStack = null;
  if (has("font")) {
    fontStack = c.font === "custom" ? (has("fontCustom") ? `"${c.fontCustom}", "Segoe UI", sans-serif` : null) : FONTS[c.font];
  }

  // ---- окно браузера
  const v = [];
  if (has("frame")) {
    v.push(`--fm-frame: ${c.frame} !important; --toolbox-background-color: ${c.frame} !important; --toolbox-background-color-inactive: ${c.frame} !important; --toolbar-background-color: ${c.frame} !important; --toolbar-bgcolor: ${c.frame} !important; --sidebar-background-color: ${c.frame} !important;`);
    chrome.push(`:is(#navigator-toolbox, #nav-bar, #PersonalToolbar, #TabsToolbar, #browser, #sidebar-main, #sidebar-box, #panel-sidebar-select-box) { background-color: ${c.frame} !important; }`);
    chrome.push(`body, #navigator-toolbox { background-image: none !important; }`);
  }
  if (has("bar")) {
    v.push(`--fm-bar: ${c.bar} !important; --fm-field: ${c.field || c.bar} !important; --toolbar-field-background-color: ${c.bar} !important; --urlbar-background-color: ${c.bar} !important;`);
  }
  if (has("ink")) {
    v.push(`--fm-ink: ${c.ink} !important; --toolbar-color: ${c.ink} !important; --toolbox-text-color: ${c.ink} !important; --toolbarbutton-icon-fill: ${c.ink} !important;`);
    chrome.push(`:is(#navigator-toolbox, #sidebar-main) { color: ${c.ink} !important; }`);
  }
  if (has("radius")) {
    v.push(`--fm-radius: ${px(c.radius)} !important;`);
    chrome.push(`#tabbrowser-tabpanels .browserContainer { border-radius: ${px(c.radius)} !important; }`);
  }
  if (has("gap")) {
    v.push(`--fm-gap: ${px(c.gap)} !important;`);
    chrome.push(`:root:not([inDOMFullscreen], [inFullscreen]) #tabbrowser-tabbox { padding: 0 ${px(c.gap)} ${px(c.gap)} !important; }`);
  }
  if (has("pageShadow")) {
    const a = c.pageShadow / 100;
    chrome.push(`#tabbrowser-tabpanels .browserContainer { box-shadow: 0 1px 3px rgb(0 0 0 / ${(a * 0.4).toFixed(2)}), 0 12px 34px rgb(0 0 0 / ${(a * 0.45).toFixed(2)}) !important; }`);
  }
  if (v.length) {
    chrome.push(`:root, menupopup, panel, tooltip, #urlbar, .urlbarView { ${v.join(" ")} }`);
  }

  // меню и панели
  const menuVars = [];
  if (has("menuBg")) {
    menuVars.push(`--fm-menu: ${c.menuBg} !important; --panel-background: ${c.menuBg} !important; --arrowpanel-background: ${c.menuBg} !important; --panel-background-color: ${c.menuBg} !important; --menu-background-color: ${c.menuBg} !important;`);
  }
  if (menuVars.length) {
    chrome.push(`:root, menupopup, panel, tooltip { ${menuVars.join(" ")} }`);
  }
  if (has("menuStyle")) {
    chrome.push(MENU_STYLES[c.menuStyle]);
  }
  if (has("menuAlpha") && c.menuAlpha > 0) {
    chrome.push(`:is(menupopup, panel[type="arrow"])::part(content) { background-color: color-mix(in srgb, var(--fm-menu, #1c1d20) ${100 - c.menuAlpha}%, transparent) !important; }`);
  }
  if (has("menuBlur") && c.menuBlur > 0) {
    chrome.push(`:is(menupopup, panel[type="arrow"])::part(content) { backdrop-filter: blur(${px(c.menuBlur)}) saturate(1.6) !important; }`);
  }
  if (has("menuRadius")) {
    chrome.push(`:is(menupopup, panel)::part(content) { border-radius: ${px(c.menuRadius)} !important; }`);
    chrome.push(`menupopup :is(menuitem, menu), .subviewbutton { border-radius: ${px(Math.max(0, Math.round(c.menuRadius * 0.6)))} !important; }`);
  }
  if (has("menuItemRadius")) {
    chrome.push(`:root, menupopup, panel { --menuitem-border-radius: ${px(c.menuItemRadius)} !important; --arrowpanel-menuitem-border-radius: ${px(c.menuItemRadius)} !important; }`);
    chrome.push(`menupopup :is(menuitem, menu), .subviewbutton { border-radius: ${px(c.menuItemRadius)} !important; }`);
  }
  if (has("tileShape") || has("tileColor")) {
    const tile = `#appMenu-mainView .subviewbutton:is(${TILE_SEL}) > .toolbarbutton-icon`;
    if (c.tileShape === "none") {
      chrome.push(`${tile} { background: transparent !important; box-shadow: none !important; }`);
    } else {
      if (has("tileShape")) {
        chrome.push(`${tile} { border-radius: ${{ circle: "50%", rounded: "10px", square: "3px" }[c.tileShape]} !important; }`);
      }
      if (has("tileColor")) {
        chrome.push(`${tile} { background: ${c.tileColor} !important; }`);
      }
    }
  }
  if (has("menuItemHeight")) {
    chrome.push(`menupopup :is(menuitem, menu) { min-height: ${px(c.menuItemHeight)} !important; padding-block: 0 !important; }`);
  }
  if (has("menuFont")) {
    chrome.push(`menupopup :is(menuitem, menu) { font-size: ${px(c.menuFont)} !important; }`);
  }
  if (c.menuIcons === false) {
    chrome.push(`menupopup :is(menuitem, menu) > .menu-icon, menupopup :is(menuitem, menu):not([type])::before { display: none !important; }`);
  }

  if (c.tabPreview === "compact") {
    chrome.push(`#tab-preview-panel { --panel-width: 260px !important; } #tab-preview-panel .tab-preview-thumbnail-container { display: none !important; } #tab-preview-panel .tab-preview-text-container { margin: 4px 8px !important; }`);
  } else if (c.tabPreview === "wide") {
    chrome.push(`#tab-preview-panel { --panel-width: 420px !important; } #tab-preview-panel .tab-preview-title { font-size: 14px !important; }`);
  }

  // Ctrl+Tab
  if (has("ctrlTabStyle")) {
    chrome.push(CTRLTAB_BASE, CTRLTAB_STYLES[c.ctrlTabStyle]);
  }

  // кнопки
  if (has("buttonShape")) {
    const r = { round: "999px", rounded: "10px", square: "3px" }[c.buttonShape];
    v.push(`--toolbarbutton-border-radius: ${r} !important;`);
    chrome.push(`:root { --toolbarbutton-border-radius: ${r} !important; }`);
    chrome.push(`toolbar .toolbarbutton-1 > :is(.toolbarbutton-icon, .toolbarbutton-badge-stack, .toolbarbutton-text) { border-radius: ${r} !important; }`);
  }
  if (has("density")) {
    const pad = { compact: "6px", normal: "8px", touch: "11px" }[c.density];
    chrome.push(`:root { --toolbarbutton-inner-padding: ${pad} !important; --toolbarbutton-padding-inner: ${pad} !important; }`);
    chrome.push(`toolbar .toolbarbutton-1 > :is(.toolbarbutton-icon, .toolbarbutton-badge-stack) { padding: ${pad} !important; }`);
    chrome.push(`#nav-bar { padding-block: ${c.density === "compact" ? "1px" : c.density === "touch" ? "7px" : "4px"} !important; }`);
  }

  // вкладки
  if (has("tabShape")) {
    chrome.push(TAB_SHAPES[c.tabShape]);
  }
  if (has("tabSelected")) {
    chrome.push(TAB_SELECTED[c.tabSelected]);
  }
  if (has("tabHeight")) {
    chrome.push(`:root { --tab-min-height: ${px(c.tabHeight)} !important; }`);
    chrome.push(`.tabbrowser-tab { min-height: ${px(c.tabHeight)} !important; } .tab-content { min-height: ${px(c.tabHeight)} !important; }`);
  }
  if (has("tabMinWidth")) {
    chrome.push(`:root { --tab-min-width: ${px(c.tabMinWidth)} !important; } .tabbrowser-tab:not([pinned]) { min-width: ${px(c.tabMinWidth)} !important; }`);
  }
  if (has("tabClose")) {
    if (c.tabClose === "never") {
      chrome.push(`.tabbrowser-tab:not([pinned]) .tab-close-button { display: none !important; }`);
    } else if (c.tabClose === "hover") {
      chrome.push(`.tabbrowser-tab:not([pinned]):not(:hover) .tab-close-button { display: none !important; }`);
    } else {
      chrome.push(`.tabbrowser-tab:not([pinned]) .tab-close-button { display: flex !important; }`);
    }
  }
  if (has("tabWeight")) {
    chrome.push(`.tabbrowser-tab .tab-label, .tabbrowser-tab[selected] .tab-label { font-weight: ${c.tabWeight} !important; }`);
  }

  // вкладки спрятаны: боковая панель вкладок становится «шторкой» поверх страницы,
  // верхний ряд вкладок сворачивается и появляется при наведении на панель
  if (has("tabsHide")) {
    const V = '#browser > :has(#tabbrowser-tabs[orient="vertical"])';
    const edge = c.tabsHide === "edge";
    chrome.push(`#browser { position: relative !important; }`);
    chrome.push(`:root:not([customizing]) ${V} {
      position: absolute !important; inset-block: 0 !important; inset-inline-start: 0 !important; z-index: 30 !important;
      translate: ${edge ? "calc(-100% + 8px)" : "-100%"} 0; opacity: 0;
      ${edge ? "" : "visibility: hidden;"}
      background-color: var(--fm-frame, var(--toolbox-background-color, Canvas)) !important;
      box-shadow: 10px 0 34px rgb(0 0 0 / .32) !important;
      transition: translate calc(.38s * var(--fm-k, 1)) var(--fm-spring, ease), opacity .2s ease, visibility 0s .38s !important; }`);
    chrome.push(`:root:not([customizing]) ${V}:is(:hover, :focus-within, [fm-open]), :root[fm-tabs-peek] ${V} {
      translate: 0 0; opacity: 1; visibility: visible; transition: translate calc(.38s * var(--fm-k, 1)) var(--fm-spring, ease), opacity .15s ease !important; }`);
    chrome.push(`:root:not([customizing]) #sidebar-launcher-splitter { display: none !important; }`);
    chrome.push(`:root:not([customizing]):not([fm-tabs-peek]) #navigator-toolbox:not(:hover, :focus-within) #TabsToolbar:has(#tabbrowser-tabs:not([orient="vertical"])) { visibility: collapse !important; }`);
  }

  // адресная строка
  if (has("urlHeight")) {
    chrome.push(`#urlbar { --urlbar-min-height: ${px(c.urlHeight)} !important; --urlbar-height: ${px(c.urlHeight)} !important; }`);
    chrome.push(`#urlbar-container { --urlbar-container-height: ${px(c.urlHeight + 8)} !important; }`);
  }
  if (has("urlRadius")) {
    chrome.push(`#urlbar { --urlbar-border-radius: ${px(c.urlRadius)} !important; --toolbarbutton-border-radius: ${px(c.urlRadius)}; }`);
    chrome.push(`#urlbar > :is(#urlbar-background, .urlbar-background), .urlbar > .urlbar-background { border-radius: ${px(c.urlRadius)} !important; }`);
  }
  if (has("urlAlign")) {
    chrome.push(`#urlbar:not([focused], [open]) #urlbar-input, moz-urlbar:not([focused], [open]) .urlbar-input { text-align: ${c.urlAlign} !important; }`);
  }
  if (has("urlBorder")) {
    if (c.urlBorder === "none") {
      chrome.push(`#urlbar > :is(#urlbar-background, .urlbar-background), .urlbar > .urlbar-background { outline: none !important; box-shadow: none !important; }`);
    } else if (c.urlBorder === "line") {
      chrome.push(`#urlbar > :is(#urlbar-background, .urlbar-background), .urlbar > .urlbar-background { outline: 1px solid var(--fm-line, rgb(128 128 128 / .3)) !important; outline-offset: -1px !important; box-shadow: none !important; }`);
      chrome.push(`#urlbar:is([focused], [open]) > :is(#urlbar-background, .urlbar-background) { outline: 1.5px solid var(--fm-accent) !important; }`);
    } else {
      chrome.push(`#urlbar > :is(#urlbar-background, .urlbar-background) { box-shadow: 0 0 18px color-mix(in srgb, var(--fm-accent) 30%, transparent) !important; }`);
    }
  }

  // шрифт
  if (fontStack) {
    chrome.push(`#navigator-toolbox, #sidebar-main, #panel-sidebar-select-box, menupopup, panel, tooltip, .tabbrowser-tab, #urlbar { font-family: ${fontStack} !important; }`);
  }
  if (has("fontSize")) {
    chrome.push(`#navigator-toolbox, menupopup, panel, #sidebar-main { font-size: ${px(c.fontSize)} !important; } .tabbrowser-tab .tab-label, #urlbar-input, .urlbar-input { font-size: ${px(c.fontSize)} !important; }`);
  }

  // показать / скрыть
  const hide = (key, sel) => {
    if (c[key] === false) {
      chrome.push(`${sel} { display: none !important; }`);
    }
  };
  hide("showBookmarks", "#PersonalToolbar");
  hide("showSidebarButton", "#sidebar-button");
  hide("showTabList", "#alltabs-button");
  hide("showNewTabButton", ":is(#new-tab-button, #tabs-newtab-button, #vertical-tabs-newtab-button)");
  hide("showExtensions", "#unified-extensions-button");
  hide("showNowBar", ".fm-nowbar");
  hide("showCallBar", ".fm-callbar");
  hide("showProgress", ".fm-progress");
  if (c.showBookmarks === true) {
    chrome.push(`#PersonalToolbar[collapsed] { visibility: visible !important; }`);
  }

  // ---- новая вкладка
  const CLOCK = ".absolute.top-4.right-4";
  if (has("clockSize")) {
    newtab.push(`${CLOCK} .tabular-nums { font-size: ${px(c.clockSize)} !important; line-height: 1 !important; }`);
  }
  if (has("clockWeight")) {
    newtab.push(`${CLOCK} .tabular-nums { font-weight: ${c.clockWeight} !important; }`);
  }
  if (has("clockFont")) {
    const f = c.clockFont === "ui" ? (fontStack || FONTS.segoe) : CLOCK_FONTS[c.clockFont];
    newtab.push(`${CLOCK}, ${CLOCK} .tabular-nums { font-family: ${f} !important; }`);
  }
  if (has("clockPos")) {
    if (c.clockPos === "hidden") {
      newtab.push(`${CLOCK} { display: none !important; } :root:has(#fm-clock) :is(.outer-wrapper, .nova-outer-wrapper) { padding-top: revert !important; }`);
    } else if (c.clockPos === "center") {
      newtab.push(`${CLOCK} { top: 26vh !important; }`);
      newtab.push(`.w-full.min-h-screen.flex.flex-col.justify-center.items-center { padding-top: 40vh !important; } :root:has(#fm-clock) :is(.outer-wrapper, .nova-outer-wrapper) { padding-top: 50vh !important; }`);
    } else {
      newtab.push(`${CLOCK} { top: 8vh !important; }`);
    }
  }
  if (c.showDate === false) {
    newtab.push(`${CLOCK} .flex-col.text-right { display: none !important; }`);
  }
  if (has("searchWidth")) {
    newtab.push(`:is(.group.cursor-pointer:has(input[readonly]), .search-wrapper .search-inner-wrapper) { width: ${c.searchWidth}vw !important; max-width: ${c.searchWidth}vw !important; }`);
    newtab.push(`.search-wrapper { width: auto !important; max-width: none !important; }`);
  }
  if (c.tiles === false) {
    newtab.push(`:is(.inline-block.backdrop-blur-sm.p-3, .top-sites, .top-sites-list) { display: none !important; }`);
  }
  if (has("wallBlur") && c.wallBlur > 0) {
    newtab.push(`#fm-wall { filter: blur(${px(c.wallBlur)}); inset: -${px(c.wallBlur * 2)} !important; }`);
  }

  // без @layer: в окне браузера слой проигрывает !important темы, поэтому boost()
  const out = ["/* Hand Design Studio — собрано автоматически */", "@layer fm-studio, fm-settings;"];
  const R = root.length ? `:root, menupopup, panel, tooltip, #urlbar, .urlbarView { ${root.join(" ")} }` : "";
  out.push(`@-moz-document url("chrome://browser/content/browser.xhtml") {\n${boost(R + "\n:root { --fm-studio-ok: 1 !important; }\n" + withPanelVars(chrome.join("\n")))}\n}`);
  out.push(`@-moz-document url("about:newtab"), url("about:home"), url-prefix("chrome://noraneko-newtab/") {\n${boost(R + "\n" + newtab.join("\n"))}\n}`);
  if (R) {
    // PDF и встроенные страницы тоже берут акцент и скорость анимаций
    out.push(`@-moz-document url-prefix("resource://pdf.js/"), url-prefix("about:"), url-prefix("resource://handdesign/"), url-prefix("chrome://fmstudio/") {\n${boost(R)}\n}`);
  }
  const pdfVars = [];
  for (const [key, prop] of [["pdfBar", "--x-bar"], ["pdfWell", "--x-well"]]) {
    if (has(key)) {
      pdfVars.push(`${prop}: ${c[key]} !important;`);
    }
  }
  if (pdfVars.length) {
    out.push(`@-moz-document url-prefix("resource://pdf.js/") {\n${boost(`:root:has(#outerContainer #viewerContainer) { ${pdfVars.join(" ")} }`)}\n}`);
  }
  if (c.square === true) {
    out.push(SQUARE_CHROME.replaceAll("@layer LAYER", "@media all"));
    out.push(SQUARE_CONTENT.replaceAll("@layer LAYER", "@media all"));
  }
  return out.join("\n\n");
}

/* ---------------- подключение к браузеру ---------------- */
let registered = null;
let started = false;

function sss() {
  return Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
}

export function version() {
  return APP_VERSION;
}

export function readConfig() {
  try {
    return sanitize(JSON.parse(Services.prefs.getStringPref(PREF, "{}")));
  } catch (e) {
    return {};
  }
}

let lastCss = "";
export function currentSheet() {
  return registered ? registered.spec : "";
}
export function hasConfig() {
  return Object.keys(readConfig()).length > 0;
}

function apply() {
  const s = sss();
  if (registered && s.sheetRegistered(registered, s.USER_SHEET)) {
    s.unregisterSheet(registered, s.USER_SHEET);
  }
  registered = null;
  const cfg = readConfig();
  lastCss = buildCss(cfg);
  // копия собранного CSS — для проверки, что именно применилось
  try {
    const dir = PathUtils.join(Services.dirsvc.get("UChrm", Ci.nsIFile).path, "pdf-tweaks");
    IOUtils.writeUTF8(PathUtils.join(dir, "fm-studio.css"), lastCss || "/* Studio: всё как в теме */").catch(() => {});
  } catch (e) {}
  if (!lastCss) {
    return;
  }
  registered = Services.io.newURI("data:text/css;charset=utf-8," + encodeURIComponent(lastCss));
  s.loadAndRegisterSheet(registered, s.USER_SHEET);
}

/* сохранить настройки (вызывает родительский актор) */
export function save(raw) {
  const cfg = sanitize(raw);
  Services.prefs.setStringPref(PREF, JSON.stringify(cfg));
  // Ctrl+Tab с превью — это настройка самого браузера
  if (cfg.ctrlTabPreview !== undefined) {
    Services.prefs.setBoolPref("browser.ctrlTab.sortByRecentlyUsed", cfg.ctrlTabPreview);
  }
  // просмотрщик PDF читает свои настройки сам; оформление и цвет страниц — его собственные prefs
  if (cfg.pdfUi !== undefined) {
    Services.prefs.setStringPref("floorp.pdftweaks.ui", cfg.pdfUi);
  }
  if (cfg.pdfPage !== undefined) {
    Services.prefs.setStringPref("floorp.pdftweaks.page", cfg.pdfPage);
  }
  if (cfg.density !== undefined) {
    Services.prefs.setIntPref("browser.uidensity", { normal: 0, compact: 1, touch: 2 }[cfg.density]);
  }
  if (cfg.showBookmarks !== undefined) {
    Services.prefs.setStringPref("browser.toolbars.bookmarks.visibility", cfg.showBookmarks ? "always" : "never");
  }
  return cfg;
}

export function init() {
  if (started) {
    return;
  }
  started = true;
  // настоящая версия — в настройку (её читают страница Studio и журналы)
  try {
    Services.prefs.setStringPref("floorp.modern.version", APP_VERSION);
  } catch (e) {}
  // сброс настроек, испорченных восстановлением вкладки Studio в 1.13.0–1.13.3
  try {
    const c = readConfig();
    if (c.accent === "#808080" && c.frame === "#808080" && c.ink === "#808080") {
      Services.prefs.setStringPref(PREF, "{}");
    }
  } catch (e) {}
  try {
    apply();
  } catch (e) {
    console.error("[floorp-modern] studio:", e);
  }
  const reapply = () => {
    try {
      apply();
    } catch (e) {
      console.error("[floorp-modern] studio:", e);
    }
  };
  Services.prefs.addObserver(PREF, reapply);
  Services.prefs.addObserver("floorp.modern.theme", reapply);
}
