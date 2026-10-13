/**
 * Framework-free custom elements:
 *
 * - `<witness-notice>`: the chatbot notice (Art. 50(1)). Expanded until acknowledged, then a
 *   compact label that can be reopened.
 * - `<witness-label>`: a badge for AI-generated or AI-edited content with a details popover.
 * - `<witness-player>`: wraps an `<audio>` or `<video>` and shows the label with it, as an overlay
 *   on video and above the controls on audio (Art. 50(4) for deepfakes).
 *
 * Import `@sweberdev/witness/elements` to register both, or call `defineWitnessElements()`.
 */

import { type C2paInfo, readC2pa } from "./c2pa.js";
import { createDisclosure, type Disclosure, type DisclosureEvent } from "./disclosure.js";
import { format, getMessages, resolveLocale } from "./i18n.js";
import { DISCLOSURE_KINDS, type DisclosureKind } from "./types.js";

const BaseElement: typeof HTMLElement =
  typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const SHARED_CSS = `
:host { --witness-accent: #003399; --witness-accent-text: #ffffff; --witness-bg: #ffffff;
  --witness-fg: #1a1a1a; --witness-muted: #555b66; --witness-border: #d7dbe3; --witness-radius: 8px;
  font: inherit; color: var(--witness-fg); }
@media (prefers-color-scheme: dark) {
  :host { --witness-accent: #8fb0ff; --witness-accent-text: #0b1530; --witness-bg: #15181f;
    --witness-fg: #eef1f6; --witness-muted: #a9b0bd; --witness-border: #2c323d; }
}
.icon { display: inline-flex; align-items: center; justify-content: center; min-width: 1.75em;
  height: 1.5em; padding: 0 .3em; border-radius: 4px; background: var(--witness-accent);
  color: var(--witness-accent-text); font-weight: 700; font-size: .75em; letter-spacing: .02em;
  line-height: 1; flex: none; }
button { font: inherit; cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--witness-accent); outline-offset: 2px; }
a { color: inherit; }
.muted { color: var(--witness-muted); }
`;

const NOTICE_CSS = `${SHARED_CSS}
:host { display: block; }
.notice { display: flex; gap: .75em; align-items: flex-start; padding: .875em 1em;
  border: 1px solid var(--witness-border); border-left: 4px solid var(--witness-accent);
  border-radius: var(--witness-radius); background: var(--witness-bg); }
.notice h2 { font-size: 1em; margin: 0 0 .25em; }
.notice p { margin: 0 0 .75em; line-height: 1.45; }
.actions { display: flex; gap: .75em; align-items: center; flex-wrap: wrap; }
.ack { padding: .4em .9em; border-radius: 6px; border: 0; background: var(--witness-accent);
  color: var(--witness-accent-text); font-weight: 600; }
.compact { display: inline-flex; gap: .5em; align-items: center; padding: .25em .5em;
  border: 1px solid var(--witness-border); border-radius: 999px; background: var(--witness-bg);
  color: var(--witness-fg); font-size: .875em; }
`;

const LABEL_CSS = `${SHARED_CSS}
:host { display: inline-block; position: relative; font-size: .875em; }
:host([variant="overlay"]) { position: absolute; inset-block-start: .5em; inset-inline-end: .5em; z-index: 1; }
.badge { display: inline-flex; gap: .4em; align-items: center; padding: .2em .55em .2em .25em;
  border: 1px solid var(--witness-border); border-radius: 999px; background: var(--witness-bg);
  color: var(--witness-fg); }
.panel { position: absolute; inset-block-start: calc(100% + .4em); inset-inline-end: 0; z-index: 10;
  width: max-content; max-width: min(22em, 80vw); padding: .75em .875em; text-align: start;
  border: 1px solid var(--witness-border); border-radius: var(--witness-radius);
  background: var(--witness-bg); box-shadow: 0 6px 24px rgb(0 0 0 / .15); line-height: 1.45; }
:host([variant="inline"]) .panel, :host(:not([variant])) .panel { inset-inline-end: auto; inset-inline-start: 0; }
.panel strong { display: block; margin-bottom: .25em; }
.panel p { margin: 0 0 .4em; }
.panel ul { margin: .4em 0; padding-inline-start: 1.1em; }
.close { position: absolute; inset-block-start: .35em; inset-inline-end: .35em; border: 0;
  background: none; color: var(--witness-muted); font-size: 1.1em; line-height: 1; padding: .2em .35em; }
[hidden] { display: none !important; }
`;

