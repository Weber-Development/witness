import "@sweberdev/witness/elements";
import "@sweberdev/witness/styles.css";
import {
  createMarking,
  type DisclosureEvent,
  labelHtml,
  markingAttributes,
} from "@sweberdev/witness";

// Article 50(1): tell people they are talking to an AI before the first message.
// The acknowledgement is remembered; `witness-shown` and `witness-acknowledged` are your evidence.
document.addEventListener("witness-shown", (event) =>
  console.info("notice shown", (event as CustomEvent<DisclosureEvent>).detail),
);
document.addEventListener("witness-acknowledged", (event) =>
  console.info("notice acknowledged", (event as CustomEvent<DisclosureEvent>).detail),
);

// Article 50(4): a visible label on AI-generated content.
const marking = createMarking({ generator: "Example model", generatorVersion: "1" });
const answer = labelHtml("<p>This paragraph was written by a model.</p>", marking, {
  locale: "en",
  tag: "article",
});

const app = document.querySelector<HTMLElement>("#app");
if (app) {
  app.innerHTML = `
    <h1>Witness with Vite</h1>
    <witness-notice disclosure-id="support" href="/ai.html"></witness-notice>
    <h2>A label next to an image or a text</h2>
    <p>
      An AI image <witness-label kind="generated" generator="Image model" href="/ai.html"></witness-label>
    </p>
    ${answer}
    <h2>Audio and video</h2>
    <witness-player kind="deepfake" generator="Video model" href="/ai.html">
      <video width="320" height="180" controls></video>
    </witness-player>
  `;
  // The same attributes are what the Pro scanner looks for.
  console.info(markingAttributes(marking));
}
