import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCodexQuotaWindow, parseCodexQuota } from "../codex-quota.ts";

test("parses raw primary and secondary Codex quota values", () => {
  assert.deepEqual(parseCodexQuota({
    "x-codex-primary-used-percent": "25",
    "x-codex-primary-window-minutes": "300",
    "x-codex-secondary-used-percent": "60.5",
    "x-codex-secondary-window-minutes": "10080",
  }), {
    primary: { usedPercent: 25, windowMinutes: 300 },
    secondary: { usedPercent: 60.5, windowMinutes: 10080 },
  });
});

test("ignores malformed quota values and preserves valid partial data", () => {
  assert.deepEqual(parseCodexQuota({
    "x-codex-primary-used-percent": "not-a-number",
    "x-codex-secondary-used-percent": "0",
    "x-codex-secondary-window-minutes": "10080",
  }), {
    secondary: { usedPercent: 0, windowMinutes: 10080 },
  });
  assert.equal(parseCodexQuota({ "x-codex-primary-used-percent": "Infinity" }), null);
});

test("formats raw usage with reported or fallback window labels", () => {
  assert.equal(formatCodexQuotaWindow({ usedPercent: 25, windowMinutes: 300 }, "5h"), "5h 25%");
  assert.equal(formatCodexQuotaWindow({ usedPercent: 60.5, windowMinutes: 10080 }, "wk"), "wk 60.5%");
  assert.equal(formatCodexQuotaWindow({ usedPercent: 12, windowMinutes: undefined }, "wk"), "wk 12%");
});
