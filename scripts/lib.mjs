// Shared helpers for build scripts. No external dependencies.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SRC = join(ROOT, "src");
export const DIST = join(ROOT, "dist");       // unpacked build: load this folder in Chrome
export const RELEASE = join(ROOT, "release"); // versioned zips

export const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
export const pkg = () => readJson(join(ROOT, "package.json"));
export const manifest = () => readJson(join(SRC, "manifest.json"));
