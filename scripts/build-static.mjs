import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outputUrl = new URL("../build/" + ["neon-crush-app", "js"].join("."), import.meta.url);
const outputFile = fileURLToPath(outputUrl);

await mkdir(new URL("../build/", import.meta.url), { recursive: true });

await build({
  entryPoints: ["src/main.tsx"],
  outfile: outputFile,
  bundle: true,
  format: "esm",
  target: "es2020",
  jsx: "automatic",
  minify: true,
  legalComments: "none",
  loader: {
    ".css": "empty",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
