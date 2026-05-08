export type HighlightSegment = { kind: "text" | "highlight"; text: string };

const MARKER_REGEX = /\*\*([^*]+)\*\*/g;

export function splitWithHighlight(content: string, target: string): HighlightSegment[] {
  const fromMarkers = splitWithMarkers(content);
  if (fromMarkers !== null) {
    return fromMarkers;
  }

  return splitWithSubstring(content, target);
}

function splitWithMarkers(content: string): HighlightSegment[] | null {
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  let matched = false;

  for (const match of content.matchAll(MARKER_REGEX)) {
    matched = true;
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({ kind: "text", text: content.slice(cursor, start) });
    }
    segments.push({ kind: "highlight", text: match[1] });
    cursor = start + match[0].length;
  }

  if (!matched) {
    return null;
  }

  if (cursor < content.length) {
    segments.push({ kind: "text", text: content.slice(cursor) });
  }

  return segments;
}

function splitWithSubstring(content: string, target: string): HighlightSegment[] {
  const trimmed = target.trim();
  if (!trimmed) {
    return [{ kind: "text", text: content }];
  }

  const lowerContent = content.toLowerCase();
  const lowerTarget = trimmed.toLowerCase();

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  let next = lowerContent.indexOf(lowerTarget, cursor);

  while (next !== -1) {
    if (next > cursor) {
      segments.push({ kind: "text", text: content.slice(cursor, next) });
    }
    segments.push({ kind: "highlight", text: content.slice(next, next + trimmed.length) });
    cursor = next + trimmed.length;
    next = lowerContent.indexOf(lowerTarget, cursor);
  }

  if (cursor === 0) {
    return [{ kind: "text", text: content }];
  }

  if (cursor < content.length) {
    segments.push({ kind: "text", text: content.slice(cursor) });
  }

  return segments;
}
