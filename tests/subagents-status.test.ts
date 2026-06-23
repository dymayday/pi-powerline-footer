import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import {
  createSubagentStatusController,
  formatSubagentPowerlineStatus,
  MAX_STATUS_READ_FAILURES,
  MISSING_STATUS_GRACE_MS,
  scanAsyncStatusFiles,
  STALE_STATUS_MS,
  TERMINAL_RETENTION_MS,
} from "../subagents-status.ts";

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

test("controller handles async start and completion retention", () => {
  let now = 1_000;
  let renderRequests = 0;
  const controller = createSubagentStatusController({
    getNow: () => now,
    requestRender: () => { renderRequests++; },
    scanAsyncRuns: () => [],
  });

  controller.start("session-a");
  controller.handleAsyncStarted({ id: "run-1", asyncDir: "/tmp/run-1", mode: "single", agent: "worker" });
  assert.match(controller.getPowerlineStatus().content, /worker/);

  controller.handleAsyncComplete({ runId: "run-1", success: true });
  assert.match(controller.getPowerlineStatus().content, /complete/);

  now += TERMINAL_RETENTION_MS + 1;
  controller.prune();
  assert.equal(controller.getPowerlineStatus().visible, false);
  assert.ok(renderRequests >= 2);
});

test("controller accepts id, runId, and asyncId completion ids", () => {
  const completionPayloads = [
    { id: "run-id", success: true },
    { runId: "run-id", success: true },
    { asyncId: "run-id", success: true },
  ];

  for (const payload of completionPayloads) {
    const controller = createSubagentStatusController({ scanAsyncRuns: () => [] });
    controller.start("session-a");
    controller.handleAsyncStarted({ id: "run-id", asyncDir: "/tmp/run-id", mode: "single", agent: "worker" });
    controller.handleAsyncComplete(payload);
    assert.equal(controller.getPowerlineStatus().tone, "success");
  }
});

test("controller preserves paused async completion state", () => {
  const controller = createSubagentStatusController({ scanAsyncRuns: () => [] });
  controller.start("session-a");
  controller.handleAsyncStarted({ asyncId: "run-1", asyncDir: "/tmp/run-1", mode: "single", agent: "worker" });
  controller.handleAsyncComplete({ runId: "run-1", state: "paused" });
  const status = controller.getPowerlineStatus();
  assert.equal(status.tone, "paused");
  assert.match(status.content, /paused/);
});

test("controller automatically clears retained terminal summary on timer tick", () => {
  let now = 1_000;
  let intervalCallback: (() => void) | null = null;
  let cleared = false;
  const controller = createSubagentStatusController({
    getNow: () => now,
    scanAsyncRuns: () => [],
    setIntervalFn: (callback: () => void) => {
      intervalCallback = callback;
      return 1 as never;
    },
    clearIntervalFn: () => { cleared = true; },
  });

  controller.start("session-a");
  controller.handleAsyncStarted({ id: "run-1", asyncDir: "/tmp/run-1", mode: "single", agent: "worker" });
  controller.handleAsyncComplete({ id: "run-1", success: true });
  assert.equal(controller.getPowerlineStatus().visible, true);

  now += TERMINAL_RETENTION_MS + 1;
  const tick = intervalCallback as (() => void) | null;
  assert.ok(tick);
  tick();

  assert.equal(controller.getPowerlineStatus().visible, false);
  assert.equal(cleared, true);
});

test("controller clears missing async status after grace period", () => {
  let now = 1_000;
  const controller = createSubagentStatusController({
    getNow: () => now,
    scanAsyncRuns: () => [],
  });

  controller.start("session-a");
  controller.handleAsyncStarted({ id: "run-1", asyncDir: "/tmp/run-1", mode: "single", agent: "worker" });
  controller.scanNow();
  assert.equal(controller.getPowerlineStatus().visible, true);

  now += MISSING_STATUS_GRACE_MS + 1;
  controller.scanNow();
  assert.equal(controller.getPowerlineStatus().visible, false);
});

test("controller clears malformed status after max read failures", () => {
  const controller = createSubagentStatusController({
    scanAsyncRuns: () => { throw new Error("malformed status"); },
  });

  controller.start("session-a");
  controller.handleAsyncStarted({ id: "run-1", asyncDir: "/tmp/run-1", mode: "single", agent: "worker" });

  for (let i = 0; i < MAX_STATUS_READ_FAILURES - 1; i++) {
    controller.scanNow();
    assert.equal(controller.getPowerlineStatus().visible, true);
  }

  controller.scanNow();
  assert.equal(controller.getPowerlineStatus().visible, false);
});

test("controller handles nested control event payloads with outer run id", () => {
  const controller = createSubagentStatusController({ scanAsyncRuns: () => [] });
  controller.start("session-a");
  controller.handleAsyncStarted({ id: "run-1", asyncDir: "/tmp/run-1", mode: "single", agent: "worker" });

  controller.handleControlEvent({ runId: "run-1", event: { type: "needs_attention", agent: "reviewer" } });

  const status = controller.getPowerlineStatus();
  assert.equal(status.tone, "attention");
  assert.match(status.content, /reviewer/);
});

