import { type ContentKind, type DisclosureKind, format } from "@sweberdev/witness";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "./AiNotice.js";
import { useWitnessMessages } from "./context.js";

export interface AiLabelProps {
  /** Default `generated`. */
  kind?: ContentKind | DisclosureKind;
  generator?: string;
  generatorVersion?: string;
  /** ISO date or timestamp. */
  createdAt?: string;
  /** A person reviewed the content and holds editorial responsibility. */
  reviewed?: boolean;
  /** Link to a page that explains how you use AI. */
  href?: string;
  locale?: string | readonly string[];
  /** `overlay` places the label in the top corner of a positioned parent, e.g. over an image. */
  variant?: "inline" | "overlay";
  className?: string;
}

/** A badge for AI-generated or AI-edited content. Clicking it shows what the label means. */
export function AiLabel({
  kind = "generated",
  generator,
  generatorVersion,
  createdAt,
  reviewed,
  href,
  locale,
  variant = "inline",
  className,
}: AiLabelProps) {
  const { locale: code, messages } = useWitnessMessages(locale);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const text = messages.kinds[kind];
  const name = [generator, generatorVersion].filter(Boolean).join(" ");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const facts: string[] = [];
  if (name) facts.push(format(messages.ui.generatedWith, { generator: name }));
  if (createdAt) facts.push(format(messages.ui.createdOn, { date: formatDate(createdAt, code) }));
  if (reviewed) facts.push(messages.ui.humanReviewed);

  return (
    <span
      ref={root}
      className={cx("witness-badge", `witness-badge--${variant}`, className)}
      style={variant === "overlay" ? overlayStyle : inlineStyle}
    >
      <button
        ref={button}
        type="button"
        className="witness-label"
        style={{ margin: 0, font: "inherit", cursor: "pointer" }}
        aria-expanded={open}
        aria-controls={panelId}
        title={messages.ui.details}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="witness-label__icon" aria-hidden="true">
          AI
        </span>
        <span className="witness-label__text">{text.label}</span>
      </button>
      <span
        id={panelId}
        role="dialog"
        aria-label={text.title}
        className="witness-badge__panel"
        hidden={!open}
        style={variant === "overlay" ? { ...panelStyle, right: 0 } : { ...panelStyle, left: 0 }}
      >
        <strong style={{ display: "block", marginBottom: "0.25em" }}>{text.title}</strong>
        <span style={{ display: "block" }}>{text.body}</span>
        {facts.length > 0 ? (
          <ul style={{ margin: "0.4em 0", paddingInlineStart: "1.1em" }}>
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : null}
        {href ? <a href={href}>{messages.ui.moreInfo}</a> : null}
      </span>
    </span>
  );
}

const inlineStyle = { position: "relative", display: "inline-block" } as const;
const overlayStyle = { position: "absolute", top: "0.5em", right: "0.5em", zIndex: 1 } as const;
const panelStyle = {
  position: "absolute",
  top: "calc(100% + 0.4em)",
  zIndex: 10,
  width: "max-content",
  maxWidth: "min(22em, 80vw)",
  padding: "0.75em 0.875em",
  border: "1px solid var(--witness-border, #d7dbe3)",
  borderRadius: "var(--witness-radius, 8px)",
  background: "var(--witness-bg, #fff)",
  color: "var(--witness-fg, #1a1a1a)",
  boxShadow: "0 6px 24px rgb(0 0 0 / 0.15)",
  lineHeight: 1.45,
  fontSize: "0.875rem",
  textAlign: "start",
} as const;

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
  } catch {
    return value;
  }
}
