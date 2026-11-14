/* Сгенерировано tools/gen_chrome_themes.py из палитр Firefox-версии — не править руками. */
export const GROUPS = [["all", "Все", "All"], ["dark", "Тёмные", "Dark"], ["light", "Светлые", "Light"], ["glass", "Стекло", "Glass"], ["bright", "Яркие", "Bright"], ["strict", "Строгие", "Strict"], ["retro", "Ретро", "Retro"]];
export const THEMES = [
 {
  "id": "oneui",
  "name": "One UI",
  "groups": [
   "dark"
  ],
  "scheme": "both",
  "swatch": [
   "#0f1012",
   "#1c1d21",
   "#3e91ff",
   "#f2f3f5"
  ],
  "accentDefault": "#4C9AFF",
  "glass": false,
  "live": true,
  "vars": {
   "accent": "light-dark(var(--hd-ua, var(--hd-sys-accent)), color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 62%, white))",
   "on_accent": "light-dark(#ffffff, color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 22%, black))",
   "frame": "light-dark(#f2f3f5, #000000)",
   "bar": "light-dark(#ffffff, #17181a)",
   "field": "light-dark(#ffffff, #1f2022)",
   "menu": "light-dark(rgb(255 255 255 / .96), rgb(36 37 40 / .96))",
   "ink": "light-dark(#111214, #f2f2f3)",
   "muted": "light-dark(#6b6f76, #9a9da3)",
   "line": "light-dark(rgb(0 0 0 / .07), rgb(255 255 255 / .07))",
   "hover": "light-dark(rgb(0 0 0 / .05), rgb(255 255 255 / .08))",
   "press": "light-dark(rgb(0 0 0 / .10), rgb(255 255 255 / .14))"
  },
  "radius": "22px",
  "rItem": "14px",
  "rTab": "999px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#04050a",
  "wall": "radial-gradient(38% 46% at 22% 28%, color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 92%, transparent), transparent 70%), radial-gradient(34% 42% at 78% 22%, rgb(150 90 255 / .72), transparent 70%), radial-gradient(40% 50% at 62% 82%, rgb(0 200 255 / .5), transparent 70%), radial-gradient(30% 36% at 18% 86%, rgb(255 80 170 / .38), transparent 70%), #04050a",
  "clock": {
   "weight": "300",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#ffffff",
   "spacing": "0",
   "shadow": "0 4px 40px rgb(0 0 0 / .35)"
  },
  "date": {
   "color": "rgb(255 255 255 / .8)",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "999px",
   "bg": "rgb(255 255 255 / .12)",
   "border": "1px solid rgb(255 255 255 / .16)",
   "blur": "blur(22px) saturate(1.5)",
   "shadow": "0 16px 40px rgb(0 0 0 / .35)"
  }
 },
 {
  "id": "ios",
  "name": "iOS Liquid Glass",
  "groups": [
   "glass",
   "light",
   "dark"
  ],
  "scheme": "both",
  "swatch": [
   "#05060b",
   "#1c1c1e",
   "#0a84ff",
   "#ffffff"
  ],
  "accentDefault": "#007AFF",
  "glass": true,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, light-dark(#007AFF, #0A84FF))",
   "on_accent": "#ffffff",
   "frame": "light-dark(#e9eef8, #05060b)",
   "bar": "light-dark(rgb(255 255 255 / .72), rgb(28 28 30 / .72))",
   "field": "light-dark(rgb(255 255 255 / .85), rgb(44 44 46 / .8))",
   "menu": "light-dark(rgb(255 255 255 / .72), rgb(30 30 32 / .66))",
   "ink": "light-dark(#000000, #ffffff)",
   "muted": "light-dark(rgb(60 60 67 / .6), rgb(235 235 245 / .6))",
   "line": "light-dark(rgb(0 0 0 / .08), rgb(255 255 255 / .12))",
   "hover": "light-dark(rgb(0 0 0 / .05), rgb(255 255 255 / .09))",
   "press": "light-dark(rgb(0 0 0 / .1), rgb(255 255 255 / .16))"
  },
  "radius": "26px",
  "rItem": "12px",
  "rTab": "999px",
  "rBtn": "999px",
  "font": "\"SF Pro Display\", \"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#050611",
  "wall": "radial-gradient(60% 55% at 18% 18%, rgb(64 156 255 / .95), transparent 62%), radial-gradient(55% 60% at 88% 12%, rgb(120 86 255 / .9), transparent 64%), radial-gradient(70% 55% at 75% 95%, rgb(255 92 140 / .75), transparent 62%), radial-gradient(45% 45% at 8% 92%, rgb(255 170 90 / .55), transparent 66%), radial-gradient(45% 40% at 50% 58%, rgb(70 80 220 / .55), transparent 70%), #070a24",
  "clock": {
   "weight": "600",
   "size": "clamp(110px, 14vw, 200px)",
   "color": "rgb(255 255 255 / .82)",
   "spacing": "-0.03em",
   "shadow": "0 2px 30px rgb(0 0 0 / .2)",
   "glass": true
  },
  "date": {
   "color": "rgb(255 255 255 / .9)",
   "size": "21px",
   "weight": "600"
  },
  "dateAbove": true,
  "search": {
   "radius": "999px",
   "bg": "rgb(255 255 255 / .16)",
   "border": "0",
   "blur": "blur(28px) saturate(1.8)",
   "shadow": "inset 0 0 0 .5px rgb(255 255 255 / .35), 0 16px 40px rgb(0 0 0 / .3)"
  }
 },
 {
  "id": "material",
  "name": "Material You",
  "groups": [
   "light",
   "dark"
  ],
  "scheme": "both",
  "swatch": [
   "#131418",
   "#1d2027",
   "#a8c7fa",
   "#e4e2e6"
  ],
  "accentDefault": "#4C9AFF",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "light-dark(color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 80%, black), color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 55%, white))",
   "on_accent": "light-dark(#ffffff, #10131a)",
   "frame": "light-dark(color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 5%, #fbf9fd), color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 7%, #111317))",
   "bar": "light-dark(color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 10%, #ffffff), color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 12%, #1b1d22))",
   "field": "light-dark(color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 14%, #ffffff), color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 18%, #22252b))",
   "menu": "light-dark(color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 8%, #f7f5fa), color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 14%, #202328))",
   "ink": "light-dark(#1b1b1f, #e4e2e6)",
   "muted": "light-dark(#5e5e66, #a3a3ad)",
   "line": "light-dark(color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 14%, transparent), color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 18%, transparent))",
   "hover": "color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 12%, transparent)",
   "press": "color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 20%, transparent)"
  },
  "radius": "28px",
  "rItem": "999px",
  "rTab": "999px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 25%, #0d0f14)",
  "wall": "radial-gradient(60% 60% at 20% 20%, color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 70%, transparent), transparent 70%), radial-gradient(55% 55% at 85% 80%, color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 45%, #ff9e80), transparent 70%), color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 22%, #0d0f14)",
  "clock": {
   "weight": "400",
   "size": "clamp(84px, 10.5vw, 160px)",
   "color": "color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 35%, white)",
   "spacing": "0",
   "shadow": "none",
   "family": ""
  },
  "date": {
   "color": "light-dark(#5e5e66, #a3a3ad)",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": true,
  "search": {
   "radius": "999px",
   "bg": "color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 30%, #1b1d22)",
   "border": "0",
   "blur": "none",
   "shadow": "0 10px 30px rgb(0 0 0 / .25)"
  }
 },
 {
  "id": "fluent",
  "name": "Windows 11",
  "groups": [
   "light",
   "dark",
   "strict"
  ],
  "scheme": "both",
  "swatch": [
   "#202020",
   "#2b2b2b",
   "#4cc2ff",
   "#ffffff"
  ],
  "accentDefault": "#4C9AFF",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "light-dark(var(--hd-ua, var(--hd-sys-accent)), color-mix(in srgb, var(--hd-ua, var(--hd-sys-accent)) 70%, white))",
   "on_accent": "light-dark(#ffffff, #000000)",
   "frame": "light-dark(#f3f3f3, #202020)",
   "bar": "light-dark(#fbfbfb, #2b2b2b)",
   "field": "light-dark(#ffffff, #2d2d2d)",
   "menu": "light-dark(#f9f9f9, #2c2c2c)",
   "ink": "light-dark(#1a1a1a, #ffffff)",
   "muted": "light-dark(#5f5f5f, #c5c5c5)",
   "line": "light-dark(rgb(0 0 0 / .08), rgb(255 255 255 / .08))",
   "hover": "light-dark(rgb(0 0 0 / .04), rgb(255 255 255 / .06))",
   "press": "light-dark(rgb(0 0 0 / .08), rgb(255 255 255 / .04))"
  },
  "radius": "8px",
  "rItem": "4px",
  "rTab": "6px",
  "rBtn": "4px",
  "font": "\"Segoe UI Variable Text\", \"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#0b1a3a",
  "wall": "radial-gradient(45% 55% at 52% 60%, rgb(120 170 255 / .9), transparent 62%), radial-gradient(35% 40% at 40% 50%, rgb(40 100 230 / .9), transparent 70%), radial-gradient(60% 60% at 70% 45%, rgb(80 60 200 / .7), transparent 70%), linear-gradient(160deg, #07122b, #0b2a6b 60%, #0a1838)",
  "clock": {
   "weight": "600",
   "size": "clamp(90px, 11vw, 150px)",
   "color": "light-dark(#1a1a1a, #ffffff)",
   "spacing": "-0.01em",
   "shadow": "0 2px 20px rgb(0 0 0 / .3)",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", sans-serif"
  },
  "date": {
   "color": "light-dark(#5f5f5f, #c5c5c5)",
   "size": "22px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "8px",
   "bg": "rgb(32 32 32 / .85)",
   "border": "0",
   "blur": "none",
   "shadow": "inset 0 -2px 0 var(--hd-ua, var(--hd-sys-accent)), 0 16px 40px rgb(0 0 0 / .3)"
  }
 },
 {
  "id": "macos",
  "name": "macOS",
  "groups": [
   "light",
   "dark"
  ],
  "scheme": "both",
  "swatch": [
   "#1e1e1e",
   "#2c2c2e",
   "#0a84ff",
   "#f5f5f7"
  ],
  "accentDefault": "#007AFF",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "light-dark(var(--hd-ua, #007AFF), var(--hd-ua, #0A84FF))",
   "on_accent": "#ffffff",
   "frame": "light-dark(#e7e5ea, #1f1e23)",
   "bar": "light-dark(#f6f5f8, #2a292f)",
   "field": "light-dark(#ffffff, #38373d)",
   "menu": "light-dark(rgb(246 245 248 / .97), rgb(40 39 44 / .97))",
   "ink": "light-dark(#1d1d1f, #f5f5f7)",
   "muted": "light-dark(#6e6e73, #98989d)",
   "line": "light-dark(rgb(0 0 0 / .1), rgb(255 255 255 / .1))",
   "hover": "light-dark(rgb(0 0 0 / .05), rgb(255 255 255 / .07))",
   "press": "light-dark(rgb(0 0 0 / .1), rgb(255 255 255 / .12))"
  },
  "radius": "12px",
  "rItem": "6px",
  "rTab": "8px",
  "rBtn": "7px",
  "font": "\"SF Pro Display\", \"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#1a1030",
  "wall": "radial-gradient(70% 50% at 20% 85%, rgb(255 140 60 / .85), transparent 65%), radial-gradient(60% 55% at 85% 20%, rgb(90 120 255 / .85), transparent 65%), radial-gradient(55% 50% at 60% 60%, rgb(200 70 160 / .7), transparent 70%), linear-gradient(170deg, #1d1440, #3a1d5c 50%, #20123a)",
  "clock": {
   "weight": "600",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "rgb(255 255 255 / .92)",
   "spacing": "-0.02em",
   "shadow": "0 2px 30px rgb(0 0 0 / .25)",
   "family": ""
  },
  "date": {
   "color": "rgb(255 255 255 / .9)",
   "size": "20px",
   "weight": "600"
  },
  "dateAbove": true,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .16)",
   "border": "0",
   "blur": "blur(24px) saturate(180%)",
   "shadow": "inset 0 0 0 .5px rgb(255 255 255 / .3), 0 16px 40px rgb(0 0 0 / .3)"
  }
 },
 {
  "id": "nothing",
  "name": "Nothing",
  "groups": [
   "dark",
   "strict"
  ],
  "scheme": "both",
  "swatch": [
   "#000000",
   "#111111",
   "#d71921",
   "#ffffff"
  ],
  "accentDefault": "#D71921",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #D71921)",
   "on_accent": "#ffffff",
   "frame": "light-dark(#f2f2f2, #000000)",
   "bar": "light-dark(#ffffff, #111111)",
   "field": "light-dark(#ffffff, #000000)",
   "menu": "light-dark(#ffffff, #0d0d0d)",
   "ink": "light-dark(#000000, #ffffff)",
   "muted": "light-dark(#666666, #8a8a8a)",
   "line": "light-dark(rgb(0 0 0 / .25), rgb(255 255 255 / .22))",
   "hover": "light-dark(rgb(0 0 0 / .06), rgb(255 255 255 / .08))",
   "press": "light-dark(rgb(0 0 0 / .12), rgb(255 255 255 / .14))"
  },
  "radius": "20px",
  "rItem": "999px",
  "rTab": "999px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#000",
  "wall": "radial-gradient(circle, rgb(255 255 255 / .07) 1px, transparent 1.5px) 0 0 / 22px 22px, #000",
  "clock": {
   "weight": "900",
   "size": "clamp(120px, 15vw, 230px)",
   "color": "transparent",
   "spacing": ".04em",
   "shadow": "none",
   "family": "\"Segoe UI Black\", \"Arial Black\", \"Segoe UI\", sans-serif",
   "fill": "radial-gradient(circle, #fff 42%, transparent 46%) 0 0 / 11px 11px"
  },
  "date": {
   "color": "#fff",
   "size": "15px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "999px",
   "bg": "#000",
   "border": "1px solid rgb(255 255 255 / .35)",
   "blur": "none",
   "shadow": "none"
  }
 },
 {
  "id": "nightdrive",
  "name": "Night Drive",
  "groups": [
   "dark",
   "glass"
  ],
  "scheme": "dark",
  "swatch": [
   "#07080d",
   "#151822",
   "#ffb25b",
   "#eef0f6"
  ],
  "accentDefault": "#FFB25B",
  "glass": true,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #FFB25B)",
   "on_accent": "#1a1205",
   "frame": "#07080d",
   "bar": "#151822",
   "field": "#1b1f2b",
   "menu": "rgb(21 24 33 / .94)",
   "ink": "#eef0f6",
   "muted": "#9aa0b4",
   "line": "rgb(255 255 255 / .08)",
   "hover": "rgb(255 255 255 / .07)",
   "press": "rgb(255 255 255 / .12)"
  },
  "radius": "22px",
  "rItem": "12px",
  "rTab": "12px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#05060b",
  "wall": "radial-gradient(9% 12% at 6% 78%, rgb(255 60 50 / .85), transparent 70%), radial-gradient(7% 9% at 15% 90%, rgb(255 40 40 / .7), transparent 70%), radial-gradient(11% 14% at 92% 72%, rgb(255 178 91 / .8), transparent 70%), radial-gradient(8% 11% at 83% 88%, rgb(255 210 140 / .65), transparent 70%), radial-gradient(10% 13% at 96% 18%, rgb(80 200 255 / .55), transparent 70%), radial-gradient(7% 9% at 4% 16%, rgb(255 150 60 / .55), transparent 70%), radial-gradient(6% 8% at 24% 8%, rgb(120 160 255 / .4), transparent 70%), radial-gradient(5% 7% at 74% 6%, rgb(255 120 80 / .4), transparent 70%), radial-gradient(70% 55% at 50% 50%, #0a0c14, #04050a 100%)",
  "clock": {
   "weight": "200",
   "size": "clamp(110px, 13vw, 200px)",
   "color": "rgb(255 255 255 / .92)",
   "spacing": ".02em",
   "shadow": "0 0 40px rgb(255 178 91 / .25)",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", sans-serif"
  },
  "date": {
   "color": "rgb(255 255 255 / .75)",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .07)",
   "border": "1px solid rgb(255 255 255 / .12)",
   "blur": "blur(20px)",
   "shadow": "inset 0 1px 0 rgb(255 255 255 / .1), 0 20px 50px rgb(0 0 0 / .5)"
  }
 },
 {
  "id": "aero",
  "name": "Aero",
  "groups": [
   "glass",
   "retro"
  ],
  "scheme": "both",
  "swatch": [
   "#163a6b",
   "#1d4a85",
   "#5ab0ff",
   "#ffffff"
  ],
  "accentDefault": "#2B7CD3",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #2B7CD3)",
   "on_accent": "#ffffff",
   "frame": "light-dark(#bcd3ee, #14223a)",
   "bar": "light-dark(rgb(255 255 255 / .75), rgb(30 50 85 / .8))",
   "field": "light-dark(#ffffff, #1b2b48)",
   "menu": "light-dark(#f2f6fb, #1a2944)",
   "ink": "light-dark(#0b1a2e, #eaf2ff)",
   "muted": "light-dark(#4a5f7a, #9fb4d4)",
   "line": "light-dark(rgb(30 60 110 / .25), rgb(160 200 255 / .2))",
   "hover": "light-dark(rgb(43 124 211 / .12), rgb(120 180 255 / .14))",
   "press": "light-dark(rgb(43 124 211 / .22), rgb(120 180 255 / .22))"
  },
  "radius": "8px",
  "rItem": "3px",
  "rTab": "6px",
  "rBtn": "4px",
  "font": "\"Segoe UI\", Tahoma, sans-serif",
  "newtabBg": "#0b3a7a",
  "wall": "radial-gradient(60% 40% at 30% 70%, rgb(140 220 255 / .55), transparent 70%), linear-gradient(160deg, transparent 40%, rgb(255 255 255 / .18) 50%, transparent 60%), linear-gradient(170deg, transparent 55%, rgb(160 230 120 / .35) 62%, transparent 70%), linear-gradient(180deg, #0b4fa8, #0a2f6b)",
  "clock": {
   "weight": "300",
   "size": "clamp(100px, 12vw, 170px)",
   "color": "#fff",
   "spacing": "0",
   "shadow": "0 0 18px rgb(255 255 255 / .55), 0 2px 6px rgb(0 0 0 / .4)",
   "family": "\"Segoe UI\", sans-serif"
  },
  "date": {
   "color": "light-dark(#4a5f7a, #9fb4d4)",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "6px",
   "bg": "linear-gradient(180deg, rgb(255 255 255 / .55), rgb(255 255 255 / .3))",
   "border": "1px solid rgb(255 255 255 / .6)",
   "blur": "blur(12px)",
   "shadow": "inset 0 1px 0 #fff, 0 10px 30px rgb(0 0 0 / .3)"
  }
 },
 {
  "id": "retro",
  "name": "Retro 98",
  "groups": [
   "retro",
   "light"
  ],
  "scheme": "light",
  "swatch": [
   "#008080",
   "#c0c0c0",
   "#000080",
   "#000000"
  ],
  "accentDefault": "#000080",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #000080)",
   "on_accent": "#ffffff",
   "frame": "#c0c0c0",
   "bar": "#ffffff",
   "field": "#ffffff",
   "menu": "#c0c0c0",
   "ink": "#000000",
   "muted": "#404040",
   "line": "#808080",
   "hover": "rgb(0 0 128 / .12)",
   "press": "rgb(0 0 128 / .22)"
  },
  "radius": "0px",
  "rItem": "0px",
  "rTab": "0px",
  "rBtn": "0px",
  "font": "Tahoma, \"MS Sans Serif\", \"Segoe UI\", sans-serif",
  "newtabBg": "#008080",
  "wall": "#008080",
  "clock": {
   "weight": "700",
   "size": "clamp(70px, 8vw, 110px)",
   "color": "#000",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Courier New\", Consolas, monospace"
  },
  "date": {
   "color": "#000",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "0",
   "bg": "#fff",
   "border": "0",
   "blur": "none",
   "shadow": "inset 1px 1px #808080, inset -1px -1px #fff, inset 2px 2px #404040, 3px 3px 0 rgb(0 0 0 / .3)"
  }
 },
 {
  "id": "terminal",
  "name": "Terminal",
  "groups": [
   "retro",
   "dark"
  ],
  "scheme": "dark",
  "swatch": [
   "#030803",
   "#081108",
   "#33ff66",
   "#b7ffc4"
  ],
  "accentDefault": "#33FF66",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #33FF66)",
   "on_accent": "#000000",
   "frame": "#030603",
   "bar": "#081108",
   "field": "#000000",
   "menu": "#061006",
   "ink": "#5CFF85",
   "muted": "#2BA84C",
   "line": "rgb(51 255 102 / .28)",
   "hover": "rgb(51 255 102 / .1)",
   "press": "rgb(51 255 102 / .18)"
  },
  "radius": "2px",
  "rItem": "2px",
  "rTab": "2px",
  "rBtn": "2px",
  "font": "\"Cascadia Mono\", \"Cascadia Code\", Consolas, ui-monospace, monospace",
  "newtabBg": "#010301",
  "wall": "repeating-linear-gradient(180deg, rgb(0 0 0 / .35) 0 1px, transparent 1px 3px), radial-gradient(80% 70% at 50% 45%, rgb(20 80 35 / .55), transparent 75%), #010301",
  "clock": {
   "weight": "400",
   "size": "clamp(90px, 11vw, 160px)",
   "color": "#5CFF85",
   "spacing": "0",
   "shadow": "0 0 10px rgb(51 255 102 / .8), 0 0 40px rgb(51 255 102 / .35)",
   "family": "\"Cascadia Mono\", Consolas, monospace"
  },
  "date": {
   "color": "#2BA84C",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "0",
   "bg": "#000",
   "border": "1px solid rgb(51 255 102 / .5)",
   "blur": "none",
   "shadow": "0 0 18px rgb(51 255 102 / .2)"
  }
 },
 {
  "id": "paper",
  "name": "Paper",
  "groups": [
   "light"
  ],
  "scheme": "light",
  "swatch": [
   "#f3eee3",
   "#fbf8f1",
   "#b4532a",
   "#2b2620"
  ],
  "accentDefault": "#B4532A",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #B4532A)",
   "on_accent": "#ffffff",
   "frame": "#efe9de",
   "bar": "#f8f4ec",
   "field": "#fffdf8",
   "menu": "#faf6ee",
   "ink": "#2b2622",
   "muted": "#7a7066",
   "line": "rgb(43 38 34 / .16)",
   "hover": "rgb(43 38 34 / .06)",
   "press": "rgb(43 38 34 / .11)"
  },
  "radius": "6px",
  "rItem": "3px",
  "rTab": "4px",
  "rBtn": "4px",
  "font": "Georgia, Cambria, \"Times New Roman\", serif",
  "newtabBg": "#f1ebdf",
  "wall": "repeating-linear-gradient(180deg, transparent 0 35px, rgb(120 90 60 / .06) 35px 36px), radial-gradient(90% 70% at 50% 40%, #fbf7ef, #ece4d5)",
  "clock": {
   "weight": "400",
   "size": "clamp(100px, 12vw, 170px)",
   "color": "#2b2622",
   "spacing": "0",
   "shadow": "none",
   "family": "Georgia, \"Times New Roman\", serif"
  },
  "date": {
   "color": "#7a7066",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "0",
   "bg": "transparent",
   "border": "0",
   "blur": "none",
   "shadow": "inset 0 -2px 0 #2b2622"
  }
 },
 {
  "id": "cyber",
  "name": "Cyberpunk",
  "groups": [
   "bright",
   "dark"
  ],
  "scheme": "dark",
  "swatch": [
   "#0a0612",
   "#15111f",
   "#ff00aa",
   "#f3f0ff"
  ],
  "accentDefault": "#FCEE0A",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #FCEE0A)",
   "on_accent": "#000000",
   "frame": "#0b0912",
   "bar": "#15111f",
   "field": "#1a1526",
   "menu": "#120e1b",
   "ink": "#f3f0ff",
   "muted": "#a497cc",
   "line": "rgb(255 0 170 / .32)",
   "hover": "rgb(0 240 255 / .1)",
   "press": "rgb(0 240 255 / .18)"
  },
  "radius": "4px",
  "rItem": "0px",
  "rTab": "0px",
  "rBtn": "2px",
  "font": "Bahnschrift, \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#07050d",
  "wall": "linear-gradient(180deg, transparent 58%, rgb(255 0 170 / .0) 58%), repeating-linear-gradient(90deg, rgb(0 240 255 / .18) 0 1px, transparent 1px 80px) 0 62% / 100% 38% no-repeat, repeating-linear-gradient(180deg, rgb(255 0 170 / .2) 0 1px, transparent 1px 34px) 0 100% / 100% 38% no-repeat, radial-gradient(60% 30% at 50% 62%, rgb(255 0 170 / .45), transparent 70%), radial-gradient(40% 40% at 85% 15%, rgb(0 240 255 / .3), transparent 70%), linear-gradient(180deg, #0a0614, #1a0b2e 60%, #07050d)",
  "clock": {
   "weight": "700",
   "size": "clamp(100px, 12vw, 170px)",
   "color": "#FCEE0A",
   "spacing": ".04em",
   "shadow": "-3px 0 rgb(255 0 170 / .85), 3px 0 rgb(0 240 255 / .85), 0 0 30px rgb(252 238 10 / .35)",
   "family": "Bahnschrift, \"Segoe UI\", sans-serif"
  },
  "date": {
   "color": "#00f0ff",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "0",
   "bg": "rgb(10 6 20 / .85)",
   "border": "1px solid #FCEE0A",
   "blur": "none",
   "shadow": "none"
  }
 },
 {
  "id": "arctic",
  "name": "Arctic",
  "groups": [
   "light"
  ],
  "scheme": "light",
  "swatch": [
   "#eef3f9",
   "#ffffff",
   "#2f7df6",
   "#14202e"
  ],
  "accentDefault": "#2F7DF6",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #2F7DF6)",
   "on_accent": "#ffffff",
   "frame": "#eef3f9",
   "bar": "#ffffff",
   "field": "#ffffff",
   "menu": "rgb(255 255 255 / .96)",
   "ink": "#14202e",
   "muted": "#5b6b80",
   "line": "rgb(0 0 0 / .1)",
   "hover": "rgb(0 0 0 / .05)",
   "press": "rgb(0 0 0 / .09)"
  },
  "radius": "18px",
  "rItem": "10px",
  "rTab": "10px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#eef3f9",
  "wall": "radial-gradient(80% 70% at 20% 10%, #dbe9ff, transparent 70%), radial-gradient(70% 60% at 90% 90%, #e3f6ff, transparent 70%), #f4f8fc",
  "clock": {
   "weight": "300",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#14202e",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif"
  },
  "date": {
   "color": "#5b6b80",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .72)",
   "border": "1px solid rgb(0 0 0 / .1)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .08)"
  }
 },
 {
  "id": "sakura",
  "name": "Sakura",
  "groups": [
   "light",
   "bright"
  ],
  "scheme": "light",
  "swatch": [
   "#fbf0f3",
   "#fffafb",
   "#e0567f",
   "#3a1d27"
  ],
  "accentDefault": "#E0567F",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #E0567F)",
   "on_accent": "#ffffff",
   "frame": "#fbf0f3",
   "bar": "#fffafb",
   "field": "#ffffff",
   "menu": "rgb(255 250 251 / .96)",
   "ink": "#3a1d27",
   "muted": "#8a6672",
   "line": "rgb(0 0 0 / .1)",
   "hover": "rgb(0 0 0 / .05)",
   "press": "rgb(0 0 0 / .09)"
  },
  "radius": "22px",
  "rItem": "12px",
  "rTab": "14px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#fbf0f3",
  "wall": "radial-gradient(60% 60% at 15% 20%, #ffd3e0, transparent 70%), radial-gradient(60% 60% at 85% 80%, #ffe6ee, transparent 70%), #fdf3f6",
  "clock": {
   "weight": "300",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#c23a64",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif"
  },
  "date": {
   "color": "#8a6672",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .72)",
   "border": "1px solid rgb(0 0 0 / .1)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .08)"
  }
 },
 {
  "id": "mint",
  "name": "Mint",
  "groups": [
   "light"
  ],
  "scheme": "light",
  "swatch": [
   "#eef7f3",
   "#fbfffd",
   "#16a37a",
   "#12302a"
  ],
  "accentDefault": "#16A37A",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #16A37A)",
   "on_accent": "#ffffff",
   "frame": "#eef7f3",
   "bar": "#fbfffd",
   "field": "#ffffff",
   "menu": "rgb(251 255 253 / .96)",
   "ink": "#12302a",
   "muted": "#5c7a71",
   "line": "rgb(0 0 0 / .1)",
   "hover": "rgb(0 0 0 / .05)",
   "press": "rgb(0 0 0 / .09)"
  },
  "radius": "18px",
  "rItem": "10px",
  "rTab": "10px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#eef7f3",
  "wall": "radial-gradient(70% 60% at 80% 15%, #c9f1e2, transparent 70%), radial-gradient(60% 60% at 10% 90%, #e2f7ef, transparent 70%), #f3faf7",
  "clock": {
   "weight": "300",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#12302a",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif"
  },
  "date": {
   "color": "#5c7a71",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .72)",
   "border": "1px solid rgb(0 0 0 / .1)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .08)"
  }
 },
 {
  "id": "latte",
  "name": "Latte",
  "groups": [
   "light"
  ],
  "scheme": "light",
  "swatch": [
   "#f2ebe3",
   "#fbf7f2",
   "#8b5e3c",
   "#33261c"
  ],
  "accentDefault": "#8B5E3C",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #8B5E3C)",
   "on_accent": "#ffffff",
   "frame": "#f2ebe3",
   "bar": "#fbf7f2",
   "field": "#fffdfa",
   "menu": "rgb(251 247 242 / .97)",
   "ink": "#33261c",
   "muted": "#7d6a5a",
   "line": "rgb(0 0 0 / .1)",
   "hover": "rgb(0 0 0 / .05)",
   "press": "rgb(0 0 0 / .09)"
  },
  "radius": "14px",
  "rItem": "8px",
  "rTab": "8px",
  "rBtn": "10px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", sans-serif",
  "newtabBg": "#f2ebe3",
  "wall": "radial-gradient(80% 70% at 50% 0%, #f0e2d2, transparent 70%), #f6efe7",
  "clock": {
   "weight": "500",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#5a3e28",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", sans-serif"
  },
  "date": {
   "color": "#7d6a5a",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "10px",
   "bg": "rgb(255 255 255 / .72)",
   "border": "1px solid rgb(0 0 0 / .1)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .08)"
  }
 },
 {
  "id": "midnight",
  "name": "Midnight",
  "groups": [
   "dark",
   "glass"
  ],
  "scheme": "dark",
  "swatch": [
   "#0b1020",
   "#141a2e",
   "#6c8cff",
   "#e6eaff"
  ],
  "accentDefault": "#6C8CFF",
  "glass": true,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #6C8CFF)",
   "on_accent": "#0b1022",
   "frame": "#0b1020",
   "bar": "#141a2e",
   "field": "#18203a",
   "menu": "rgb(20 26 46 / .95)",
   "ink": "#e6eaff",
   "muted": "#8f98bf",
   "line": "rgb(255 255 255 / .09)",
   "hover": "rgb(255 255 255 / .07)",
   "press": "rgb(255 255 255 / .12)"
  },
  "radius": "18px",
  "rItem": "10px",
  "rTab": "10px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#0b1020",
  "wall": "radial-gradient(60% 50% at 50% 0%, #1d2a5c, transparent 70%), radial-gradient(40% 40% at 90% 90%, #2a1d5c, transparent 70%), #080c18",
  "clock": {
   "weight": "200",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#dfe5ff",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif"
  },
  "date": {
   "color": "#8f98bf",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .08)",
   "border": "1px solid rgb(255 255 255 / .14)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .35)"
  }
 },
 {
  "id": "fjord",
  "name": "Fjord",
  "groups": [
   "dark",
   "strict"
  ],
  "scheme": "dark",
  "swatch": [
   "#242b37",
   "#2e3644",
   "#88c0d0",
   "#e5e9f0"
  ],
  "accentDefault": "#88C0D0",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #88C0D0)",
   "on_accent": "#1d2430",
   "frame": "#242b37",
   "bar": "#2e3644",
   "field": "#343d4c",
   "menu": "rgb(46 54 68 / .97)",
   "ink": "#e5e9f0",
   "muted": "#9aa5b8",
   "line": "rgb(255 255 255 / .09)",
   "hover": "rgb(255 255 255 / .07)",
   "press": "rgb(255 255 255 / .12)"
  },
  "radius": "12px",
  "rItem": "6px",
  "rTab": "6px",
  "rBtn": "8px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#242b37",
  "wall": "linear-gradient(180deg, #3b4555, #242b37)",
  "clock": {
   "weight": "300",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#e5e9f0",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif"
  },
  "date": {
   "color": "#9aa5b8",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "8px",
   "bg": "rgb(255 255 255 / .08)",
   "border": "1px solid rgb(255 255 255 / .14)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .35)"
  }
 },
 {
  "id": "ember",
  "name": "Ember",
  "groups": [
   "dark",
   "retro"
  ],
  "scheme": "dark",
  "swatch": [
   "#1d1a17",
   "#282420",
   "#fe8019",
   "#ebdbb2"
  ],
  "accentDefault": "#FE8019",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #FE8019)",
   "on_accent": "#1d1a17",
   "frame": "#1d1a17",
   "bar": "#282420",
   "field": "#302b26",
   "menu": "rgb(40 36 32 / .97)",
   "ink": "#ebdbb2",
   "muted": "#a89984",
   "line": "rgb(255 255 255 / .09)",
   "hover": "rgb(255 255 255 / .07)",
   "press": "rgb(255 255 255 / .12)"
  },
  "radius": "10px",
  "rItem": "6px",
  "rTab": "6px",
  "rBtn": "8px",
  "font": "\"Cascadia Code\", \"Segoe UI\", sans-serif",
  "newtabBg": "#1d1a17",
  "wall": "radial-gradient(50% 40% at 50% 100%, rgb(254 128 25 / .28), transparent 70%), #1a1714",
  "clock": {
   "weight": "400",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#fabd2f",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Cascadia Code\", \"Segoe UI\", sans-serif"
  },
  "date": {
   "color": "#a89984",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "8px",
   "bg": "rgb(255 255 255 / .08)",
   "border": "1px solid rgb(255 255 255 / .14)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .35)"
  }
 },
 {
  "id": "forest",
  "name": "Forest",
  "groups": [
   "dark"
  ],
  "scheme": "dark",
  "swatch": [
   "#0f1a13",
   "#17241b",
   "#7bc47f",
   "#e2efe3"
  ],
  "accentDefault": "#7BC47F",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #7BC47F)",
   "on_accent": "#0c1a0f",
   "frame": "#0f1a13",
   "bar": "#17241b",
   "field": "#1c2c21",
   "menu": "rgb(23 36 27 / .96)",
   "ink": "#e2efe3",
   "muted": "#8fa894",
   "line": "rgb(255 255 255 / .09)",
   "hover": "rgb(255 255 255 / .07)",
   "press": "rgb(255 255 255 / .12)"
  },
  "radius": "18px",
  "rItem": "10px",
  "rTab": "10px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#0f1a13",
  "wall": "radial-gradient(70% 60% at 30% 100%, #1f4a2a, transparent 70%), radial-gradient(50% 50% at 90% 0%, #23402a, transparent 70%), #0b140e",
  "clock": {
   "weight": "200",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#cfe8d1",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif"
  },
  "date": {
   "color": "#8fa894",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .08)",
   "border": "1px solid rgb(255 255 255 / .14)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .35)"
  }
 },
 {
  "id": "ocean",
  "name": "Ocean",
  "groups": [
   "dark",
   "glass"
  ],
  "scheme": "dark",
  "swatch": [
   "#06161d",
   "#0d222b",
   "#22c3e6",
   "#dff6fb"
  ],
  "accentDefault": "#22C3E6",
  "glass": true,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #22C3E6)",
   "on_accent": "#03141a",
   "frame": "#06161d",
   "bar": "#0d222b",
   "field": "#112a35",
   "menu": "rgb(13 34 43 / .95)",
   "ink": "#dff6fb",
   "muted": "#83aab5",
   "line": "rgb(255 255 255 / .09)",
   "hover": "rgb(255 255 255 / .07)",
   "press": "rgb(255 255 255 / .12)"
  },
  "radius": "18px",
  "rItem": "10px",
  "rTab": "10px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#06161d",
  "wall": "radial-gradient(80% 60% at 50% 110%, #0a5a73, transparent 70%), radial-gradient(40% 40% at 10% 10%, #0b3a4f, transparent 70%), #041015",
  "clock": {
   "weight": "200",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#bff1fb",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif"
  },
  "date": {
   "color": "#83aab5",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .08)",
   "border": "1px solid rgb(255 255 255 / .14)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .35)"
  }
 },
 {
  "id": "rose",
  "name": "Rosé",
  "groups": [
   "dark"
  ],
  "scheme": "dark",
  "swatch": [
   "#191724",
   "#1f1d2e",
   "#ebbcba",
   "#e0def4"
  ],
  "accentDefault": "#EBBCBA",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #EBBCBA)",
   "on_accent": "#1f1d2e",
   "frame": "#191724",
   "bar": "#1f1d2e",
   "field": "#26233a",
   "menu": "rgb(31 29 46 / .96)",
   "ink": "#e0def4",
   "muted": "#908caa",
   "line": "rgb(255 255 255 / .09)",
   "hover": "rgb(255 255 255 / .07)",
   "press": "rgb(255 255 255 / .12)"
  },
  "radius": "20px",
  "rItem": "12px",
  "rTab": "12px",
  "rBtn": "999px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#191724",
  "wall": "radial-gradient(60% 50% at 80% 10%, rgb(235 188 186 / .18), transparent 70%), radial-gradient(60% 50% at 10% 90%, rgb(196 167 231 / .16), transparent 70%), #191724",
  "clock": {
   "weight": "300",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#ebbcba",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif"
  },
  "date": {
   "color": "#908caa",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .08)",
   "border": "1px solid rgb(255 255 255 / .14)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .35)"
  }
 },
 {
  "id": "synthwave",
  "name": "Synthwave",
  "groups": [
   "bright",
   "dark",
   "retro"
  ],
  "scheme": "dark",
  "swatch": [
   "#140a24",
   "#1f1033",
   "#ff4fd8",
   "#fbeaff"
  ],
  "accentDefault": "#FF4FD8",
  "glass": true,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #FF4FD8)",
   "on_accent": "#14041d",
   "frame": "#140a24",
   "bar": "#1f1033",
   "field": "#26143d",
   "menu": "rgb(31 16 51 / .95)",
   "ink": "#fbeaff",
   "muted": "#b195c9",
   "line": "rgb(255 255 255 / .09)",
   "hover": "rgb(255 255 255 / .07)",
   "press": "rgb(255 255 255 / .12)"
  },
  "radius": "16px",
  "rItem": "8px",
  "rTab": "8px",
  "rBtn": "999px",
  "font": "Bahnschrift, \"Segoe UI\", sans-serif",
  "newtabBg": "#140a24",
  "wall": "linear-gradient(180deg, #14082a 0%, #2b0b45 55%, #ff4fd8 56%, #2b0b45 57%, #120625 100%)",
  "clock": {
   "weight": "700",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#ffd36b",
   "spacing": "0",
   "shadow": "none",
   "family": "Bahnschrift, \"Segoe UI\", sans-serif"
  },
  "date": {
   "color": "#b195c9",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "14px",
   "bg": "rgb(255 255 255 / .08)",
   "border": "1px solid rgb(255 255 255 / .14)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .35)"
  }
 },
 {
  "id": "contrast",
  "name": "High Contrast",
  "groups": [
   "dark",
   "strict",
   "bright"
  ],
  "scheme": "dark",
  "swatch": [
   "#000000",
   "#000000",
   "#ffe600",
   "#ffffff"
  ],
  "accentDefault": "#FFE600",
  "glass": false,
  "live": false,
  "vars": {
   "accent": "var(--hd-ua, #FFE600)",
   "on_accent": "#000000",
   "frame": "#000000",
   "bar": "#000000",
   "field": "#0a0a0a",
   "menu": "#000000",
   "ink": "#ffffff",
   "muted": "#e0e0e0",
   "line": "#ffffff",
   "hover": "rgb(255 255 255 / .07)",
   "press": "rgb(255 255 255 / .12)"
  },
  "radius": "6px",
  "rItem": "4px",
  "rTab": "4px",
  "rBtn": "6px",
  "font": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif",
  "newtabBg": "#000000",
  "wall": "#000000",
  "clock": {
   "weight": "800",
   "size": "clamp(100px, 12vw, 180px)",
   "color": "#ffe600",
   "spacing": "0",
   "shadow": "none",
   "family": "\"Segoe UI Variable Display\", \"Segoe UI\", system-ui, sans-serif"
  },
  "date": {
   "color": "#e0e0e0",
   "size": "18px",
   "weight": "500"
  },
  "dateAbove": false,
  "search": {
   "radius": "6px",
   "bg": "rgb(255 255 255 / .08)",
   "border": "1px solid rgb(255 255 255 / .14)",
   "blur": "blur(18px)",
   "shadow": "0 16px 40px rgb(0 0 0 / .35)"
  }
 }
];
export const THEME_IDS = THEMES.map(t => t.id);
