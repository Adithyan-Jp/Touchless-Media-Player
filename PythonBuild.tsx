import { useState, type ReactNode } from "react";
import { Check, Copy, FileCode2, Terminal } from "lucide-react";
import appPy from "../python_project/app.py?raw";
import gesturesPy from "../python_project/gestures.py?raw";
import controllerPy from "../python_project/controller.py?raw";
import dbPy from "../python_project/db.py?raw";
import reqTxt from "../python_project/requirements.txt?raw";
import { cn } from "../utils/cn";

const FILES = [
  { name: "app.py", src: appPy, desc: "Streamlit UI + the real-time loop that connects every module." },
  { name: "gestures.py", src: gesturesPy, desc: "Landmarks → gesture name using joint-distance rules." },
  { name: "controller.py", src: controllerPy, desc: "Debounce / cooldown buffer and PyAutoGUI media keys." },
  { name: "db.py", src: dbPy, desc: "Optional SQLite event log and usage statistics." },
  { name: "requirements.txt", src: reqTxt, desc: "Python packages to install with pip." },
];

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1400);
      }}
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-lime-300" /> : <Copy className="h-3.5 w-3.5" />}
      {ok ? "Copied" : label}
    </button>
  );
}

function Cmd({ children, title }: { children: string; title?: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07] bg-black/40">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[11px] text-white/35">
          <Terminal className="h-3 w-3" /> {title ?? "Terminal"}
        </span>
        <CopyButton text={children} />
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[12.5px] leading-relaxed text-lime-100/90">{children}</pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="relative pl-12">
      <span className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-[#0a0a0b] font-mono text-xs text-lime-300">{n}</span>
      <div className="absolute bottom-[-2rem] left-4 top-9 w-px bg-white/[0.07]" />
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <div className="mt-2 text-[13.5px] leading-relaxed text-white/50">{children}</div>
    </div>
  );
}

const TREE = `gesture-player/
├── .venv/                  ← virtual environment (created by you)
├── .vscode/
│   └── launch.json         ← optional: press F5 to run / debug
├── app.py                  ← Streamlit app (entry point)
├── gestures.py             ← gesture classifier
├── controller.py           ← cooldown buffer + PyAutoGUI
├── db.py                   ← SQLite logger
├── requirements.txt
├── hand_landmarker.task    ← auto-downloaded on first run
└── gesture_log.db          ← auto-created on first command`;

const LAUNCH = `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Streamlit: app.py",
      "type": "debugpy",
      "request": "launch",
      "module": "streamlit",
      "args": ["run", "app.py"],
      "justMyCode": true
    }
  ]
}`;

