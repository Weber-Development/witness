import { describe, expect, it } from "vitest";
import {
  BUILT_IN_LOCALES,
  createMarking,
  DISCLOSURE_KINDS,
  disclosureText,
  getMessages,
  hasTextWatermark,
  labelHtml,
  labelText,
  markingAttributes,
  markingJsonLd,
  nextMetadata,
  readTextWatermark,
  registerLocale,
  renderJsonLd,
  renderMetaTags,
  resolveLocale,
  stripTextWatermark,
  watermarkSuffix,
  watermarkText,
} from "../src/index.js";

describe("locales", () => {
  it("has every kind and string in every built-in locale", () => {
    for (const locale of BUILT_IN_LOCALES) {
      const messages = getMessages(locale);
      for (const kind of DISCLOSURE_KINDS) {
        const text = messages.kinds[kind];
        expect(text.label.length, `${locale}/${kind}`).toBeGreaterThan(0);
        expect(text.title.length).toBeGreaterThan(0);
        expect(text.body.length).toBeGreaterThan(0);
      }
      for (const value of Object.values(messages.ui)) expect(value.length).toBeGreaterThan(0);
    }
  });

  it("resolves regional tags and falls back to English", () => {
    expect(resolveLocale("de-CH")).toBe("de");
    expect(resolveLocale(["nl-NL", "fr-CH"])).toBe("fr");
    expect(resolveLocale("ja")).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });

  it("registers new locales and partial overrides", () => {
    registerLocale("de-x-du", { kinds: { chatbot: { title: "Du chattest mit einer KI" } } });
    expect(disclosureText("chatbot", "de-x-du").title).toBe("Du chattest mit einer KI");
    expect(disclosureText("chatbot", "de-x-du").label).toBe("KI-Assistent");
    expect(disclosureText("chatbot", "de").title).toBe("Sie chatten mit einer KI");
  });
});

describe("marking", () => {
  it("applies defaults per kind", () => {
    const generated = createMarking({ createdAt: "2026-10-05T10:00:00.000Z" });
    expect(generated).toEqual({
      kind: "generated",
      sourceType: "trainedAlgorithmicMedia",
      createdAt: "2026-10-05T10:00:00.000Z",
      humanReviewed: false,
    });
    expect(createMarking({ kind: "edited" }).sourceType).toBe(
      "compositeWithTrainedAlgorithmicMedia",
    );
    expect(createMarking({ createdAt: new Date(0) }).createdAt).toBe("1970-01-01T00:00:00.000Z");
  });

  it("builds attributes, meta tags and JSON-LD", () => {
    const m = createMarking({
      generator: "Claude",
      generatorVersion: "5",
      createdAt: "2026-10-05",
      humanReviewed: true,
    });
    expect(markingAttributes(m)).toMatchObject({
      "data-ai-generated": "true",
      "data-ai-source-type":
        "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
      "data-ai-generator": "Claude 5",
      "data-ai-reviewed": "true",
    });
    expect(nextMetadata(m).other["ai-generator"]).toBe("Claude 5");
    expect(renderMetaTags(m)).toContain('<meta name="ai-generated" content="generated">');
    const ld = markingJsonLd(m, { "@type": "NewsArticle", headline: "Hi" });
    expect(ld).toMatchObject({
      "@type": "NewsArticle",
      digitalSourceType: "https://schema.org/TrainedAlgorithmicMediaDigitalSource",
      creator: { "@type": "SoftwareApplication", name: "Claude", softwareVersion: "5" },
    });
    expect(renderJsonLd({ description: "</script><b>" })).not.toContain("</script><b>");
  });

  it("labels HTML at the top and escapes values", () => {
    const html = labelHtml(
      "<p>Body</p>",
      { generator: '"><script>', disclosureUrl: "/ki" },
      { locale: "de" },
    );
    expect(html.startsWith('<div class="witness-content" data-ai-generated="true"')).toBe(true);
    expect(html).not.toContain('"><script>');
    expect(html.indexOf("witness-label")).toBeLessThan(html.indexOf("<p>Body</p>"));
    expect(html).toContain("KI-generiert");
    expect(html).toContain('href="/ki"');
    expect(labelHtml("x", {}, { position: "bottom" }).indexOf("x")).toBeLessThan(
      labelHtml("x", {}, { position: "bottom" }).indexOf('witness-label"'),
    );
    expect(labelText({ generator: "GPT", humanReviewed: true }, { locale: "fr" })).toBe(
      "Généré par IA · Généré avec GPT · Vérifié par une personne",
    );
  });
});

describe("text watermark", () => {
  const mark = { generator: "openai/gpt-5", createdAt: "2026-10-05T10:00:00Z", id: "msg_1" };

  it("is invisible and round-trips", () => {
    const text = "Hello, world.";
    const marked = watermarkText(text, mark);
    expect(marked.startsWith(text)).toBe(true);
    expect(marked.length).toBeGreaterThan(text.length);
    expect(readTextWatermark(marked)).toEqual({
      ...mark,
      raw: "g=openai%2Fgpt-5;t=2026-10-05T10%3A00%3A00Z;i=msg_1",
    });
    expect(stripTextWatermark(marked)).toBe(text);
    expect(hasTextWatermark(text)).toBe(false);
  });

  it("replaces an existing watermark instead of stacking", () => {
    const twice = watermarkText(watermarkText("Hi", mark), { generator: "b" });
    expect(readTextWatermark(twice)?.generator).toBe("b");
    expect(stripTextWatermark(twice)).toBe("Hi");
  });

  it("leaves emoji variation selectors alone", () => {
    const text = "I ❤️ this ✌️";
    const marked = watermarkText(text, mark);
    expect(readTextWatermark(marked)?.id).toBe("msg_1");
    expect(stripTextWatermark(marked)).toBe(text);
    expect(stripTextWatermark(text)).toBe(text);
    expect(readTextWatermark(text)).toBeNull();
  });

  it("survives being split across stream chunks and copied mid-text", () => {
    const streamed = ["Par", "tial ", "answer"].join("") + watermarkSuffix(mark);
    expect(readTextWatermark(`Quote: ${streamed} (copied)`)?.generator).toBe("openai/gpt-5");
  });

  it("drops whole fields when the payload is too long", () => {
    const marked = watermarkText("x", { generator: "g", id: "i".repeat(400) });
    expect(readTextWatermark(marked)).toMatchObject({ generator: "g" });
  });

  it("ignores empty text", () => {
    expect(watermarkText("", mark)).toBe("");
  });
});

describe("paragraph watermarks", () => {
  it("marks every paragraph so a quoted paragraph keeps the mark", async () => {
    const { watermarkText, readTextWatermark, stripTextWatermark } = await import(
      "../src/index.js"
    );
    const text = "First paragraph.\n\nSecond one.\n\n\nThird.";
    const marked = watermarkText(text, { generator: "Claude" }, { paragraphs: true });
    const paragraphs = marked.split(/\n\s*\n/);
    expect(paragraphs).toHaveLength(3);
    for (const p of paragraphs) expect(readTextWatermark(p)?.generator).toBe("Claude");
    expect(stripTextWatermark(marked)).toBe(text);
    expect(watermarkText(marked, { generator: "Claude" }, { paragraphs: true })).toBe(marked);
  });
});
