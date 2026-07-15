# Graph Report - .  (2026-07-15)

## Corpus Check
- 44 files · ~95,019 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 673 nodes · 1342 edges · 38 communities (34 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.9)
- Token cost: 11,821 input · 1,274 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Subagent Status|Subagent Status]]
- [[_COMMUNITY_Working Vibes|Working Vibes]]
- [[_COMMUNITY_ANSI Colors|ANSI Colors]]
- [[_COMMUNITY_Extension Core|Extension Core]]
- [[_COMMUNITY_Mouse Input|Mouse Input]]
- [[_COMMUNITY_Managed Shell|Managed Shell]]
- [[_COMMUNITY_Fixed Editor Rendering|Fixed Editor Rendering]]
- [[_COMMUNITY_Bash Editor|Bash Editor]]
- [[_COMMUNITY_Bash Completion|Bash Completion]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Status Segments|Status Segments]]
- [[_COMMUNITY_Bash Tests|Bash Tests]]
- [[_COMMUNITY_Powerline Configuration|Powerline Configuration]]
- [[_COMMUNITY_Terminal Painting|Terminal Painting]]
- [[_COMMUNITY_Icons|Icons]]
- [[_COMMUNITY_Docs and Editor Cluster|Docs and Editor Cluster]]
- [[_COMMUNITY_Segment Tests and Types|Segment Tests and Types]]
- [[_COMMUNITY_Theme Colors|Theme Colors]]
- [[_COMMUNITY_Terminal Modes|Terminal Modes]]
- [[_COMMUNITY_Git Status|Git Status]]
- [[_COMMUNITY_Shell History|Shell History]]
- [[_COMMUNITY_Session and Stash Paths|Session and Stash Paths]]
- [[_COMMUNITY_Settings Persistence|Settings Persistence]]
- [[_COMMUNITY_Fixed Editor Tests|Fixed Editor Tests]]
- [[_COMMUNITY_Autocomplete Providers|Autocomplete Providers]]
- [[_COMMUNITY_Extension Lifecycle|Extension Lifecycle]]
- [[_COMMUNITY_Shortcut Matching|Shortcut Matching]]
- [[_COMMUNITY_Shortcut Parsing|Shortcut Parsing]]
- [[_COMMUNITY_Presets|Presets]]
- [[_COMMUNITY_Text Selection|Text Selection]]
- [[_COMMUNITY_Mode-Aware Completion|Mode-Aware Completion]]
- [[_COMMUNITY_Context Usage|Context Usage]]
- [[_COMMUNITY_Prompt History|Prompt History]]
- [[_COMMUNITY_Responsive Layout|Responsive Layout]]
- [[_COMMUNITY_Stash Tests|Stash Tests]]
- [[_COMMUNITY_Subagent Wiring Tests|Subagent Wiring Tests]]

