# Subagent Progress Powerline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an always-visible `subagents` Powerline segment that shows compact progress for both async/background and sync/foreground Pi subagent runs.

**Architecture:** Add a focused `subagents-status.ts` module that owns normalization, async status-file discovery/polling, foreground progress updates, terminal summary retention, and compact formatting. Wire that module into `index.ts` lifecycle/event hooks and expose a `subagents` status snapshot through `SegmentContext` so the existing `segments.ts` stub can render it. Keep `pi-subagents` optional by using event names and status-file shapes defensively rather than static imports.

**Tech Stack:** TypeScript Pi extension, Node built-ins (`fs`, `os`, `path`), `node:test`, `@earendil-works/pi-tui` width/truncation utilities, existing Powerline segment/render scheduler.

---

## File structure

- Create `subagents-status.ts`
  - Pure constants/types.
  - Status JSON parsing and normalization.
  - Async run scanning/polling controller.
  - Foreground subagent lifecycle/update controller.
  - Compact formatter that returns `{ content, tone, visible }` for `segments.ts`.
- Create `tests/subagents-status.test.ts`
  - Unit tests for formatting, normalization, status scanning, failure cutoffs, retention timers, and foreground fallback.
- Modify `types.ts`
  - Add `SubagentPowerlineStatus` and `subagentsStatus?: SubagentPowerlineStatus | null` to `SegmentContext`.
- Modify `segments.ts`
  - Replace hidden `subagents` stub with a real segment that reads `ctx.subagentsStatus`.
- Modify `presets.ts`
  - Add `subagents` to the default preset left segments.
- Modify `index.ts`
  - Import and create the subagent status controller.
  - Start/stop it during session lifecycle and Powerline enable/disable.
  - Subscribe to async event-bus events.
  - Subscribe to foreground `tool_execution_start`, `tool_execution_update`, and `tool_execution_end`.
  - Pass `subagentsStatus` into `buildSegmentContext`.
- Modify `README.md`
  - Document the `subagents` segment and that it appears automatically when `pi-subagents` is active.

## Task 1: Add pure subagent status formatter and types

**Files:**
- Create: `subagents-status.ts`
- Create: `tests/subagents-status.test.ts`
- Modify: none yet

- [ ] **Step 1: Write failing formatter tests**

Add tests like:

```ts
import test from "node:test";
import assert from "node:assert/strict";
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

test("prioritizes needs attention over normal running", () => {
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

test("truncates long content before returning a segment string", () => {
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
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
cd /Users/meidhy/.pi/agent/git/github.com/dymayday/pi-powerline-footer
npm test -- tests/subagents-status.test.ts
```

Expected: fails because `subagents-status.ts` does not exist.

- [ ] **Step 3: Implement the minimal formatter and exported types**

Create `subagents-status.ts` with constants and pure formatter:

```ts
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export const ASYNC_POLL_INTERVAL_MS = 1_000;
export const MISSING_STATUS_GRACE_MS = 3_000;
export const TERMINAL_RETENTION_MS = 10_000;
export const STALE_STATUS_MS = 30_000;
export const MAX_STATUS_READ_FAILURES = 3;
export const MAX_SEGMENT_VISIBLE_WIDTH = 48;

export type SubagentLifecycleState = "queued" | "running" | "complete" | "failed" | "paused";
export type SubagentActivityState = "active_long_running" | "needs_attention";
export type SubagentSource = "foreground" | "async";
export type SubagentMode = "single" | "parallel" | "chain";
export type SubagentPowerlineTone = "running" | "attention" | "success" | "error" | "paused";

export interface SubagentRunSummary {
  id: string;
  source: SubagentSource;
  mode: SubagentMode;
  state: SubagentLifecycleState;
  activityState?: SubagentActivityState;
  activeAgent?: string;
  currentStep?: number;
  totalSteps?: number;
  currentTool?: string;
  currentPath?: string;
  runningCount?: number;
  attentionCount?: number;
  updatedAt: number;
}

export interface SubagentTerminalSummary extends SubagentRunSummary {
  terminalAt: number;
}

export interface SubagentStatusState {
  foreground: SubagentRunSummary | null;
  asyncRuns: SubagentRunSummary[];
  lastTerminal: SubagentTerminalSummary | null;
}

export interface SubagentPowerlineStatus {
  visible: boolean;
  content: string;
  tone: SubagentPowerlineTone;
  visibleWidth: number;
}

export function formatSubagentPowerlineStatus(
  state: SubagentStatusState,
  options: { now?: number; maxWidth?: number } = {},
): SubagentPowerlineStatus {
  const now = options.now ?? Date.now();
  const maxWidth = options.maxWidth ?? MAX_SEGMENT_VISIBLE_WIDTH;
  const attention = [...(state.foreground ? [state.foreground] : []), ...state.asyncRuns]
    .filter((run) => run.activityState === "needs_attention");

  let content = "";
  let tone: SubagentPowerlineTone = "running";

  if (attention.length > 0) {
    const run = newestRun(attention);
    content = joinParts("⚠ subagents needs attention", run.activeAgent);
    tone = "attention";
  } else if (state.foreground && isActive(state.foreground)) {
    content = foregroundContent(state.foreground);
    tone = "running";
  } else {
    const activeAsync = state.asyncRuns.filter(isActive);
    if (activeAsync.length === 1) {
      content = asyncContent(activeAsync[0]);
      tone = "running";
    } else if (activeAsync.length > 1) {
      const attentionCount = activeAsync.filter((run) => run.activityState === "needs_attention").length;
      content = `⠋ subagents ${activeAsync.length} running${attentionCount ? ` · ${attentionCount} attention` : ""}`;
      tone = attentionCount > 0 ? "attention" : "running";
    } else if (state.lastTerminal && now - state.lastTerminal.terminalAt <= TERMINAL_RETENTION_MS) {
      content = terminalContent(state.lastTerminal);
      tone = terminalTone(state.lastTerminal.state);
    }
  }

  if (!content) return { visible: false, content: "", tone: "running", visibleWidth: 0 };
  const truncated = truncateToWidth(content, maxWidth, "…");
  return { visible: true, content: truncated, tone, visibleWidth: visibleWidth(truncated) };
}
```

Also add small helper functions in the same file: `isActive`, `newestRun`, `joinParts`, `displayStep`, `asyncContent`, `foregroundContent`, `terminalContent`, and `terminalTone`.

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
npm test -- tests/subagents-status.test.ts
```

Expected: formatter tests pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add subagents-status.ts tests/subagents-status.test.ts
git commit -m "feat: add subagent status formatter"
```

## Task 2: Normalize async status files and scan active runs

**Files:**
- Modify: `subagents-status.ts`
- Modify: `tests/subagents-status.test.ts`

- [ ] **Step 1: Write failing async normalization and scan tests**

Add tests that create temp directory fixtures with `pi-subagents-test/async-subagent-runs/<id>/status.json`:

```ts
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
});
```

Add tests for stale no-session files being ignored and malformed JSON incrementing failure counts through the controller in Task 3.

- [ ] **Step 2: Run tests and verify they fail**

```bash
npm test -- tests/subagents-status.test.ts
```

Expected: fails because scanner/normalizer exports do not exist.

- [ ] **Step 3: Implement defensive async status parsing**

In `subagents-status.ts`, add minimal type guards and exports:

