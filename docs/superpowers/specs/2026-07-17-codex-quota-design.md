# Codex quota segment design

**Status:** approved

## Goal

Show the raw Codex subscription-quota percentages for the active OpenAI/Codex OAuth model as a separate Powerline segment. The values are **used**, not remaining; for example, `5h 25% · wk 60%`.

## Data flow

1. On `after_provider_response`, check that the active model provider is `openai-codex` and uses OAuth.
2. Parse the Codex rate-limit headers already present on that response:
   - primary: `x-codex-primary-used-percent` and its window duration
   - secondary: `x-codex-secondary-used-percent` and its window duration
3. Cache only valid numeric values in memory and immediately request a footer repaint.
4. Clear the cached quota when the selected model changes. The segment remains hidden until a Codex response supplies fresh values.

This makes no additional network request, does not read or persist credentials, and does not retain stale quota values when headers are absent or malformed.

## Rendering

- Add a built-in `quota` segment next to the existing `cost` segment.
- Render the raw percentages without converting `used` to `remaining`.
- Label each value from its reported window duration (`5h`, `wk`, or a compact duration fallback). Render whichever windows are available.
- Show the segment only for the active `openai-codex` OAuth model and only when at least one valid quota window exists.
- Add `quota` to every preset that currently includes `cost`; keep `minimal` unchanged.

## Implementation boundaries

- A small `codex-quota.ts` module owns header parsing and the quota snapshot type.
- `index.ts` owns response-event capture, in-memory state, clearing on model selection, and repainting.
- `types.ts`, `segments.ts`, and `presets.ts` add the segment to the existing rendering path.
- `README.md` lists the segment and its raw-used semantics.

## Errors and tests

- Missing, malformed, or non-finite header values are ignored; if no values survive parsing, the segment hides.
- Add unit tests for parsing primary/secondary headers, preserving raw values, partial data, invalid headers, and segment visibility/rendering.
- No polling, retries, external quota endpoint, persistent cache, configuration option, or credential handling is in scope.
