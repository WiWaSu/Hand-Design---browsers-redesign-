import { build } from "esbuild";

await build({
  entryPoints: ["src/editor.js"],
  bundle: true,
  format: "esm",
  minify: true,
  target: ["firefox128", "chrome123"],
  legalComments: "eof",
  external: ["./HandDesignMarkdown.sys.mjs"],
  outfile: "../apps/hd-notes-editor.mjs",
  banner: { js: "/* Hand Design notes editor. CodeMirror 6 and Lezer (MIT, Marijn Haverbeke and others): https://codemirror.net */" },
});
console.log("ok");
