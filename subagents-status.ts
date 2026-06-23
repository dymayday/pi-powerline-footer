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

export interface FormatSubagentPowerlineStatusOptions {
  now?: number;
  maxWidth?: number;
}

export function formatSubagentPowerlineStatus(
  state: SubagentStatusState,
  options: FormatSubagentPowerlineStatusOptions = {},
): SubagentPowerlineStatus {
  const now = options.now ?? Date.now();
  const maxWidth = normalizeMaxWidth(options.maxWidth);
  const attentionRuns = [state.foreground, ...state.asyncRuns].filter(isNeedsAttention);

  let content = "";
  let tone: SubagentPowerlineTone = "running";

  if (attentionRuns.length > 0) {
    const run = newestRun(attentionRuns);
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
      const attentionCount = sumCounts(activeAsync, "attentionCount");
      content = `⠋ subagents ${activeAsync.length} running${attentionCount > 0 ? ` · ${attentionCount} attention` : ""}`;
      tone = attentionCount > 0 ? "attention" : "running";
    } else if (state.lastTerminal && now - state.lastTerminal.terminalAt <= TERMINAL_RETENTION_MS) {
      content = terminalContent(state.lastTerminal);
      tone = terminalTone(state.lastTerminal.state);
    }
  }

  if (!content) return hiddenStatus();

  const truncated = truncateToWidth(content, maxWidth, "…");
  return {
    visible: true,
    content: truncated,
    tone,
    visibleWidth: visibleWidth(truncated),
  };
}

function hiddenStatus(): SubagentPowerlineStatus {
  return { visible: false, content: "", tone: "running", visibleWidth: 0 };
}

function normalizeMaxWidth(maxWidth: number | undefined): number {
  if (typeof maxWidth !== "number" || !Number.isFinite(maxWidth)) {
    return MAX_SEGMENT_VISIBLE_WIDTH;
  }
  return Math.max(1, Math.floor(maxWidth));
}

function isActive(run: SubagentRunSummary): boolean {
  return run.state === "queued" || run.state === "running";
}

function isNeedsAttention(run: SubagentRunSummary | null): run is SubagentRunSummary {
  return run?.activityState === "needs_attention";
}

function newestRun(runs: SubagentRunSummary[]): SubagentRunSummary {
  return runs.reduce((newest, run) => run.updatedAt > newest.updatedAt ? run : newest);
}

function joinParts(...parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}

function asyncContent(run: SubagentRunSummary): string {
  return joinParts("⠋ subagents 1 async", agentStepDetail(run), toolPathDetail(run));
}

function foregroundContent(run: SubagentRunSummary): string {
  return joinParts("⠋ subagents foreground", run.activeAgent, toolPathDetail(run));
}

function terminalContent(run: SubagentTerminalSummary): string {
  return joinParts(`${terminalGlyph(run.state)} subagents ${terminalLabel(run.state)}`, run.activeAgent);
}

function agentStepDetail(run: SubagentRunSummary): string | undefined {
  const step = displayStep(run);
  if (run.activeAgent && step) return `${run.activeAgent} ${step}`;
  return run.activeAgent ?? step;
}

function toolPathDetail(run: SubagentRunSummary): string | undefined {
  if (run.currentTool && run.currentPath) return `${run.currentTool} ${run.currentPath}`;
  return run.currentTool ?? run.currentPath;
}

function displayStep(run: SubagentRunSummary): string | undefined {
  if (typeof run.currentStep !== "number" || !Number.isFinite(run.currentStep)) {
    return undefined;
  }

  const currentStep = Math.max(0, Math.floor(run.currentStep) + 1);
  if (typeof run.totalSteps === "number" && Number.isFinite(run.totalSteps) && run.totalSteps > 0) {
    return `step ${currentStep}/${Math.floor(run.totalSteps)}`;
  }
  return `step ${currentStep}`;
}

function terminalGlyph(state: SubagentLifecycleState): string {
  if (state === "complete") return "✓";
  if (state === "failed") return "✗";
  if (state === "paused") return "⏸";
  return "•";
}

function terminalLabel(state: SubagentLifecycleState): string {
  if (state === "complete") return "complete";
  if (state === "failed") return "failed";
  if (state === "paused") return "paused";
  return state;
}

function terminalTone(state: SubagentLifecycleState): SubagentPowerlineTone {
  if (state === "complete") return "success";
  if (state === "failed") return "error";
  if (state === "paused") return "paused";
  return "running";
}

function sumCounts(runs: SubagentRunSummary[], field: "attentionCount" | "runningCount"): number {
  return runs.reduce((total, run) => total + positiveInteger(run[field]), 0);
}

function positiveInteger(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}
