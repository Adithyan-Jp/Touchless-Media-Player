"""
db.py  -  OPTIONAL event log stored in SQLite.

SQLite ships with Python (module `sqlite3`) - no server, no install, one file: gesture_log.db.
The gesture recogniser itself does NOT need a database; the log only gives you
history / analytics that look good in a report (usage per gesture, average latency...).
"""
import sqlite3
from datetime import datetime

DB_PATH = "gesture_log.db"


def _conn():
    return sqlite3.connect(DB_PATH)


def init():
    with _conn() as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS events (
                   id         INTEGER PRIMARY KEY AUTOINCREMENT,
                   ts         TEXT    NOT NULL,
                   gesture    TEXT    NOT NULL,
                   action     TEXT    NOT NULL,
                   latency_ms REAL
               )"""
        )


def log_event(gesture, action, latency_ms):
    with _conn() as c:
        c.execute(
            "INSERT INTO events (ts, gesture, action, latency_ms) VALUES (?, ?, ?, ?)",
            (datetime.now().isoformat(timespec="seconds"), gesture, action, round(latency_ms, 1)),
        )


def recent(n=8):
    with _conn() as c:
        return c.execute(
            "SELECT ts, gesture, action, latency_ms FROM events ORDER BY id DESC LIMIT ?", (n,)
        ).fetchall()


def usage_stats():
    """Number of commands and average inference latency per action."""
    with _conn() as c:
        return c.execute(
            "SELECT action, COUNT(*), ROUND(AVG(latency_ms), 1) FROM events GROUP BY action"
        ).fetchall()