function locale(el: HTMLElement): string[] {
  const own = el.getAttribute("locale") ?? el.closest("[lang]")?.getAttribute("lang");
  if (own) return [own];
  return typeof navigator !== "undefined" ? [...navigator.languages] : [];
}

function kindOf(el: HTMLElement, fallback: DisclosureKind): DisclosureKind {
  const value = el.getAttribute("kind") as DisclosureKind | null;
  return value && DISCLOSURE_KINDS.includes(value) ? value : fallback;
}

function h<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Array<Node | string | null>
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  for (const child of children) {
    if (child !== null) el.append(child);
  }
  return el;
}

function icon(doc: Document): HTMLElement {
  return h(doc, "span", { class: "icon", "aria-hidden": "true", part: "icon" }, "AI");
}

/** `<witness-notice kind="chatbot" locale="de" disclosure-id="support" version="2" href="/ki">` */
export class WitnessNoticeElement extends BaseElement {
  static observedAttributes = ["kind", "locale", "disclosure-id", "version", "href", "storage"];

  #disclosure: Disclosure | null = null;
  #unsubscribe: (() => void) | null = null;
  #expanded = false;
  /** `id@version` of the disclosure a `shown` event was sent for, so attribute changes don't repeat it. */
  #shownFor: string | null = null;

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.#setup();
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    if (this.isConnected && this.shadowRoot) this.#setup();
  }

  /** Forgets the acknowledgement and shows the full notice again. */
  reset(): void {
    this.#disclosure?.reset();
  }

  get disclosure(): Disclosure | null {
    return this.#disclosure;
  }

  #setup(): void {
    this.#unsubscribe?.();
    const storage = this.getAttribute("storage");
    const kind = kindOf(this, "chatbot");
    const tags = locale(this);
    this.#disclosure = createDisclosure({
      kind,
      id: this.getAttribute("disclosure-id") ?? kind,
      version: this.getAttribute("version") ?? "1",
      locale: getLocaleCode(tags),
      ...(storage === "session" || storage === "memory" || storage === "local" ? { storage } : {}),
      onEvent: (event) => this.#dispatch(event),
    });
    this.#expanded = false;
    this.#unsubscribe = this.#disclosure.subscribe(() => {
      this.#expanded = false;
      this.#render();
    });
    this.#render();
  }

  #dispatch(event: DisclosureEvent): void {
    this.dispatchEvent(
      new CustomEvent(`witness-${event.type}`, { detail: event, bubbles: true, composed: true }),
    );
  }

  #render(): void {
    const root = this.shadowRoot;
    const disclosure = this.#disclosure;
    if (!root || !disclosure) return;
    const doc = this.ownerDocument;
    const messages = getMessages(locale(this));
    const text = messages.kinds[disclosure.kind];
    const href = this.getAttribute("href");
    const full = this.#expanded || disclosure.needsAcknowledgement();

    const style = h(doc, "style", {}, NOTICE_CSS);
    if (full) {
      const ack = h(
        doc,
        "button",
        { type: "button", class: "ack", part: "button" },
        messages.ui.acknowledge,
      );
      ack.addEventListener("click", () => disclosure.acknowledge());
      const link = href ? h(doc, "a", { href, part: "link" }, messages.ui.moreInfo) : null;
      const box = h(
        doc,
        "section",
        { class: "notice", role: "note", "aria-labelledby": "title", part: "notice" },
        icon(doc),
        h(
          doc,
          "div",
          {},
          h(doc, "h2", { id: "title", part: "title" }, text.title),
          h(doc, "p", { part: "body" }, h(doc, "slot", {}, text.body)),
          h(doc, "div", { class: "actions" }, ack, link),
        ),
      );
      root.replaceChildren(style, box);
      const shownFor = `${disclosure.id}@${disclosure.version}`;
      if (this.#shownFor !== shownFor) {
        this.#shownFor = shownFor;
        disclosure.markShown();
      }
    } else {
      const reopen = h(
        doc,
        "button",
        {
          type: "button",
          class: "compact",
          "aria-label": `${text.label}: ${messages.ui.details}`,
          part: "compact",
        },
        icon(doc),
        text.label,
      );
      reopen.addEventListener("click", () => {
        this.#expanded = true;
        this.#render();
      });
      root.replaceChildren(style, reopen);
    }
  }
}

/** `<witness-label kind="generated" generator="Claude" created="2026-10-05" reviewed href="/ki">` */
export class WitnessLabelElement extends BaseElement {
  static observedAttributes = [
    "kind",
    "locale",
    "generator",
    "generator-version",
    "created",
    "reviewed",
    "href",
    "variant",
  ];

