import { type C2paInfo, readC2pa } from "@sweberdev/witness";
import { useEffect, useState } from "react";

export interface UseContentCredentialsResult {
  /** `idle` without a `src`, then `loading`, then `found`, `none` or `error`. */
  state: "idle" | "loading" | "found" | "none" | "error";
  /** What the C2PA manifest says. Read, not verified. `null` unless `state` is `found`. */
  info: C2paInfo | null;
}

/**
 * Reads the C2PA manifest of an image, audio or video file in the browser. The file must be
 * reachable with CORS. Witness reads the manifest but does not verify the signature.
 */
export function useContentCredentials(src: string | undefined): UseContentCredentialsResult {
  const [result, setResult] = useState<UseContentCredentialsResult>({ state: "idle", info: null });

  useEffect(() => {
    if (!src) {
      setResult({ state: "idle", info: null });
      return;
    }
    let current = true;
    setResult({ state: "loading", info: null });
    fetch(src)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return readC2pa(new Uint8Array(await response.arrayBuffer()));
      })
      .then((info) => {
        if (current) setResult(info ? { state: "found", info } : { state: "none", info: null });
      })
      .catch(() => {
        if (current) setResult({ state: "error", info: null });
      });
    return () => {
      current = false;
    };
  }, [src]);

  return result;
}
