import { Callout, Text } from "@radix-ui/themes";
import { CheckCircledIcon, Pencil2Icon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import type { DiffSegment, PracticeFeedback } from "../../hooks/usePracticeSocket";
import styles from "./PracticeSession.module.css";

type FeedbackBannerProps = {
  feedback: PracticeFeedback;
};

export function FeedbackBanner({ feedback }: FeedbackBannerProps) {
  if (!feedback.has_mistakes) {
    return (
      <Callout.Root color="grass" size="1" className={styles.feedbackOk}>
        <Callout.Icon>
          <CheckCircledIcon />
        </Callout.Icon>
        <Callout.Text>Looks good!</Callout.Text>
      </Callout.Root>
    );
  }

  const merged = mergeDiffs(feedback.diff_original, feedback.diff_corrected);

  return (
    <Callout.Root color="amber" size="1" className={styles.feedbackCorrection}>
      <Callout.Icon>
        <Pencil2Icon />
      </Callout.Icon>
      <Callout.Text>
        <Text size="2" as="span">
          {merged.map((segment, idx) => renderSegment(segment, idx))}
        </Text>
      </Callout.Text>
    </Callout.Root>
  );
}

function renderSegment(segment: DiffSegment, idx: number): ReactNode {
  switch (segment.kind) {
    case "equal":
      return <span key={idx}>{segment.text}</span>;
    case "removed":
      return (
        <del key={idx} className={styles.feedbackRemoved}>
          {segment.text}
        </del>
      );
    case "added":
      return (
        <mark key={idx} className={styles.feedbackAdded}>
          {segment.text}
        </mark>
      );
  }
}

function mergeDiffs(original: DiffSegment[], corrected: DiffSegment[]): DiffSegment[] {
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