  #open = false;
  #onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.#open) {
      this.#toggle(false);
      this.shadowRoot?.querySelector<HTMLButtonElement>(".badge")?.focus();
    }
  };
  #onOutside = (event: Event) => {
    if (this.#open && !event.composedPath().includes(this)) this.#toggle(false);
  };

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.ownerDocument.addEventListener("keydown", this.#onKey);
    this.ownerDocument.addEventListener("click", this.#onOutside);
    this.#render();
  }

  disconnectedCallback(): void {
    this.ownerDocument.removeEventListener("keydown", this.#onKey);
    this.ownerDocument.removeEventListener("click", this.#onOutside);
  }

  attributeChangedCallback(): void {
    if (this.isConnected && this.shadowRoot) this.#render();
  }

  #toggle(open: boolean): void {
    this.#open = open;
    this.#render();
  }

  #render(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const doc = this.ownerDocument;
    const tags = locale(this);
    const messages = getMessages(tags);
    const kind = kindOf(this, "generated");
    const text = messages.kinds[kind];
    const generator = [this.getAttribute("generator"), this.getAttribute("generator-version")]
      .filter(Boolean)
      .join(" ");
    const created = this.getAttribute("created");
    const href = this.getAttribute("href");

    const badge = h(
      doc,
      "button",
      {
        type: "button",
        class: "badge",
        part: "badge",
        "aria-expanded": String(this.#open),
        "aria-controls": "panel",
        title: messages.ui.details,
      },
      icon(doc),
      h(doc, "span", { part: "label" }, text.label),
    );
    badge.addEventListener("click", () => this.#toggle(!this.#open));

    const facts = h(doc, "ul", {});
    if (generator) facts.append(h(doc, "li", {}, format(messages.ui.generatedWith, { generator })));
    if (created) {
      facts.append(
        h(doc, "li", {}, format(messages.ui.createdOn, { date: formatDate(created, tags) })),
      );
    }
    if (this.hasAttribute("reviewed")) facts.append(h(doc, "li", {}, messages.ui.humanReviewed));

    const close = h(
      doc,
      "button",
      { type: "button", class: "close", "aria-label": messages.ui.close },
      "×",
    );
    close.addEventListener("click", () => this.#toggle(false));

    const panel = h(
      doc,
      "div",
      { id: "panel", class: "panel", role: "dialog", "aria-label": text.title, part: "panel" },
      close,
      h(doc, "strong", {}, text.title),
      h(doc, "p", {}, text.body),
      facts.childElementCount > 0 ? facts : null,
      href ? h(doc, "a", { href, part: "link" }, messages.ui.moreInfo) : null,
    );
    if (!this.#open) panel.hidden = true;
    root.replaceChildren(h(doc, "style", {}, LABEL_CSS), badge, panel);
  }
}

const PLAYER_CSS = `
:host { display: block; position: relative; }
:host([hidden]) { display: none; }
.frame { position: relative; display: block; }
.frame.video { display: inline-block; max-width: 100%; vertical-align: top; }
.bar { display: block; margin-block-end: .5em; }
::slotted(video), ::slotted(audio) { display: block; max-width: 100%; }
`;

/**
 * `<witness-player kind="deepfake" generator="video-model" href="/ki"><video src="clip.mp4" controls></video></witness-player>`
 *
 * The label stays visible while the media plays: an overlay in the corner of a video, a bar above
 * the controls of an audio player. Takes the same attributes as `<witness-label>`.
 */
export class WitnessPlayerElement extends BaseElement {
  static observedAttributes = [
    "kind",
    "locale",
    "generator",
    "generator-version",
    "created",
    "reviewed",
    "href",
  ];

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.#render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected && this.shadowRoot) this.#render();
  }

  #render(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const doc = this.ownerDocument;
    const label = doc.createElement("witness-label");
    for (const name of WitnessPlayerElement.observedAttributes) {
      const value = this.getAttribute(name);
      if (value !== null) label.setAttribute(name, value);
    }
    if (!label.hasAttribute("kind")) label.setAttribute("kind", "generated");
    const video = this.querySelector("video") !== null;
    label.setAttribute("variant", video ? "overlay" : "inline");
    const slot = h(doc, "slot", {});
    const frame = h(doc, "div", { class: video ? "frame video" : "frame" });
    if (video) frame.append(slot, label);
    else {
      const bar = h(doc, "div", { class: "bar" });
      bar.append(label);
      frame.append(bar, slot);
    }
    slot.addEventListener("slotchange", () => {
      if ((this.querySelector("video") !== null) !== video) this.#render();
    });
    root.replaceChildren(h(doc, "style", {}, PLAYER_CSS), frame);
  }
}

function formatDate(value: string, tags: string[]): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(tags.length > 0 ? tags : undefined, {
      dateStyle: "medium",
    }).format(date);
  } catch {
    return value;
  }
}

