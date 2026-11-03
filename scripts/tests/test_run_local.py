"""Launcher safety tests. No Docker, databases, or application dependencies needed."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "run_local.py"
spec = importlib.util.spec_from_file_location("run_local", SCRIPT)
launcher = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = launcher
spec.loader.exec_module(launcher)


class LauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="novo-launcher-test-")
        self.root = Path(self.temp.name)
        self.app = launcher.Supervisor(launcher.arguments([]), root=self.root, state=self.root / "state")
        self.output = contextlib.redirect_stdout(io.StringIO())
        self.output.__enter__()
        self.app.acquire()
        self.app.terminal.keys = lambda: ""

    def tearDown(self):
        self.app.shutdown()
        self.output.__exit__(None, None, None)
        self.temp.cleanup()

    def test_compose_ps_handles_both_formats(self):
        row = {"Service": "kafka", "State": "running", "Health": "healthy"}
        self.assertEqual(launcher.parse_compose_ps(json.dumps([row])), [row])
        self.assertEqual(launcher.parse_compose_ps(json.dumps(row) + "\n"), [row])

    def test_q_interrupts_even_a_startup_command(self):
        self.app.terminal.keys = lambda: "q"
        with self.assertRaises(launcher.StopRequested):
            self.app.command("slow-build", [sys.executable, "-c", "import time; time.sleep(60)"])
        self.assertTrue(self.app.stop)

    def test_unexpected_service_exit_fails_the_run(self):
        child = self.app.start("broken", [sys.executable, "-c", "raise SystemExit(7)"])
        child.process.wait(timeout=3)
        with self.assertRaisesRegex(launcher.LaunchError, "broken exited unexpectedly"):
            self.app.pump(0)

    def test_quiet_or_filtered_logs_are_still_saved(self):
        self.app.paused = True
        self.app.filter = "unrelated"
        self.app.command("logger", [sys.executable, "-c", "print('important output')"])
        self.assertIn("important output", (self.app.log_dir / "logger.log").read_text())
        self.assertIn("[logger] important output", (self.app.log_dir / "all.log").read_text())

    def test_failed_setup_is_not_reported_successful(self):
        with self.assertRaisesRegex(launcher.LaunchError, "exit 3"):
            self.app.command("install", [sys.executable, "-c", "raise SystemExit(3)"])

    def test_second_launcher_cannot_acquire_lock(self):
        second = launcher.Supervisor(launcher.arguments([]), root=self.root, state=self.app.state)
        try:
            with self.assertRaisesRegex(launcher.LaunchError, "already running"):
                second.acquire()
        finally:
            second.lock_file.close()

    def test_shutdown_reaches_grandchild_but_not_unrelated_process(self):
        # Grandchild listens on a real TCP port. Its parent reaps it on SIGTERM.
        portfile = self.root / "port"
        program = r'''
import subprocess,sys,signal,time
worker = subprocess.Popen([sys.executable, '-c',
    "import socket,time,pathlib; s=socket.socket(); s.bind(('127.0.0.1',0)); s.listen(); "
    "pathlib.Path(" + repr(sys.argv[1]) + ").write_text(str(s.getsockname()[1])); time.sleep(60)"])
def stop(*_):
    worker.wait(timeout=4)
    sys.exit(0)
signal.signal(signal.SIGTERM, stop)
while True: time.sleep(.05)
'''
        outsider = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"], start_new_session=True)
        try:
            child = self.app.start("tree", [sys.executable, "-c", program, str(portfile)])
            deadline = time.monotonic() + 4
            while not portfile.exists() and time.monotonic() < deadline:
                self.app.pump(.02)
            port = int(portfile.read_text())
            self.assertTrue(launcher.tcp_ready(port))
            self.app.shutdown()
            self.assertFalse(launcher.tcp_ready(port))
            self.assertIsNotNone(child.process.poll())
            self.assertIsNone(outsider.poll())
        finally:
            outsider.terminate()
            outsider.wait(timeout=4)

    def test_shutdown_compose_never_removes_volumes(self):
        self.app.compose_owned = True
        actual_start = self.app.start
        commands = []
        def fake_docker(name, command, **kwargs):
            commands.append(command)
            return actual_start(name, [sys.executable, "-c", "pass"], **kwargs)
        with patch.object(self.app, "start", side_effect=fake_docker):
            self.assertTrue(self.app.shutdown())
        self.app.compose_owned = False
        self.assertIn("down", commands[0])
        self.assertIn("novo-local", commands[0])
        self.assertNotIn("--volumes", commands[0])
        self.assertNotIn("-v", commands[0])

    def test_mobile_uses_explicit_host_and_timeout_validation(self):
        args = launcher.arguments(["--mobile-host", "192.168.1.10"])
        self.assertTrue(args.mobile)
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            launcher.arguments(["--startup-timeout", "0"])


if __name__ == "__main__":
    unittest.main()
