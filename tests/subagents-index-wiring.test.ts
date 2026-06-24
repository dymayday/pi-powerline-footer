import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../index.ts", import.meta.url), "utf-8");

test("powerline wires subagent status controller into lifecycle and context", () => {
  assert.match(source, /import \{ createSubagentStatusController \} from "\.\/subagents-status\.ts";/);
  assert.match(source, /const subagentStatus = createSubagentStatusController\(\{[\s\S]*getSessionId: \(\) => currentCtx\?\.sessionManager\?\.getSessionId\?\.\(\)/);
  assert.match(source, /requestRender: \(\) => requestImmediateStatusRender\(\{ deferDuringTyping: false \}\)/);
  assert.match(source, /function startSubagentStatus\(ctx: any\): void \{[\s\S]*subagentStatus\.start\(ctx\.sessionManager\?\.getSessionId\?\.\(\)\);[\s\S]*subagentStatus\.scanNow\(\);[\s\S]*\}/);
  assert.match(source, /pi\.on\("session_start", async \(event, ctx\) => \{[\s\S]*startSubagentStatus\(ctx\);/);
  assert.match(source, /pi\.on\("session_shutdown", async \(event\) => \{[\s\S]*subagentStatus\.dispose\(\);/);
  assert.match(source, /if \(enabled\) \{[\s\S]*setupCustomEditor\(ctx\);[\s\S]*startSubagentStatus\(ctx\);[\s\S]*ctx\.ui\.notify\("Powerline enabled", "info"\);/);
  assert.match(source, /subagentStatus\.dispose\(\);[\s\S]*ctx\.ui\.setEditorComponent\(undefined\);/);
  assert.match(source, /subagentsStatus: subagentStatus\.getPowerlineStatus\(\),/);
});

test("powerline listens to async and foreground subagent events without importing pi-subagents", () => {
  assert.doesNotMatch(source, /from ["']pi-subagents["']/);
  assert.match(source, /pi\.events\.on\("subagent:async-started", \(payload: unknown\) => subagentStatus\.handleAsyncStarted\(payload\)\)/);
  assert.match(source, /pi\.events\.on\("subagent:async-complete", \(payload: unknown\) => subagentStatus\.handleAsyncComplete\(payload\)\)/);
  assert.match(source, /pi\.events\.on\("subagent:control-event", \(payload: unknown\) => subagentStatus\.handleControlEvent\(payload\)\)/);
  assert.match(source, /pi\.on\("tool_execution_start", async \(event\) => \{[\s\S]*if \(event\.toolName === "subagent"\) subagentStatus\.handleForegroundStart\(event\);[\s\S]*\}\);/);
  assert.match(source, /pi\.on\("tool_execution_update", async \(event\) => \{[\s\S]*if \(event\.toolName === "subagent"\) subagentStatus\.handleForegroundUpdate\(event\);[\s\S]*\}\);/);
  assert.match(source, /pi\.on\("tool_execution_end", async \(event\) => \{[\s\S]*if \(event\.toolName === "subagent"\) subagentStatus\.handleForegroundEnd\(event\);[\s\S]*\}\);/);
  assert.match(source, /if \(isTerminalExit\) \{[\s\S]*subagentEventUnsubscribes\.splice\(0\)\.forEach\(\(unsubscribe\) => unsubscribe\(\)\);[\s\S]*\}/);
});
