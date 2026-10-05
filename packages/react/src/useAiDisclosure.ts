import { createDisclosure, type Disclosure, type DisclosureOptions } from "@sweberdev/witness";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

export interface UseAiDisclosureResult {
  /** True until the current version was acknowledged. Always true during server rendering. */
  needsAcknowledgement: boolean;
  acknowledgedAt: string | null;
  acknowledge: () => void;
  /** Records that the notice was rendered (emits a `shown` event once). */
  markShown: () => void;
  reset: () => void;
  disclosure: Disclosure;
}

/**
 * State for a custom AI disclosure UI. The server snapshot always needs acknowledgement, so
 * the full notice is in the server HTML and collapses after hydration for people who already
 * acknowledged it.
 */
export function useAiDisclosure(options: DisclosureOptions = {}): UseAiDisclosureResult {
  const onEvent = useRef(options.onEvent);
  onEvent.current = options.onEvent;
  const { id, kind, version, locale, storage } = options;

  const disclosure = useMemo(
    () =>
      createDisclosure({
        ...(id ? { id } : {}),
        ...(kind ? { kind } : {}),
        ...(version ? { version } : {}),
        ...(locale ? { locale } : {}),
        ...(storage ? { storage } : {}),
        onEvent: (event) => onEvent.current?.(event),
      }),
    [id, kind, version, locale, storage],
  );

  const subscribe = useCallback(
    (listener: () => void) => {
      const unsubscribe = disclosure.subscribe(listener);
      // Another tab acknowledged or reset: the browser tells us through a storage event.
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key.startsWith("witness:ack:")) listener();
      };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        unsubscribe();
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
    [disclosure],
  );
  const acknowledgedAt = useSyncExternalStore(
    subscribe,
    () => disclosure.acknowledgedAt(),
    () => null,
  );

  return {
    needsAcknowledgement: acknowledgedAt === null,
    acknowledgedAt,
    acknowledge: disclosure.acknowledge,
    markShown: disclosure.markShown,
    reset: disclosure.reset,
    disclosure,
  };
}
