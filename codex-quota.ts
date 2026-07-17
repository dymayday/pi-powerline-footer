export interface CodexQuotaWindow {
  usedPercent: number;
  windowMinutes?: number;
}

export interface CodexQuota {
  primary?: CodexQuotaWindow;
  secondary?: CodexQuotaWindow;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseWindow(headers: Record<string, string>, prefix: string): CodexQuotaWindow | undefined {
  const usedPercent = parseNumber(headers[`${prefix}-used-percent`]);
  if (usedPercent === undefined) return undefined;

  const minutes = parseNumber(headers[`${prefix}-window-minutes`]);
  return {
    usedPercent,
    ...(minutes !== undefined && Number.isInteger(minutes) && minutes > 0 ? { windowMinutes: minutes } : {}),
  };
}

export function parseCodexQuota(headers: Record<string, string>): CodexQuota | null {
  const primary = parseWindow(headers, "x-codex-primary");
  const secondary = parseWindow(headers, "x-codex-secondary");
  return primary || secondary ? { ...(primary ? { primary } : {}), ...(secondary ? { secondary } : {}) } : null;
}

function formatWindowDuration(minutes: number | undefined, fallbackLabel: string): string {
  if (!minutes) return fallbackLabel;
  if (minutes === 10_080) return "wk";
  if (minutes % 1_440 === 0) return `${minutes / 1_440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

export function formatCodexQuotaWindow(window: CodexQuotaWindow, fallbackLabel: string): string {
  return `${formatWindowDuration(window.windowMinutes, fallbackLabel)} ${window.usedPercent}%`;
}