function getLocaleCode(tags: string[]): string {
  return tags[0] ?? "en";
}

const CREDENTIALS_TEXT: Record<string, Record<string, string>> = {
  en: {
    label: "Content Credentials",
    title: "Content Credentials",
    found: "This file carries a C2PA manifest.",
    none: "No Content Credentials found in this file.",
    error: "The file could not be read.",
    ai: "The manifest declares AI as the source.",
    noai: "The manifest does not declare AI as the source.",
    tool: "Made with {generator}",
    unverified:
      "Not verified: the signature and certificate were not checked in the browser. Use a C2PA validator for that.",
    actions: "Recorded actions",
    history: "AI appears in the history of this file.",
  },
  de: {
    label: "Content Credentials",
    title: "Content Credentials",
    found: "Diese Datei enthält ein C2PA-Manifest.",
    none: "In dieser Datei wurden keine Content Credentials gefunden.",
    error: "Die Datei konnte nicht gelesen werden.",
    ai: "Das Manifest erklärt KI als Quelle.",
    noai: "Das Manifest erklärt KI nicht als Quelle.",
    tool: "Erstellt mit {generator}",
    unverified:
      "Nicht geprüft: Signatur und Zertifikat wurden im Browser nicht kontrolliert. Dafür braucht es einen C2PA-Validator.",
    actions: "Aufgezeichnete Aktionen",
    history: "KI taucht in der Vorgeschichte dieser Datei auf.",
  },
  fr: {
    label: "Content Credentials",
    title: "Content Credentials",
    found: "Ce fichier contient un manifeste C2PA.",
    none: "Aucun Content Credentials trouvé dans ce fichier.",
    error: "Le fichier n'a pas pu être lu.",
    ai: "Le manifeste déclare l'IA comme source.",
    noai: "Le manifeste ne déclare pas l'IA comme source.",
    tool: "Créé avec {generator}",
    unverified:
      "Non vérifié : la signature et le certificat n'ont pas été contrôlés dans le navigateur. Utilisez un validateur C2PA.",
    actions: "Actions enregistrées",
    history: "L'IA apparaît dans l'historique de ce fichier.",
  },
  it: {
    label: "Content Credentials",
    title: "Content Credentials",
    found: "Questo file contiene un manifesto C2PA.",
    none: "Nessun Content Credentials trovato in questo file.",
    error: "Impossibile leggere il file.",
    ai: "Il manifesto dichiara l'IA come fonte.",
    noai: "Il manifesto non dichiara l'IA come fonte.",
    tool: "Creato con {generator}",
    unverified:
      "Non verificato: firma e certificato non sono stati controllati nel browser. Usa un validatore C2PA.",
    actions: "Azioni registrate",
    history: "L'IA compare nella cronologia di questo file.",
  },
};

type CredentialsState = "idle" | "loading" | "found" | "none" | "error";

/**
 * `<witness-credentials src="/media/picture.jpg">`
 *
 * Reads the C2PA manifest of an image, audio or video file in the browser, without a server, and
 * shows what it says in a details popover. Witness only reads the manifest; it does not check
 * the signature, so the popover says "not verified". Fires `witness-credentials` with
 * `detail: { info: C2paInfo | null }` when the file is read. The file must be reachable with CORS.
 */
export class WitnessCredentialsElement extends BaseElement {
  static observedAttributes = ["src", "locale", "href", "variant"];

  /** The result of the last read, or `null` when there are no credentials. */
  info: C2paInfo | null = null;

