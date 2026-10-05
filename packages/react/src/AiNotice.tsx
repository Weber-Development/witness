import type { DisclosureEvent, DisclosureKind } from "@sweberdev/witness";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useWitnessMessages } from "./context.js";
import { useAiDisclosure } from "./useAiDisclosure.js";

export interface AiNoticeProps {
  /** Default `chatbot`. Also fits `emotion-recognition` and `biometric-categorisation`. */
  kind?: DisclosureKind;
  /** Your id for this disclosure. Default: the kind. */
  id?: string;
  /** Bump when the wording changes, so people see it again. Default "1". */
  version?: string;
  locale?: string | readonly string[];
  /** Link to a page that explains how you use AI. */
  href?: string;
  storage?: "local" | "session" | "memory";
  /** Evidence hook: called when the notice is shown and acknowledged. */
  onEvent?: (event: DisclosureEvent) => void;
  /** Replaces the default body text. */
  children?: ReactNode;
  className?: string;
}

/**
 * The AI notice for a chat (Art. 50(1)): expanded until acknowledged, then a compact label
 * that stays visible and can be reopened. Style it with `@sweberdev/witness/styles.css`.
 */
export function AiNotice({
  kind = "chatbot",
  id,
  version,
  locale,
  href,
  storage,
  onEvent,
  children,
  className,
}: AiNoticeProps) {
  const { locale: code, messages } = useWitnessMessages(locale);
  const disclosure = useAiDisclosure({
    kind,
    locale: code,
    ...(id ? { id } : {}),
    ...(version ? { version } : {}),
    ...(storage ? { storage } : {}),
    ...(onEvent ? { onEvent } : {}),
  });
  const [reopened, setReopened] = useState(false);
  const titleId = useId();
  const text = messages.kinds[kind];
  const full = reopened || disclosure.needsAcknowledgement;
  const { markShown } = disclosure;

  useEffect(() => {
    if (full) markShown();
  }, [full, markShown]);

  if (!full) {
    return (
      <button
        type="button"
        className={cx("witness-notice--compact", className)}
        aria-label={`${text.label}: ${messages.ui.details}`}
        onClick={() => setReopened(true)}
      >
        <span className="witness-label__icon" aria-hidden="true">
          AI
        </span>
        {text.label}
      </button>
    );
  }

  return (
    <section className={cx("witness-notice", className)} role="note" aria-labelledby={titleId}>
      <span className="witness-label__icon" aria-hidden="true">
        AI
      </span>
      <div>
        <h2 id={titleId} className="witness-notice__title">
          {text.title}
        </h2>
        <p className="witness-notice__body">{children ?? text.body}</p>
        <div className="witness-notice__actions">
          <button
            type="button"
            className="witness-notice__ack"
            onClick={() => {
              setReopened(false);
              disclosure.acknowledge();
            }}
          >
            {messages.ui.acknowledge}
          </button>
          {href ? <a href={href}>{messages.ui.moreInfo}</a> : null}
        </div>
      </div>
    </section>
  );
}

export function cx(...names: Array<string | undefined | false>): string {
  return names.filter(Boolean).join(" ");
}
