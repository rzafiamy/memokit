// Builds dist/ (a clean copy of src/ ready for "Load unpacked")
// and, with --zip, release/memokit-v<version>.zip for the Chrome Web Store.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { DIST, RELEASE, ROOT, SRC, pkg } from "./lib.mjs";

const { name, version } = pkg();
const outDir = DIST;
const zipPath = join(RELEASE, `${name}-v${version}.zip`);

execFileSync(process.execPath, [join(ROOT, "scripts/check.mjs")], { stdio: "inherit" });

rmSync(outDir, { recursive: true, force: true });
cpSync(SRC, outDir, {
  recursive: true,
  filter: (src) => !/(^|[\\/])(\.DS_Store|Thumbs\.db|.*\.map)$/.test(src),
});
console.log(`✓ Built ${name} v${version} -> dist/  (Load unpacked: select this folder)`);

if (process.argv.includes("--zip")) {
  mkdirSync(RELEASE, { recursive: true });
  rmSync(zipPath, { force: true });
  try {
    execFileSync("zip", ["-r", "-q", "-X", zipPath, "."], { cwd: outDir, stdio: "inherit" });
  } catch {
    console.error("✗ Packaging failed: the 'zip' command is required (e.g. apt install zip).");
    process.exit(1);
  }
  console.log(`✓ Packaged -> release/${name}-v${version}.zip`);
}
