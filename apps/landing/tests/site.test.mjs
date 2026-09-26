import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Check the actual static output, including React-rendered links and Astro images.
test("the landing page ships working navigation, assets, and honest release links", () => {
  const html = readFileSync("dist/index.html", "utf8");
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.equal((html.match(/<details\b/g) ?? []).length, 5);
  assert.match(html, /Approved installers are on the way/);
  assert.match(html, /https:\/\/github.com\/antick\/copper\/releases/);
  assert.match(html, /<link rel="canonical" href="https:\/\/copper.potion.sh"/);
  assert.doesNotMatch(html, /<astro-island\b/);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(html.includes(`id="${target}"`), `Missing anchor: ${target}`);
  }
  for (const [, asset] of html.matchAll(
    /(?:src|href)="(\/_astro\/[^"?#]+)"/g,
  )) {
    assert.ok(existsSync(join("dist", asset)), `Missing asset: ${asset}`);
  }
  assert.match(
    readFileSync("dist/robots.txt", "utf8"),
    /Sitemap: https:\/\/copper.potion.sh\/sitemap.xml/,
  );
  assert.match(
    readFileSync("dist/sitemap.xml", "utf8"),
    /<loc>https:\/\/copper.potion.sh\/<\/loc>/,
  );
});
