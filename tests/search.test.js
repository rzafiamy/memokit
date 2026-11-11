import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, countOpen, search } from "../src/shared/search.js";
import { displayUrl } from "../src/shared/url.js";
import { profileColor, PROFILE_COLORS } from "../src/shared/constants.js";

const profiles = [
  { id: "1", name: "Proxmox", urls: ["https://pve1.lan:8006/", "https://pve2.lan:8006"] },
  { id: "2", name: "Git", urls: ["https://gitlab.lan", "https://github.com/rzafiamy"] },
  { id: "3", name: "Monitoring", urls: ["https://grafana.lan", "https://pve1.lan:8006"] },
];
const index = buildIndex(profiles, [{ url: "https://mail.lan", title: "Mail" }]);

test("buildIndex de-duplicates sites and remembers their profiles", () => {
  const pve1 = index.filter((e) => e.type === "site" && e.label === "pve1.lan:8006");
  assert.equal(pve1.length, 1);
  assert.deepEqual(pve1[0].profiles, ["Proxmox", "Monitoring"]);
  assert.ok(index.some((e) => e.type === "site" && e.label === "Mail"));
});

test("empty query lists profiles in saved order", () => {
  assert.deepEqual(search(index, "").map((e) => e.label), ["Proxmox", "Git", "Monitoring"]);
});

test("search matches profiles and sites, best match first", () => {
  const results = search(index, "git");
  assert.equal(results[0].type, "profile");
  assert.equal(results[0].label, "Git");
  assert.ok(results.some((e) => e.label === "gitlab.lan"));
});

test("all terms must match", () => {
  assert.deepEqual(search(index, "pve 2").map((e) => e.label), ["pve2.lan:8006"]);
  assert.deepEqual(search(index, "nothing-here"), []);
});

test("sites are searchable by profile name", () => {
  assert.ok(search(index, "monitoring").some((e) => e.label === "grafana.lan"));
});

test("countOpen compares normalized URLs", () => {
  assert.equal(countOpen(profiles[0].urls, ["https://PVE1.lan:8006", "https://other"]), 1);
});

test("displayUrl strips scheme, www and trailing slash", () => {
  assert.equal(displayUrl("https://www.example.com/a/"), "example.com/a");
  assert.equal(displayUrl("http://10.0.0.1:8006/"), "10.0.0.1:8006");
});

test("profileColor uses explicit color or a stable fallback", () => {
  assert.equal(profileColor({ color: "rose" }), PROFILE_COLORS.rose);
  assert.equal(profileColor({ id: "x" }), profileColor({ id: "x" }));
  assert.ok(Object.values(PROFILE_COLORS).includes(profileColor({ id: "abc" })));
});
