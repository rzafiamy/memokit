import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../src/shared/utils.js";

test("escapeHtml escapes markup characters", () => {
  assert.equal(escapeHtml(`<img src=x onerror="a('b')">&`), "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(3), "3");
});
