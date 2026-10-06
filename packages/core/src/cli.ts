import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { parseArgs } from "node:util";
import { detectImageFormat } from "./image.js";
import { iptcSourceType } from "./marking.js";
import { detectMediaFormat, markFile, readMarking } from "./media.js";
import type { ContentKind, MarkingInput } from "./types.js";
import { readTextWatermark } from "./watermark.js";

export interface CliIo {
  out: (line: string) => void;
  err: (line: string) => void;
}

const HELP = `witness: AI Act Article 50 marking for images, audio, video and text

Usage
  witness mark <files...> (--out <dir> | --in-place) [options]
  witness inspect <files...> [--json] [--require]

mark options
  --generator <name>         AI system, e.g. "gpt-image-2"
  --generator-version <v>    its version
  --kind <kind>              generated (default), edited or deepfake
  --provider <name>          your company or product
  --url <url>                page that explains how you use AI
  --description <text>       free text written to dc:description
  --overwrite-c2pa           also rewrite files that carry a C2PA manifest

inspect options
  --json                     one JSON object per file
  --require                  exit 1 if a file carries no AI marking

Images: PNG, JPEG, WebP. Audio and video: MP3, WAV, MP4, MOV, M4A.
All get XMP with the IPTC Digital Source Type.
Text files are checked for the Witness text watermark.`;

const KINDS: ContentKind[] = ["generated", "edited", "deepfake"];

export async function runCli(argv: string[], io: CliIo = defaultIo): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h" || command === "help") {
    io.out(HELP);
    return command ? 0 : 1;
  }
  try {
    if (command === "mark") return await mark(rest, io);
    if (command === "inspect") return await inspect(rest, io);
    io.err(`Unknown command "${command}". Run "witness --help".`);
    return 1;
  } catch (error) {
    io.err(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function mark(argv: string[], io: CliIo): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      "in-place": { type: "boolean" },
      generator: { type: "string" },
      "generator-version": { type: "string" },
      kind: { type: "string" },
      provider: { type: "string" },
      url: { type: "string" },
      description: { type: "string" },
      "overwrite-c2pa": { type: "boolean" },
    },
  });
  if (positionals.length === 0) throw new Error("witness mark: no files given.");
  if (!values.out && !values["in-place"]) {
    throw new Error("witness mark: pass --out <dir> or --in-place.");
  }
  const kind = (values.kind ?? "generated") as ContentKind;
  if (!KINDS.includes(kind))
    throw new Error(`witness mark: --kind must be one of ${KINDS.join(", ")}.`);
  const input: MarkingInput = { kind };
  if (values.generator) input.generator = values.generator;
  if (values["generator-version"]) input.generatorVersion = values["generator-version"];
  if (values.provider) input.provider = values.provider;
  if (values.url) input.disclosureUrl = values.url;
  if (values.description) input.description = values.description;
  if (values.out) await mkdir(values.out, { recursive: true });

  let failed = 0;
  for (const file of positionals) {
    const bytes = new Uint8Array(await readFile(file));
    const result = markFile(bytes, input, {
      c2pa: values["overwrite-c2pa"] ? "overwrite" : "skip",
    });
    if (result.status === "unsupported") {
      io.err(`${file}: not a PNG, JPEG, WebP, MP3, WAV or MP4 file, skipped`);
      failed++;
      continue;
    }
    if (result.status === "skipped-c2pa") {
      io.err(`${file}: carries a C2PA manifest, left unchanged (use --overwrite-c2pa to force)`);
      continue;
    }
    const target = values.out ? join(values.out, basename(file)) : file;
    await writeFile(target, result.bytes);
    io.out(`${file}: marked (${result.format}) -> ${target}`);
  }
  return failed > 0 ? 1 : 0;
}

async function inspect(argv: string[], io: CliIo): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { json: { type: "boolean" }, require: { type: "boolean" } },
  });
  if (positionals.length === 0) throw new Error("witness inspect: no files given.");
  let unmarked = 0;
  for (const file of positionals) {
    const bytes = new Uint8Array(await readFile(file));
    const format = detectImageFormat(bytes) ?? detectMediaFormat(bytes);
    if (format) {
      const info = readMarking(bytes);
      const marked = info.aiGenerated || info.c2pa;
      if (!marked) unmarked++;
      if (values.json) {
        const { xmp: _xmp, ...rest } = info;
        io.out(JSON.stringify({ file, ...rest }));
      } else {
        const parts = [
          `${file}: ${format}`,
          info.sourceType
            ? `source type ${iptcSourceType(info.sourceType)}`
            : "no IPTC source type",
          info.generator ? `generator ${info.generator}` : null,
          info.c2paManifest
            ? `C2PA manifest by ${info.c2paManifest.active.claimGenerator ?? "unknown"}${info.c2paManifest.aiGenerated ? " declaring AI" : info.c2paManifest.aiInHistory ? ", AI in its history" : ""} (not verified)`
            : info.c2pa
              ? "C2PA manifest present (not verified)"
              : null,
          marked ? "AI-marked" : "NOT AI-marked",
        ];
        io.out(parts.filter(Boolean).join(", "));
      }
      continue;
    }
    const ext = extname(file).toLowerCase();
    const text = new TextDecoder().decode(bytes);
    const watermark = readTextWatermark(text);
    if (!watermark) unmarked++;
    if (values.json) {
      io.out(JSON.stringify({ file, format: ext.slice(1) || "text", watermark }));
    } else {
      io.out(
        watermark
          ? `${file}: text watermark found${watermark.generator ? `, generator ${watermark.generator}` : ""}${watermark.createdAt ? `, created ${watermark.createdAt}` : ""}`
          : `${file}: no Witness text watermark`,
      );
    }
  }
  return values.require && unmarked > 0 ? 1 : 0;
}

const defaultIo: CliIo = {
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
};
