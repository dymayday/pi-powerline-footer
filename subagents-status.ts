import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
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

export interface AsyncStatusScanDeps {
  tmpDir: string;
  sessionId?: string;
  now?: number;
  listDirs(path: string): string[];
  exists(path: string): boolean;
  readFile(path: string): string;
  statMtimeMs(path: string): number;
}

export interface NormalizeAsyncStatusOptions {
  now?: number;
  mtimeMs?: number;
  sessionId?: string;
}

type IntervalHandle = ReturnType<typeof setInterval>;

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

export interface SubagentStatusControllerDeps {
  getNow?: () => number;
  getTmpDir?: () => string;
  getSessionId?: () => string | undefined;
  requestRender?: () => void;
  setIntervalFn?: (callback: () => void, ms: number) => IntervalHandle;
  clearIntervalFn?: (handle: IntervalHandle) => void;
  scanAsyncRuns?: () => SubagentRunSummary[];
}

interface TrackedSubagentRun extends SubagentRunSummary {
  asyncDir?: string;
  missingSince?: number;
  readFailures?: number;
}

export function normalizeAsyncStatus(
  raw: unknown,
  asyncDir: string,
  options: NormalizeAsyncStatusOptions = {},
): SubagentRunSummary | null {
  if (!isRecord(raw)) return null;

  const mode = normalizeMode(raw.mode);
  const state = normalizeLifecycleState(raw.state);
  if (!mode || !state) return null;

  const statusSessionId = stringValue(raw.sessionId);
  if (options.sessionId && statusSessionId && statusSessionId !== options.sessionId) {
    return null;
  }

  const now = options.now ?? Date.now();
  const mtimeMs = options.mtimeMs ?? numberValue(raw.lastUpdate) ?? numberValue(raw.startedAt) ?? now;
  if (!statusSessionId) {
    if (!isActiveState(state)) return null;
    if (now - mtimeMs > STALE_STATUS_MS) return null;
  }

  const steps = Array.isArray(raw.steps) ? raw.steps.filter(isRecord) : [];
  const currentStep = integerValue(raw.currentStep);
  const activeStep = pickActiveStep(steps, currentStep);
  const attentionStep = steps.find((step) => normalizeActivityState(step.activityState) === "needs_attention");
  const detailStep = attentionStep ?? activeStep;
  const activityState = normalizeActivityState(attentionStep?.activityState) ?? normalizeActivityState(activeStep?.activityState) ?? normalizeActivityState(raw.activityState);
  const activeAgent = stringValue(detailStep?.agent) ?? firstString(raw.agents) ?? stringValue(raw.agent);
  const currentTool = stringValue(detailStep?.currentTool) ?? stringValue(raw.currentTool);
  const currentPath = stringValue(detailStep?.currentPath) ?? stringValue(raw.currentPath);
  const computedTotalSteps = totalSteps(raw, steps);

  return {
    id: stringValue(raw.runId) ?? stringValue(raw.id) ?? path.basename(asyncDir),
    source: "async",
    mode,
    state,
    ...(activityState ? { activityState } : {}),
    ...(activeAgent ? { activeAgent } : {}),
    ...(typeof currentStep === "number" ? { currentStep } : {}),
    ...(typeof computedTotalSteps === "number" ? { totalSteps: computedTotalSteps } : {}),
    ...(currentTool ? { currentTool } : {}),
    ...(currentPath ? { currentPath } : {}),
    runningCount: runningStepCount(raw, steps),
    attentionCount: attentionStepCount(raw, steps),
    updatedAt: numberValue(raw.lastUpdate) ?? numberValue(raw.lastActivityAt) ?? mtimeMs,
  };
}

