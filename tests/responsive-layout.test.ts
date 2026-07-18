import assert from "node:assert/strict";
import test from "node:test";
import { visibleWidth } from "@earendil-works/pi-tui";
import {
  MAX_POWERLINE_ROWS,
  packPowerlineLayout,
  packSegmentsIntoRows,
  type LayoutSegment,
} from "../responsive-layout.ts";

const segment = (content: string): LayoutSegment => ({
  content,
  width: visibleWidth(content),
});

const renderedWidth = (parts: readonly string[], separatorWidth: number): number =>
  2 + parts.reduce(
    (total, part, index) => total + visibleWidth(part) + (index > 0 ? separatorWidth : 0),
    0,
  );

test("packs overflow across more than two rows in order", () => {
  const rows = packSegmentsIntoRows(
    ["aaa", "bbb", "ccc", "ddd", "eee"].map(segment),
    9,
    1,
  );

  assert.deepEqual(rows, [
    ["aaa", "bbb"],
    ["ccc", "ddd"],
    ["eee"],
  ]);
});

test("wraps a long timer status instead of dropping it", () => {
  const status = [
    "⏱ total 1m 0s · run 1m 0s running",
    "LSP Active: typescript",
    "○ 🐴 ponytail: ⚡ FULL",
  ].join(" · ");

  const rows = packSegmentsIntoRows([segment(status)], 40, 3);
  const text = rows.flat().join(" ").replace(/\s+/g, " ");

  assert.ok(rows.length > 1);
  assert.match(text, /total 1m 0s/);
  assert.match(text, /LSP Active: typescript/);
  assert.match(text, /ponytail:/);
  assert.ok(rows.every((row) => renderedWidth(row, 3) <= 40));
});

test("wraps ANSI-colored oversized content within visible width", () => {
  const content = `\x1b[31m${"abcdefghij".repeat(3)}\x1b[0m`;
  const rows = packSegmentsIntoRows([segment(content)], 10, 3);
  const plainText = rows.flat().join("").replace(/\x1b\[[0-9;]*m/g, "");

  assert.equal(plainText, "abcdefghij".repeat(3));
  assert.ok(rows.every((row) => renderedWidth(row, 3) <= 10));
});

test("retains only the earliest seven rows", () => {
  const rows = packSegmentsIntoRows(
    Array.from({ length: 10 }, (_, index) => segment(`row-${index}`)),
    7,
    1,
  );

  assert.equal(rows.length, MAX_POWERLINE_ROWS);
  assert.deepEqual(rows.flat(), Array.from({ length: 7 }, (_, index) => `row-${index}`));
});

test("does not emit an unsplittable wide grapheme beyond terminal width", () => {
  const rows = packSegmentsIntoRows([segment("😀")], 3, 1);

  assert.deepEqual(rows, []);
});

test("returns no rows when outer padding cannot fit", () => {
  assert.deepEqual(packSegmentsIntoRows([segment("status")], 2, 1), []);
  assert.deepEqual(packSegmentsIntoRows([segment("status")], 0, 1), []);
});

test("flow layout preserves flattened packing order", () => {
  const layout = packPowerlineLayout(
    "flow",
    [segment("aaa")],
    [segment("bbb")],
    [segment("ccc")],
    9,
    1,
  );

  assert.deepEqual(layout, {
    topRows: [["aaa", "bbb"]],
    secondaryRows: [["ccc"]],
  });
});

test("balanced layout keeps work and metrics in separate bands", () => {
  const layout = packPowerlineLayout(
    "balanced",
    [segment("aaa")],
    [segment("bbb")],
    [segment("ccc")],
    9,
    1,
  );

  assert.deepEqual(layout, {
    topRows: [["aaa"]],
    secondaryRows: [["bbb", "ccc"]],
  });
});

test("balanced layout wraps each band independently", () => {
  const layout = packPowerlineLayout(
    "balanced",
    [segment("work1"), segment("work2")],
    [segment("metric1"), segment("metric2")],
    [],
    9,
    1,
  );

  assert.deepEqual(layout.topRows, [["work1"], ["work2"]]);
  assert.deepEqual(layout.secondaryRows, [["metric1"], ["metric2"]]);
});

test("balanced layout reserves one of seven rows for metrics", () => {
  const layout = packPowerlineLayout(
    "balanced",
    Array.from({ length: 10 }, (_, index) => segment(`work${index}`)),
    [segment("timer")],
    [],
    7,
    1,
  );

  assert.equal(layout.topRows.length, 6);
  assert.deepEqual(layout.topRows.flat(), Array.from({ length: 6 }, (_, index) => `work${index}`));
  assert.deepEqual(layout.secondaryRows, [["timer"]]);
  assert.equal(layout.topRows.length + layout.secondaryRows.length, MAX_POWERLINE_ROWS);
});
