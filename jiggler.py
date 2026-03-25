#!/usr/bin/env python3
"""
Jiggler – keeps your computer awake by randomly moving the mouse or pressing a key.
No pip packages required: uses macOS built-in CoreGraphics (ctypes) + osascript.
"""
import ctypes, ctypes.util, subprocess, threading, random, time, tkinter as tk
from tkinter import ttk

# ── constants ──────────────────────────────────────────────────────────────
JITTER_PX = 5   # pixels the mouse moves and returns

# ── mouse via CoreGraphics (ctypes, no pip needed) ─────────────────────────
class _CGPoint(ctypes.Structure):
    _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double)]

_cg = ctypes.CDLL(ctypes.util.find_library("ApplicationServices"))
_cg.CGEventCreate.restype          = ctypes.c_void_p
_cg.CGEventCreate.argtypes         = [ctypes.c_void_p]
_cg.CGEventGetLocation.restype     = _CGPoint
_cg.CGEventGetLocation.argtypes    = [ctypes.c_void_p]
_cg.CGWarpMouseCursorPosition.restype  = ctypes.c_int
_cg.CGWarpMouseCursorPosition.argtypes = [_CGPoint]
_cg.CFRelease.argtypes             = [ctypes.c_void_p]

def _get_mouse_pos():
    ev = _cg.CGEventCreate(None)
    pt = _cg.CGEventGetLocation(ev)
    _cg.CFRelease(ev)
    return pt.x, pt.y

def do_mouse_jiggle():
    x, y = _get_mouse_pos()
    _cg.CGWarpMouseCursorPosition(_CGPoint(x + JITTER_PX, y))
    time.sleep(0.1)
    _cg.CGWarpMouseCursorPosition(_CGPoint(x, y))
    return f"Mouse jiggled at ({int(x)}, {int(y)})"

# ── key press via osascript (no pip needed) ────────────────────────────────
_KEY_CODES = {
    "shift": 56, "ctrl": 59, "control": 59,
    "alt": 58, "option": 58, "cmd": 55, "command": 55,
    "space": 49, "return": 36, "enter": 36, "tab": 48,
    "esc": 53, "escape": 53, "capslock": 57,
    "f1": 122, "f2": 120, "f3": 99,  "f4": 118, "f5": 96,
    "f6": 97,  "f7": 98,  "f8": 100, "f9": 101, "f10": 109,
    "f11": 103,"f12": 111,"f13": 105,"f14": 107,"f15": 113,"f16": 106,
}

def do_key_press(key):
    k = key.strip().lower()
    if k in _KEY_CODES:
        script = f'tell application "System Events" to key code {_KEY_CODES[k]}'
    elif len(k) == 1:
        script = f'tell application "System Events" to keystroke "{k}"'
    else:
        return f"Unknown key: {key!r}"
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=5)
    return f"Key pressed: {key!r}"

# ── background loop ────────────────────────────────────────────────────────
def jiggle_loop(mode_var, key_var, max_var, status_label, countdown_label, stop_event):
    while not stop_event.is_set():
        try:
            max_secs = max(2, min(int(max_var.get()), 300))
        except ValueError:
            max_secs = 30

        interval = random.randint(1, max_secs)

        for remaining in range(interval, 0, -1):
            if stop_event.is_set():
                return
            countdown_label.config(text=f"Next action in {remaining}s")
            time.sleep(1)

        if stop_event.is_set():
            return

        try:
            if mode_var.get() == "mouse":
                msg = do_mouse_jiggle()
            else:
                msg = do_key_press(key_var.get() or "shift")
            countdown_label.config(text=f"[{time.strftime('%H:%M:%S')}] {msg}")
        except Exception as e:
            countdown_label.config(text=f"Error: {e}")

# ── GUI ────────────────────────────────────────────────────────────────────
def build_ui():
    root = tk.Tk()
    root.title("Jiggler")
    root.resizable(False, False)
    root.configure(padx=20, pady=16)
    ttk.Style().theme_use("aqua")

    mode_var = tk.StringVar(value="mouse")
    key_var  = tk.StringVar(value="shift")
    max_var  = tk.StringVar(value="30")

    # ── mode ──
    mf = ttk.LabelFrame(root, text="Action", padding=(10, 6))
    mf.grid(row=0, column=0, sticky="ew", pady=(0, 10))
    ttk.Radiobutton(mf, text="Move mouse", variable=mode_var, value="mouse").grid(row=0, column=0, sticky="w")
    ttk.Radiobutton(mf, text="Press key:", variable=mode_var, value="key").grid(row=1, column=0, sticky="w", pady=(4,0))
    ttk.Entry(mf, textvariable=key_var, width=12).grid(row=1, column=1, sticky="w", padx=(6,0), pady=(4,0))
    ttk.Label(mf, text="(e.g. shift, f15, space, a)", foreground="gray").grid(row=2, column=0, columnspan=2, sticky="w", pady=(2,0))

    # ── interval ──
    ivf = ttk.LabelFrame(root, text="Max interval (seconds)", padding=(10, 6))
    ivf.grid(row=1, column=0, sticky="ew", pady=(0, 10))
    ttk.Spinbox(ivf, from_=2, to=300, textvariable=max_var, width=6).grid(row=0, column=0, sticky="w")
    ttk.Label(ivf, text="Action fires at a random time within this window.", foreground="gray").grid(row=0, column=1, padx=(8,0), sticky="w")

    # ── status ──
    countdown_label = ttk.Label(root, text="Stopped", foreground="#888")
    countdown_label.grid(row=2, column=0, sticky="w", pady=(0, 10))

    # ── buttons ──
    stop_event = threading.Event()

    def start():
        stop_event.clear()
        start_btn.config(state="disabled")
        stop_btn.config(state="normal")
        countdown_label.config(text="Starting…", foreground="#2a7")
        threading.Thread(
            target=jiggle_loop,
            args=(mode_var, key_var, max_var, None, countdown_label, stop_event),
            daemon=True,
        ).start()

    def stop():
        stop_event.set()
        start_btn.config(state="normal")
        stop_btn.config(state="disabled")
        countdown_label.config(text="Stopped", foreground="#888")

    bf = ttk.Frame(root)
    bf.grid(row=3, column=0, sticky="e")
    start_btn = ttk.Button(bf, text="Start", command=start)
    start_btn.grid(row=0, column=0, padx=(0, 6))
    stop_btn = ttk.Button(bf, text="Stop", command=stop, state="disabled")
    stop_btn.grid(row=0, column=1)

    root.mainloop()

if __name__ == "__main__":
    build_ui()