```ts
export interface AsyncStatusScanDeps {
  tmpDir: string;
  sessionId?: string;
  now?: number;
  listDirs(path: string): string[];
  exists(path: string): boolean;
  readFile(path: string): string;
  statMtimeMs(path: string): number;
}

export function normalizeAsyncStatus(raw: unknown, asyncDir: string, options: { now?: number; mtimeMs?: number; sessionId?: string } = {}): SubagentRunSummary | null {
  // Validate object shape defensively.
  // Keep only state queued/running/complete/failed/paused and mode single/parallel/chain.
  // If sessionId matches current session, accept it.
  // If no sessionId, only accept queued/running and fresh mtime <= STALE_STATUS_MS.
  // Pick active step from status.currentStep or first running step.
}

export function scanAsyncStatusFiles(deps: AsyncStatusScanDeps): SubagentRunSummary[] {
  // Find tmp entries starting with "pi-subagents-".
  // For each async-subagent-runs child, read status.json if present.
  // Normalize and return visible run summaries.
}
```

Use Node path joining via injected string paths or `node:path` helpers. Keep this testable through injected `listDirs`, `exists`, `readFile`, and `statMtimeMs`.

- [ ] **Step 4: Run scanner tests**

```bash
npm test -- tests/subagents-status.test.ts
```

Expected: tests pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add subagents-status.ts tests/subagents-status.test.ts
git commit -m "feat: scan async subagent status files"
```

## Task 3: Add status controller for async events, polling, retention, and foreground fallback

**Files:**
- Modify: `subagents-status.ts`
- Modify: `tests/subagents-status.test.ts`

- [ ] **Step 1: Write failing controller tests**

Add tests for:

- `handleAsyncStarted({ id, asyncDir })` creates visible running status.
- `handleAsyncComplete({ id, success: true })`, `handleAsyncComplete({ runId, success: true })`, and `handleAsyncComplete({ asyncId, success: true })` all resolve the run id and move to terminal success.
- `handleAsyncComplete({ runId, state: "paused" })` preserves paused state instead of mapping it to failed.
- Terminal summaries clear automatically after `TERMINAL_RETENTION_MS` using fake timers; polling/prune remains active while either active async runs or retained terminal summaries exist.
- Missing status clears after `MISSING_STATUS_GRACE_MS`.
- Malformed status clears after `MAX_STATUS_READ_FAILURES`.
- `handleForegroundStart`, `handleForegroundUpdate`, and `handleForegroundEnd` produce start/end fallback even without partial details.
- `dispose()` clears interval and listeners/timers through injected callbacks.

Example test shape:

```ts
test("controller retains completion briefly then clears", () => {
  let now = 1_000;
  let renderRequests = 0;
  const controller = createSubagentStatusController({
    getNow: () => now,
    requestRender: () => { renderRequests++; },
    scanAsyncRuns: () => [],
  });

  controller.handleAsyncStarted({ id: "run-1", asyncDir: "/tmp/run-1", mode: "single", agent: "worker" });
  assert.match(controller.getPowerlineStatus().content, /worker/);

  controller.handleAsyncComplete({ runId: "run-1", success: true });
  assert.match(controller.getPowerlineStatus().content, /complete/);

  now += TERMINAL_RETENTION_MS + 1;
  controller.prune();
  assert.equal(controller.getPowerlineStatus().visible, false);
  assert.ok(renderRequests >= 2);
});

