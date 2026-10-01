import type { ReactNode } from "react";
import { ArrowRight, Database, Gauge, Layers, ShieldCheck } from "lucide-react";
import { GESTURES } from "../lib/gestures";
import { HandDiagram } from "./HandDiagram";

function Section({ n, title, lead, children }: { n: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/[0.06] py-14">
      <div className="mb-8 flex items-baseline gap-4">
        <span className="font-mono text-xs text-lime-300">{n}</span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
          {lead && <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-white/50">{lead}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const card = "rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5";
const code = "rounded-md bg-white/[0.07] px-1.5 py-0.5 font-mono text-[12px] text-lime-200";

const PIPELINE = [
  { t: "Capture", tech: "OpenCV · getUserMedia", d: "The webcam delivers ~30 frames per second. In Python, cv2.VideoCapture reads each frame as a BGR NumPy array." },
  { t: "Pre-process", tech: "OpenCV", d: "Mirror the frame (cv2.flip) so it behaves like a mirror, then convert BGR → RGB because MediaPipe expects RGB." },
  { t: "Detect + landmark", tech: "MediaPipe Hand Landmarker", d: "Two neural networks find the palm and then regress 21 3D joint positions of the hand." },
  { t: "Classify", tech: "Rule-based geometry", d: "Distances between joints tell which fingers are extended → Open Palm, Fist, Pointer, Peace, Thumbs Up." },
  { t: "Filter", tech: "Temporal buffer", d: "Hold-to-confirm debounce + cooldown stop flicker and accidental triggers." },
  { t: "Dispatch", tech: "PyAutoGUI", d: "A confirmed command becomes a real OS media key: playpause, volumeup, volumedown, volumemute." },
  { t: "Display", tech: "Streamlit", d: "Annotated video, FPS, latency and the command log are streamed to a browser dashboard." },
];

const LANDMARKS = [
  ["0", "Wrist"],
  ["1–4", "Thumb: CMC, MCP, IP, TIP"],
  ["5–8", "Index: MCP, PIP, DIP, TIP"],
  ["9–12", "Middle: MCP, PIP, DIP, TIP"],
  ["13–16", "Ring: MCP, PIP, DIP, TIP"],
  ["17–20", "Pinky: MCP, PIP, DIP, TIP"],
];

const LATENCY = [
  ["Camera frame interval (30 fps)", "≈ 33 ms", "Hardware limit – not part of processing"],
  ["Flip + colour convert", "< 1 ms", "OpenCV, runs in optimised C++"],
  ["MediaPipe inference", "8 – 25 ms", "TFLite + XNNPACK (CPU) or GPU delegate"],
  ["Gesture classification", "< 0.1 ms", "≈ 20 distance computations"],
  ["Temporal filter", "< 0.1 ms", "A handful of comparisons"],
  ["PyAutoGUI key press", "1 – 5 ms", "Calls the OS keyboard API"],
];

const QA = [
  ["Why MediaPipe instead of training my own CNN?", "MediaPipe's models were trained by Google on a large, diverse dataset and run in real time on a laptop CPU. Training an equivalent hand-keypoint network from scratch needs tens of thousands of annotated images and GPUs. Re-using it lets the project focus on the interesting part: turning landmarks into commands."],
  ["Is there any machine learning in your own code?", "The classifier is rule-based (geometry), which makes it explainable, fast and needs no training data. The learning happens inside the pre-trained MediaPipe networks. A natural extension is to collect landmark vectors and train a small MLP / KNN / Random-Forest on them to recognise custom gestures."],
  ["Why are world landmarks used for the rules?", "Image landmarks are normalised to the frame, so x and y are stretched by the aspect ratio and depend on distance to the camera. World landmarks are in metres with the origin at the hand centre, so distances are isotropic and the same for a near or far hand."],
  ["How do you avoid accidental triggers?", "Three layers: (1) minimum detection / tracking confidence in the model, (2) the pose must be held for 350 ms, (3) a 1.2 s cooldown after every discrete command. Volume gestures repeat at a controlled rate instead of every frame."],
  ["How does the Open Palm differ from a Fist mathematically?", "For each finger we compare ‖tip − wrist‖ with ‖PIP − wrist‖. When a finger is straight the tip is far beyond the PIP joint; when it is curled the tip folds back toward the palm. Four extended fingers = Open Palm, four curled = Fist."],
  ["What is the role of OpenCV?", "Camera capture, frame mirroring, colour-space conversion, drawing the skeleton and text overlays on the frame. It does not detect hands – MediaPipe does."],
  ["Which database do you use?", "None is required for recognition. SQLite (built into Python) is used as an optional event log to show history and analytics. The models themselves were trained by Google on their own image datasets."],
  ["What are the limitations?", "Poor lighting, strong backlight and very fast motion reduce accuracy; only one hand is tracked; OS media keys act on whichever app currently owns media focus; Wayland on Linux blocks synthetic key events."],
];

export function Guide() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <div className="py-16">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-lime-300">Documentation</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          How a wave of your hand becomes a media command.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/50">
          Every stage of the project explained – from camera pixels to keyboard events – with the exact computer-vision
          concepts you will be asked about in a viva.
        </p>
      </div>

      {/* 1 pipeline */}
      <Section n="01" title="System architecture" lead="Seven stages run on every camera frame. Each one has a single responsibility, which is why the code is split into small modules.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((p, i) => (
            <div key={p.t} className={card}>
              <div className="mb-4 flex items-center justify-between">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 font-mono text-xs text-white/60">{i + 1}</span>
                {i < PIPELINE.length - 1 && <ArrowRight className="h-4 w-4 text-white/20" />}
              </div>
              <h3 className="text-sm font-semibold text-white">{p.t}</h3>
              <p className="mt-0.5 font-mono text-[11px] text-lime-300/80">{p.tech}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-white/50">{p.d}</p>
            </div>
          ))}
          <div className={`${card} flex flex-col justify-center border-lime-300/20 bg-lime-300/[0.04]`}>
            <Gauge className="mb-3 h-5 w-5 text-lime-300" />
            <p className="text-sm font-semibold text-white">Total processing</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/50">≈ 10 – 30 ms per frame on a modern laptop – inside the 50 ms target.</p>
          </div>
        </div>
      </Section>

      {/* 2 CV */}
      <Section n="02" title="How computer vision is applied" lead="MediaPipe Hands is a two-stage machine-learning pipeline. Splitting the problem is what makes it fast enough for real time.">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className={card}>
              <h3 className="mb-1 text-sm font-semibold text-white">Stage 1 · Palm detector (BlazePalm)</h3>
              <p className="text-[13px] leading-relaxed text-white/50">
                A single-shot detector (SSD-style CNN) scans the whole frame and returns an oriented bounding box around the palm. Palms are
                easier to detect than whole hands with fingers, because they are roughly square and have no articulation – so a simple box is enough.
              </p>
            </div>
            <div className={card}>
              <h3 className="mb-1 text-sm font-semibold text-white">Stage 2 · Hand landmark model</h3>
              <p className="text-[13px] leading-relaxed text-white/50">
                The cropped, rotated hand region is fed to a second CNN that <em>regresses</em> 21 keypoints, each with (x, y, z). It also outputs a
                <span className={`mx-1 ${code}`}>presence</span> score and left / right <span className={`ml-1 ${code}`}>handedness</span>. z is depth relative to the wrist.
              </p>
            </div>
            <div className={card}>
              <h3 className="mb-1 text-sm font-semibold text-white">Tracking trick</h3>
              <p className="text-[13px] leading-relaxed text-white/50">
                In <span className={code}>VIDEO</span> mode the crop for the next frame is derived from the landmarks of the previous frame, so the heavy palm detector
                only runs again when tracking is lost. This is the main reason inference is only a few milliseconds.
              </p>
            </div>
            <div className={card}>
              <h3 className="mb-1 text-sm font-semibold text-white">Two kinds of coordinates</h3>
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-white/50">
                <li><span className={code}>landmarks</span> – x, y normalised 0–1 relative to the image; used for drawing and “is the thumb pointing up?”.</li>
                <li><span className={code}>world_landmarks</span> – metres, origin at the hand centre; used for distances in the gesture rules.</li>
              </ul>
            </div>
          </div>
          <div className={`${card} flex flex-col`}>
            <HandDiagram />
            <div className="mt-4 divide-y divide-white/[0.05] text-xs">
              {LANDMARKS.map(([i, n]) => (
                <div key={i} className="flex justify-between py-2">
                  <span className="font-mono text-lime-300">{i}</span>
                  <span className="text-white/55">{n}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/35">MCP = knuckle · PIP/DIP/IP = middle joints · TIP = fingertip · CMC = thumb base.</p>
          </div>
        </div>
      </Section>

      {/* 3 model */}
      <Section n="03" title="How the model works" lead="You are using a pre-trained model – you do not train anything. Here is what is inside the file you download.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className={card}>
            <Layers className="mb-3 h-5 w-5 text-lime-300" />
            <h3 className="text-sm font-semibold text-white">The model file</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">
              <span className={code}>hand_landmarker.task</span> (~7.5 MB) is a bundle of two TensorFlow Lite networks: the palm detector (192×192 input) and the
              landmark network (224×224 input). Quantised to float16 so it is small and fast.
            </p>
          </div>
          <div className={card}>
            <Database className="mb-3 h-5 w-5 text-lime-300" />
            <h3 className="text-sm font-semibold text-white">Training data</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">
              Google trained the landmark model on roughly 30,000 real-world images manually annotated with 21 3D points, plus synthetic hands rendered over
              many backgrounds. That is why it works across skin tones, lighting and angles.
            </p>
          </div>
          <div className={card}>
            <ShieldCheck className="mb-3 h-5 w-5 text-lime-300" />
            <h3 className="text-sm font-semibold text-white">Runtime</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">
              Inference runs on-device through TFLite (CPU with XNNPACK) or a GPU delegate. In the browser the same model runs via WebAssembly + WebGL. No frame is
              ever uploaded.
            </p>
          </div>
        </div>
        <div className={`${card} mt-3`}>
          <h3 className="mb-3 text-sm font-semibold text-white">Rule-based gesture classifier (your code)</h3>
          <p className="mb-4 text-[13px] leading-relaxed text-white/50">
            A finger is <em>extended</em> when its tip is farther from the wrist than its middle joint:
          </p>
          <pre className="mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/40 p-4 font-mono text-[13px] text-lime-200">
            extended(finger) = ‖tip − wrist‖ &gt; 1.08 × ‖pip − wrist‖
          </pre>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] uppercase tracking-widest text-white/35">
                  <th className="py-2 pr-4 font-medium">Gesture</th>
                  <th className="py-2 pr-4 font-medium">Rule</th>
                  <th className="py-2 pr-4 font-medium">Command</th>
                  <th className="py-2 font-medium">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {GESTURES.map((g) => (
                  <tr key={g.id}>
                    <td className="py-3 pr-4 text-white/85">
                      <span className="mr-2">{g.emoji}</span>
                      {g.label}
                    </td>
                    <td className="py-3 pr-4 text-white/50">{g.rule}</td>
                    <td className="py-3 pr-4 text-lime-300">{g.actionLabel}</td>
                    <td className="py-3 text-white/40">{g.continuous ? "repeats while held" : "once per hold"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* 4 temporal */}
      <Section n="04" title="Temporal cooldown buffer" lead="A raw classifier flickers: one noisy frame could pause your movie. The buffer turns a noisy frame stream into deliberate commands.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Debounce", "The same gesture must be seen continuously for the hold time (default 350 ms). Any change restarts the timer – shown as the lime “Hold to confirm” bar."],
            ["Cooldown", "After Play / Pause / Mute fires, all discrete commands are locked for 1.2 s. Shown as the white “Cooldown” bar draining."],
            ["Repeat rate", "Volume gestures are continuous: after the hold time they fire every 250 ms, giving smooth ±5 % steps instead of 30 jumps per second."],
          ].map(([t, d], i) => (
            <div key={t} className={card}>
              <p className="mb-3 font-mono text-xs text-lime-300">0{i + 1}</p>
              <h3 className="text-sm font-semibold text-white">{t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/50">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 latency */}
      <Section n="05" title="Latency budget" lead="Where the “sub-50 ms” figure comes from. Numbers are typical for a recent laptop; the live Inference stat in the Studio tab shows your real value.">
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <tbody className="divide-y divide-white/[0.05]">
              {LATENCY.map(([a, b, c]) => (
                <tr key={a}>
                  <td className="px-5 py-3.5 text-white/85">{a}</td>
                  <td className="px-5 py-3.5 font-mono text-lime-300">{b}</td>
                  <td className="px-5 py-3.5 text-white/40">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 6 database */}
      <Section n="06" title="Which database is used?" lead="Short answer: none is needed for the system to work. Here is the complete picture so you can answer confidently.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className={card}>
            <h3 className="text-sm font-semibold text-white">Training dataset</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">The ~30k annotated hand images belong to Google and are already baked into the model weights. You never download or touch them.</p>
          </div>
          <div className={card}>
            <h3 className="text-sm font-semibold text-white">SQLite (optional)</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">
              The Python project logs every executed command to <span className={code}>gesture_log.db</span>: timestamp, gesture, action, latency. SQLite is a serverless file database that ships with Python.
            </p>
          </div>
          <div className={card}>
            <h3 className="text-sm font-semibold text-white">Browser demo</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">This web version stores your YouTube / URL library and event history in <span className={code}>localStorage</span>. Local files are never uploaded or stored.</p>
          </div>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/40 p-5 font-mono text-[12.5px] leading-relaxed text-white/70">
{`CREATE TABLE events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT NOT NULL,     -- 2026-01-15T10:32:08
  gesture    TEXT NOT NULL,     -- open_palm
  action     TEXT NOT NULL,     -- play
  latency_ms REAL               -- 17.4
);`}
        </pre>
      </Section>

      {/* 7 web vs python */}
      <Section n="07" title="This web demo vs. the Python project" lead="Both use the same model and the same rules. They differ in how a command reaches the player.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className={card}>
            <h3 className="text-sm font-semibold text-white">Web demo (this page)</h3>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-white/50">
              <li>• MediaPipe Tasks Vision (JavaScript / WASM)</li>
              <li>• Controls the built-in player: local files, direct URLs, YouTube</li>
              <li>• Nothing to install – ideal for a live demo or screenshots</li>
              <li>• A browser cannot press OS hotkeys (security), so it can only drive the page</li>
            </ul>
          </div>
          <div className={`${card} border-lime-300/20 bg-lime-300/[0.03]`}>
            <h3 className="text-sm font-semibold text-white">Python project (your submission)</h3>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-white/50">
              <li>• MediaPipe Python + OpenCV + Streamlit + PyAutoGUI</li>
              <li>• Presses <em>global</em> media keys → controls VLC, Spotify, YouTube in any browser tab…</li>
              <li>• Works for presentations: slides, system volume, anything with media keys</li>
              <li>• Full code and VS Code walkthrough in the “Python build” tab</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 8 QA */}
      <Section n="08" title="Viva questions & answers">
        <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          {QA.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white/90">
                {q}
                <span className="text-lg leading-none text-white/30 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-white/50">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section n="09" title="Limitations & future scope">
        <div className="grid gap-3 md:grid-cols-2">
          <div className={card}>
            <h3 className="text-sm font-semibold text-white">Known limitations</h3>
            <ul className="mt-3 space-y-2 text-[13px] text-white/50">
              <li>• Needs reasonable, front-facing light</li>
              <li>• One hand tracked at a time</li>
              <li>• Fixed gesture vocabulary (rules are hand-written)</li>
              <li>• OS media keys go to the app that has media focus</li>
            </ul>
          </div>
          <div className={card}>
            <h3 className="text-sm font-semibold text-white">Future scope</h3>
            <ul className="mt-3 space-y-2 text-[13px] text-white/50">
              <li>• Train an MLP on landmark vectors for custom gestures</li>
              <li>• Swipe gestures for next / previous track (motion history)</li>
              <li>• Hand-height as a continuous volume slider</li>
              <li>• Two-hand support and per-user calibration</li>
            </ul>
          </div>
        </div>
      </Section>
    </div>
  );
}
