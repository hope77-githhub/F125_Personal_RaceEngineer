"""The TV overlay says "engineer radio off" when the game runs without a LIVE dashboard (main.radio_off_hint)."""
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
logging.disable(logging.CRITICAL)
import main  # noqa: E402  (module import only: no server, no startup clean-up)


def drive(seconds, start=1000.0, step=0.5):
    shown = []
    t = start
    while t <= start + seconds:
        if main.radio_off_hint(now=t):
            shown.append(t - start)
        t += step
    return shown


def reset(monkeypatch, live_clients=0):
    toasts = []
    monkeypatch.setattr(main.overlay_manager, "toast", lambda text: toasts.append(text) or True)
    monkeypatch.setattr(main, "_live_clients", live_clients)
    monkeypatch.setattr(main, "_no_dashboard_since", None)
    monkeypatch.setattr(main, "_radio_hint_at", 0.0)
    monkeypatch.setattr(main, "_last_game_packet_at", 0.0)
    return toasts


def test_hint_after_15_s_without_a_live_dashboard_then_every_10_min(monkeypatch):
    toasts = reset(monkeypatch)
    shown = drive(1300)
    assert shown[0] == 15.0 and len(shown) == 3                 # at 15 s, ~615 s and ~1215 s
    assert all(b - a >= 600 for a, b in zip(shown, shown[1:]))
    assert "LIVE" in toasts[0] and len(toasts[0]) <= 90


def test_no_hint_while_a_live_dashboard_is_connected(monkeypatch):
    toasts = reset(monkeypatch, live_clients=1)
    assert drive(120) == [] and toasts == []


def test_game_back_after_a_break_waits_15_s_again(monkeypatch):
    reset(monkeypatch)
    first = drive(20, start=1000.0)
    again = drive(700, start=2000.0)          # game paused/closed for > 30 s, then back
    assert first == [15.0]
    assert again and again[0] >= 15.0