test("controller preserves paused async completion state", () => {
  const controller = createSubagentStatusController({ scanAsyncRuns: () => [] });
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
  intervalCallback?.();

  assert.equal(controller.getPowerlineStatus().visible, false);
  assert.equal(cleared, true);
});
```

- [ ] **Step 2: Run controller tests and verify they fail**

```bash
npm test -- tests/subagents-status.test.ts
```

Expected: fails because controller does not exist.

- [ ] **Step 3: Implement `createSubagentStatusController`**

Add:

```ts
export interface SubagentStatusController {
  start(sessionId?: string): void;
  dispose(): void;
  scanNow(): void;
  prune(): void;
  getPowerlineStatus(): SubagentPowerlineStatus;
  handleAsyncStarted(payload: unknown): void;
  handleAsyncComplete(payload: unknown): void;
  handleControlEvent(payload: unknown): void;
  handleForegroundStart(event: unknown): void;
  handleForegroundUpdate(event: unknown): void;
  handleForegroundEnd(event: unknown): void;
}
```

Dependencies should be injectable for tests and default to real Node functions for runtime:

```ts
interface SubagentStatusControllerDeps {
  getNow?: () => number;
  getTmpDir?: () => string;
  getSessionId?: () => string | undefined;
  requestRender?: () => void;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
  scanAsyncRuns?: () => SubagentRunSummary[];
}
```

Implementation notes:

- Store async runs in a `Map<string, SubagentRunSummary & { asyncDir?: string; missingSince?: number; readFailures?: number }>`.
- Resolve async completion IDs from `id`, `runId`, or `asyncId`. Preserve explicit `state: "paused"`; map `success: true` to `complete`; map `success: false` with no paused state to `failed`.
- Keep polling/prune active while either active async runs exist or a retained terminal summary exists. Stop polling only when neither exists.
- Schedule or tick pruning so terminal summaries clear automatically after `TERMINAL_RETENTION_MS`; do not require a later external event to clear them.
- Call `requestRender()` whenever the visible snapshot might change.
- Foreground `handleForegroundStart` should parse `event.args` enough to identify agent/mode when available but degrade to `subagents foreground`.
- Foreground `handleForegroundUpdate` should defensively read possible partial details only through a helper like `extractForegroundDetails(event: unknown)`; if no known shape exists, no-op.
- `handleForegroundEnd` should set `lastTerminal` with `state: event.isError ? "failed" : "complete"` and clear foreground. Foreground paused/interrupt states may be added later if Pi exposes them, but do not infer paused from generic non-success.
- `handleControlEvent` should set matching run/step `activityState = "needs_attention"` when payload includes `event.type === "needs_attention"` and a run id.

- [ ] **Step 4: Run controller tests**

```bash
npm test -- tests/subagents-status.test.ts
```

Expected: all subagent status tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add subagents-status.ts tests/subagents-status.test.ts
git commit -m "feat: track subagent progress state"
```

## Task 4: Wire the `subagents` segment and default preset

**Files:**
- Modify: `types.ts`
- Modify: `segments.ts`
- Modify: `presets.ts`
- Modify: `tests/segments.test.ts`
- Create or modify: `tests/presets.test.ts` if no suitable preset test exists

- [ ] **Step 1: Write failing segment and preset tests**

In `tests/segments.test.ts`, extend `makeContext()` with `subagentsStatus: null`, then add:

```ts
test("subagents segment is hidden with no status", () => {
  const rendered = renderSegment("subagents", makeContext({ subagentsStatus: null }));
  assert.equal(rendered.visible, false);
});

test("subagents segment renders compact status with tone color", () => {
  const rendered = renderSegment("subagents", makeContext({
    subagentsStatus: {
      visible: true,
      content: "⠋ subagents 1 async · worker",
      tone: "running",
      visibleWidth: 29,
    },
  }));

  assert.equal(rendered.visible, true);
  assert.equal(rendered.content, "⠋ subagents 1 async · worker");
});
```

Add a preset test:

```ts
import { PRESETS } from "../presets.ts";

test("default preset includes subagents segment", () => {
  assert.ok(PRESETS.default.leftSegments.includes("subagents"));
});
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
npm test -- tests/segments.test.ts tests/presets.test.ts
```

Expected: fail because `SegmentContext` lacks `subagentsStatus`, segment is hidden, default preset omits `subagents`.

- [ ] **Step 3: Add `SubagentPowerlineStatus` to `SegmentContext`**

In `types.ts`:

```ts
export interface SubagentPowerlineStatus {
  visible: boolean;
  content: string;
  tone: "running" | "attention" | "success" | "error" | "paused";
  visibleWidth: number;
}

export interface SegmentContext {
  // ...existing fields
  subagentsStatus?: SubagentPowerlineStatus | null;
}
```

Keep this type structurally compatible with the exported type from `subagents-status.ts`. Avoid importing from `subagents-status.ts` into `types.ts` unless it creates no cycle; duplication of this small shape is acceptable.

