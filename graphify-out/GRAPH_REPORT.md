# Graph Report - .  (2026-07-15)

## Corpus Check
- 46 files · ~95,339 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 714 nodes · 1448 edges · 39 communities (34 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Subagent Status|Subagent Status]]
- [[_COMMUNITY_Working Vibes|Working Vibes]]
- [[_COMMUNITY_Context Usage|Context Usage]]
- [[_COMMUNITY_ANSI Colors|ANSI Colors]]
- [[_COMMUNITY_Plugin Integration|Plugin Integration]]
- [[_COMMUNITY_Release Features|Release Features]]
- [[_COMMUNITY_Bash Editor|Bash Editor]]
- [[_COMMUNITY_Fixed Editor Clusters|Fixed Editor Clusters]]
- [[_COMMUNITY_Shell Sessions|Shell Sessions]]
- [[_COMMUNITY_Bash Completion|Bash Completion]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Bash Mode Tests|Bash Mode Tests]]
- [[_COMMUNITY_Status Segments|Status Segments]]
- [[_COMMUNITY_Terminal Modes|Terminal Modes]]
- [[_COMMUNITY_Terminal Compositor|Terminal Compositor]]
- [[_COMMUNITY_Theme Rendering|Theme Rendering]]
- [[_COMMUNITY_Project Assets|Project Assets]]
- [[_COMMUNITY_Terminal Cleanup|Terminal Cleanup]]
- [[_COMMUNITY_Icon Rendering|Icon Rendering]]
- [[_COMMUNITY_Configuration Types|Configuration Types]]
- [[_COMMUNITY_Mouse Selection|Mouse Selection]]
- [[_COMMUNITY_Git Status|Git Status]]
- [[_COMMUNITY_Bash History|Bash History]]
- [[_COMMUNITY_Keyboard Shortcuts|Keyboard Shortcuts]]
- [[_COMMUNITY_Segment Rendering|Segment Rendering]]
- [[_COMMUNITY_Session History|Session History]]
- [[_COMMUNITY_Responsive Layout|Responsive Layout]]
- [[_COMMUNITY_Settings Management|Settings Management]]
- [[_COMMUNITY_Text Selection|Text Selection]]
- [[_COMMUNITY_Shortcut Settings|Shortcut Settings]]
- [[_COMMUNITY_Theme Presets|Theme Presets]]
- [[_COMMUNITY_Extended Completion|Extended Completion]]
- [[_COMMUNITY_Mode-Aware Completion|Mode-Aware Completion]]
- [[_COMMUNITY_Prompt History|Prompt History]]
- [[_COMMUNITY_Stash Tests|Stash Tests]]
- [[_COMMUNITY_Subagent Wiring Tests|Subagent Wiring Tests]]
- [[_COMMUNITY_Banner Image|Banner Image]]

