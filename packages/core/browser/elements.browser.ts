import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { type Browser, chromium, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** Real Chromium against the built elements: layout, focus, keyboard and shadow DOM. */
const dist = join(import.meta.dirname, "..", "dist");
const TYPES: Record<string, string> = { ".js": "text/javascript", ".html": "text/html" };

let server: Server;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/") {
      res.setHeader("content-type", "text/html");
      res.end(
        `<!doctype html><meta charset="utf-8"><html lang="en"><body><script type="module" src="/elements-auto.js"></script></body></html>`,
      );
      return;
    }
    try {
      const file = join(dist, normalize(url.pathname).replace(/^(\.\.[/\\])+/, ""));
      const body = await readFile(file);
      res.setHeader("content-type", TYPES[extname(file)] ?? "application/octet-stream");
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    timeout: 30_000,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
});

afterAll(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

async function open(html: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(origin);
  await page.waitForFunction(() => customElements.get("witness-label") !== undefined);
  await page.evaluate((markup) => {
    document.body.innerHTML = markup;
  }, html);
  return page;
}

describe("elements in Chromium", () => {
  it("opens the label details with the mouse and closes them with Escape, returning focus", async () => {
    const page = await open(
      '<p>Text <witness-label kind="deepfake" generator="Model"></witness-label></p>',
    );
    const badge = page.locator("witness-label .badge");
    await expect(badge.getAttribute("aria-expanded")).resolves.toBe("false");
    await expect(page.locator("witness-label .panel").isVisible()).resolves.toBe(false);

    await badge.click();
    await expect(badge.getAttribute("aria-expanded")).resolves.toBe("true");
    await expect(page.locator("witness-label .panel").isVisible()).resolves.toBe(true);
    await expect(page.locator("witness-label .panel").textContent()).resolves.toContain("Model");

    await page.keyboard.press("Escape");
    await expect(page.locator("witness-label .panel").isVisible()).resolves.toBe(false);
    const focused = await page.evaluate(
      () => document.querySelector("witness-label")?.shadowRoot?.activeElement?.className,
    );
    expect(focused).toBe("badge");
    await page.close();
  });

  it("can be reached and opened with the keyboard", async () => {
    const page = await open('<button id="before">before</button><witness-label></witness-label>');
    await page.focus("#before");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.locator("witness-label .panel").isVisible()).resolves.toBe(true);
    await page.close();
  });

  it("shows the chatbot notice, collapses it on acknowledge and remembers that", async () => {
    const page = await open(
      '<witness-notice disclosure-id="support" locale="de"></witness-notice>',
    );
    await expect(page.locator("witness-notice h2").textContent()).resolves.toBe(
      "Sie chatten mit einer KI",
    );
    await page.locator("witness-notice .ack").click();
    await expect(page.locator("witness-notice .compact").isVisible()).resolves.toBe(true);

    await page.reload();
    await page.waitForFunction(() => customElements.get("witness-notice") !== undefined);
    await page.evaluate(() => {
      document.body.innerHTML =
        '<witness-notice disclosure-id="support" locale="de"></witness-notice>';
    });
    await expect(page.locator("witness-notice .compact").isVisible()).resolves.toBe(true);
    await expect(page.locator("witness-notice h2").count()).resolves.toBe(0);
    await page.close();
  });

  it("places the player label over a video and keeps the video visible", async () => {
    const page = await open(
      '<witness-player kind="deepfake"><video width="320" height="180" controls></video></witness-player>',
    );
    const video = await page.locator("witness-player video").boundingBox();
    const badge = await page.locator("witness-player witness-label").boundingBox();
    expect(video && badge).toBeTruthy();
    if (video && badge) {
      expect(badge.x).toBeGreaterThanOrEqual(video.x);
      expect(badge.x + badge.width).toBeLessThanOrEqual(video.x + video.width + 1);
      expect(badge.y).toBeGreaterThanOrEqual(video.y - 1);
      expect(badge.y + badge.height).toBeLessThanOrEqual(video.y + video.height);
    }
    await page.close();
  });

  it("puts the player label above an audio player", async () => {
    const page = await open("<witness-player><audio controls></audio></witness-player>");
    const audio = await page.locator("witness-player audio").boundingBox();
    const badge = await page.locator("witness-player witness-label").boundingBox();
    expect(audio && badge).toBeTruthy();
    if (audio && badge) expect(badge.y + badge.height).toBeLessThanOrEqual(audio.y + 1);
    await page.close();
  });
});
