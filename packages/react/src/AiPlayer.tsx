import type { Marking, MarkingInput } from "@sweberdev/witness";
import type { ReactNode } from "react";
import { AiContent } from "./AiContent.js";

export interface AiPlayerProps {
  marking: Marking | MarkingInput;
  /** `video` puts the label over the picture, `audio` above the controls. Default `video`. */
  media?: "video" | "audio";
  locale?: string | readonly string[];
  className?: string;
  /** The `<video>` or `<audio>` element. */
  children: ReactNode;
}

/**
 * Wraps an `<audio>` or `<video>` element with the AI label that has to stay visible while it
 * plays (Art. 50(4) for deepfakes). Use `marking.kind: "deepfake"` for deepfake content.
 */
export function AiPlayer({ marking, media = "video", locale, className, children }: AiPlayerProps) {
  return (
    <AiContent
      marking={marking}
      labelPosition={media === "video" ? "overlay" : "top"}
      {...(locale ? { locale } : {})}
      {...(className ? { className } : {})}
    >
      {children}
    </AiContent>
  );
}
