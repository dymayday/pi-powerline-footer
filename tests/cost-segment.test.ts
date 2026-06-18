import test from "node:test";
import assert from "node:assert/strict";
import { renderSegment } from "../segments.ts";
import type { SegmentContext } from "../types.ts";

function createSegmentContext(overrides: Partial<SegmentContext> = {}): SegmentContext {
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

test("cost segment defaults to subscription marker for subscription auth", () => {
  const rendered = renderSegment(
    "cost",
    createSegmentContext({
      usageStats: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0.1234 },
      usingSubscription: true,
    }),
  );

  assert.equal(rendered.visible, true);
  assert.equal(rendered.content, "(sub)");
});

test("cost segment can show reported cost for subscription auth", () => {
  const rendered = renderSegment(
    "cost",
    createSegmentContext({
      usageStats: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0.1234 },
      usingSubscription: true,
      options: { cost: { subscriptionDisplay: "reported-cost" } },
    }),
  );

  assert.equal(rendered.visible, true);
  assert.equal(rendered.content, "$0.12");
});

test("cost segment can show reported cost and subscription marker together", () => {
  const rendered = renderSegment(
    "cost",
    createSegmentContext({
      usageStats: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0.1234 },
      usingSubscription: true,
      options: { cost: { subscriptionDisplay: "both" } },
    }),
  );

  assert.equal(rendered.visible, true);
  assert.equal(rendered.content, "$0.12 (sub)");
});

test("cost segment falls back to subscription marker when no cost is reported", () => {
  for (const subscriptionDisplay of ["reported-cost", "both"] as const) {
    const rendered = renderSegment(
      "cost",
      createSegmentContext({
        usingSubscription: true,
        options: { cost: { subscriptionDisplay } },
      }),
    );

    assert.equal(rendered.visible, true);
    assert.equal(rendered.content, "(sub)");
  }
});

test("cost segment keeps non-subscription cost behavior", () => {
  const rendered = renderSegment(
    "cost",
    createSegmentContext({
      usageStats: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0.1234 },
      options: { cost: { subscriptionDisplay: "both" } },
    }),
  );

  assert.equal(rendered.visible, true);
  assert.equal(rendered.content, "$0.12");
});
