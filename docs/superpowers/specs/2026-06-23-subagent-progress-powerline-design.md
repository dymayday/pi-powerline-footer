# Subagent Progress in Powerline Footer Design

Date: 2026-06-23
Repo: `pi-powerline-footer`
Status: Draft, spec review iteration 2

## Problem

Pi async subagents can continue working after the main Pi window is usable, but users currently have no reliable always-visible indication of advancement in this setup. The native Pi footer is not visible because `pi-powerline-footer` intentionally replaces it with an empty footer and renders status in its own editor/powerline surfaces.

Evidence from the current codebase:

- `README.md` says the status renders in the editor top border, not as a separate footer.
- `index.ts` calls `ctx.ui.setFooter(...)` and its custom footer `render()` returns `[]`.
- `segments.ts` already contains a `subagents` segment stub, but it always returns hidden.
- `pi-subagents` already maintains async status files and emits async lifecycle events such as `subagent:async-started` and `subagent:async-complete`.

## Approved direction

Build the hybrid design:

1. **Powerline segment:** always-visible compact advancement for subagents.
2. **Existing subagent widget / Ctrl+O:** richer live detail.
3. **Transcript notifications:** sparse durable lifecycle events only, such as start, complete, failed, paused, or needs-attention.

## Goals

- Show progress for both async/background and sync/foreground subagent runs.
- Avoid depending on Pi's native footer.
- Keep the main window non-blocking for async runs.
- Keep the Powerline display compact enough for narrow terminals.
- Reuse existing `pi-subagents` status/events as much as possible.
- Avoid noisy transcript updates for every minor progress change.

## Non-goals

- Replacing `pi-subagents` existing async widget or status command.
- Showing full subagent logs in the Powerline segment.
- Making sync subagents non-blocking; sync remains blocking by nature, but progress should be visible while it runs.
- Building a generic workflow dashboard in the footer.

## User-facing behavior

The `subagents` Powerline segment should render examples like:

- `⠋ subagents 1 async · worker step 2/4`
- `⠋ subagents foreground · reviewer · read src/foo.ts`
- `⚠ subagents needs attention · worker`
- `✗ subagents failed · reviewer`
- `✓ subagents complete · worker`

Completed/failed/paused summaries should remain visible for `TERMINAL_RETENTION_MS` (default `10_000`) after the terminal event, then clear unless another subagent run is active.

When there are multiple active runs, prefer an aggregate:

- `⠋ subagents 2 running · 1 attention`

Use `attention` rather than `blocked` in user-facing text because `pi-subagents` exposes `activityState: "needs_attention"`, not a formal `blocked` lifecycle state.

## Architecture

Add a small subagent-status layer inside `pi-powerline-footer`.

Likely files:

- `subagents-status.ts` — state store, event hooks, status-file polling, compact formatter.
- `segments.ts` — make the existing `subagents` segment read the status summary instead of returning hidden.
- `types.ts` — add segment context for subagent status, and optionally color semantics/options.
- `index.ts` — install/uninstall subagent status hooks with existing Powerline lifecycle.
- `presets.ts` — decide which presets include `subagents` by default.
- Tests under `tests/`.

Initial implementation should be mostly Powerline-side. Only change `pi-subagents` if current public events/tool updates are insufficient. Do not add a runtime dependency or static import from `pi-subagents`; this package must keep working when `pi-subagents` is absent.

## Data sources

### Async/background runs

Use existing `pi-subagents` surfaces:

- Event bus:
  - `subagent:async-started`
  - `subagent:async-complete`
  - `subagent:control-event` if available
- Status files:
  - temp root pattern: `os.tmpdir()/pi-subagents-*/async-subagent-runs/<runId>/status.json`
  - each `status.json` includes mode, state, current step, per-step agent/status/tool/activity fields.

Implementation requirements:

- Use `asyncDir` from `subagent:async-started` when the event provides it.
- Also scan `os.tmpdir()` on `session_start`, `/reload`, and Powerline enable for active `pi-subagents-* / async-subagent-runs/*/status.json` files. This catches runs that started before Powerline loaded, load-order races, and `/reload` during active async work.
- Prefer status files whose `sessionId` matches the current Pi session when available. If `sessionId` is absent, include only `state: "queued" | "running"` statuses updated within `STALE_STATUS_MS` (default `30_000`) to avoid showing old unrelated work.
- Poll tracked active async runs every `ASYNC_POLL_INTERVAL_MS` (default `1_000`). Stop polling when there are no tracked active runs and no retained terminal summary.

### Sync/foreground runs

Listen to Pi tool lifecycle events for `subagent`:

- `tool_execution_start` starts foreground status when `event.toolName === "subagent"`.
- `tool_execution_update` should be used only if Pi exposes a partial tool result payload with the current `pi-subagents` `Details` shape. The implementation must first inspect/log the actual event shape in the installed Pi runtime and then read the exact documented field from that runtime.
- If `tool_execution_update` does not expose partial details, add a small public foreground progress publisher in `pi-subagents` (for example an event-bus update or status setter) and consume that instead of guessing at an internal field.
- `tool_execution_end` marks completion/failure and schedules clear.

