import assert from "node:assert/strict";
import { test } from "node:test";
import { renderSegment } from "../segments.ts";
import type { SegmentContext } from "../types.ts";

function makeContext(overrides: Partial<SegmentContext> = {}): SegmentContext {
  return {
    model: undefined,
    thinkingLevel: "off",
    sessionId: undefined,
    cwd: "/tmp/project",
    usageStats: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
    contextPercent: 0,
    contextWindow: 0,
    autoCompactEnabled: true,
    customCompactionEnabled: false,
    usingSubscription: false,
    sessionStartTime: Date.now(),
    shellModeActive: false,
    shellRunning: false,
    shellName: null,
    shellCwd: null,
    git: { branch: null, staged: 0, unstaged: 0, untracked: 0 },
    extensionStatuses: new Map(),
    hiddenExtensionStatusKeys: new Set(),
    customItemsById: new Map(),
    options: {},
    theme: { fg: (_color: string, text: string) => text },
    colors: {},
    ...overrides,
  };
}

test("cost segment shows reported session cost even when using subscription auth", () => {
  const rendered = renderSegment(
    "cost",
    makeContext({
      usageStats: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0.1234 },
      usingSubscription: true,
    }),
  );

  assert.equal(rendered.visible, true);
  assert.equal(rendered.content, "$0.12");
});

test("cost segment falls back to subscription marker when no cost is reported", () => {
  const rendered = renderSegment(
    "cost",
    makeContext({
      usageStats: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
      usingSubscription: true,
    }),
  );

  assert.equal(rendered.visible, true);
  assert.equal(rendered.content, "(sub)");
});
