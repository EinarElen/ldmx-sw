"""Run inside denv; cancel the actual job through the shared session directory."""

import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time


def read_command(session):
    command = json.loads((Path(session) / "operation.json").read_text())["command"]
    if (not isinstance(command, list) or not command
            or not all(isinstance(arg, str) and "\0" not in arg for arg in command)):
        raise ValueError("operation.json must contain a nonempty command argument list")
    return command


def supervise(session, command, timeout=20.0):
    session = Path(session)
    heartbeat = session / "heartbeat"

    def cancelled():
        return (
            (session / "cancel").exists()
            or not heartbeat.exists()
            or time.time() - heartbeat.stat().st_mtime > timeout
        )

    if cancelled():
        print("Session cancelled or host heartbeat expired.", flush=True)
        return 130
    child = subprocess.Popen(command, start_new_session=True)
    interrupted = False

    def interrupt(_signum, _frame):
        nonlocal interrupted
        interrupted = True

    for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(sig, interrupt)
    while child.poll() is None:
        if interrupted or cancelled():
            print("Stopping container job and its process group.", flush=True)
            try:
                os.killpg(child.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                child.wait(timeout=3)
            except subprocess.TimeoutExpired:
                pass
            # Also reap descendants that ignored TERM after the leader exited.
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            child.wait()
            return 130
        time.sleep(0.2)
    return child.returncode if child.returncode >= 0 else 128 - child.returncode


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("usage: supervise.py SESSION")
        sys.exit(supervise(sys.argv[1], read_command(sys.argv[1])))
    except (OSError, ValueError, KeyError) as error:
        print(f"Studio supervisor: {error}", file=sys.stderr)
        sys.exit(1)