- [ ] **Step 4: Implement `subagents` segment**

In `segments.ts`, replace the stub with:

```ts
const subagentsSegment: StatusLineSegment = {
  id: "subagents",
  render(ctx) {
    const status = ctx.subagentsStatus;
    if (!status?.visible || !status.content) return { content: "", visible: false };

    const colorByTone = {
      running: "accent",
      attention: "warning",
      success: "success",
      error: "error",
      paused: "warning",
    } as const;

    return {
      content: applyColor(ctx.theme, colorByTone[status.tone], status.content),
      visible: true,
    };
  },
};
```

- [ ] **Step 5: Add `subagents` to default preset**

In `presets.ts`, change `PRESETS.default.leftSegments` to:

```ts
leftSegments: ["model", "thinking", "shell_mode", "path", "git", "subagents", "context_pct", "cache_read", "cost"],
```

- [ ] **Step 6: Run segment/preset tests**

```bash
npm test -- tests/segments.test.ts tests/presets.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit Task 4**

```bash
git add types.ts segments.ts presets.ts tests/segments.test.ts tests/presets.test.ts
git commit -m "feat: render subagent powerline segment"
```

## Task 5: Wire controller into Powerline lifecycle and events

**Files:**
- Modify: `index.ts`
- Modify: `subagents-status.ts` if event extraction gaps appear
- Modify: `tests/subagents-status.test.ts` only if new extraction helpers need direct tests

- [ ] **Step 1: Add tests for event extraction helpers if needed**

If `handleForegroundUpdate` needs helper extraction from possible event shapes, add focused tests in `tests/subagents-status.test.ts` for the actual shape discovered in the installed Pi runtime. Do not guess; if the runtime event shape is unavailable, keep update extraction no-op and rely on foreground start/end fallback.

Run:

```bash
npm test -- tests/subagents-status.test.ts
```

Expected: tests fail before helper implementation if added.

- [ ] **Step 2: Import and instantiate controller in `index.ts`**

At the top of `index.ts` add:

```ts
import { createSubagentStatusController } from "./subagents-status.ts";
```

Near render scheduler setup, instantiate:

```ts
const subagentStatus = createSubagentStatusController({
  getSessionId: () => currentCtx?.sessionManager?.getSessionId?.(),
  requestRender: () => requestImmediateStatusRender({ deferDuringTyping: false }),
});
```

Because `requestImmediateStatusRender` is declared before the controller needs to call it, place instantiation after that function is defined, not at module top.

- [ ] **Step 3: Start scanning on session start and cleanup on shutdown**

Inside `pi.on("session_start", ...)`, after `currentCtx = ctx` and after settings/config refresh:

```ts
subagentStatus.start(ctx.sessionManager?.getSessionId?.());
subagentStatus.scanNow();
```

Inside `pi.on("session_shutdown", ...)`:

```ts
subagentStatus.dispose();
```

After `/powerline` toggles enabled and calls `setupCustomEditor(ctx)`, call both:

```ts
subagentStatus.start(ctx.sessionManager?.getSessionId?.());
subagentStatus.scanNow();
```

After `/powerline` toggles disabled and clears custom UI, call:

```ts
subagentStatus.dispose();
```

`dispose()` must make event handlers no-op until the next `start()` so background event-bus subscriptions cannot update hidden/disabled Powerline state.

- [ ] **Step 4: Subscribe to async subagent event-bus events**

In `powerlineFooter(pi)`, after controller creation:

```ts
const subagentEventUnsubscribes = [
  pi.events.on("subagent:async-started", (payload: unknown) => subagentStatus.handleAsyncStarted(payload)),
  pi.events.on("subagent:async-complete", (payload: unknown) => subagentStatus.handleAsyncComplete(payload)),
  pi.events.on("subagent:control-event", (payload: unknown) => subagentStatus.handleControlEvent(payload)),
];
```

Event subscriptions may live for the extension lifetime, but handlers must become no-ops while the controller is disposed. On extension shutdown/reload, call every unsubscribe function returned by `pi.events.on` if the API provides one. On ordinary session switch or `/powerline` disable, `subagentStatus.dispose()` is sufficient only if it clears state, stops timers, and marks the controller inactive so later event-bus payloads are ignored until `start()`.

- [ ] **Step 5: Subscribe to foreground tool lifecycle events**

Add event hooks:

```ts
pi.on("tool_execution_start", async (event) => {
  if (event.toolName === "subagent") subagentStatus.handleForegroundStart(event);
});

