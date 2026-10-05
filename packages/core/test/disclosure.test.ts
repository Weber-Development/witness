import { describe, expect, it, vi } from "vitest";
import { createDisclosure, memoryStorage } from "../src/index.js";

describe("createDisclosure", () => {
  it("tracks acknowledgement per version and emits evidence events", () => {
    const storage = memoryStorage();
    const onEvent = vi.fn();
    const now = () => new Date("2026-10-05T12:00:00Z");
    const first = createDisclosure({ id: "support", storage, onEvent, now, locale: "de" });
    expect(first.needsAcknowledgement()).toBe(true);
    first.markShown();
    first.markShown();
    first.acknowledge();
    expect(first.needsAcknowledgement()).toBe(false);
    expect(first.acknowledgedAt()).toBe("2026-10-05T12:00:00.000Z");
    expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual(["shown", "acknowledged"]);
    expect(onEvent.mock.calls[1]?.[0]).toEqual({
      type: "acknowledged",
      id: "support",
      kind: "chatbot",
      version: "1",
      locale: "de",
      at: "2026-10-05T12:00:00.000Z",
    });

    const second = createDisclosure({ id: "support", version: "2", storage });
    expect(second.needsAcknowledgement()).toBe(true);
  });

  it("notifies subscribers and resets", () => {
    const disclosure = createDisclosure({ storage: "memory" });
    const listener = vi.fn();
    const unsubscribe = disclosure.subscribe(listener);
    disclosure.acknowledge();
    disclosure.reset();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(disclosure.needsAcknowledgement()).toBe(true);
    unsubscribe();
    disclosure.acknowledge();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("uses localStorage by default and survives corrupt entries", () => {
    localStorage.setItem("witness:ack:chatbot", "{not json");
    const disclosure = createDisclosure();
    expect(disclosure.needsAcknowledgement()).toBe(true);
    disclosure.acknowledge();
    expect(JSON.parse(localStorage.getItem("witness:ack:chatbot") ?? "{}").version).toBe("1");
  });
});