export function scanAsyncStatusFiles(deps: AsyncStatusScanDeps): Array<SubagentRunSummary & { asyncDir?: string }> {
  const now = deps.now ?? Date.now();
  const runs: Array<SubagentRunSummary & { asyncDir?: string }> = [];

  for (const tmpEntry of safeListDirs(deps.tmpDir, deps.listDirs)) {
    if (!tmpEntry.startsWith("pi-subagents-")) continue;
    const asyncRunsDir = path.join(deps.tmpDir, tmpEntry, "async-subagent-runs");
    for (const runDirName of safeListDirs(asyncRunsDir, deps.listDirs)) {
      const asyncDir = path.join(asyncRunsDir, runDirName);
      const statusPath = path.join(asyncDir, "status.json");
      if (!safeExists(statusPath, deps.exists)) continue;

      try {
        const mtimeMs = deps.statMtimeMs(statusPath);
        const raw = JSON.parse(deps.readFile(statusPath)) as unknown;
        const normalized = normalizeAsyncStatus(raw, asyncDir, { now, mtimeMs, sessionId: deps.sessionId });
        if (normalized) runs.push({ ...normalized, asyncDir });
      } catch {
        // Malformed or disappearing status files are ignored here. The controller
        // tracks repeated read failures once polling is active.
      }
    }
  }

  return runs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createSubagentStatusController(deps: SubagentStatusControllerDeps = {}): SubagentStatusController {
  const asyncRuns = new Map<string, TrackedSubagentRun>();
  const getNow = deps.getNow ?? (() => Date.now());
  const setIntervalFn = deps.setIntervalFn ?? ((callback, ms) => setInterval(callback, ms));
  const clearIntervalFn = deps.clearIntervalFn ?? ((handle) => clearInterval(handle));
  let active = false;
  let sessionId: string | undefined;
  let foreground: SubagentRunSummary | null = null;
  let lastTerminal: SubagentTerminalSummary | null = null;
  let pollHandle: IntervalHandle | null = null;

  function requestRender(): void {
    deps.requestRender?.();
  }

  function activeAsyncRuns(): TrackedSubagentRun[] {
    return [...asyncRuns.values()].filter((run) => isActiveState(run.state));
  }

  function hasRetainedTerminal(now = getNow()): boolean {
    return Boolean(lastTerminal && now - lastTerminal.terminalAt <= TERMINAL_RETENTION_MS);
  }

  function ensurePolling(): void {
    const shouldPoll = active && (activeAsyncRuns().length > 0 || hasRetainedTerminal());
    if (shouldPoll && pollHandle === null) {
      pollHandle = setIntervalFn(() => {
        scanNow();
        prune();
      }, ASYNC_POLL_INTERVAL_MS);
      unrefInterval(pollHandle);
    } else if (!shouldPoll && pollHandle !== null) {
      clearIntervalFn(pollHandle);
      pollHandle = null;
    }
  }

  function defaultScanAsyncRuns(): SubagentRunSummary[] {
    const tmpDir = deps.getTmpDir?.() ?? os.tmpdir();
    return scanAsyncStatusFiles({
      tmpDir,
      sessionId: sessionId ?? deps.getSessionId?.(),
      now: getNow(),
      listDirs: listDirectoryNames,
      exists: fs.existsSync,
      readFile: (filePath) => fs.readFileSync(filePath, "utf8"),
      statMtimeMs: (filePath) => fs.statSync(filePath).mtimeMs,
    });
  }

  function recordScanFailure(id: string, run: TrackedSubagentRun): boolean {
    run.readFailures = (run.readFailures ?? 0) + 1;
    if (run.readFailures >= MAX_STATUS_READ_FAILURES) {
      asyncRuns.delete(id);
      return true;
    }
    return false;
  }

  function recordTerminalRun(run: SubagentRunSummary, terminalAt = run.updatedAt): boolean {
    if (lastTerminal && terminalAt < lastTerminal.terminalAt) return false;
    if (lastTerminal?.id === run.id && lastTerminal.state === run.state && lastTerminal.terminalAt === terminalAt) {
      return false;
    }
    lastTerminal = { ...run, terminalAt };
    return true;
  }

  function inspectTrackedStatusFile(id: string, run: TrackedSubagentRun, now: number): boolean | null {
    if (deps.scanAsyncRuns || !run.asyncDir) return null;
    const statusPath = path.join(run.asyncDir, "status.json");
    if (!fs.existsSync(statusPath)) return null;

    try {
      const mtimeMs = fs.statSync(statusPath).mtimeMs;
      const raw = JSON.parse(fs.readFileSync(statusPath, "utf8")) as unknown;
      const normalized = normalizeAsyncStatus(raw, run.asyncDir, { now, mtimeMs, sessionId: sessionId ?? deps.getSessionId?.() });
      if (!normalized) return recordScanFailure(id, run);
      if (isActiveState(normalized.state)) {
        asyncRuns.set(id, { ...run, ...normalized, missingSince: undefined, readFailures: 0 });
      } else {
        asyncRuns.delete(id);
        recordTerminalRun(normalized);
      }
      return true;
    } catch {
      return recordScanFailure(id, run);
    }
  }

  function scanNow(): void {
    if (!active) return;
    const now = getNow();
    let scanned: SubagentRunSummary[];
    try {
      scanned = deps.scanAsyncRuns ? deps.scanAsyncRuns() : defaultScanAsyncRuns();
    } catch {
      let changed = false;
      for (const [id, run] of asyncRuns) {
        run.readFailures = (run.readFailures ?? 0) + 1;
        if (run.readFailures >= MAX_STATUS_READ_FAILURES) {
          asyncRuns.delete(id);
          changed = true;
        }
      }
      if (changed) requestRender();
      ensurePolling();
      return;
    }

    const seen = new Set<string>();
    let changed = false;
    for (const run of scanned) {
      seen.add(run.id);
      if (isActiveState(run.state)) {
        const previous = asyncRuns.get(run.id);
        asyncRuns.set(run.id, { ...previous, ...run, missingSince: undefined, readFailures: 0 });
        changed = true;
      } else {
        asyncRuns.delete(run.id);
        changed = recordTerminalRun(run) || changed;
      }
    }

    for (const [id, run] of asyncRuns) {
      if (seen.has(id) || !isActiveState(run.state)) continue;
      const inspected = inspectTrackedStatusFile(id, run, now);
      if (inspected !== null) {
        changed = inspected || changed;
        continue;
      }
      if (run.missingSince === undefined) {
        run.missingSince = now;
      } else if (now - run.missingSince > MISSING_STATUS_GRACE_MS) {
        asyncRuns.delete(id);
        changed = true;
      }
    }

    prune({ skipPollingUpdate: true });
    if (changed) requestRender();
    ensurePolling();
  }

  function prune(options: { skipPollingUpdate?: boolean } = {}): void {
    const now = getNow();
    if (lastTerminal && now - lastTerminal.terminalAt > TERMINAL_RETENTION_MS) {
      lastTerminal = null;
      requestRender();
    }
    if (!options.skipPollingUpdate) ensurePolling();
  }

  function start(nextSessionId?: string): void {
    active = true;
    sessionId = nextSessionId ?? deps.getSessionId?.();
    ensurePolling();
  }

  function dispose(): void {
    active = false;
    asyncRuns.clear();
    foreground = null;
    lastTerminal = null;
    ensurePolling();
    requestRender();
  }

  function getPowerlineStatus(): SubagentPowerlineStatus {
    return formatSubagentPowerlineStatus({ foreground, asyncRuns: [...asyncRuns.values()], lastTerminal }, { now: getNow() });
  }

  function handleAsyncStarted(payload: unknown): void {
    if (!active || !isRecord(payload)) return;
    const id = resolvePayloadRunId(payload);
    if (!id) return;
    const now = getNow();
    const mode = normalizeMode(payload.mode) ?? "single";
    const activeAgent = stringValue(payload.agent) ?? firstString(payload.agents);
    const totalStepsValue = integerValue(payload.chainStepCount);
    asyncRuns.set(id, {
      id,
      source: "async",
      mode,
      state: "running",
      ...(activeAgent ? { activeAgent } : {}),
      ...(typeof totalStepsValue === "number" && totalStepsValue > 0 ? { totalSteps: totalStepsValue } : {}),
      updatedAt: now,
      asyncDir: stringValue(payload.asyncDir),
      missingSince: undefined,
      readFailures: 0,
    });
    ensurePolling();
    requestRender();
  }

  function handleAsyncComplete(payload: unknown): void {
    if (!active || !isRecord(payload)) return;
    const id = resolvePayloadRunId(payload);
    if (!id) return;
    const now = getNow();
    const existing = asyncRuns.get(id);
    const explicitState = normalizeLifecycleState(payload.state) ?? normalizeLifecycleState(payload.status);
    const state = explicitState === "paused" ? "paused" : payload.success === true ? "complete" : payload.success === false ? "failed" : explicitState ?? "complete";
    const mode = normalizeMode(payload.mode) ?? existing?.mode ?? "single";
    const activeAgent = stringValue(payload.agent) ?? firstString(payload.agents) ?? existing?.activeAgent;
    asyncRuns.delete(id);
    recordTerminalRun({
      ...(existing ?? {}),
      id,
      source: "async",
      mode,
      state,
      ...(activeAgent ? { activeAgent } : {}),
      updatedAt: now,
    }, now);
    ensurePolling();
    requestRender();
  }

  function handleControlEvent(payload: unknown): void {
    if (!active) return;
    const outer = isRecord(payload) ? payload : null;
    const event = outer && isRecord(outer.event) ? outer.event : payload;
    if (!isRecord(event) || event.type !== "needs_attention") return;
    const id = resolvePayloadRunId(event) ?? (outer ? resolvePayloadRunId(outer) : undefined);
    if (!id) return;
    const run = asyncRuns.get(id);
    if (!run) return;
    run.activityState = "needs_attention";
    run.activeAgent = stringValue(event.agent) ?? run.activeAgent;
    run.currentTool = stringValue(event.currentTool) ?? run.currentTool;
    run.currentPath = stringValue(event.currentPath) ?? run.currentPath;
    run.updatedAt = numberValue(event.ts) ?? getNow();
    requestRender();
  }

  function handleForegroundStart(event: unknown): void {
    if (!active) return;
    const args = extractArgs(event);
    const mode = normalizeMode(args?.mode) ?? inferForegroundMode(args);
    const activeAgent = stringValue(args?.agent) ?? stringValue(args?.chainName) ?? firstString(args?.agents);
    foreground = {
      id: "foreground",
      source: "foreground",
      mode,
      state: "running",
      ...(activeAgent ? { activeAgent } : {}),
      updatedAt: getNow(),
    };
    requestRender();
  }

  function handleForegroundUpdate(event: unknown): void {
    if (!active || !foreground) return;
    const details = extractForegroundDetails(event);
    if (!details) return;
    foreground = { ...foreground, ...details, updatedAt: getNow() };
    requestRender();
  }

  function handleForegroundEnd(event: unknown): void {
    if (!active) return;
    const now = getNow();
    const failed = isRecord(event) && event.isError === true;
    lastTerminal = {
      ...(foreground ?? { id: "foreground", source: "foreground" as const, mode: "single" as const, updatedAt: now }),
      state: failed ? "failed" : "complete",
      updatedAt: now,
      terminalAt: now,
    };
    foreground = null;
    ensurePolling();
    requestRender();
  }

  return {
    start,
    dispose,
    scanNow,
    prune,
    getPowerlineStatus,
    handleAsyncStarted,
    handleAsyncComplete,
    handleControlEvent,
    handleForegroundStart,
    handleForegroundUpdate,
    handleForegroundEnd,
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function integerValue(value: unknown): number | undefined {
  const n = numberValue(value);
  return typeof n === "number" ? Math.max(0, Math.floor(n)) : undefined;
}

function firstString(value: unknown): string | undefined {
  return Array.isArray(value) ? value.find((item): item is string => typeof item === "string" && item.length > 0) : undefined;
}

function normalizeMode(value: unknown): SubagentMode | null {
  if (value === "single" || value === "parallel" || value === "chain") return value;
  return null;
}

function normalizeLifecycleState(value: unknown): SubagentLifecycleState | null {
  if (value === "queued" || value === "running" || value === "complete" || value === "failed" || value === "paused") {
    return value;
  }
  if (value === "completed") return "complete";
  return null;
}

function normalizeActivityState(value: unknown): SubagentActivityState | undefined {
  if (value === "active_long_running" || value === "needs_attention") return value;
  return undefined;
}

function isActiveState(state: SubagentLifecycleState): boolean {
  return state === "queued" || state === "running";
}

function pickActiveStep(
  steps: Array<Record<string, unknown>>,
  currentStep: number | undefined,
): Record<string, unknown> | undefined {
  if (typeof currentStep === "number" && currentStep >= 0 && currentStep < steps.length) {
    return steps[currentStep];
  }
  return steps.find((step) => normalizeLifecycleState(step.status) === "running") ?? steps.find((step) => normalizeLifecycleState(step.status) === "queued");
}

function totalSteps(raw: Record<string, unknown>, steps: Array<Record<string, unknown>>): number | undefined {
  const explicitTotal = integerValue(raw.chainStepCount) ?? integerValue(raw.stepsTotal);
  if (typeof explicitTotal === "number" && explicitTotal > 0) return explicitTotal;
  return steps.length > 0 ? steps.length : undefined;
}

function runningStepCount(raw: Record<string, unknown>, steps: Array<Record<string, unknown>>): number {
  const explicit = integerValue(raw.runningSteps);
  if (typeof explicit === "number") return explicit;
  return steps.filter((step) => normalizeLifecycleState(step.status) === "running").length;
}

function attentionStepCount(raw: Record<string, unknown>, steps: Array<Record<string, unknown>>): number {
  const explicit = integerValue(raw.attentionCount);
  if (typeof explicit === "number") return explicit;
  return steps.filter((step) => normalizeActivityState(step.activityState) === "needs_attention").length + (normalizeActivityState(raw.activityState) === "needs_attention" ? 1 : 0);
}

function safeListDirs(dir: string, listDirs: (path: string) => string[]): string[] {
  try {
    return listDirs(dir);
  } catch {
    return [];
  }
}

function safeExists(candidatePath: string, exists: (path: string) => boolean): boolean {
  try {
    return exists(candidatePath);
  } catch {
    return false;
  }
}

function listDirectoryNames(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function unrefInterval(handle: IntervalHandle): void {
  const maybeUnref = (handle as { unref?: () => void }).unref;
  if (typeof maybeUnref === "function") maybeUnref.call(handle);
}

function resolvePayloadRunId(payload: Record<string, unknown>): string | undefined {
  return stringValue(payload.id) ?? stringValue(payload.runId) ?? stringValue(payload.asyncId);
}

function extractArgs(event: unknown): Record<string, unknown> | null {
  if (!isRecord(event)) return null;
  if (isRecord(event.args)) return event.args;
  if (isRecord(event.toolArgs)) return event.toolArgs;
  return null;
}

function inferForegroundMode(args: Record<string, unknown> | null): SubagentMode {
  if (!args) return "single";
  if (Array.isArray(args.chain)) return "chain";
  if (Array.isArray(args.tasks)) return "parallel";
  return "single";
}

function extractForegroundDetails(event: unknown): Partial<SubagentRunSummary> | null {
  const candidate = firstProgressRecord(event);
  if (!candidate) return null;

  const activeAgent = stringValue(candidate.agent);
  const activityState = normalizeActivityState(candidate.activityState);
  const currentTool = stringValue(candidate.currentTool);
  const currentPath = stringValue(candidate.currentPath);
  const state = normalizeLifecycleState(candidate.status) ?? normalizeLifecycleState(candidate.state);

  const details: Partial<SubagentRunSummary> = {};
  if (activeAgent) details.activeAgent = activeAgent;
  if (activityState) details.activityState = activityState;
  if (currentTool) details.currentTool = currentTool;
  if (currentPath) details.currentPath = currentPath;
  if (state) details.state = state;
  return Object.keys(details).length > 0 ? details : null;
}

function firstProgressRecord(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const direct = firstRecord(value.progress);
  if (direct) return direct;
  const details = isRecord(value.details) ? value.details : null;
  const detailsProgress = firstRecord(details?.progress);
  if (detailsProgress) return detailsProgress;
  const partialResult = isRecord(value.partialResult) ? value.partialResult : null;
  const partialDetails = isRecord(partialResult?.details) ? partialResult.details : null;
  const partialProgress = firstRecord(partialDetails?.progress);
  if (partialProgress) return partialProgress;
  const result = isRecord(value.result) ? value.result : null;
  const resultDetails = isRecord(result?.details) ? result.details : null;
  return firstRecord(resultDetails?.progress);
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return value.find(isRecord) ?? null;
  return isRecord(value) ? value : null;
}