## God Nodes (most connected - your core abstractions)
1. `TerminalSplitCompositor` - 53 edges
2. `powerlineFooter()` - 40 edges
3. `BashModeEditor` - 21 edges
4. `BashTranscriptStore` - 17 edges
5. `normalizeAsyncStatus()` - 15 edges
6. `ManagedShellSession` - 13 edges
7. `isRecord()` - 13 edges
8. `formatSubagentPowerlineStatus()` - 13 edges
9. `BashCompletionEngine` - 12 edges
10. `buildFixedClusterPaint()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `stash shortcut terminal compatibility test` --conceptually_related_to--> `app-owned fixed editor and chat viewport`  [AMBIGUOUS]
  tests/stash-shortcut.test.ts → README.md
- `packSegmentsIntoRows()` --semantically_similar_to--> `renderFixedEditorCluster()`  [INFERRED] [semantically similar]
  responsive-layout.ts → fixed-editor/cluster.ts
- `status-line domain contract` --implements--> `configurable status segments and custom items`  [INFERRED]
  types.ts → README.md
- `responsive status wrapping tests` --conceptually_related_to--> `app-owned fixed editor and chat viewport`  [INFERRED]
  tests/responsive-layout.test.ts → README.md
- `mergeSegmentOptions()` --semantically_similar_to--> `getPreset()`  [INFERRED] [semantically similar]
  powerline-config.ts → presets.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **** — index_powerlinefooter, bash_mode_editor_bashmodeeditor, bash_mode_completion_modeawareautocompleteprovider, bash_mode_shell_session_managedshellsession, bash_mode_transcript_bashtranscriptstore [INFERRED 0.85]
- **** — index_powerlinefooter, fixed_editor_terminal_split_terminalsplitcompositor, fixed_editor_cluster_renderfixededitorcluster, responsive_layout_packsegmentsintorows [INFERRED 0.85]

## Communities (39 total, 5 thin omitted)

### Community 0 - "Subagent Status"
Cohesion: 0.06
Nodes (55): agentStepDetail(), asyncContent(), AsyncStatusScanDeps, attentionStepCount(), createSubagentStatusController(), displayStep(), extractArgs(), extractForegroundDetails() (+47 more)

### Community 1 - "Working Vibes"
Cohesion: 0.08
Nodes (46): buildAiContext(), buildVibePrompt(), config, generateAndUpdate(), generateVibe(), generateVibesBatch(), GenerateVibesResult, getNextVibeFromFile() (+38 more)

### Community 2 - "Context Usage"
Cohesion: 0.10
Nodes (30): CoreContextUsage, isRecord(), readCoreContextUsage(), powerlineFooter(), Package Manifest, collectHiddenExtensionStatusKeys(), getNotificationExtensionStatuses(), isNotificationExtensionStatus() (+22 more)

### Community 3 - "ANSI Colors"
Cohesion: 0.09
Nodes (26): ansi, AnsiColors, ColorName, fgOnly(), getAnsiCode(), getFgAnsiCode(), hexToRgb(), THEME (+18 more)

### Community 4 - "Plugin Integration"
Cohesion: 0.06
Nodes (31): APP_RESERVED_SHORTCUTS, CHAT_JUMP_SHORTCUTS, ChatJumpDirection, ChatJumpRole, ChatJumpShortcutAction, ChatJumpShortcutKey, config, DEFAULT_BASH_MODE_SETTINGS (+23 more)

### Community 5 - "Release Features"
Cohesion: 0.07
Nodes (31): release change rationale, persistent shell mode with safe ghost suggestions, app-owned fixed editor and chat viewport, live context-window usage reporting, configurable status segments and custom items, compact subagent progress reporting, layered semantic theme overrides, startup welcome and local environment summary (+23 more)

### Community 6 - "Bash Editor"
Cohesion: 0.12
Nodes (11): getOneOffBashCommandContext(), OneOffBashAutocompleteProvider, BashModeEditor, BashModeEditorOptions, bracketedPasteContent(), decodeFileUriList(), DEFAULT_EDITOR_BOUNDARY_SHORTCUTS, droppedPathTextFromInput() (+3 more)

### Community 7 - "Fixed Editor Clusters"
Cohesion: 0.09
Nodes (28): FixedEditorClusterRender, buildFixedClusterPaint(), clearLine(), CompositeLineAt, DEFAULT_KEYBOARD_SCROLL_SHORTCUTS, disableExtendedKeyboardMode(), DisposeOptions, enableMouseReporting() (+20 more)

### Community 8 - "Shell Sessions"
Cohesion: 0.13
Nodes (10): getShellInitScript(), ManagedShellSession, quoteShellArg(), stripAnsi(), BashTranscriptStore, compactLines(), BashCommandRecord, BashModeSettings (+2 more)

### Community 9 - "Bash Completion"
Cohesion: 0.14
Nodes (22): applyCompletionToLine(), BashCompletionEngine, boostValidatedItemsFromGlobalHistory(), canUseHistorySuggestion(), commandHead(), findNewestHistoryMatchForHead(), getCuratedCommandFallback(), getGitSuggestions() (+14 more)

### Community 10 - "Package Metadata"
Cohesion: 0.12
Nodes (23): author, description, devDependencies, @earendil-works/pi-ai, @earendil-works/pi-coding-agent, @earendil-works/pi-tui, files, keywords (+15 more)

### Community 12 - "Status Segments"
Cohesion: 0.09
Nodes (19): cacheReadSegment, cacheWriteSegment, contextPctSegment, contextTotalSegment, costSegment, extensionStatusesSegment, gitSegment, hostnameSegment (+11 more)

### Community 13 - "Terminal Modes"
Cohesion: 0.16
Nodes (11): beginSynchronizedOutput(), disableMouseReporting(), emergencyTerminalModeReset(), enableAlternateScrollMode(), endSynchronizedOutput(), exitAlternateScreen(), resetExtendedKeyboardModes(), resetScrollRegion() (+3 more)

### Community 14 - "Terminal Compositor"
Cohesion: 0.13
Nodes (5): descriptorForRows(), disableAlternateScrollMode(), enableExtendedKeyboardMode(), enterAlternateScreen(), TerminalSplitCompositor

### Community 15 - "Theme Rendering"
Cohesion: 0.16
Nodes (19): color(), renderCustomSegment(), applyColor(), DEFAULT_COLORS, fg(), getThemePath(), hexToAnsi(), isHexColor() (+11 more)

### Community 16 - "Project Assets"
Cohesion: 0.13
Nodes (18): pi-powerline-footer logo banner, Changelog, Editor Stash, capEditorLines(), extractCursor(), FixedEditorClusterInput, FixedEditorCursor, normalizeLines() (+10 more)

### Community 17 - "Terminal Cleanup"
Cohesion: 0.26
Nodes (4): disableAutoWrap(), enableAutoWrap(), moveCursor(), setScrollRegion()

### Community 18 - "Icon Rendering"
Cohesion: 0.17
Nodes (14): ASCII_ICONS, ASCII_SEPARATORS, getIcons(), getSeparatorChars(), getThinkingText(), hasNerdFonts(), IconSet, NERD_ICONS (+6 more)

### Community 19 - "Configuration Types"
Cohesion: 0.17
Nodes (13): PowerlineConfig, BuiltinStatusLineSegmentId, CustomItemPosition, CustomStatusItem, RenderedSegment, SeparatorDef, StatusLinePreset, StatusLineSegment (+5 more)

### Community 20 - "Mouse Selection"
Cohesion: 0.27
Nodes (5): isLeftDrag(), isLeftPress(), isRightPress(), mouseBaseButton(), mouseScrollDelta()

### Community 21 - "Git Status"
Cohesion: 0.22
Nodes (12): CachedBranch, CachedGitStatus, fetchGitBranch(), fetchGitStatus(), getCurrentBranch(), getGitStatus(), GitPollingMode, invalidateGitBranch() (+4 more)

### Community 22 - "Bash History"
Cohesion: 0.28
Nodes (11): appendProjectHistory(), getHistoryDir(), getHomeDir(), normalizePersistedEntries(), parseBashHistory(), parseFishHistory(), PersistedHistoryEntry, projectHistoryPath() (+3 more)

### Community 23 - "Keyboard Shortcuts"
Cohesion: 0.23
Nodes (8): parseKeyboardScrollDelta(), isSupportedSuperShortcut(), matchesConfiguredShortcut(), shortcutConflictKey(), shortcutUsesSuper(), SUPER_SHORTCUT_PATTERNS, powerlineShortcutKeys, source

### Community 24 - "Segment Rendering"
Cohesion: 0.18
Nodes (7): renderSegmentWithWidth(), isCustomSegmentId(), renderSegment(), SEGMENTS, ColorScheme, SegmentContext, ThemeLike

### Community 25 - "Session History"
Cohesion: 0.24
Nodes (11): getProjectSessionsPath(), getPromptHistoryText(), getSessionsPath(), hasNonWhitespaceText(), hasSessionAssistantUsage(), isRecord(), isSessionAssistantMessage(), normalizeStashHistoryEntries() (+3 more)

### Community 26 - "Responsive Layout"
Cohesion: 0.31
Nodes (5): buildContentFromParts(), computeResponsiveLayout(), LayoutSegment, packSegmentsIntoRows(), getSeparator()

### Community 27 - "Settings Management"
Cohesion: 0.25
Nodes (9): getProjectSettingsPath(), getSettingsPath(), mergeSettings(), readSettings(), readSettingsFile(), readWritableSettingsFile(), writePowerlineOptionSetting(), writePowerlinePresetSetting() (+1 more)

### Community 28 - "Text Selection"
Cohesion: 0.32
Nodes (3): compareSelectionPoints(), sliceColumns(), stripAnsi()

### Community 29 - "Shortcut Settings"
Cohesion: 0.43
Nodes (8): findShortcutReplacement(), isValidShortcutKeyPart(), normalizeShortcut(), parseBashModeSettings(), parseShortcutOverride(), reservedShortcuts(), resolveShortcutConfig(), shortcutUsageKey()

### Community 30 - "Theme Presets"
Cohesion: 0.29
Nodes (6): DEFAULT_COLORS, MINIMAL_COLORS, NERD_COLORS, PRESETS, getDefaultColors(), PresetDef

### Community 31 - "Extended Completion"
Cohesion: 0.33
Nodes (3): applyExtendedCompletion(), BashAutocompleteProvider, isExtendedCompletionItem()

### Community 33 - "Prompt History"
Cohesion: 0.33
Nodes (6): getPromptHistoryState(), isPromptHistoryState(), readPromptHistory(), restorePromptHistory(), snapshotPromptHistory(), trackPromptHistory()

## Ambiguous Edges - Review These
- `stash shortcut terminal compatibility test` → `app-owned fixed editor and chat viewport`  [AMBIGUOUS]
  tests/stash-shortcut.test.ts · relation: conceptually_related_to

## Knowledge Gaps
- **161 isolated node(s):** `TokenContext`, `OneOffBashCommandContext`, `GIT_SUBCOMMANDS`, `EditorBoundaryShortcuts`, `DEFAULT_EDITOR_BOUNDARY_SHORTCUTS` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `stash shortcut terminal compatibility test` and `app-owned fixed editor and chat viewport`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `TerminalSplitCompositor` connect `Terminal Compositor` to `Context Usage`, `Plugin Integration`, `Fixed Editor Clusters`, `Terminal Modes`, `Terminal Cleanup`, `Mouse Selection`, `Text Selection`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `BashModeEditor` connect `Bash Editor` to `Bash Completion`, `Context Usage`, `Plugin Integration`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `powerlineFooter()` connect `Context Usage` to `Mode-Aware Completion`, `Subagent Status`, `Plugin Integration`, `Bash Editor`, `Shell Sessions`, `Bash Completion`, `Terminal Modes`, `Terminal Compositor`, `Project Assets`, `Git Status`, `Bash History`, `Keyboard Shortcuts`, `Segment Rendering`, `Session History`, `Responsive Layout`, `Settings Management`, `Shortcut Settings`, `Extended Completion`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `TokenContext`, `OneOffBashCommandContext`, `GIT_SUBCOMMANDS` to the rest of the system?**
  _161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Subagent Status` be split into smaller, more focused modules?**
  _Cohesion score 0.06187202538339503 - nodes in this community are weakly interconnected._
- **Should `Working Vibes` be split into smaller, more focused modules?**
  _Cohesion score 0.07770582793709528 - nodes in this community are weakly interconnected._