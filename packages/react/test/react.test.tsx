import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiContent, AiLabel, AiNotice, AiPlayer, WitnessProvider } from "../src/index.js";

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("AiNotice", () => {
  it("shows the notice, records evidence and collapses to a label", () => {
    const onEvent = vi.fn();
    render(
      <WitnessProvider locale="de-CH">
        <AiNotice id="support" href="/ki" onEvent={onEvent} />
      </WitnessProvider>,
    );
    expect(screen.getByRole("heading").textContent).toBe("Sie chatten mit einer KI");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/ki");
    fireEvent.click(screen.getByRole("button", { name: "Verstanden" }));
    expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual(["shown", "acknowledged"]);
    expect(onEvent.mock.calls[1]?.[0]).toMatchObject({ id: "support", locale: "de" });
    const compact = screen.getByRole("button", { name: /KI-Assistent/ });
    fireEvent.click(compact);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  it("renders the full notice on the server", () => {
    localStorage.setItem("witness:ack:chatbot", JSON.stringify({ version: "1", at: "x" }));
    const html = renderToString(<AiNotice locale="it" />);
    expect(html).toContain("Stai parlando con un’IA");
  });

  it("collapses on the client when already acknowledged", () => {
    localStorage.setItem("witness:ack:chatbot", JSON.stringify({ version: "1", at: "x" }));
    render(<AiNotice locale="en" />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("button", { name: /AI assistant/ })).toBeTruthy();
  });

  it("accepts custom body text", () => {
    render(<AiNotice>Our bot Aria answers in English and German.</AiNotice>);
    expect(screen.getByText("Our bot Aria answers in English and German.")).toBeTruthy();
  });
});

describe("AiLabel", () => {
  it("opens details and closes with Escape", () => {
    render(<AiLabel locale="fr" generator="Mistral" reviewed href="/ia" />);
    const button = screen.getByRole("button", { name: /Généré par IA/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog").textContent).toContain("Généré avec Mistral");
    expect(screen.getByRole("dialog").textContent).toContain("Vérifié par une personne");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("AiContent", () => {
  it("adds marking attributes and a label above the content", () => {
    const { container } = render(
      <AiContent
        as="article"
        marking={{ generator: "Claude", createdAt: "2026-10-05" }}
        locale="de"
      >
        <p>Zusammenfassung</p>
      </AiContent>,
    );
    const article = container.querySelector("article");
    expect(article?.getAttribute("data-ai-generated")).toBe("true");
    expect(article?.getAttribute("data-ai-generator")).toBe("Claude");
    expect(article?.textContent?.indexOf("KI-generiert")).toBeLessThan(
      article?.textContent?.indexOf("Zusammenfassung") ?? 0,
    );
  });

  it("can overlay the label on media", () => {
    const { container } = render(
      <AiContent marking={{ kind: "edited" }} labelPosition="overlay">
        <img alt="" src="x.png" />
      </AiContent>,
    );
    expect((container.firstChild as HTMLElement).style.position).toBe("relative");
    expect(container.textContent).toContain("AI-edited");
  });
});

describe("AiPlayer", () => {
  it("wraps the media and shows the label over a video", () => {
    const { container } = render(
      <AiPlayer marking={{ kind: "deepfake", generator: "video-model" }} locale="en">
        {/* biome-ignore lint/a11y/useMediaCaption: test fixture */}
        <video src="a.mp4" />
      </AiPlayer>,
    );
    expect(container.querySelector("[data-ai-generated]")).not.toBeNull();
    expect(container.querySelector(".witness-badge--overlay")).not.toBeNull();
    expect(container.querySelector("video")).not.toBeNull();
  });
});
