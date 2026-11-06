import test from "node:test";
import assert from "node:assert/strict";
import { fileNameFromUrl, parsePdfUrl } from "../js/pdf-url.js";

test("http と https の URL だけを受け付ける", () => {
  assert.equal(parsePdfUrl("  https://example.com/a.pdf ").href, "https://example.com/a.pdf");
  assert.equal(parsePdfUrl("http://example.com/a.pdf").protocol, "http:");
  assert.equal(parsePdfUrl("example.com/a.pdf"), null);
  assert.equal(parsePdfUrl("file:///home/a.pdf"), null);
  assert.equal(parsePdfUrl("javascript:alert(1)"), null);
  assert.equal(parsePdfUrl(""), null);
});

test("URL からファイル名を決める", () => {
  const name = (url) => fileNameFromUrl(new URL(url));
  assert.equal(name("https://example.com/files/Monkey%20Hat.PDF?v=2"), "Monkey Hat.pdf");
  assert.equal(name("https://example.com/download/1234"), "1234.pdf");
  assert.equal(name("https://example.com/"), "example.com.pdf");
  assert.equal(name("https://example.com/%E0%A4%A.pdf"), "%E0%A4%A.pdf");
});
