import { visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import type { PowerlineLayout } from "./types.ts";

export const MAX_POWERLINE_ROWS = 7;

export interface LayoutSegment {
  content: string;
  width: number;
}

export function packSegmentsIntoRows(
  segments: readonly LayoutSegment[],
  availableWidth: number,
  separatorWidth: number,
  maxRows = MAX_POWERLINE_ROWS,
): string[][] {
  const contentWidth = availableWidth - 2;
  if (contentWidth <= 0 || segments.length === 0 || maxRows <= 0) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentWidth = 0;

  const commitRow = (): boolean => {
    if (currentRow.length === 0) return true;
    rows.push(currentRow);
    currentRow = [];
    currentWidth = 0;
    return rows.length < maxRows;
  };

  for (const segment of segments) {
    if (!segment.content || segment.width <= 0) continue;

    const separator = currentRow.length > 0 ? separatorWidth : 0;
    if (segment.width <= contentWidth && currentWidth + separator + segment.width <= contentWidth) {
      currentRow.push(segment.content);
      currentWidth += separator + segment.width;
      continue;
    }

    if (currentRow.length > 0 && !commitRow()) break;

    if (segment.width <= contentWidth) {
      currentRow = [segment.content];
      currentWidth = segment.width;
      continue;
    }

    const fragments = wrapTextWithAnsi(segment.content, contentWidth)
      .filter((fragment) => visibleWidth(fragment) > 0);

    for (let index = 0; index < fragments.length; index++) {
      const fragment = fragments[index]!;
      const fragmentWidth = visibleWidth(fragment);
      if (fragmentWidth > contentWidth) return rows;
      currentRow = [fragment];
      currentWidth = fragmentWidth;
      if (index < fragments.length - 1 && !commitRow()) return rows;
    }
  }

  if (currentRow.length > 0 && rows.length < maxRows) rows.push(currentRow);
  return rows;
}

export interface PackedPowerlineLayout {
  topRows: string[][];
  secondaryRows: string[][];
}

export function packPowerlineLayout(
  layout: PowerlineLayout,
  leftSegments: readonly LayoutSegment[],
  rightSegments: readonly LayoutSegment[],
  secondarySegments: readonly LayoutSegment[],
  availableWidth: number,
  separatorWidth: number,
): PackedPowerlineLayout {
  const metricSegments = [...rightSegments, ...secondarySegments];

  if (layout === "flow") {
    const rows = packSegmentsIntoRows(
      [...leftSegments, ...metricSegments],
      availableWidth,
      separatorWidth,
    );
    return { topRows: rows.slice(0, 1), secondaryRows: rows.slice(1) };
  }

  if (leftSegments.length === 0) {
    return {
      topRows: [],
      secondaryRows: packSegmentsIntoRows(
        metricSegments,
        availableWidth,
        separatorWidth,
      ),
    };
  }

  if (metricSegments.length === 0) {
    return {
      topRows: packSegmentsIntoRows(
        leftSegments,
        availableWidth,
        separatorWidth,
      ),
      secondaryRows: [],
    };
  }

  const topRows = packSegmentsIntoRows(
    leftSegments,
    availableWidth,
    separatorWidth,
    MAX_POWERLINE_ROWS - 1,
  );
  const secondaryRows = packSegmentsIntoRows(
    metricSegments,
    availableWidth,
    separatorWidth,
    MAX_POWERLINE_ROWS - topRows.length,
  );

  return { topRows, secondaryRows };
}
