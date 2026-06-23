# Subagent Progress in Powerline Footer Design

Date: 2026-06-23
Repo: `pi-powerline-footer`
Status: Draft for spec review

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

Completed/failed/paused summaries should remain visible briefly, then clear unless another subagent run is active.

When there are multiple active runs, prefer an aggregate:

- `⠋ subagents 2 running · 1 blocked`

## Architecture

Add a small subagent-status layer inside `pi-powerline-footer`.

Likely files:

- `subagents-status.ts` — state store, event hooks, status-file polling, compact formatter.
- `segments.ts` — make the existing `subagents` segment read the status summary instead of returning hidden.
- `types.ts` — add segment context for subagent status, and optionally color semantics/options.
- `index.ts` — install/uninstall subagent status hooks with existing Powerline lifecycle.
- `presets.ts` — decide which presets include `subagents` by default.
- Tests under `tests/`.

Initial implementation should be mostly Powerline-side. Only change `pi-subagents` if current public events/tool updates are insufficient.

## Data sources

### Async/background runs

Use existing `pi-subagents` surfaces:

- Event bus:
  - `subagent:async-started`
  - `subagent:async-complete`
  - `subagent:control-event` if available
- Status files:
  - temp root: `os.tmpdir()/pi-subagents-<scope>/async-subagent-runs/<runId>/status.json`
  - each `status.json` includes mode, state, current step, per-step agent/status/tool/activity fields.

The status layer should track started async run IDs and poll their status files while active. Polling should be throttled and stopped when no tracked runs remain.

### Sync/foreground runs

Listen to Pi tool lifecycle events for `subagent`:

- `tool_execution_start` starts foreground status.
- `tool_execution_update` reads `partialResult.details` from the subagent tool to update progress.
- `tool_execution_end` marks completion/failure and schedules clear.

This should make foreground subagent advancement visible while the parent turn is blocked.

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
  state: "queued" | "running" | "complete" | "failed" | "paused" | "needs_attention";
  activeAgent?: string;
  currentStep?: number;
  totalSteps?: number;
  currentTool?: string;
  currentPath?: string;
  runningCount?: number;
  blockedCount?: number;
  updatedAt: number;
}
```

## Formatting rules

Priority order:

1. Any `needs_attention` or blocked state.
2. Active foreground run.
3. Active async runs.
4. Most recent terminal summary during short retention window.
5. Hidden.

Width discipline:

- Use terse labels.
- Prefer aggregate display over listing many agents.
- Let the existing Powerline segment truncation/composition handle final width, but keep source strings short.

## Preset behavior

The `subagents` segment already appears in `full` and `nerd` presets. Consider adding it to `default` because the user-visible problem happened in normal usage, but keep the segment hidden when no status exists.

Recommended default preset left segments:

```ts
["model", "thinking", "shell_mode", "path", "git", "subagents", "context_pct", "cache_read", "cost"]
```

## Error handling

- If `pi-subagents` is not installed or no events appear, segment stays hidden.
- If an async status file is missing or malformed, keep the start summary briefly, then degrade to `subagents running` or clear when stale.
- If polling fails repeatedly, stop polling that run and surface no noisy error to the user.
- Never throw from render paths; render hidden on unexpected state.
- Clear timers/listeners on `/reload`, session shutdown, or `/powerline` disable.

## Testing plan

Unit tests:

- Format single async running summary.
- Format foreground running summary from tool updates.
- Prioritize needs-attention over normal running.
- Aggregate multiple async runs.
- Hide when idle/stale.
- Segment hidden when status provider returns no state.

Integration-ish tests with mocked extension APIs:

- `subagent:async-started` creates visible segment.
- status file update changes step/tool display.
- `subagent:async-complete` shows completion briefly, then clears.
- `tool_execution_start/update/end` updates foreground segment.
- cleanup removes timers/listeners.

Manual verification:

- Start Pi with Powerline enabled.
- Launch async subagent; confirm Powerline segment updates while main editor remains usable.
- Launch foreground subagent; confirm segment updates during blocking tool run.
- Trigger or simulate needs-attention; confirm warning priority.
- Confirm existing widget/Ctrl+O behavior still works.

## Risks

- `pi-subagents` event payloads are package-internal strings, not formally documented as a public API. Mitigation: use defensive parsing and status-file fallback.
- Powerline fixed-editor mode has custom rendering; segment updates must use existing `requestStatusRender()` scheduler rather than direct rendering.
- Sync foreground updates depend on `tool_execution_update` partial details. If unavailable, show only start/end state and consider a small `pi-subagents` publisher change later.

## Implementation handoff summary

Implement the first-class `subagents` Powerline segment by adding a Powerline-local status collector that listens to subagent lifecycle/tool events, polls tracked async status files, normalizes foreground and async runs into compact summaries, and feeds the existing segment registry. Preserve existing `pi-subagents` widget behavior and avoid transcript spam.