pi.on("tool_execution_update", async (event) => {
  if (event.toolName === "subagent") subagentStatus.handleForegroundUpdate(event);
});

pi.on("tool_execution_end", async (event) => {
  if (event.toolName === "subagent") subagentStatus.handleForegroundEnd(event);
});
```

Keep existing `tool_result` hook unchanged.

- [ ] **Step 6: Pass status into segment context**

In `buildSegmentContext(ctx, theme)`, add to the returned object:

```ts
subagentsStatus: subagentStatus.getPowerlineStatus(),
```

- [ ] **Step 7: Run focused tests**

```bash
npm test -- tests/subagents-status.test.ts tests/segments.test.ts tests/presets.test.ts
```

Expected: pass.

- [ ] **Step 8: Commit Task 5**

```bash
git add index.ts subagents-status.ts tests/subagents-status.test.ts
git commit -m "feat: connect subagent progress to powerline"
```

## Task 6: Documentation and full validation

**Files:**
- Modify: `README.md`
- Possibly modify: `CHANGELOG.md` if project convention expects it

- [ ] **Step 1: Add README documentation**

In `README.md`, under Features or Usage, add a short section:

```md
**Subagent progress** — When `pi-subagents` is installed, Powerline shows a compact `subagents` segment for foreground and async subagent work. Async runs remain non-blocking; the segment shows running, needs-attention, completed, failed, or paused summaries while detailed logs stay in the existing subagent widget / Ctrl+O view.
```

Under presets, mention the segment is included in `default`, `full`, and `nerd`, and hidden when idle.

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/meidhy/.pi/agent/git/github.com/dymayday/pi-powerline-footer
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run a manual TypeScript/runtime smoke check**

Because this package uses runtime TypeScript stripping rather than a committed `tsconfig`, use tests as the primary automated gate. If available, additionally run:

```bash
node --experimental-strip-types --test tests/subagents-status.test.ts tests/segments.test.ts tests/presets.test.ts
```

Expected: pass.

- [ ] **Step 4: Manual Pi verification**

In a fresh Pi session with this extension loaded:

1. Confirm idle Powerline does not show `subagents`.
2. Launch a foreground subagent and confirm a `subagents foreground` segment appears during execution and briefly completes.
3. Launch an async subagent and confirm the main editor remains usable while Powerline shows async progress.
4. Run `/reload` during an active async subagent and confirm startup scan recovers the active run.
5. Simulate or trigger `needs_attention` and confirm warning priority.
6. Confirm existing `pi-subagents` widget/Ctrl+O still works.

- [ ] **Step 5: Commit docs and final validation evidence**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: document subagent progress segment"
```

If no `CHANGELOG.md` update is made, omit it from `git add`.

## Final review checklist

- [ ] `git status --short` is clean except intended changes before each commit.
- [ ] `npm test` passes.
- [ ] No static imports from `pi-subagents` exist.
- [ ] `subagents` segment is hidden when idle.
- [ ] `default` preset includes `subagents`.
- [ ] Long agent/tool/path text cannot exceed `MAX_SEGMENT_VISIBLE_WIDTH`.
- [ ] Async timers/listeners are cleaned up on shutdown/reload/disable.
- [ ] Foreground subagent progress has a safe fallback if partial updates are not exposed.
