import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureHttpUrl, hostnameOf, isInternalUrl, normalizeUrl } from "../src/shared/url.js";

test("normalizeUrl ignores case, trailing slash and hash", () => {
  assert.equal(normalizeUrl("https://Example.com/Path/"), normalizeUrl("https://example.com/path"));
  assert.equal(normalizeUrl("https://example.com/a#section"), "https://example.com/a");
  assert.equal(normalizeUrl("https://example.com/"), "https://example.com/");
  assert.equal(normalizeUrl("https://example.com/?q=1"), "https://example.com/?q=1");
});

test("normalizeUrl handles empty and invalid input", () => {
  assert.equal(normalizeUrl(""), "");
  assert.equal(normalizeUrl(undefined), "");
  assert.equal(normalizeUrl(" Not A Url "), "not a url");
});

test("isInternalUrl detects browser pages", () => {
  assert.ok(isInternalUrl("chrome://newtab/"));
  assert.ok(isInternalUrl("chrome-extension://abc/options.html"));
  assert.ok(isInternalUrl("about:blank"));
  assert.ok(isInternalUrl(undefined));
  assert.ok(!isInternalUrl("https://github.com"));
});

test("ensureHttpUrl adds scheme and rejects invalid URLs", () => {
  assert.equal(ensureHttpUrl("github.com"), "https://github.com");
  assert.equal(ensureHttpUrl("http://a.com"), "http://a.com");
  assert.equal(ensureHttpUrl("HTTPS://a.com"), "HTTPS://a.com");
  assert.equal(ensureHttpUrl("   "), null);
  assert.equal(ensureHttpUrl("http://"), null);
});

test("hostnameOf returns hostname or fallback", () => {
  assert.equal(hostnameOf("https://sub.example.com/x"), "sub.example.com");
  assert.equal(hostnameOf("nope"), "Invalid URL");
});
