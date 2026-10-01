"""
app.py  -  Touchless Gesture-Controlled Media Player (Streamlit front-end)

Run with:   streamlit run app.py

Pipeline per frame
    OpenCV capture -> flip -> BGR->RGB -> MediaPipe HandLandmarker (21 landmarks)
    -> gestures.classify -> controller.ActionEngine (debounce + cooldown)
    -> controller.OSController (PyAutoGUI media keys) -> db.log_event (SQLite)
"""
import os
import time
import urllib.request

import cv2
import mediapipe as mp
import streamlit as st
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

import db
from controller import ActionEngine, OSController
from gestures import GESTURE_TO_ACTION, LABELS, classify

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)
MODEL_PATH = "hand_landmarker.task"

# bones of the hand skeleton (pairs of landmark indices)
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),            # thumb
    (0, 5), (5, 6), (6, 7), (7, 8),            # index
    (5, 9), (9, 10), (10, 11), (11, 12),       # middle
    (9, 13), (13, 14), (14, 15), (15, 16),     # ring
    (13, 17), (17, 18), (18, 19), (19, 20),    # pinky
    (0, 17),                                   # palm edge
]


def ensure_model():
    """Download the pre-trained .task model (~7 MB) the first time."""
    if not os.path.exists(MODEL_PATH):
        with st.spinner("Downloading hand landmark model..."):
            urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)


@st.cache_resource
def load_landmarker():
    ensure_model()
    options = vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=vision.RunningMode.VIDEO,      # tracking mode: re-uses the previous frame
        num_hands=1,
        min_hand_detection_confidence=0.6,
        min_hand_presence_confidence=0.6,
        min_tracking_confidence=0.5,
    )
    return vision.HandLandmarker.create_from_options(options)


def draw_hand(frame, landmarks):
    h, w = frame.shape[:2]
    pts = [(int(p.x * w), int(p.y * h)) for p in landmarks]
    for a, b in HAND_CONNECTIONS:
        cv2.line(frame, pts[a], pts[b], (255, 255, 255), 2, cv2.LINE_AA)
    for p in pts:
        cv2.circle(frame, p, 5, (100, 242, 190), -1, cv2.LINE_AA)
        cv2.circle(frame, p, 5, (10, 10, 11), 1, cv2.LINE_AA)


# ------------------------------------------------------------------ UI -----
st.set_page_config(page_title="Touchless Media Player", page_icon="🖐️", layout="wide")
db.init()

st.title("🖐️ Touchless Gesture-Controlled Media Player")
st.caption("MediaPipe Hand Landmarker · OpenCV · PyAutoGUI · Streamlit")

with st.sidebar:
    st.header("Controls")
    run = st.toggle("Start camera", value=False)
    send_keys = st.toggle("Send OS media keys", value=True,
                          help="Turn off to test gestures without touching your system volume.")
    cam_index = st.number_input("Camera index", min_value=0, max_value=5, value=0)
    hold_s = st.slider("Hold time (s)", 0.1, 1.0, 0.35, 0.05)
    cooldown_s = st.slider("Cooldown (s)", 0.3, 3.0, 1.2, 0.1)
    st.divider()
    st.subheader("Gesture map")
    for g, act in GESTURE_TO_ACTION.items():
        st.write(f"**{LABELS[g]}** → {act.replace('_', ' ')}")

left, right = st.columns([3, 2])
frame_slot = left.empty()
with right:
    gesture_slot = st.empty()
    m1, m2, m3 = st.columns(3)
    fps_slot, lat_slot, act_slot = m1.empty(), m2.empty(), m3.empty()
    st.subheader("Recent commands")
    log_slot = st.empty()
    st.subheader("Usage")
    stats_slot = st.empty()


def refresh_log():
    rows = db.recent()
    log_slot.dataframe(
        [{"time": r[0], "gesture": r[1], "action": r[2], "ms": r[3]} for r in rows],
        use_container_width=True, hide_index=True,
    )
    stats_slot.dataframe(
        [{"action": r[0], "count": r[1], "avg ms": r[2]} for r in db.usage_stats()],
        use_container_width=True, hide_index=True,
    )


refresh_log()

# ------------------------------------------------------------ main loop ----
if run:
    cap = cv2.VideoCapture(int(cam_index))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    landmarker = load_landmarker()
    engine = ActionEngine(hold_s=hold_s, cooldown_s=cooldown_s)
    controller = OSController(enabled=send_keys)
    last_action, frames, t_fps, fps = "-", 0, time.perf_counter(), 0

    try:
        while run:                                   # Streamlit re-runs the script when the toggle changes
            ok, frame = cap.read()
            if not ok:
                st.error("Could not read from the camera. Try another camera index.")
                break

            frame = cv2.flip(frame, 1)               # mirror, so it feels like a mirror
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            t0 = time.perf_counter()
            result = landmarker.detect_for_video(mp_image, int(time.monotonic() * 1000))
            latency = (time.perf_counter() - t0) * 1000

            gesture = None
            if result.hand_landmarks:
                lms = result.hand_landmarks[0]
                draw_hand(frame, lms)
                gesture = classify(lms, result.hand_world_landmarks[0])

            action, hold_progress, _cooldown_left = engine.update(gesture)
            if action and controller.dispatch(action):
                last_action = action.replace("_", " ")
                db.log_event(gesture, action, latency)
                refresh_log()

            # overlay
            label = LABELS.get(gesture, "No gesture")
            cv2.putText(frame, label, (16, 36), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.rectangle(frame, (16, 52), (16 + int(200 * hold_progress), 60), (100, 242, 190), -1)

            frames += 1
            if time.perf_counter() - t_fps >= 1:
                fps, frames, t_fps = frames, 0, time.perf_counter()

            frame_slot.image(frame, channels="BGR", use_container_width=True)
            gesture_slot.markdown(f"### {label}")
            fps_slot.metric("FPS", fps)
            lat_slot.metric("Inference", f"{latency:.0f} ms")
            act_slot.metric("Last action", last_action)
    finally:
        cap.release()                                # always free the webcam
else:
    frame_slot.info("Switch on **Start camera** in the sidebar to begin.")
