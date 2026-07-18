import assert from "node:assert/strict";
import test from "node:test";
import { PRESETS } from "../presets.ts";

const existingDefaultOrder = [
  "model",
  "thinking",
  "shell_mode",
  "path",
  "git",
  "subagents",
  "context_pct",
  "cache_read",
  "cost",
  "quota",
  "extension_statuses",
];

test("default preset separates work and metric segments", () => {
  assert.deepEqual(PRESETS.default.leftSegments, [
    "model",
    "thinking",
    "shell_mode",
    "path",
    "git",
    "subagents",
  ]);
  assert.deepEqual(PRESETS.default.rightSegments, [
    "context_pct",
    "cache_read",
    "cost",
    "quota",
  ]);
});

test("default preset retains its flattened flow order", () => {
  assert.deepEqual(
    [
      ...PRESETS.default.leftSegments,
      ...PRESETS.default.rightSegments,
      ...(PRESETS.default.secondarySegments ?? []),
    ],
    existingDefaultOrder,
  );
});