This should make foreground subagent advancement visible while the parent turn is blocked. The minimum acceptable foreground behavior is start/end visibility; live step/tool detail is required only if exposed by Pi or by the small `pi-subagents` publisher.

## State model

Maintain a compact in-memory state:

```ts
interface SubagentPowerlineState {
  foreground?: SubagentRunSummary;
  asyncRuns: Map<string, SubagentRunSummary>;
  lastTerminal?: SubagentTerminalSummary;
}
```

Each run summary should normalize both foreground and async sources to:

```ts
interface SubagentRunSummary {
  id: string;
  source: "foreground" | "async";
  mode: "single" | "parallel" | "chain";
  state: "queued" | "running" | "complete" | "failed" | "paused";
  activityState?: "active_long_running" | "needs_attention";
  activeAgent?: string;
  /** zero-based internally when copied from pi-subagents; display as currentStep + 1 */
  currentStep?: number;
  totalSteps?: number;
  currentTool?: string;
  currentPath?: string;
  runningCount?: number;
  /** count of runs/steps where activityState === "needs_attention" */
  attentionCount?: number;
  updatedAt: number;
}
```

`needs_attention` is an activity state, not a lifecycle state. Formatting may promote it visually above lifecycle state, but the normalized model must keep it separate.

## Formatting rules

Priority order:

1. Any run or step with `activityState === "needs_attention"`.
2. Active foreground run.
3. Active async runs.
4. Most recent terminal summary during `TERMINAL_RETENTION_MS`.
5. Hidden.

Width discipline:

- Use terse labels.
- Prefer aggregate display over listing many agents.
- The formatter must cap its own output; do not rely on Powerline layout to truncate individual segment content because the current responsive layout keeps or drops whole segments.
- Default `MAX_SEGMENT_VISIBLE_WIDTH` is `48` cells. Truncate agent names, tool names, and paths before joining the final segment. Preserve the leading status glyph and `subagents` label when truncating.
- Add narrow-width tests for long agent names, long tool arguments, and long paths.

## Preset behavior

The `subagents` segment already appears in `full` and `nerd` presets. Add it to the `default` preset because the user-visible problem happened in normal usage. Keep the segment hidden when no status exists, so idle users do not lose space.

Required default preset left segments:

```ts
["model", "thinking", "shell_mode", "path", "git", "subagents", "context_pct", "cache_read", "cost"]
```

## Error handling

- If `pi-subagents` is not installed or no events appear, segment stays hidden.
- If an async status file is missing, keep the last known/start summary for `MISSING_STATUS_GRACE_MS` (default `3_000`), then clear that run if no status appears.
- If an async status file is malformed, ignore that read. After `MAX_STATUS_READ_FAILURES` consecutive failures (default `3`), stop tracking that run and surface no noisy error to the user.
- If an existing status file is older than `STALE_STATUS_MS` (default `30_000`) and has no current-session match, do not show it.
- Never throw from render paths; render hidden on unexpected state.
- Clear timers/listeners on `/reload`, session shutdown, or `/powerline` disable.

## Testing plan

Unit tests:

- Format single async running summary.
- Format foreground running summary from tool updates or fallback start/end events.
- Prioritize `activityState === "needs_attention"` over normal running.
- Aggregate multiple async runs and display `attentionCount`.
- Convert zero-based `currentStep` to one-based display.
- Truncate long agent/tool/path values to `MAX_SEGMENT_VISIBLE_WIDTH`.
- Hide when idle/stale.
- Segment hidden when status provider returns no state.

Integration-ish tests with mocked extension APIs:

- Startup/session-start scan picks up active current-session async status files.
- `subagent:async-started` with `asyncDir` creates visible segment.
- status file update changes step/tool display.
- `subagent:async-complete` shows completion for `TERMINAL_RETENTION_MS`, then clears with fake timers.
- missing status clears after `MISSING_STATUS_GRACE_MS` with fake timers.
- malformed status stops tracking after `MAX_STATUS_READ_FAILURES`.
- `tool_execution_start/update/end` updates foreground segment when update details are available.
- `tool_execution_start/end` still shows useful foreground start/end status when partial update details are unavailable.
- cleanup removes timers/listeners.

Manual verification:

- Start Pi with Powerline enabled.
- Launch async subagent; confirm Powerline segment updates while main editor remains usable.
- Launch foreground subagent; confirm segment updates during blocking tool run.
- Trigger or simulate needs-attention; confirm warning priority.
- Confirm existing widget/Ctrl+O behavior still works.

## Risks

- `pi-subagents` event payloads are package-internal strings, not formally documented as a public API. Mitigation: use defensive parsing, status-file fallback, no static imports, and graceful hidden state when absent.
- Powerline fixed-editor mode has custom rendering; segment updates must use existing `requestStatusRender()` scheduler rather than direct rendering.
- Sync foreground updates depend on `tool_execution_update` partial details. If unavailable, show only start/end state and consider a small `pi-subagents` publisher change later.

## Implementation handoff summary

Implement the first-class `subagents` Powerline segment by adding a Powerline-local status collector that listens to subagent lifecycle/tool events, polls tracked async status files, normalizes foreground and async runs into compact summaries, and feeds the existing segment registry. Preserve existing `pi-subagents` widget behavior and avoid transcript spam.
