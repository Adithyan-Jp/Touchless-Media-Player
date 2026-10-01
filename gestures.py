"""
gestures.py  -  Geometry-based hand-gesture classifier.

Input : the 21 MediaPipe landmarks of ONE hand
        * image landmarks  -> x, y normalised to 0..1 (y grows downward)
        * world landmarks  -> x, y, z in metres, origin at the hand centre

We compare 3-D distances between joints, so the result does not change when
the hand rotates or moves closer to / farther from the camera.
"""
import math

# --- landmark indices of the 21-point hand model ---------------------------
WRIST = 0
THUMB_TIP = 4
MIDDLE_MCP = 9
FINGERS = {            # name: (MCP knuckle, PIP joint, fingertip)
    "index":  (5, 6, 8),
    "middle": (9, 10, 12),
    "ring":   (13, 14, 16),
    "pinky":  (17, 18, 20),
}

# --- gesture -> action map --------------------------------------------------
GESTURE_TO_ACTION = {
    "open_palm": "play",
    "fist": "pause",
    "pointer": "volume_up",
    "peace": "volume_down",
    "thumbs_up": "mute",
}
CONTINUOUS = {"pointer", "peace"}      # keep firing while the pose is held

LABELS = {
    "open_palm": "Open Palm",
    "fist": "Closed Fist",
    "pointer": "Index Pointer",
    "peace": "Peace Sign",
    "thumbs_up": "Thumbs Up",
}


def _dist(a, b):
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)


def finger_states(world):
    """Return {'thumb': bool, 'index': bool, ...}  (True = extended)."""
    hand_size = _dist(world[WRIST], world[MIDDLE_MCP]) or 0.09
    states = {
        # the thumb sticks out of the palm -> its tip is far from the middle knuckle
        "thumb": _dist(world[THUMB_TIP], world[MIDDLE_MCP]) > hand_size * 0.95
    }
    for name, (_mcp, pip, tip) in FINGERS.items():
        # extended finger: tip is farther from the wrist than the PIP joint
        states[name] = _dist(world[tip], world[WRIST]) > _dist(world[pip], world[WRIST]) * 1.08
    return states


def classify(image_lms, world_lms):
    """Return a gesture name from GESTURE_TO_ACTION, or None."""
    f = finger_states(world_lms)
    idx, mid, ring, pinky, thumb = f["index"], f["middle"], f["ring"], f["pinky"], f["thumb"]

    if idx and mid and ring and pinky:
        return "open_palm"
    if idx and mid and not ring and not pinky:
        return "peace"
    if idx and not (mid or ring or pinky):
        return "pointer"
    if not (idx or mid or ring or pinky):
        # y grows downward in image space, so "above" means a smaller y
        thumb_up = image_lms[THUMB_TIP].y < image_lms[WRIST].y - 0.08
        if thumb and thumb_up:
            return "thumbs_up"
        if not thumb:
            return "fist"
    return None
