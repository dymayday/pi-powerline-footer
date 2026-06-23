import assert from "node:assert/strict";
import { test } from "node:test";
import { formatSubagentPowerlineStatus, scanAsyncStatusFiles, STALE_STATUS_MS } from "../subagents-status.ts";

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

test("scanAsyncStatusFiles picks current-session active runs", () => {
  const files = new Map<string, string>();
  const statusPath = "/tmp/pi-subagents-test/async-subagent-runs/run-1/status.json";
  files.set(statusPath, JSON.stringify({
    runId: "run-1",
    sessionId: "session-a",
    mode: "chain",
    state: "running",
    startedAt: 1_000,
    lastUpdate: 2_000,
    currentStep: 1,
    chainStepCount: 3,
    steps: [
      { agent: "scout", status: "complete" },
      { agent: "worker", status: "running", currentTool: "read", currentPath: "/tmp/src.ts" },
      { agent: "reviewer", status: "pending" },
    ],
  }));

  const runs = scanAsyncStatusFiles({
    tmpDir: "/tmp",
    sessionId: "session-a",
    now: 2_500,
    readFile: (path) => files.get(path)!,
    statMtimeMs: () => 2_000,
    listDirs: (path) => path === "/tmp" ? ["pi-subagents-test"] : path.endsWith("async-subagent-runs") ? ["run-1"] : [],
    exists: (path) => path === statusPath,
  });

  assert.equal(runs.length, 1);
  assert.equal(runs[0].activeAgent, "worker");
  assert.equal(runs[0].currentStep, 1);
  assert.equal(runs[0].totalSteps, 3);
  assert.equal(runs[0].currentTool, "read");
  assert.equal(runs[0].currentPath, "/tmp/src.ts");
});

test("scanAsyncStatusFiles ignores stale no-session status files", () => {
  const files = new Map<string, string>();
  const statusPath = "/tmp/pi-subagents-test/async-subagent-runs/run-1/status.json";
  files.set(statusPath, JSON.stringify({
    runId: "run-1",
    mode: "single",
    state: "running",
    startedAt: 1_000,
    lastUpdate: 2_000,
    steps: [{ agent: "worker", status: "running" }],
  }));

  const now = 100_000;
  const runs = scanAsyncStatusFiles({
    tmpDir: "/tmp",
    now,
    readFile: (path) => files.get(path)!,
    statMtimeMs: () => now - STALE_STATUS_MS - 1,
    listDirs: (path) => path === "/tmp" ? ["pi-subagents-test"] : path.endsWith("async-subagent-runs") ? ["run-1"] : [],
    exists: (path) => path === statusPath,
  });

  assert.deepEqual(runs, []);
});

test("scanAsyncStatusFiles ignores other-session runs", () => {
  const files = new Map<string, string>();
  const statusPath = "/tmp/pi-subagents-test/async-subagent-runs/run-1/status.json";
  files.set(statusPath, JSON.stringify({
    runId: "run-1",
    sessionId: "session-b",
    mode: "single",
    state: "running",
    startedAt: 1_000,
    lastUpdate: 2_000,
    steps: [{ agent: "worker", status: "running" }],
  }));

  const runs = scanAsyncStatusFiles({
    tmpDir: "/tmp",
    sessionId: "session-a",
    now: 2_500,
    readFile: (path) => files.get(path)!,
    statMtimeMs: () => 2_000,
    listDirs: (path) => path === "/tmp" ? ["pi-subagents-test"] : path.endsWith("async-subagent-runs") ? ["run-1"] : [],
    exists: (path) => path === statusPath,
  });

  assert.deepEqual(runs, []);
});

test("scanAsyncStatusFiles promotes needs_attention from non-current steps", () => {
  const files = new Map<string, string>();
  const statusPath = "/tmp/pi-subagents-test/async-subagent-runs/run-1/status.json";
  files.set(statusPath, JSON.stringify({
    runId: "run-1",
    sessionId: "session-a",
    mode: "parallel",
    state: "running",
    startedAt: 1_000,
    lastUpdate: 2_000,
    currentStep: 0,
    steps: [
      { agent: "worker", status: "running" },
      { agent: "reviewer", status: "running", activityState: "needs_attention", currentTool: "bash" },
    ],
  }));

  const runs = scanAsyncStatusFiles({
    tmpDir: "/tmp",
    sessionId: "session-a",
    now: 2_500,
    readFile: (path) => files.get(path)!,
    statMtimeMs: () => 2_000,
    listDirs: (path) => path === "/tmp" ? ["pi-subagents-test"] : path.endsWith("async-subagent-runs") ? ["run-1"] : [],
    exists: (path) => path === statusPath,
  });

  assert.equal(runs.length, 1);
  assert.equal(runs[0].activityState, "needs_attention");
  assert.equal(runs[0].activeAgent, "reviewer");
  assert.equal(runs[0].attentionCount, 1);

  const formatted = formatSubagentPowerlineStatus({ foreground: null, asyncRuns: runs, lastTerminal: null });
  assert.equal(formatted.tone, "attention");
  assert.equal(formatted.content, "⚠ subagents needs attention · reviewer");
});
