/* Обои новой вкладки — те же ключи и картинки, что в Firefox-версии (WALLS в FloorpPdfTweaksChild.sys.mjs).
   Ключи понимает установщик (параметр -Wall). */
export const WALLS = [
  ["aurora", "Аврора", "Aurora", "radial-gradient(40% 50% at 22% 28%, rgb(107 77 255 / .9), transparent 70%), radial-gradient(36% 44% at 78% 22%, rgb(180 77 255 / .7), transparent 70%), radial-gradient(42% 52% at 62% 82%, rgb(0 180 255 / .55), transparent 70%), radial-gradient(30% 36% at 18% 86%, rgb(255 80 170 / .4), transparent 70%), #05060c"],
  ["iris", "Ирис", "Iris", "radial-gradient(60% 55% at 18% 18%, #409cff, transparent 62%), radial-gradient(55% 60% at 85% 30%, #7a3cc8, transparent 65%), radial-gradient(60% 55% at 55% 95%, #ff5c8c, transparent 65%), #0a0b2a"],
  ["sunset", "Закат", "Sunset", "radial-gradient(70% 60% at 50% 100%, #ffb36b, transparent 70%), linear-gradient(170deg, #2b1055 0%, #7a2a7a 45%, #ff7e5f 80%, #feb47b 100%)"],
  ["ocean", "Океан", "Ocean", "radial-gradient(60% 50% at 30% 20%, rgb(0 198 255 / .85), transparent 65%), linear-gradient(180deg, #0072ff 0%, #023a7a 55%, #021b3a 100%)"],
  ["forest", "Лес", "Forest", "radial-gradient(55% 50% at 75% 15%, rgb(168 224 99 / .55), transparent 65%), linear-gradient(160deg, #2f8f5b 0%, #145a3c 45%, #0b2e22 100%)"],
  ["night", "Ночь", "Night", "radial-gradient(50% 40% at 70% 20%, rgb(120 160 255 / .25), transparent 70%), linear-gradient(180deg, #0f2027, #203a43 55%, #2c5364)"],
  ["rose", "Пудра", "Rose", "radial-gradient(60% 60% at 20% 20%, #fbd3e0, transparent 70%), linear-gradient(135deg, #f9c5d1 0%, #c7b5f0 55%, #9795ef 100%)"],
  ["graphite", "Графит", "Graphite", "radial-gradient(70% 60% at 50% 0%, #4a4d55, transparent 70%), linear-gradient(180deg, #2a2c31, #141518)"],
  ["bloom", "Bloom", "Bloom", "radial-gradient(45% 55% at 52% 60%, rgb(120 170 255 / .95), transparent 62%), radial-gradient(35% 40% at 40% 50%, rgb(40 100 230 / .95), transparent 70%), #0b1a3a"],
  ["dune", "Дюна", "Dune", "radial-gradient(60% 45% at 70% 25%, rgb(255 214 150 / .8), transparent 70%), linear-gradient(170deg, #c07a3a 0%, #6b3f22 55%, #2a1810 100%)"],
];
// светлые обои: часы и поиск на них — тёмные
export const LIGHT_WALLS = new Set(["rose"]);