export function PythonBuild() {
  const [active, setActive] = useState(0);
  const file = FILES[active];

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <div className="py-16">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-lime-300">Build it in VS Code</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          The full Python project, step by step.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/50">
          This is the version that presses real keyboard media keys. Copy the five files below, follow the steps and you will have the same
          system running as a desktop-controlling Streamlit app.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <Step n={1} title="Install the prerequisites">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <b className="text-white/80">Python 3.10 – 3.12 (64-bit)</b> – MediaPipe does not yet ship wheels for the newest Python versions. Tick “Add Python to PATH” on Windows.
              </li>
              <li>
                <b className="text-white/80">Visual Studio Code</b> + the <b className="text-white/80">Python</b> extension (Microsoft). Optional: Pylance.
              </li>
              <li>A webcam and decent front lighting.</li>
            </ul>
            <Cmd>{`python --version     # should print 3.10 / 3.11 / 3.12`}</Cmd>
          </Step>

          <Step n={2} title="Create the project folder and open it in VS Code">
            <Cmd>{`mkdir gesture-player
cd gesture-player
code .`}</Cmd>
            <p className="mt-3">Create the five files shown on the right (New File icon in the Explorer) and paste the code of each one.</p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07] bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-white/60">{TREE}</pre>
          </Step>

          <Step n={3} title="Create a virtual environment">
            <p>A venv keeps this project's packages separate from the rest of your system. Open the VS Code terminal with <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Ctrl + `</kbd>.</p>
            <Cmd title="Windows (PowerShell)">{`py -3.11 -m venv .venv
.venv\\Scripts\\Activate.ps1`}</Cmd>
            <Cmd title="macOS / Linux">{`python3.11 -m venv .venv
source .venv/bin/activate`}</Cmd>
            <p className="mt-3">
              Then press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Ctrl + Shift + P</kbd> → <b className="text-white/80">Python: Select Interpreter</b> → choose the one inside <code className="font-mono text-lime-200">.venv</code>.
              If PowerShell blocks activation run <code className="font-mono text-lime-200">Set-ExecutionPolicy -Scope CurrentUser RemoteSigned</code>.
            </p>
          </Step>

          <Step n={4} title="Install the dependencies">
            <Cmd>{`pip install --upgrade pip
pip install -r requirements.txt`}</Cmd>
            <p className="mt-3">This installs MediaPipe (hand model runtime), OpenCV (camera + drawing), Streamlit (web UI), PyAutoGUI (OS key presses) and NumPy.</p>
          </Step>

          <Step n={5} title="Run it">
            <Cmd>{`streamlit run app.py`}</Cmd>
            <p className="mt-3">
              The browser opens at <code className="font-mono text-lime-200">http://localhost:8501</code>. The first launch downloads <code className="font-mono text-lime-200">hand_landmarker.task</code> (~7 MB). Switch on <b className="text-white/80">Start camera</b> in the sidebar, start a video in VLC / YouTube / Spotify, and raise your hand.
            </p>
            <p className="mt-2">Tip: turn off <i>Send OS media keys</i> first to test the gestures safely.</p>
          </Step>

          <Step n={6} title="Optional: run and debug with F5">
            <p>Create <code className="font-mono text-lime-200">.vscode/launch.json</code> to set breakpoints inside <code className="font-mono text-lime-200">gestures.py</code> or <code className="font-mono text-lime-200">controller.py</code>.</p>
            <Cmd title=".vscode/launch.json">{LAUNCH}</Cmd>
          </Step>

          <Step n={7} title="Troubleshooting">
            <ul className="list-disc space-y-1.5 pl-5">
              <li><b className="text-white/80">Black frame / “could not read camera”</b> – change the Camera index in the sidebar, or close Zoom / Teams which may hold the webcam.</li>
              <li><b className="text-white/80">macOS</b> – System Settings → Privacy & Security → allow <i>Camera</i> and <i>Accessibility</i> for VS Code / Terminal, otherwise PyAutoGUI cannot press keys.</li>
              <li><b className="text-white/80">Linux</b> – use an X11 session (Wayland blocks synthetic keys) and run <code className="font-mono text-lime-200">sudo apt install python3-tk python3-dev scrot</code>.</li>
              <li><b className="text-white/80">pip cannot find mediapipe</b> – your Python is too new; create the venv with 3.11.</li>
              <li><b className="text-white/80">Gestures misfire</b> – increase “Hold time”, improve lighting, keep the hand 40 – 80 cm away.</li>
              <li><b className="text-white/80">Nothing happens in the player</b> – click the player once so it owns media focus; OS media keys go to the focused media app.</li>
            </ul>
          </Step>
        </div>

        {/* code viewer */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <div className="flex flex-wrap gap-1 border-b border-white/[0.06] p-2">
              {FILES.map((f, i) => (
                <button
                  key={f.name}
                  onClick={() => setActive(i)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] transition",
                    i === active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70",
                  )}
                >
                  <FileCode2 className="h-3 w-3" />
                  {f.name}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-2.5">
              <p className="text-xs text-white/45">{file.desc}</p>
              <CopyButton text={file.src} label="Copy file" />
            </div>
            <pre className="max-h-[64vh] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-white/70">
              <code>{file.src}</code>
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}
