// Copies the version from package.json into src/manifest.json and the README badge.
// Runs automatically during `npm version <patch|minor|major>`.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, SRC, manifest, pkg } from "./lib.mjs";

const { version } = pkg();

const m = manifest();
m.version = version;
writeFileSync(join(SRC, "manifest.json"), JSON.stringify(m, null, 2) + "\n");

const readmePath = join(ROOT, "README.md");
const readme = readFileSync(readmePath, "utf8")
  .replace(/badge\/Version-[\d.]+-/, `badge/Version-${version}-`);
writeFileSync(readmePath, readme);

console.log(`✓ Synced version ${version} -> src/manifest.json, README.md`);
