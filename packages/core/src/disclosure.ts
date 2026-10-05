import type { DisclosureKind } from "./types.js";

/** Minimal key-value storage, e.g. `localStorage`. */
export interface DisclosureStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DisclosureEvent {
  type: "shown" | "acknowledged";
  /** Your id for this disclosure, e.g. "support-chat". */
  id: string;
  kind: DisclosureKind;
  /** Bump the version when the wording changes, so people see the new text once. */
  version: string;
  locale: string;
  /** ISO 8601 timestamp. */
  at: string;
}

export interface DisclosureOptions {
  /** Your id for this disclosure. Default: the kind. */
  id?: string;
  /** Default `chatbot`. */
  kind?: DisclosureKind;
  /** Default `1`. */
  version?: string;
  /** Locale shown, recorded in events. Default `en`. */
  locale?: string;
  /**
   * Where the acknowledgement is remembered: `local` (default), `session`, `memory` or your
   * own storage. Falls back to memory when browser storage is unavailable.
   */
  storage?: "local" | "session" | "memory" | DisclosureStorage;
  /**
   * Called when the notice is shown or acknowledged. Send these to your log (for example
   * Logarithm) to keep evidence of what people were told and when.
   */
  onEvent?: (event: DisclosureEvent) => void;
  /** Clock for tests. */
  now?: () => Date;
}

export interface Disclosure {
  readonly id: string;
  readonly kind: DisclosureKind;
  readonly version: string;
  /** True until this version was acknowledged. */
  needsAcknowledgement(): boolean;
  /** When this version was acknowledged, or `null`. */
  acknowledgedAt(): string | null;
  /** Records that the notice was rendered. Emits a `shown` event once per instance. */
  markShown(): void;
  /** Records the acknowledgement and emits an `acknowledged` event. */
  acknowledge(): void;
  /** Forgets the acknowledgement. */
  reset(): void;
  /** Called whenever the acknowledgement changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

const PREFIX = "witness:ack:";

/**
 * Tracks whether a person has seen and acknowledged an AI disclosure.
 *
 * Article 50(5) asks for the information "at the latest at the time of the first interaction
 * or exposure". Keep a compact label visible after the acknowledgement: the acknowledgement
 * only collapses the notice, it does not make it disappear.
 */
export function createDisclosure(options: DisclosureOptions = {}): Disclosure {
  const kind = options.kind ?? "chatbot";
  const id = options.id ?? kind;
  const version = options.version ?? "1";
  const locale = options.locale ?? "en";
  const now = options.now ?? (() => new Date());
  const storage = resolveStorage(options.storage);
  const key = `${PREFIX}${id}`;
  const listeners = new Set<() => void>();
  let shown = false;

  const read = (): { version: string; at: string } | null => {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { version?: unknown; at?: unknown };
      if (typeof parsed.version !== "string" || typeof parsed.at !== "string") return null;
      return { version: parsed.version, at: parsed.at };
    } catch {
      return null;
    }
  };

  const emit = (type: DisclosureEvent["type"], at: string) => {
    options.onEvent?.({ type, id, kind, version, locale, at });
  };

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    id,
    kind,
    version,
    needsAcknowledgement: () => read()?.version !== version,
    acknowledgedAt: () => {
      const entry = read();
      return entry?.version === version ? entry.at : null;
    },
    markShown() {
      if (shown) return;
      shown = true;
      emit("shown", now().toISOString());
    },
    acknowledge() {
      const at = now().toISOString();
      try {
        storage.setItem(key, JSON.stringify({ version, at }));
      } catch {
        // Storage full or blocked: the acknowledgement lasts for this page only.
      }
      emit("acknowledged", at);
      notify();
    },
    reset() {
      try {
        storage.removeItem(key);
      } catch {
        // ignore
      }
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function resolveStorage(option: DisclosureOptions["storage"]): DisclosureStorage {
  if (option && typeof option === "object") return option;
  if (option !== "memory") {
    try {
      const candidate = option === "session" ? globalThis.sessionStorage : globalThis.localStorage;
      if (candidate) {
        const probe = `${PREFIX}probe`;
        candidate.setItem(probe, "1");
        candidate.removeItem(probe);
        return candidate;
      }
    } catch {
      // fall through to memory
    }
  }
  return memoryStorage();
}

/** In-memory storage, e.g. for server rendering or tests. */
export function memoryStorage(): DisclosureStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}
