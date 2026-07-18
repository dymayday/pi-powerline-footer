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
    codexQuota: null,
    sessionStartTime: Date.now(),
    timeFocus: false,
    shellModeActive: false,
    shellRunning: false,
    shellName: null,
    shellCwd: null,
    git: { branch: null, staged: 0, unstaged: 0, untracked: 0 },
    extensionStatuses: new Map(),
    hiddenExtensionStatusKeys: new Set(),
    customItemsById: new Map(),
    subagentsStatus: null,
    options: {},
    theme: { fg: (_color: string, text: string) => text },
    colors: {},
    ...overrides,
  };
}

test("focused elapsed time uses the warning theme color", () => {
  const rendered = renderSegment(
    "time_spent",
    makeContext({
      timeFocus: true,
      sessionStartTime: Date.now() - 2_000,
      theme: { fg: (color: string, text: string) => `<${color}>${text}</${color}>` },
    }),
  );

  assert.equal(rendered.visible, true);
  assert.match(rendered.content, /^<warning>/);
  assert.match(rendered.content, /<\/warning>$/);
});

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

test("quota segment renders raw primary and weekly usage", () => {
  const rendered = renderSegment("quota", makeContext({
    codexQuota: {
      primary: { usedPercent: 25, windowMinutes: 300 },
      secondary: { usedPercent: 60, windowMinutes: 10080 },
    },
  }));

  assert.equal(rendered.visible, true);
  assert.equal(rendered.content, "5h 25% · wk 60%");
});

test("quota segment is hidden without a Codex quota snapshot", () => {
  const rendered = renderSegment("quota", makeContext());
  assert.equal(rendered.visible, false);
  assert.equal(rendered.content, "");
});

test("subagents segment is hidden with no status", () => {
  const rendered = renderSegment("subagents", makeContext({ subagentsStatus: null }));

  assert.equal(rendered.visible, false);
});

test("subagents segment renders compact status with tone color", () => {
  const rendered = renderSegment(
    "subagents",
    makeContext({
      subagentsStatus: {
        visible: true,
        content: "⠋ subagents 1 async · worker",
        tone: "running",
        visibleWidth: 29,
      },
    }),
  );

  assert.equal(rendered.visible, true);
  assert.equal(rendered.content, "⠋ subagents 1 async · worker");
});
