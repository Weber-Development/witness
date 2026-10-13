import { readFileSync } from "node:fs";
import { join } from "node:path";
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

describe("<witness-player>", () => {
  it("puts the label over a video and above an audio player", () => {
    document.body.innerHTML = `
      <witness-player id="v" kind="deepfake" locale="de"><video src="a.mp4" controls></video></witness-player>
      <witness-player id="a" locale="en"><audio src="a.mp3" controls></audio></witness-player>`;
    const video = document.querySelector("#v")?.shadowRoot;
    const label = video?.querySelector("witness-label");
    expect(label?.getAttribute("variant")).toBe("overlay");
    expect(label?.getAttribute("kind")).toBe("deepfake");
    expect(label?.shadowRoot?.querySelector(".badge")?.textContent).toContain("Künstlich erzeugt");
    expect(video?.querySelector("slot")).not.toBeNull();

    const audio = document.querySelector("#a")?.shadowRoot;
    expect(audio?.querySelector(".bar witness-label")?.getAttribute("variant")).toBe("inline");
    expect(audio?.querySelector("witness-label")?.getAttribute("kind")).toBe("generated");
  });
});

describe("<witness-credentials>", () => {
  const png = new Uint8Array(readFileSync(join(process.cwd(), "test/fixtures/c2pa/signed.png")));

  function mockFetch(bytes: Uint8Array | null): void {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        bytes
          ? new Response(bytes.slice().buffer as ArrayBuffer, { status: 200 })
          : new Response("", { status: 404 }),
      ),
    );
  }

  async function settled(el: Element): Promise<{ info: unknown; state: string }> {
    return new Promise((resolve) => {
      el.addEventListener("witness-credentials", (event) => resolve((event as CustomEvent).detail));
    });
  }

  it("reads the manifest and says it is not verified", async () => {
    mockFetch(png);
    document.body.innerHTML =
      '<witness-credentials src="/a.png" locale="en"></witness-credentials>';
    const el = document.querySelector("witness-credentials") as HTMLElement;
    const detail = await settled(el);
    expect(detail.state).toBe("found");
    expect(el.hidden).toBe(false);
    const root = el.shadowRoot;
    expect(root?.querySelector(".badge")?.textContent).toContain("Content Credentials");
    expect(root?.querySelector("#panel")?.textContent).toContain("Not verified");
    expect(root?.querySelector("#panel")?.textContent).toContain("Image Model X 3");
    vi.unstubAllGlobals();
  });

  it("stays hidden when the file has no credentials", async () => {
    mockFetch(new Uint8Array(readFileSync(join(process.cwd(), "test/fixtures/tone.wav"))));
    document.body.innerHTML = '<witness-credentials src="/a.wav"></witness-credentials>';
    const el = document.querySelector("witness-credentials") as HTMLElement;
    expect((await settled(el)).state).toBe("none");
    expect(el.hidden).toBe(true);
    vi.unstubAllGlobals();
  });

  it("reports an error for a missing file", async () => {
    mockFetch(null);
    document.body.innerHTML =
      '<witness-credentials src="/missing.png" locale="de"></witness-credentials>';
    const el = document.querySelector("witness-credentials") as HTMLElement;
    expect((await settled(el)).state).toBe("error");
    expect(el.shadowRoot?.querySelector("#panel")?.textContent).toContain("nicht gelesen");
    vi.unstubAllGlobals();
  });
});
