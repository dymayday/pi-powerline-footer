# Balanced Powerline Layout Design

## Goal

Make footer information easier to scan without removing the existing adaptive layout. Users can opt into a stable semantic hierarchy and independently choose whether elapsed session time is prominent.

## Current problem

The renderer currently concatenates `leftSegments`, `rightSegments`, and `secondarySegments`, then packs the combined list across up to seven rows. As terminal width changes, work context and resource metrics can move between rows and between the areas above and below the editor.

## Decisions

### Configuration

Add two optional settings:

```json
{
  "powerline": {
    "layout": "balanced",
    "timeFocus": true
  }
}
```

- `layout`: `"flow" | "balanced"`; default `"flow"` preserves existing behavior.
- `timeFocus`: boolean; default `false`.
- Unknown or incorrectly typed values fall back to their defaults.

Presets continue to choose which ordinary segments are available. Layout configuration only controls their stacking. The exception is `timeFocus: true`, which also enables `time_spent` so the setting behaves consistently with every preset.

### Flow layout

With `timeFocus: false`, `flow` keeps the current rendering and segment order unchanged. With `timeFocus: true`, only the counter insertion, promotion, and emphasis described below apply; packing remains unchanged.

### Balanced layout

Balanced is composed of two semantic bands:

1. **Work band above the editor**: model, thinking level, shell mode, path, git state, and subagent state.
2. **Metric band below the editor**: elapsed time, context, token/cache usage, cost, quota, wall clock, session data, and extension statuses.

The preset fields provide the boundary:

- `leftSegments` render in the work band.
- `rightSegments` followed by `secondarySegments` render in the metric band.
- Custom items retain their configured `left`, `right`, or `secondary` position.

The default preset will move context, cache, cost, and quota IDs from `leftSegments` to `rightSegments`. Because flow concatenates left then right, its visible order remains unchanged.

Each band packs and wraps independently. A narrow terminal may therefore use more than two physical rows, but work information never mixes with metrics. The existing seven-row total safety cap remains. If both bands contain content, the work band receives at most six rows and the metric band receives the remaining capacity, guaranteeing it at least one row. If either band is empty, the other may use all seven rows.

### Time focus

With `timeFocus: false`, `time_spent` appears only when the selected preset already includes it and retains its ordinary metric ordering and styling.

With `timeFocus: true`:

- `time_spent` is inserted if the preset omitted it.
- Duplicate instances are removed.
- It is promoted to the first position in the metric band.
- It uses the theme's existing `warning` color for emphasis.
- The wall-clock `time` segment remains an ordinary metric and is not promoted.

In `balanced`, this creates the selected **time-led metric rail** without consuming another terminal row or crowding the work band. In `flow`, the focused counter is inserted between the work (`leftSegments`) and metric (`rightSegments` plus `secondarySegments`) groups before the combined list is packed.

## Rendering structure

Replace the flattened layout result with a small structured result:

```ts
interface ResponsiveLayout {
  topLines: string[];
  secondaryLines: string[];
}
```

- Flow computes the current packed list, returning its first row in `topLines` and the remainder in `secondaryLines`.
- Balanced renders and packs the work and metric bands separately.
- The existing layout cache stores the structured result.
- Fixed-editor and regular widget rendering consume the named line arrays directly instead of slicing a shared list.

No manual row-array configuration, new preset system, or automatic time-based mode switching is included.

## Failure and compatibility behavior

- Existing string preset configuration remains valid.
- Existing object configuration without the new fields renders exactly as before.
- Invalid `layout` values use `flow`; non-boolean `timeFocus` values use `false`.
- Missing or initially sub-second elapsed time keeps the counter hidden until it has meaningful content.
- Existing terminal-height clipping and stale-context handling remain unchanged.

## Verification

Add focused tests for:

1. Default configuration producing the existing flow layout, plus focused-time behavior within flow.
2. Balanced work and metric segments never sharing a band.
3. Independent wrapping within both bands on narrow widths.
4. A seven-row maximum with a metric row reserved when both bands are non-empty.
5. `timeFocus` inserting, deduplicating, promoting, and emphasizing `time_spent`.
6. `timeFocus: false` preserving preset-controlled timer visibility.
7. Invalid configuration falling back safely.
8. Custom left/right/secondary items landing in their corresponding balanced band.

## Considered alternatives

- **Strict single row:** simplest, but hides too much information at common terminal widths.
- **Strict two physical rows:** predictable, but requires dropping or truncating useful segments on narrow terminals.
- **Manual row arrays:** maximum control, but duplicates presets and adds validation complexity without demonstrated need.
- **Pinned top-row timer:** highly visible, but competes with work context.
- **Dedicated timer row:** strongest emphasis, but permanently consumes terminal height.

The selected design keeps the current flow behavior, adds an opt-in balanced hierarchy, and supports both quiet and focused elapsed-time presentations with two small settings.
