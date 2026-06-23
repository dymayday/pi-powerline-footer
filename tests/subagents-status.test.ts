import assert from "node:assert/strict";
import { test } from "node:test";
import { formatSubagentPowerlineStatus } from "../subagents-status.ts";

test("formats single async running step with one-based display", () => {
  const formatted = formatSubagentPowerlineStatus({
    foreground: null,
    asyncRuns: [
      {
        id: "run-1",
        source: "async",
        mode: "chain",
        state: "running",
        activeAgent: "worker",
        currentStep: 1,
        totalSteps: 4,
        updatedAt: 1_000,
      },
    ],
    lastTerminal: null,
  }, { now: 2_000, maxWidth: 48 });

  assert.equal(formatted.visible, true);
  assert.equal(formatted.tone, "running");
  assert.equal(formatted.content, "⠋ subagents 1 async · worker step 2/4");
});

test("prioritizes needs_attention over normal running", () => {
  const formatted = formatSubagentPowerlineStatus({
    foreground: null,
    asyncRuns: [
      { id: "a", source: "async", mode: "single", state: "running", activeAgent: "worker", updatedAt: 1 },
      { id: "b", source: "async", mode: "single", state: "running", activityState: "needs_attention", activeAgent: "reviewer", updatedAt: 2 },
    ],
    lastTerminal: null,
  }, { now: 3, maxWidth: 48 });

  assert.equal(formatted.tone, "attention");
  assert.equal(formatted.content, "⚠ subagents needs attention · reviewer");
});

test("truncates long foreground content", () => {
  const formatted = formatSubagentPowerlineStatus({
    foreground: {
      id: "fg",
      source: "foreground",
      mode: "single",
      state: "running",
      activeAgent: "extremely-long-reviewer-agent-name",
      currentTool: "read",
      currentPath: "/very/long/path/to/source/file/with/many/segments/example.ts",
      updatedAt: 1,
    },
    asyncRuns: [],
    lastTerminal: null,
  }, { now: 2, maxWidth: 48 });

  assert.equal(formatted.visible, true);
  assert.ok(formatted.content.startsWith("⠋ subagents foreground"));
  assert.ok(formatted.visibleWidth <= 48);
});
