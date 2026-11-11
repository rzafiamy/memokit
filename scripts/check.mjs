// Validates the extension source: manifest version matches package.json,
// every file referenced by the manifest / HTML pages exists, and all JS parses.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { SRC, manifest, pkg } from "./lib.mjs";

const errors = [];
const m = manifest();
const version = pkg().version;

if (m.version !== version) {
  errors.push(`manifest.json version (${m.version}) != package.json version (${version}). Run: node scripts/sync-version.mjs`);
}

// Files referenced from the manifest.
const refs = [
  m.background?.service_worker,
  m.action?.default_popup,
  m.options_page,
  ...Object.values(m.icons ?? {}),
  ...Object.values(m.action?.default_icon ?? {}),
].filter(Boolean);
for (const ref of refs) {
  if (!existsSync(join(SRC, ref))) errors.push(`manifest.json references missing file: ${ref}`);
}

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(SRC);

// Local src/href in HTML and relative imports in JS must resolve.
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const patterns = file.endsWith(".html")
    ? [/(?:src|href)="([^"#:]+)"/g]
    : file.endsWith(".js") ? [/from\s+"(\.{1,2}\/[^"]+)"/g, /import\s+"(\.{1,2}\/[^"]+)"/g] : [];
  for (const re of patterns) {
    for (const [, ref] of text.matchAll(re)) {
      if (!existsSync(join(dirname(file), ref))) {
        errors.push(`${relative(SRC, file)} references missing file: ${ref}`);
      }
    }
  }
  if (file.endsWith(".js")) {
    try {
      execFileSync(process.execPath, ["--check", "--input-type=module"], { input: text, stdio: ["pipe", "ignore", "pipe"] });
    } catch (e) {
      errors.push(`${relative(SRC, file)}: syntax error\n${e.stderr}`);
    }
  }
}

if (errors.length) {
  console.error("✗ Check failed:\n  - " + errors.join("\n  - "));
  process.exit(1);
}
console.log(`✓ src/ is valid (v${version}, ${files.length} files)`);
