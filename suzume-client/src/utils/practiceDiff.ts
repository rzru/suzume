import type { DiffSegment } from "../hooks/usePracticeSocket";

export function mergeDiffs(original: DiffSegment[], corrected: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  let i = 0;
  let j = 0;

  while (i < original.length || j < corrected.length) {
    const origSeg = original[i];
    const corrSeg = corrected[j];

    if (origSeg && corrSeg && origSeg.kind === "equal" && corrSeg.kind === "equal") {
      merged.push({ kind: "equal", text: origSeg.text });
      i++;
      j++;
      continue;
    }

    if (origSeg && origSeg.kind === "removed") {
      merged.push(origSeg);
      i++;
      continue;
    }

    if (corrSeg && corrSeg.kind === "added") {
      merged.push(corrSeg);
      j++;
      continue;
    }

    if (origSeg && origSeg.kind === "equal") {
      merged.push(origSeg);
      i++;
      continue;
    }

    if (corrSeg && corrSeg.kind === "equal") {
      merged.push(corrSeg);
      j++;
      continue;
    }

    break;
  }

  return merged;
}