test("controller clears repeated scanned terminal status using original terminal time", () => {
  let now = 1_000;
  let intervalCallback: (() => void) | null = null;
  let cleared = false;
  const completedRun = {
    id: "run-1",
    source: "async" as const,
    mode: "single" as const,
    state: "complete" as const,
    activeAgent: "worker",
    updatedAt: 1_000,
  };
  const controller = createSubagentStatusController({
    getNow: () => now,
    scanAsyncRuns: () => [completedRun],
    setIntervalFn: (callback: () => void) => {
      intervalCallback = callback;
      return 1 as never;
    },
    clearIntervalFn: () => { cleared = true; },
  });

  controller.start("session-a");
  controller.scanNow();
  assert.equal(controller.getPowerlineStatus().visible, true);

  now += TERMINAL_RETENTION_MS + 1;
  const tick = intervalCallback as (() => void) | null;
  assert.ok(tick);
  tick();

  assert.equal(controller.getPowerlineStatus().visible, false);
  assert.equal(cleared, true);
});

test("controller clears malformed default status files after max read failures", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "powerline-subagents-"));
  try {
    const asyncDir = path.join(tmpRoot, "pi-subagents-test", "async-subagent-runs", "run-1");
    fs.mkdirSync(asyncDir, { recursive: true });
    fs.writeFileSync(path.join(asyncDir, "status.json"), "{not-json", "utf8");

    const controller = createSubagentStatusController({ getTmpDir: () => tmpRoot });
    controller.start("session-a");
    controller.handleAsyncStarted({ id: "run-1", asyncDir, mode: "single", agent: "worker" });

    for (let i = 0; i < MAX_STATUS_READ_FAILURES - 1; i++) {
      controller.scanNow();
      assert.equal(controller.getPowerlineStatus().visible, true);
    }

    controller.scanNow();
    assert.equal(controller.getPowerlineStatus().visible, false);
    controller.dispose();
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("controller clears malformed default-discovered status files after max read failures", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "powerline-subagents-"));
  try {
    const asyncDir = path.join(tmpRoot, "pi-subagents-test", "async-subagent-runs", "run-1");
    const statusPath = path.join(asyncDir, "status.json");
    fs.mkdirSync(asyncDir, { recursive: true });
    fs.writeFileSync(statusPath, JSON.stringify({
      runId: "run-1",
      sessionId: "session-a",
      mode: "single",
      state: "running",
      startedAt: 1_000,
      lastUpdate: 2_000,
      steps: [{ agent: "worker", status: "running" }],
    }), "utf8");

    const controller = createSubagentStatusController({ getTmpDir: () => tmpRoot });
    controller.start("session-a");
    controller.scanNow();
    assert.equal(controller.getPowerlineStatus().visible, true);

    fs.writeFileSync(statusPath, "{not-json", "utf8");
    for (let i = 0; i < MAX_STATUS_READ_FAILURES - 1; i++) {
      controller.scanNow();
      assert.equal(controller.getPowerlineStatus().visible, true);
    }

    controller.scanNow();
    assert.equal(controller.getPowerlineStatus().visible, false);
    controller.dispose();
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("controller handles foreground fallback lifecycle", () => {
  const controller = createSubagentStatusController({ scanAsyncRuns: () => [] });
  controller.start("session-a");

  controller.handleForegroundStart({ args: { agent: "worker", mode: "single" } });
  let status = controller.getPowerlineStatus();
  assert.equal(status.visible, true);
  assert.match(status.content, /foreground/);
  assert.match(status.content, /worker/);

  controller.handleForegroundUpdate({ unknown: true });
  status = controller.getPowerlineStatus();
  assert.match(status.content, /foreground/);

  controller.handleForegroundEnd({ isError: false });
  status = controller.getPowerlineStatus();
  assert.equal(status.tone, "success");
  assert.match(status.content, /complete/);
});

test("controller dispose clears timers and makes handlers no-op until restart", () => {
  let clearCount = 0;
  const controller = createSubagentStatusController({
    scanAsyncRuns: () => [],
    setIntervalFn: () => 1 as never,
    clearIntervalFn: () => { clearCount++; },
  });

  controller.start("session-a");
  controller.handleAsyncStarted({ id: "run-1", asyncDir: "/tmp/run-1", mode: "single", agent: "worker" });
  assert.equal(controller.getPowerlineStatus().visible, true);

  controller.dispose();
  assert.equal(clearCount, 1);
  assert.equal(controller.getPowerlineStatus().visible, false);

  controller.handleAsyncStarted({ id: "run-2", asyncDir: "/tmp/run-2", mode: "single", agent: "worker" });
  assert.equal(controller.getPowerlineStatus().visible, false);
});
