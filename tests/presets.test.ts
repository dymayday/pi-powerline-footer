import assert from "node:assert/strict";
import { test } from "node:test";
import { PRESETS } from "../presets.ts";

test("default preset includes subagents segment", () => {
  assert.ok(PRESETS.default.leftSegments.includes("subagents"));
});
