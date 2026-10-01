"""
controller.py  -  temporal cooldown buffer + OS hotkey dispatcher.

ActionEngine : turns a noisy per-frame gesture stream into clean, rare commands.
OSController : turns a command into a real keyboard media-key press (PyAutoGUI).
"""
import time

import pyautogui

from gestures import CONTINUOUS, GESTURE_TO_ACTION

pyautogui.PAUSE = 0          # do not add PyAutoGUI's default 0.1 s delay after each call

ACTION_TO_KEY = {
    "play": "playpause",
    "pause": "playpause",
    "volume_up": "volumeup",
    "volume_down": "volumedown",
    "mute": "volumemute",
}


class ActionEngine:
    """
    1. Debounce : the same gesture must be held for `hold_s` seconds.
    2. Cooldown : after a discrete action (play / pause / mute) wait `cooldown_s`.
    3. Repeat   : continuous gestures (volume) fire every `repeat_s` while held.
    """

    def __init__(self, hold_s=0.35, cooldown_s=1.2, repeat_s=0.25):
        self.hold_s, self.cooldown_s, self.repeat_s = hold_s, cooldown_s, repeat_s
        self._candidate = None
        self._since = 0.0
        self._fired = False
        self._last_discrete = -1e9
        self._last_repeat = -1e9

    def update(self, gesture, now=None):
        """Returns (action | None, hold_progress 0..1, cooldown_left 0..1)."""
        now = time.monotonic() if now is None else now

        if gesture != self._candidate:                # pose changed -> restart the hold timer
            self._candidate, self._since, self._fired = gesture, now, False

        cooldown_left = max(0.0, 1 - (now - self._last_discrete) / self.cooldown_s)
        if gesture is None:
            return None, 0.0, cooldown_left

        held = now - self._since
        progress = min(1.0, held / self.hold_s)
        action = None

        if held >= self.hold_s:
            if gesture in CONTINUOUS:
                if now - self._last_repeat >= self.repeat_s:
                    action, self._last_repeat = GESTURE_TO_ACTION[gesture], now
            elif not self._fired and now - self._last_discrete >= self.cooldown_s:
                action = GESTURE_TO_ACTION[gesture]
                self._fired, self._last_discrete = True, now

        return action, progress, cooldown_left


class OSController:
    """Sends global hardware media keys. Works with ANY player (VLC, YouTube, Spotify...)."""

    def __init__(self, enabled=True):
        self.enabled = enabled
        self.playing = False      # OS has only a play/pause TOGGLE, so we track the state ourselves

    def dispatch(self, action):
        if action == "play" and self.playing:
            return False          # already playing -> ignore, keeps "Play" idempotent
        if action == "pause" and not self.playing:
            return False
        if action == "play":
            self.playing = True
        elif action == "pause":
            self.playing = False

        if self.enabled:
            pyautogui.press(ACTION_TO_KEY[action])
        return True