## God Nodes (most connected - your core abstractions)
1. `TerminalSplitCompositor` - 48 edges
2. `BashModeEditor` - 19 edges
3. `BashTranscriptStore` - 15 edges
4. `normalizeAsyncStatus()` - 15 edges
5. `isRecord()` - 13 edges
6. `ManagedShellSession` - 12 edges
7. `formatSubagentPowerlineStatus()` - 12 edges
8. `buildFixedClusterPaint()` - 11 edges
9. `emergencyTerminalModeReset()` - 10 edges
10. `beginSynchronizedOutput()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `pi-powerline-footer logo banner` --references--> `pi-powerline-footer`  [EXTRACTED]
  banner.png → README.md
- `parseKeyboardScrollDelta()` --calls--> `matchesConfiguredShortcut()`  [EXTRACTED]
  fixed-editor/terminal-split.ts → shortcuts.ts
- `getIcons()` --calls--> `loadThemeConfig()`  [EXTRACTED]
  icons.ts → theme.ts
- `parseShortcutOverride()` --calls--> `shortcutUsesSuper()`  [EXTRACTED]
  index.ts → shortcuts.ts
- `shortcutUsageKey()` --calls--> `shortcutConflictKey()`  [EXTRACTED]
  index.ts → shortcuts.ts

## Import Cycles
- None detected.

## Communities (38 total, 4 thin omitted)

### Community 0 - "Subagent Status"
Cohesion: 0.06
Nodes (54): agentStepDetail(), asyncContent(), AsyncStatusScanDeps, attentionStepCount(), displayStep(), extractArgs(), extractForegroundDetails(), firstProgressRecord() (+46 more)

### Community 1 - "Working Vibes"
Cohesion: 0.08
Nodes (46): buildAiContext(), buildVibePrompt(), config, generateAndUpdate(), generateVibe(), generateVibesBatch(), GenerateVibesResult, getNextVibeFromFile() (+38 more)

### Community 2 - "ANSI Colors"
Cohesion: 0.09
Nodes (27): ansi, AnsiColors, ColorName, fgOnly(), getAnsiCode(), getFgAnsiCode(), hexToRgb(), THEME (+19 more)

### Community 3 - "Extension Core"
Cohesion: 0.07
Nodes (29): APP_RESERVED_SHORTCUTS, CHAT_JUMP_SHORTCUTS, ChatJumpDirection, ChatJumpRole, ChatJumpShortcutAction, ChatJumpShortcutKey, config, DEFAULT_BASH_MODE_SETTINGS (+21 more)

### Community 4 - "Mouse Input"
Cohesion: 0.15
Nodes (9): isLeftDrag(), isLeftPress(), isMouseRelease(), isRightPress(), mouseBaseButton(), mouseScrollDelta(), parseKeyboardScrollDelta(), parseSgrMousePackets() (+1 more)

### Community 5 - "Managed Shell"
Cohesion: 0.13
Nodes (10): getShellInitScript(), ManagedShellSession, quoteShellArg(), stripAnsi(), BashTranscriptStore, compactLines(), BashCommandRecord, BashModeSettings (+2 more)

### Community 6 - "Fixed Editor Rendering"
Cohesion: 0.09
Nodes (26): FixedEditorClusterRender, buildFixedClusterPaint(), clearLine(), CompositeLineAt, DEFAULT_KEYBOARD_SCROLL_SHORTCUTS, descriptorForRows(), DisposeOptions, enableMouseReporting() (+18 more)

### Community 7 - "Bash Editor"
Cohesion: 0.14
Nodes (11): getOneOffBashCommandContext(), BashModeEditor, BashModeEditorOptions, bracketedPasteContent(), decodeFileUriList(), DEFAULT_EDITOR_BOUNDARY_SHORTCUTS, droppedPathTextFromInput(), EditorBoundaryShortcuts (+3 more)

### Community 8 - "Bash Completion"
Cohesion: 0.14
Nodes (21): applyCompletionToLine(), BashCompletionEngine, boostValidatedItemsFromGlobalHistory(), canUseHistorySuggestion(), commandHead(), findNewestHistoryMatchForHead(), getCuratedCommandFallback(), getGitSuggestions() (+13 more)

### Community 9 - "Package Metadata"
Cohesion: 0.08
Nodes (23): author, description, devDependencies, @earendil-works/pi-ai, @earendil-works/pi-coding-agent, @earendil-works/pi-tui, files, keywords (+15 more)

### Community 10 - "Status Segments"
Cohesion: 0.08
Nodes (20): cacheReadSegment, cacheWriteSegment, contextPctSegment, contextTotalSegment, costSegment, extensionStatusesSegment, gitSegment, hostnameSegment (+12 more)

### Community 12 - "Powerline Configuration"
Cohesion: 0.18
Nodes (21): collectHiddenExtensionStatusKeys(), getNotificationExtensionStatuses(), isNotificationExtensionStatus(), isRecord(), mergeSegmentOptions(), normalizeCompactExtensionStatus(), normalizeCustomColor(), normalizeCustomItemId() (+13 more)

### Community 13 - "Terminal Painting"
Cohesion: 0.21
Nodes (8): beginSynchronizedOutput(), disableAlternateScrollMode(), disableAutoWrap(), enableAutoWrap(), endSynchronizedOutput(), enterAlternateScreen(), moveCursor(), setScrollRegion()

### Community 14 - "Icons"
Cohesion: 0.14
Nodes (17): ASCII_ICONS, ASCII_SEPARATORS, getIcons(), getSeparatorChars(), getThinkingText(), hasNerdFonts(), IconSet, NERD_ICONS (+9 more)

### Community 15 - "Docs and Editor Cluster"
Cohesion: 0.14
Nodes (17): pi-powerline-footer logo banner, Changelog, Editor Stash, capEditorLines(), extractCursor(), FixedEditorClusterInput, FixedEditorCursor, normalizeLines() (+9 more)

### Community 16 - "Segment Tests and Types"
Cohesion: 0.14
Nodes (12): BuiltinStatusLineSegmentId, ColorScheme, ColorValue, CustomItemPosition, RenderedSegment, SegmentContext, SemanticColor, StatusLineSegment (+4 more)

### Community 17 - "Theme Colors"
Cohesion: 0.20
Nodes (16): color(), applyColor(), DEFAULT_COLORS, fg(), getThemePath(), hexToAnsi(), isHexColor(), isRecord() (+8 more)

### Community 18 - "Terminal Modes"
Cohesion: 0.20
Nodes (8): disableExtendedKeyboardMode(), disableMouseReporting(), emergencyTerminalModeReset(), enableAlternateScrollMode(), enableExtendedKeyboardMode(), exitAlternateScreen(), resetExtendedKeyboardModes(), resetScrollRegion()

### Community 19 - "Git Status"
Cohesion: 0.22
Nodes (12): CachedBranch, CachedGitStatus, fetchGitBranch(), fetchGitStatus(), getCurrentBranch(), getGitStatus(), GitPollingMode, invalidateGitBranch() (+4 more)

### Community 20 - "Shell History"
Cohesion: 0.28
Nodes (11): appendProjectHistory(), getHistoryDir(), getHomeDir(), normalizePersistedEntries(), parseBashHistory(), parseFishHistory(), PersistedHistoryEntry, projectHistoryPath() (+3 more)

### Community 21 - "Session and Stash Paths"
Cohesion: 0.19
Nodes (13): getProjectSessionsPath(), getPromptHistoryText(), getSessionsPath(), getStashHistoryPath(), hasNonWhitespaceText(), hasSessionAssistantUsage(), isRecord(), isSessionAssistantMessage() (+5 more)

### Community 22 - "Settings Persistence"
Cohesion: 0.20
Nodes (11): getProjectSettingsPath(), getSettingsPath(), mergeSettings(), readSettings(), readSettingsFile(), readWritableSettingsFile(), writePowerlineOptionSetting(), writePowerlinePresetSetting() (+3 more)

### Community 23 - "Fixed Editor Tests"
Cohesion: 0.22
Nodes (3): doRender(), FakeTerminal, render()

### Community 24 - "Autocomplete Providers"
Cohesion: 0.22
Nodes (4): applyExtendedCompletion(), BashAutocompleteProvider, isExtendedCompletionItem(), OneOffBashAutocompleteProvider

### Community 25 - "Extension Lifecycle"
Cohesion: 0.27
Nodes (7): powerlineFooter(), createRenderScheduler(), RenderScheduler, createSubagentStatusController(), createWelcomeDismissScheduler(), WelcomeDismissScheduler, WelcomeDismissSchedulerOptions

### Community 26 - "Shortcut Matching"
Cohesion: 0.27
Nodes (6): matchesConfiguredShortcut(), shortcutConflictKey(), shortcutUsesSuper(), SUPER_SHORTCUT_PATTERNS, powerlineShortcutKeys, source

### Community 27 - "Shortcut Parsing"
Cohesion: 0.36
Nodes (9): findShortcutReplacement(), isValidShortcutKeyPart(), normalizeShortcut(), parseBashModeSettings(), parseShortcutOverride(), reservedShortcuts(), resolveShortcutConfig(), shortcutUsageKey() (+1 more)

### Community 28 - "Presets"
Cohesion: 0.25
Nodes (7): DEFAULT_COLORS, getPreset(), MINIMAL_COLORS, NERD_COLORS, PRESETS, getDefaultColors(), PresetDef

### Community 29 - "Text Selection"
Cohesion: 0.38
Nodes (3): compareSelectionPoints(), sliceColumns(), stripAnsi()

### Community 31 - "Context Usage"
Cohesion: 0.47
Nodes (3): CoreContextUsage, isRecord(), readCoreContextUsage()

### Community 32 - "Prompt History"
Cohesion: 0.33
Nodes (6): getPromptHistoryState(), isPromptHistoryState(), readPromptHistory(), restorePromptHistory(), snapshotPromptHistory(), trackPromptHistory()

### Community 33 - "Responsive Layout"
Cohesion: 0.40
Nodes (5): computeResponsiveLayout(), renderSegmentWithWidth(), mergeSegmentsWithCustomItems(), isCustomSegmentId(), renderSegment()

## Knowledge Gaps
- **147 isolated node(s):** `TokenContext`, `OneOffBashCommandContext`, `GIT_SUBCOMMANDS`, `EditorBoundaryShortcuts`, `DEFAULT_EDITOR_BOUNDARY_SHORTCUTS` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TerminalSplitCompositor` connect `Mouse Input` to `Extension Core`, `Fixed Editor Rendering`, `Terminal Painting`, `Terminal Modes`, `Fixed Editor Tests`, `Text Selection`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `BashModeEditor` connect `Bash Editor` to `Extension Core`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `pi-powerline-footer` connect `Docs and Editor Cluster` to `Working Vibes`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `TokenContext`, `OneOffBashCommandContext`, `GIT_SUBCOMMANDS` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Subagent Status` be split into smaller, more focused modules?**
  _Cohesion score 0.06174863387978142 - nodes in this community are weakly interconnected._
- **Should `Working Vibes` be split into smaller, more focused modules?**
  _Cohesion score 0.07770582793709528 - nodes in this community are weakly interconnected._
- **Should `ANSI Colors` be split into smaller, more focused modules?**
  _Cohesion score 0.08677098150782361 - nodes in this community are weakly interconnected._