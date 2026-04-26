#!/usr/bin/env python3
"""
Tariff D1 LED daemon.

Polls /api/severity once per second and writes a single-character command to
the D1 over USB serial when the severity level changes. Auto-reconnects on
serial or HTTP errors so the demo never needs a manual restart.

Run:
    .venv/bin/python led_daemon.py
Override port / model / API:
    LED_SERIAL_PORT=/dev/cu.usbserial-XXXX TARIFF_API=http://127.0.0.1:3001 \\
        .venv/bin/python led_daemon.py
"""
from __future__ import annotations

import os
import sys
import time
from typing import Optional

import httpx
import serial

API_BASE = os.environ.get("TARIFF_API", "http://127.0.0.1:3001")
SERIAL_PORT = os.environ.get("LED_SERIAL_PORT", "/dev/cu.usbserial-11310")
SERIAL_BAUD = 115200
POLL_INTERVAL_S = 1.0
HTTP_TIMEOUT_S = 2.0

LEVEL_TO_BYTE = {"GREEN": b"G", "YELLOW": b"Y", "RED": b"R"}


def open_serial() -> Optional[serial.Serial]:
    try:
        ser = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=0.5)
        time.sleep(2.0)  # ESP32 reset settles
        return ser
    except (serial.SerialException, OSError) as e:
        print(f"[serial] could not open {SERIAL_PORT}: {e}", file=sys.stderr)
        return None


def fetch_level(client: httpx.Client) -> Optional[str]:
    try:
        r = client.get(f"{API_BASE}/api/severity", timeout=HTTP_TIMEOUT_S)
        r.raise_for_status()
        return r.json().get("level")
    except (httpx.HTTPError, ValueError) as e:
        print(f"[http] {e}", file=sys.stderr)
        return None


def main() -> int:
    print(f"[boot] Tariff LED daemon — port={SERIAL_PORT} api={API_BASE}")
    ser: Optional[serial.Serial] = None
    last_sent: Optional[str] = None

    with httpx.Client() as client:
        while True:
            try:
                if ser is None or not ser.is_open:
                    ser = open_serial()
                    last_sent = None  # force a re-send after reconnect
                    if ser is None:
                        time.sleep(POLL_INTERVAL_S)
                        continue

                level = fetch_level(client)
                if level is None or level not in LEVEL_TO_BYTE:
                    time.sleep(POLL_INTERVAL_S)
                    continue

                if level != last_sent:
                    ser.write(LEVEL_TO_BYTE[level])
                    ser.flush()
                    print(f"[led] {last_sent or '?'} -> {level}")
                    last_sent = level

                time.sleep(POLL_INTERVAL_S)
            except KeyboardInterrupt:
                print("\n[shutdown] interrupted, closing serial")
                if ser and ser.is_open:
                    ser.close()
                return 0
            except (serial.SerialException, OSError) as e:
                print(f"[serial] dropped: {e}; reconnecting...", file=sys.stderr)
                if ser:
                    try:
                        ser.close()
                    except Exception:
                        pass
                ser = None
                time.sleep(POLL_INTERVAL_S)


if __name__ == "__main__":
    sys.exit(main())
