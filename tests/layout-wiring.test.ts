import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../index.ts", import.meta.url), "utf8");

test("index computes named powerline bands", () => {
  assert.match(source, /packPowerlineLayout\(/);
  assert.match(
    source,
    /mergeSegmentsWithCustomItems\(\s*presetDef,\s*config\.customItems,\s*config\.timeFocus,\s*\)/,
  );
  assert.match(source, /topLines: packed\.topRows\.map/);
  assert.match(source, /secondaryLines: packed\.secondaryRows\.map/);
});

test("top and secondary renderers consume named layout lines", () => {
  assert.match(source, /return getResponsiveLayout\(width, theme\)\.topLines/);
  assert.match(source, /return getResponsiveLayout\(width, theme\)\.secondaryLines/);
  assert.match(
    source,
    /lastLayoutResult = \{ topLines: \[\], secondaryLines: \[\] \}/,
  );
});
