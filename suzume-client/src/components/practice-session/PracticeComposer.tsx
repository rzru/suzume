import { Button, TextArea } from "@radix-ui/themes";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAutoResizeTextarea } from "../../hooks/useAutoResizeTextarea";
import type { PracticeMode, TranslateDirection } from "../../utils/practice";
import { composerPlaceholder } from "../../utils/practiceMessages";
import styles from "./PracticeComposer.module.css";

type PracticeComposerProps = {
  mode: PracticeMode;
  direction: TranslateDirection | null;
  disabled: boolean;
  onSubmit: (content: string) => void;
};

export function PracticeComposer({ mode, direction, disabled, onSubmit }: PracticeComposerProps) {
  const [draft, setDraft] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useAutoResizeTextarea(inputRef, draft);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={styles.composer}>
      <TextArea
        ref={inputRef}
        size="3"
        placeholder={composerPlaceholder(mode, direction)}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        resize="none"
        rows={1}
        className={styles.composerInput}
      />
      <Button type="submit" size="3" disabled={disabled || draft.trim().length === 0}>
        <PaperPlaneIcon />
        <span className={styles.composerSendLabel}>Send</span>
      </Button>
    </form>
  );
}
