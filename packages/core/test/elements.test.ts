import { beforeEach, describe, expect, it, vi } from "vitest";
import "../src/elements-auto.js";

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("<witness-notice>", () => {
  it("shows the full notice, collapses on acknowledge and emits events", () => {
    const shown = vi.fn();
    const acknowledged = vi.fn();
    document.addEventListener("witness-shown", shown);
    document.addEventListener("witness-acknowledged", acknowledged);
    document.body.innerHTML =
      '<witness-notice locale="de" disclosure-id="support" href="/ki"></witness-notice>';
    const el = document.querySelector("witness-notice");
    const root = el?.shadowRoot;
    expect(root?.querySelector("h2")?.textContent).toBe("Sie chatten mit einer KI");
    expect(root?.querySelector("a")?.getAttribute("href")).toBe("/ki");
    expect(shown).toHaveBeenCalledTimes(1);

    root?.querySelector<HTMLButtonElement>(".ack")?.click();
    expect(acknowledged.mock.calls[0]?.[0].detail).toMatchObject({ id: "support", locale: "de" });
    const compact = root?.querySelector<HTMLButtonElement>(".compact");
    expect(compact?.textContent).toContain("KI-Assistent");

    compact?.click();
    expect(root?.querySelector("h2")).not.toBeNull();
  });

  it("sends one shown event when attributes are set after insertion", () => {
    const shown = vi.fn();
    const el = document.createElement("witness-notice");
    el.addEventListener("witness-shown", shown);
    document.body.append(el);
    el.setAttribute("kind", "chatbot");
    el.setAttribute("disclosure-id", "support");
    el.setAttribute("locale", "fr");
    el.setAttribute("locale", "fr");
    expect(shown).toHaveBeenCalledTimes(2);
    expect(shown.mock.calls.map((c) => c[0].detail.id)).toEqual(["chatbot", "support"]);
    expect(el.shadowRoot?.querySelector("h2")?.textContent).toBe("Vous discutez avec une IA");

    el.setAttribute("version", "2");
    expect(shown).toHaveBeenCalledTimes(3);
  });

  it("stays collapsed after reload until the version changes", () => {
    localStorage.setItem("witness:ack:chatbot", JSON.stringify({ version: "1", at: "2026-10-05" }));
    document.body.innerHTML = "<witness-notice></witness-notice>";
    expect(
      document.querySelector("witness-notice")?.shadowRoot?.querySelector(".compact"),
    ).not.toBeNull();
    document.querySelector("witness-notice")?.setAttribute("version", "2");
    expect(
      document.querySelector("witness-notice")?.shadowRoot?.querySelector("h2"),
    ).not.toBeNull();
  });
});

describe("<witness-label>", () => {
  it("toggles a details panel with generator, date and review", () => {
    document.body.innerHTML =
      '<witness-label locale="fr" generator="Mistral" created="2026-10-05" reviewed></witness-label>';
    const root = document.querySelector("witness-label")?.shadowRoot;
    const badge = root?.querySelector<HTMLButtonElement>(".badge");
    expect(badge?.textContent).toContain("Généré par IA");
    expect(badge?.getAttribute("aria-expanded")).toBe("false");
    badge?.click();
    const panel = root?.querySelector<HTMLElement>(".panel");
    expect(panel?.hidden).toBe(false);
    expect(panel?.textContent).toContain("Généré avec Mistral");
    expect(panel?.textContent).toContain("Vérifié par une personne");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root?.querySelector<HTMLElement>(".panel")?.hidden).toBe(true);
  });

  it("uses the page language when no locale is set", () => {
    document.documentElement.lang = "it";
    document.body.innerHTML = '<witness-label kind="edited"></witness-label>';
    expect(document.querySelector("witness-label")?.shadowRoot?.textContent).toContain(
      "Modificato con IA",
    );
    document.documentElement.lang = "";
  });
});
