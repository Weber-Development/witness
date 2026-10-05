// @vitest-environment node
import { copyFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { readImageMarking, watermarkText } from "../src/index.js";

function io() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (l: string) => out.push(l), err: (l: string) => err.push(l) } };
}

describe("witness CLI", () => {
  it("marks and inspects audio files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "witness-"));
    const file = join(dir, "voice.mp3");
    await copyFile(new URL("./fixtures/tone.mp3", import.meta.url), file);
    const marked = io();
    expect(await runCli(["mark", file, "--in-place", "--generator", "tts"], marked.io)).toBe(0);
    expect(marked.out[0]).toContain("marked (mp3)");
    const inspected = io();
    expect(await runCli(["inspect", file, "--require"], inspected.io)).toBe(0);
    expect(inspected.out[0]).toContain("mp3");
    expect(inspected.out[0]).toContain("generator tts");
  });

  it("marks images into an output directory and inspects them", async () => {
    const dir = await mkdtemp(join(tmpdir(), "witness-"));
    const file = join(dir, "hero.jpg");
    await writeFile(
      file,
      await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } })
        .jpeg()
        .toBuffer(),
    );

    const first = io();
    expect(await runCli(["inspect", file, "--require"], first.io)).toBe(1);
    expect(first.out[0]).toContain("NOT AI-marked");

    const marked = io();
    const out = join(dir, "out");
    expect(
      await runCli(
        ["mark", file, "--out", out, "--generator", "Flux", "--kind", "edited"],
        marked.io,
      ),
    ).toBe(0);
    const info = readImageMarking(new Uint8Array(await readFile(join(out, "hero.jpg"))));
    expect(info).toMatchObject({
      aiGenerated: true,
      generator: "Flux",
      sourceType: "compositeWithTrainedAlgorithmicMedia",
    });

    const json = io();
    expect(await runCli(["inspect", join(out, "hero.jpg"), "--json", "--require"], json.io)).toBe(
      0,
    );
    expect(JSON.parse(json.out[0] ?? "{}")).toMatchObject({ format: "jpeg", aiGenerated: true });
  });

  it("checks text files for the watermark", async () => {
    const dir = await mkdtemp(join(tmpdir(), "witness-"));
    const file = join(dir, "answer.md");
    await writeFile(file, watermarkText("Antwort", { generator: "Claude" }));
    const result = io();
    expect(await runCli(["inspect", file, "--require"], result.io)).toBe(0);
    expect(result.out[0]).toContain("generator Claude");
  });

  it("refuses to mark without a target and rejects unknown kinds", async () => {
    const result = io();
    expect(await runCli(["mark", "x.png"], result.io)).toBe(1);
    expect(result.err[0]).toContain("--out");
    expect(await runCli(["mark", "x.png", "--in-place", "--kind", "nope"], result.io)).toBe(1);
    expect(await runCli([], result.io)).toBe(1);
  });
});
