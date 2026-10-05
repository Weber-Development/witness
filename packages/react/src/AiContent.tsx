import {
  createMarking,
  type Marking,
  type MarkingInput,
  markingAttributes,
} from "@sweberdev/witness";
import { type ElementType, type ReactNode, useMemo } from "react";
import { AiLabel } from "./AiLabel.js";
import { cx } from "./AiNotice.js";

export interface AiContentProps {
  marking: Marking | MarkingInput;
  /** Element that wraps label and content. Default `div`. */
  as?: ElementType;
  /** Text should be labelled at the top (default). Use `overlay` for images and video. */
  labelPosition?: "top" | "bottom" | "overlay" | "none";
  locale?: string | readonly string[];
  className?: string;
  children: ReactNode;
}

/**
 * Wraps AI-generated content: adds the `data-ai-*` marking attributes and a visible label.
 * With `labelPosition="overlay"` the wrapper becomes `position: relative`.
 */
export function AiContent({
  marking,
  as: Tag = "div",
  labelPosition = "top",
  locale,
  className,
  children,
}: AiContentProps) {
  const m = useMemo(() => createMarking(marking), [marking]);
  const label =
    labelPosition === "none" ? null : (
      <AiLabel
        kind={m.kind}
        variant={labelPosition === "overlay" ? "overlay" : "inline"}
        createdAt={m.createdAt}
        reviewed={m.humanReviewed}
        {...(m.generator ? { generator: m.generator } : {})}
        {...(m.generatorVersion ? { generatorVersion: m.generatorVersion } : {})}
        {...(m.disclosureUrl ? { href: m.disclosureUrl } : {})}
        {...(locale ? { locale } : {})}
      />
    );
  const labelBlock =
    label && labelPosition !== "overlay" ? (
      <div style={{ marginBlock: "0.5em" }}>{label}</div>
    ) : (
      label
    );
  return (
    <Tag
      className={cx("witness-content", className)}
      style={labelPosition === "overlay" ? { position: "relative" } : undefined}
      {...markingAttributes(m)}
    >
      {labelPosition === "bottom" ? null : labelBlock}
      {children}
      {labelPosition === "bottom" ? labelBlock : null}
    </Tag>
  );
}