  #state: CredentialsState = "idle";
  #open = false;
  #loaded = "";
  #onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.#open) {
      this.#toggle(false);
      this.shadowRoot?.querySelector<HTMLButtonElement>(".badge")?.focus();
    }
  };
  #onOutside = (event: Event) => {
    if (this.#open && !event.composedPath().includes(this)) this.#toggle(false);
  };

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.ownerDocument.addEventListener("keydown", this.#onKey);
    this.ownerDocument.addEventListener("click", this.#onOutside);
    this.#render();
    void this.#load();
  }

  disconnectedCallback(): void {
    this.ownerDocument.removeEventListener("keydown", this.#onKey);
    this.ownerDocument.removeEventListener("click", this.#onOutside);
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected || !this.shadowRoot) return;
    if (name === "src") void this.#load();
    else this.#render();
  }

  #toggle(open: boolean): void {
    this.#open = open;
    this.#render();
  }

  async #load(): Promise<void> {
    const src = this.getAttribute("src");
    if (!src || src === this.#loaded) return;
    this.#loaded = src;
    this.#state = "loading";
    this.info = null;
    this.#render();
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const info = readC2pa(new Uint8Array(await response.arrayBuffer()));
      if (this.getAttribute("src") !== src) return;
      this.info = info;
      this.#state = info ? "found" : "none";
    } catch {
      if (this.getAttribute("src") !== src) return;
      this.#state = "error";
    }
    this.#render();
    this.dispatchEvent(
      new CustomEvent("witness-credentials", {
        bubbles: true,
        composed: true,
        detail: { info: this.info, state: this.#state },
      }),
    );
  }

  #render(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const doc = this.ownerDocument;
    const tags = locale(this);
    const text = CREDENTIALS_TEXT[resolveLocale(tags)] ?? CREDENTIALS_TEXT.en ?? {};
    const en = CREDENTIALS_TEXT.en ?? {};
    const t = (key: string): string => text[key] ?? en[key] ?? key;
    const href = this.getAttribute("href");
    const info = this.info;

    // Nothing to show while loading or when the file has no credentials.
    if (this.#state === "idle" || this.#state === "loading" || this.#state === "none") {
      root.replaceChildren(h(doc, "style", {}, LABEL_CSS));
      this.hidden = true;
      return;
    }
    this.hidden = false;

    const badge = h(
      doc,
      "button",
      {
        type: "button",
        class: "badge",
        part: "badge",
        "aria-expanded": String(this.#open),
        "aria-controls": "panel",
      },
      h(doc, "span", { class: "icon", "aria-hidden": "true", part: "icon" }, "CR"),
      h(doc, "span", { part: "label" }, t("label")),
    );
    badge.addEventListener("click", () => this.#toggle(!this.#open));

    const body = h(doc, "div", {});
    if (this.#state === "error" || !info) {
      body.append(h(doc, "p", {}, t("error")));
    } else {
      body.append(h(doc, "p", {}, t("found")));
      const facts = h(doc, "ul", {});
      const tool = info.generator ?? info.active.claimGenerator;
      if (tool) facts.append(h(doc, "li", {}, format(t("tool"), { generator: tool })));
      facts.append(h(doc, "li", {}, info.aiGenerated ? t("ai") : t("noai")));
      if (!info.aiGenerated && info.aiInHistory) facts.append(h(doc, "li", {}, t("history")));
      body.append(facts);
      if (info.active.actions.length > 0) {
        body.append(h(doc, "strong", {}, t("actions")));
        const list = h(doc, "ul", {});
        for (const action of info.active.actions) {
          list.append(h(doc, "li", {}, action.action));
        }
        body.append(list);
      }
      body.append(h(doc, "p", { class: "muted" }, t("unverified")));
    }

    const closeLabel = getMessages(tags).ui.close;
    const close = h(
      doc,
      "button",
      { type: "button", class: "close", "aria-label": closeLabel },
      "×",
    );
    close.addEventListener("click", () => this.#toggle(false));
    const panel = h(
      doc,
      "div",
      { id: "panel", class: "panel", role: "dialog", "aria-label": t("title"), part: "panel" },
      close,
      h(doc, "strong", {}, t("title")),
      body,
      href ? h(doc, "a", { href, part: "link" }, getMessages(tags).ui.moreInfo) : null,
    );
    if (!this.#open) panel.hidden = true;
    root.replaceChildren(h(doc, "style", {}, LABEL_CSS), badge, panel);
  }
}

/** Registers `<witness-notice>`, `<witness-label>`, `<witness-player>` and `<witness-credentials>`. */
export function defineWitnessElements(): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get("witness-notice"))
    customElements.define("witness-notice", WitnessNoticeElement);
  if (!customElements.get("witness-label"))
    customElements.define("witness-label", WitnessLabelElement);
  if (!customElements.get("witness-player"))
    customElements.define("witness-player", WitnessPlayerElement);
  if (!customElements.get("witness-credentials"))
    customElements.define("witness-credentials", WitnessCredentialsElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "witness-notice": WitnessNoticeElement;
    "witness-label": WitnessLabelElement;
    "witness-player": WitnessPlayerElement;
  }
  interface HTMLElementEventMap {
    "witness-shown": CustomEvent<DisclosureEvent>;
    "witness-acknowledged": CustomEvent<DisclosureEvent>;
  }
}
