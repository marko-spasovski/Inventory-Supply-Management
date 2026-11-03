#!/usr/bin/env python3
"""Local stack supervisor. Python standard library only; Linux/macOS/WSL2.

All child commands have their own process group. No port-based or name-based
process killing: cleanup is limited to our children and our Compose project.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import queue
import re
import secrets
import select
import shutil
import signal
import socket
import subprocess
import sys
import termios
import threading
import time
import tty
import urllib.error
import urllib.request
from dataclasses import dataclass

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / ".local-run"
PROJECT = "novo-local"
INFRA = [f"{name}-db" for name in (
    "auth", "company", "fleet", "warehouse", "product", "inventory", "order", "notification"
)] + ["zookeeper", "kafka"]
DOTNET = [("fleet-service", 8083, "fleet", 5434),
          ("product-service", 8085, "products", 5436),
          ("order-service", 8087, "orders", 5438)]
JAVA = [("auth-service", 8081, "users", 5432),
        ("company-service", 8082, "companies", 5433),
        ("warehouse-service", 8084, "warehouses", 5435),
        ("inventory-service", 8086, "inventory", 5437)]
REMOTES = ["auth", "warehouses", "inventory", "orders", "companies", "fleet", "products"]
ANSI = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}))


class StopRequested(Exception):
    pass


class LaunchError(Exception):
    pass


@dataclass
class Child:
    name: str
    process: subprocess.Popen
    persistent: bool
    reader: threading.Thread


def http_ready(url: str, expected: int = 200, contains: bytes | None = None) -> bool:
    """A listening socket or an HTTP 500 is not a successful readiness check."""
    try:
        with HTTP.open(url, timeout=0.6) as response:
            body = response.read(512_000) if contains is not None else b""
            return response.status == expected and (contains is None or contains in body)
    except urllib.error.HTTPError as error:
        return error.code == expected and contains is None
    except (OSError, urllib.error.URLError):
        return False


def tcp_ready(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.4):
            return True
    except OSError:
        return False


def group_alive(pid: int) -> bool:
    try:
        os.killpg(pid, 0)
        return True
    except ProcessLookupError:
        return False


def signal_group(pid: int, sig: int) -> None:
    try:
        os.killpg(pid, sig)
    except ProcessLookupError:
        pass


class Terminal:
    def __init__(self):
        self.saved = None
        self.active = False
        self.eof = False

    def __enter__(self):
        if sys.stdin.isatty():
            self.saved = termios.tcgetattr(sys.stdin.fileno())
            tty.setcbreak(sys.stdin.fileno())
            self.active = True
        return self

    def keys(self) -> str:
        if self.eof:
            return ""
        try:
            if select.select([sys.stdin], [], [], 0)[0]:
                data = os.read(sys.stdin.fileno(), 1024)
                if not data:
                    self.eof = True
                return data.decode(errors="replace").lower()
        except (OSError, ValueError):
            self.eof = True
        return ""

    def __exit__(self, *_):
        if self.saved is not None:
            termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, self.saved)


class Supervisor:
    def __init__(self, args, root: Path = ROOT, state: Path = STATE):
        self.args = args
        self.root = root
        self.state = state
        self.children: list[Child] = []
        self.events: queue.Queue = queue.Queue(maxsize=5000)
        self.log_lock = threading.Lock()
        self.stop = False
        self.paused = False
        self.filter = "all"
        self.phase = "preflight"
        self.terminal = Terminal()
        self.compose_owned = False
        self.dotnet_mode = args.dotnet
        self.container_services: list[str] = []
        self.ready_endpoints: dict[str, str] = {}
        self.last_monitor = 0.0
        self.log_dir: Path | None = None
        self.lock_file = None
        self.env = os.environ.copy()
        self.env.update({
            "NOVO_DB_USER": os.environ.get("NOVO_DB_USER", "administrator"),
            "NOVO_DB_PASSWORD": os.environ.get("NOVO_DB_PASSWORD", "administrator123"),
            "NO_COLOR": "1", "FORCE_COLOR": "0", "CI": "1",
            "DOTNET_CLI_TELEMETRY_OPTOUT": "1", "DOTNET_NOLOGO": "1",
        })
        # Ignore ambient Compose selection/project/env-file settings. Always use
        # our explicit file, project, and environment for this local stack.
        for key in list(self.env):
            if key.startswith("COMPOSE_"):
                del self.env[key]

    def local_jwt_secret(self) -> str:
        path = self.state / "jwt-secret"
        if path.is_file() and len(path.read_text().strip()) >= 32:
            return path.read_text().strip()
        self.state.mkdir(parents=True, exist_ok=True)
        value = secrets.token_urlsafe(48)
        path.write_text(value)
        path.chmod(0o600)
        return value

    @property
    def compose(self) -> list[str]:
        return ["docker", "compose", "--ansi", "never", "--env-file", os.devnull,
                "--project-name", PROJECT, "--file", str(self.root / "deploy/local/compose.yaml"),
                "--profile", "dotnet"]

    def say(self, message: str) -> None:
        print(f"\n[launcher] {message}", flush=True)

    def help(self) -> None:
        self.say("Keys: q quit | s status | u URLs | l next service log | a all logs | "
                 "e errors/warnings | p pause/resume display | h help\n"
                 "           Logs continue saving while paused or filtered. q also works during startup.")

    def urls(self) -> None:
        rows = ["Web: http://localhost:3000" if not self.args.backend_only else "Web: disabled",
                "Web API: http://localhost:8080", "Mobile API: http://localhost:8090",
                "Notification HTTP: http://localhost:8088/health",
                "AI (template by default): http://localhost:8089/health"]
        if self.args.mobile:
            rows += ["Expo/Metro: http://localhost:8081 is reserved for auth; Metro uses :8100",
                     f"Expo Go: exp://{self.args.mobile_host or 'localhost'}:8100",
                     "Physical device: use --mobile-host YOUR_LAN_IP (or see docs/LOCAL_DEVELOPMENT.md)."]
        self.say("\n".join(rows))

    def status(self) -> None:
        lines = [f"Phase: {self.phase}; .NET: {self.dotnet_mode}; logs: {self.filter}; paused: {self.paused}"]
        for child in self.children:
            if child.persistent or child.process.poll() is None:
                code = child.process.poll()
                label = "running" if code is None else f"EXITED ({code})"
                lines.append(f"  {child.name:24} {label:14} pid={child.process.pid}")
        if self.container_services:
            lines.append("  Docker (monitored): " + ", ".join(self.container_services))
        if self.log_dir:
            lines.append(f"  Log files: {self.log_dir}")
        self.say("\n".join(lines))

    def acquire(self) -> None:
        self.state.mkdir(parents=True, exist_ok=True)
        self.lock_file = (self.state / "launcher.lock").open("a+")
        try:
            fcntl.flock(self.lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise LaunchError("Another launcher is already running in this checkout.") from error
        self.lock_file.seek(0)
        self.lock_file.truncate()
        self.lock_file.write(str(os.getpid()))
        self.lock_file.flush()
        stamp = time.strftime("%Y%m%d-%H%M%S") + f"-{os.getpid()}"
        self.log_dir = self.state / "logs" / stamp
        self.log_dir.mkdir(parents=True)
        self.say(f"Logs: {self.log_dir}\nData is preserved on exit. No existing project services are killed.")

    def record(self, name: str, line: str) -> None:
        clean = ANSI.sub("", line).rstrip("\r\n")
        if not clean:
            return
        rendered = f"{time.strftime('%H:%M:%S')} [{name}] {clean}"
        if self.log_dir:
            with self.log_lock:
                with (self.log_dir / f"{name}.log").open("a") as out:
                    out.write(clean + "\n")
                with (self.log_dir / "all.log").open("a") as out:
                    out.write(rendered + "\n")
        try:
            self.events.put_nowait((name, clean, rendered))
        except queue.Full:
            pass  # Only screen output is dropped; the complete files remain.

    def start(self, name: str, command: list[str], cwd: Path | None = None,
              env: dict | None = None, persistent: bool = True) -> Child:
        self.say(f"Starting {name}")
        child_env = self.env | (env or {})
        try:
            process = subprocess.Popen(
                command, cwd=cwd or self.root, env=child_env,
                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, encoding="utf-8", errors="replace", bufsize=1, start_new_session=True,
            )
        except OSError as error:
            raise LaunchError(f"Could not start {name}: {error}") from error

        def read_output():
            assert process.stdout is not None
            try:
                for line in process.stdout:
                    self.record(name, line)
            finally:
                process.stdout.close()

        reader = threading.Thread(target=read_output, name=f"logs-{name}", daemon=True)
        child = Child(name, process, persistent, reader)
        self.children.append(child)
        reader.start()
        return child

    def pump(self, delay: float = 0.05, stopping: bool = False) -> None:
        for key in self.terminal.keys():
            if key == "q":
                self.stop = True
            elif key == "s":
                self.status()
            elif key == "u":
                self.urls()
            elif key == "h":
                self.help()
            elif key == "p":
                self.paused = not self.paused
                self.say(f"Live display {'paused' if self.paused else 'resumed'}; log files remain active.")
            elif key == "a":
                self.filter = "all"
                self.say("Showing all logs.")
            elif key == "e":
                self.filter = "errors"
                self.say("Showing lines containing error/fail/exception/warn.")
            elif key == "l":
                names = ["all"] + list(dict.fromkeys(c.name for c in self.children))
                index = names.index(self.filter) if self.filter in names else 0
                self.filter = names[(index + 1) % len(names)]
                self.say(f"Log filter: {self.filter}")
        for _ in range(200):
            try:
                name, clean, rendered = self.events.get_nowait()
            except queue.Empty:
                break
            matches = self.filter in ("all", name) or (
                self.filter == "errors" and re.search(r"error|fail|exception|warn", clean, re.I))
            if not self.paused and matches:
                print(rendered, flush=True)
        if not stopping:
            if self.stop:
                raise StopRequested()
            for child in self.children:
                if child.persistent and child.process.poll() is not None:
                    raise LaunchError(f"{child.name} exited unexpectedly ({child.process.returncode}). "
                                      f"See {child.name}.log. Stopping the rest of this run.")
        time.sleep(delay)

    def command(self, name: str, command: list[str], cwd: Path | None = None,
                env: dict | None = None, timeout: float | None = None) -> None:
        child = self.start(name, command, cwd, env, persistent=False)
        deadline = time.monotonic() + (timeout or self.args.setup_timeout)
        while child.process.poll() is None:
            self.pump()
            if time.monotonic() > deadline:
                raise LaunchError(f"{name} timed out; see its log (or increase --setup-timeout).")
        child.reader.join(timeout=1)
        self.pump(0)
        if child.process.returncode:
            raise LaunchError(f"{name} failed with exit {child.process.returncode}; see {name}.log.")
        # Completed one-shot jobs cannot later own a recycled process-group ID.
        if not group_alive(child.process.pid):
            self.children.remove(child)

    def inspect(self, command: list[str], timeout: float = 15, cwd: Path | None = None) -> str:
        # Read-only probes still belong to the supervisor, so q/interrupt can
        # terminate a stalled Docker command instead of leaving it behind.
        with tempfile_output(self.state) as capture:
            process = subprocess.Popen(command, cwd=cwd or self.root, env=self.env,
                                       stdin=subprocess.DEVNULL, stdout=capture,
                                       stderr=subprocess.STDOUT, start_new_session=True)
            deadline = time.monotonic() + timeout
            try:
                while process.poll() is None:
                    self.pump()
                    if time.monotonic() > deadline:
                        raise LaunchError(f"Timed out checking {command[0]}.")
                capture.seek(0)
                result = capture.read().decode(errors="replace").strip()
                if process.returncode:
                    raise LaunchError(f"{' '.join(command[:3])} failed: {result[-2500:]}")
                return result
            finally:
                if process.poll() is None:
                    signal_group(process.pid, signal.SIGTERM)
                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        signal_group(process.pid, signal.SIGKILL)
                        process.wait()

    def preflight(self) -> None:
        if sys.version_info < (3, 10):
            raise LaunchError("Use Python 3.10 or newer.")
        for tool in ["docker", "node", "npm", "java", "javac"]:
            if not shutil.which(tool):
                raise LaunchError(f"Missing {tool}. See docs/LOCAL_DEVELOPMENT.md prerequisites.")
        node = self.inspect(["node", "--version"])
        version = tuple(int(n) for n in node.lstrip("v").split(".")[:3])
        if version < (20, 19, 4):
            raise LaunchError(f"Node {node} is too old; the frontend lockfile requires >=20.19.4.")
        java = self.inspect(["javac", "-version"])
        major = re.search(r"javac (\d+)", java)
        if not major or int(major.group(1)) < 21:
            raise LaunchError(f"A JDK 21+ is required; found {java}.")
        self.say(f"Host toolchain: Node {node}; {java}")
        self.inspect(["docker", "compose", "version"])
        self.inspect(["docker", "info", "--format", "{{.ServerVersion}}"])
        self.inspect(self.compose + ["config", "--quiet"])
        running = self.inspect(["docker", "ps", "--filter",
                                f"label=com.docker.compose.project={PROJECT}", "--format", "{{.Names}}"])
        if running:
            raise LaunchError(f"Compose project {PROJECT} already has running containers: {running}. "
                              "Quit its launcher first, or follow the crash-recovery instructions.")
        sdk9 = False
        if shutil.which("dotnet"):
            try:
                sdks = self.inspect(["dotnet", "--list-sdks"])
                sdk9 = any(line.startswith("9.0.") for line in sdks.splitlines())
            except LaunchError:
                if self.dotnet_mode == "host":
                    raise
        if self.dotnet_mode == "auto":
            self.dotnet_mode = "host" if sdk9 else "docker"
        if self.dotnet_mode == "host" and not sdk9:
            raise LaunchError("--dotnet host needs a .NET 9 SDK. Use --dotnet auto or --dotnet docker.")
        self.say(f".NET services: {self.dotnet_mode}" +
                 (" (Docker fallback; host SDK unavailable)." if not sdk9 else "."))
        ports = list(range(5432, 5440)) + list(range(8080, 8091)) + [9090, 9091, 9092]
        if not self.args.backend_only:
            ports += list(range(3000, 3008))
        if self.args.mobile:
            ports.append(8100)  # Expo's default 8081 would collide with auth.
        occupied = []
        for port in ports:
            with socket.socket() as sock:
                try:
                    sock.bind(("127.0.0.1", port))
                except OSError:
                    occupied.append(str(port))
        if occupied:
            raise LaunchError("Ports already in use: " + ", ".join(occupied) +
                              ". Stop the conflicting stack yourself; this launcher will not kill it.")
        # One signing secret for every local token issuer and verifier. No secret lives in source
        # code: use JWT_SECRET from the environment, otherwise a random one generated once per
        # checkout and kept in the (git-ignored) launcher state, so sessions survive restarts.
        self.env["JWT_SECRET"] = os.environ.get("JWT_SECRET") or self.local_jwt_secret()
        for name, port, _, _ in JAVA + DOTNET:
            self.env[name.replace("-service", "").upper() + "_SERVICE_URL"] = f"http://localhost:{port}"
        self.env.update({
            "NOTIFICATION_SERVICE_URL": "http://localhost:8088",
            "NOTIFICATION_WS_URL": "ws://localhost:9091", "AI_SERVICE_URL": "http://localhost:8089",
            "INVENTORY_GRPC_URL": "http://localhost:9090", "KAFKA_BROKERS": "localhost:9092",
            "SPRING_KAFKA_BOOTSTRAP_SERVERS": "localhost:9092",
            "AUTH_COOKIE_SECURE": "false", "AUTH_COOKIE_SAME_SITE": "Lax",
        })
        for key in ("NOVO_DB_USER", "NOVO_DB_PASSWORD"):
            if not self.env[key] or any(c in self.env[key] for c in ';"\n\r'):
                raise LaunchError(f"{key} must be nonempty and contain no semicolons, quotes or newlines.")
        self.say("Preflight passed. Ports are free; Compose is valid; toolchain is available.")

    def install(self, folder: Path, name: str, frontend: bool = False) -> None:
        digest = hashlib.sha256()
        manifests = [folder / "package.json", folder / "package-lock.json"]
        if frontend:
            manifests += [folder / "mobile/package.json"]
            manifests += sorted((folder / "web").glob("*/package.json"))
            manifests += sorted((folder / "packages").glob("*/package.json"))
        for file in manifests:
            digest.update(file.read_bytes())
        digest.update(self.inspect(["node", "--version"]).encode())
        stamp = self.state / "installs" / f"{name}.sha256"
        valid = ((folder / "node_modules").is_dir() and stamp.exists()
                 and stamp.read_text() == digest.hexdigest())
        if valid and not self.args.reinstall:
            self.say(f"Dependencies already prepared: {name}")
            return
        if self.args.no_install:
            if not (folder / "node_modules").is_dir():
                raise LaunchError(f"No dependencies for {name}. Remove --no-install on the first run.")
            self.say(f"Using existing dependencies for {name} (--no-install).")
            return
        command = ["npm", "ci", "--no-audit", "--no-fund"]
        if frontend:
            command.append("--legacy-peer-deps")
        self.command(f"install-{name}", command, folder)
        stamp.parent.mkdir(exist_ok=True)
        stamp.write_text(digest.hexdigest())

    def wait_for(self, name: str, probe) -> None:
        deadline = time.monotonic() + self.args.startup_timeout
        next_notice = time.monotonic() + 20
        while not probe():
            self.pump()
            if time.monotonic() > deadline:
                raise LaunchError(f"{name} did not become ready in {self.args.startup_timeout}s. "
                                  "Check its logs or increase --startup-timeout for a first build.")
            if time.monotonic() > next_notice:
                self.say(f"Still waiting for {name}; q stops startup.")
                next_notice += 20
            time.sleep(0.15)
        self.pump(0)
        self.say(f"READY: {name}")

    def wait_http(self, name: str, port: int, path: str, expected: int = 200,
                  contains: bytes | None = None) -> None:
        url = f"http://127.0.0.1:{port}{path}"
        self.wait_for(name, lambda: http_ready(url, expected, contains))
        self.ready_endpoints[name] = url

    def launch_java(self, name: str, port: int, database: str | None = None,
                    db_port: int | None = None) -> None:
        folder = self.root / "backend" / ("gateways/web-gateway" if name == "web-gateway" else f"services/{name}")
        env = {"SERVER_PORT": str(port), "SPRING_PROFILES_ACTIVE": "dev",
               "SPRING_DEVTOOLS_LIVERELOAD_ENABLED": "false",
               "SPRING_OUTPUT_ANSI_ENABLED": "never"}
        if database:
            env.update({"SPRING_DATASOURCE_URL": f"jdbc:postgresql://localhost:{db_port}/{database}",
                        "SPRING_DATASOURCE_USERNAME": self.env["NOVO_DB_USER"],
                        "SPRING_DATASOURCE_PASSWORD": self.env["NOVO_DB_PASSWORD"]})
        if name == "inventory-service":
            documents = self.state / "documents/consumptions"
            documents.mkdir(parents=True, exist_ok=True)
            env.update({"INVENTORY_DOCS_PATH": str(documents), "GRPC_SERVER_PORT": "9090",
                        "GRPC_SERVER_ADDRESS": "0.0.0.0"})
        self.start(name, ["bash", "./mvnw", "--batch-mode", "-DskipTests", "spring-boot:run"], folder, env)

    def launch_dotnet(self) -> None:
        names = [row[0] for row in DOTNET]
        if self.dotnet_mode == "docker":
            self.command("build-dotnet", self.compose + ["build"] + names)
            self.command("start-dotnet", self.compose + ["up", "-d", "--no-deps"] + names)
            self.container_services += names
            for name in names:
                self.start(name, self.compose + ["logs", "--follow", "--no-color", "--tail", "100", name])
        else:
            sdk_dir = self.state / "dotnet-sdk"
            sdk_dir.mkdir(exist_ok=True)
            (sdk_dir / "global.json").write_text(json.dumps({"sdk": {
                "version": "9.0.100", "rollForward": "latestMinor", "allowPrerelease": False}}))
            for name, port, database, db_port in DOTNET:
                folder = self.root / "backend/services" / name
                documents = self.state / "documents/orders"
                documents.mkdir(parents=True, exist_ok=True)
                env = {
                    "ASPNETCORE_URLS": f"http://127.0.0.1:{port}", "ASPNETCORE_ENVIRONMENT": "Development",
                    "ASPNETCORE_CONTENTROOT": str(folder),
                    "ConnectionStrings__DefaultConnection":
                        f"Host=localhost;Port={db_port};Database={database};"
                        f"Username={self.env['NOVO_DB_USER']};Password={self.env['NOVO_DB_PASSWORD']}",
                    "Kafka__BootstrapServers": "localhost:9092",
                    "DocumentStorage__BasePath": str(documents),
                }
                self.start(name, ["dotnet", "run", "--project", str(folder / f"{name}.csproj"),
                                  "--no-launch-profile"], sdk_dir, env)
        for name, port, _, _ in DOTNET:
            route = {"fleet-service": "/vehicles", "product-service": "/products", "order-service": "/orders"}[name]
            self.wait_http(name, port, route)

    def launch_web(self) -> None:
        self.phase = "web remote builds"
        frontend = self.root / "frontend"
        for name in REMOTES:
            self.command(f"build-{name}-mf", ["npm", "run", "build", f"--workspace=@erp/{name}-mf"], frontend)
        for port, name in enumerate(REMOTES, 3001):
            self.start(f"{name}-mf", ["npm", "run", "preview", f"--workspace=@erp/{name}-mf",
                                     "--", "--host", "127.0.0.1", "--strictPort"], frontend)
            self.wait_http(f"{name}-mf", port, "/assets/remoteEntry.js", contains=b"export")
        self.start("web-shell", ["npm", "run", "dev", "--workspace=@erp/shell", "--",
                                 "--host", "127.0.0.1", "--strictPort"], frontend,
                   {f"VITE_{name.upper()}_MF_URL": f"http://localhost:{port}/assets/remoteEntry.js"
                    for port, name in enumerate(REMOTES, 3001)} |
                   {"VITE_WS_URL": "ws://localhost:9091"})
        self.wait_http("web-shell", 3000, "/", contains=b"<html")
        self.wait_http("web API proxy", 3000, "/api/companies", expected=401)

    def containers_ok(self) -> None:
        raw = self.inspect(self.compose + ["ps", "--all", "--format", "json"], timeout=10)
        rows = parse_compose_ps(raw)
        states = {row["Service"]: row for row in rows}
        for name in self.container_services:
            row = states.get(name, {})
            if row.get("State") != "running" or row.get("Health") == "unhealthy":
                raise LaunchError(f"Docker service {name} is not healthy/running: "
                                  f"{row.get('State', 'missing')} {row.get('Health', '')}")

    def infrastructure_ready(self) -> bool:
        rows = parse_compose_ps(self.inspect(self.compose + ["ps", "--all", "--format", "json"]))
        states = {row["Service"]: row for row in rows}
        for name in INFRA:
            row = states.get(name, {})
            if row.get("State") in ("exited", "dead") or row.get("Health") == "unhealthy":
                raise LaunchError(f"Infrastructure service {name} failed; see {name}.log.")
        return all(states.get(name, {}).get("Health") == "healthy" for name in INFRA)

    def run(self) -> None:
        self.preflight()
        if self.args.check:
            return
        self.phase = "dependencies"
        for name, folder in [("mobile-gateway", "backend/gateways/mobile-gateway"),
                             ("notification-service", "backend/services/notification-service"),
                             ("ai-service", "backend/services/ai-service")]:
            self.install(self.root / folder, name)
        if not self.args.backend_only or self.args.mobile:
            self.install(self.root / "frontend", "frontend", frontend=True)
        self.phase = "Docker infrastructure"
        self.compose_owned = True  # Also clean partially-created containers on failure/cancel.
        self.command("infrastructure", self.compose + ["up", "-d"] + INFRA)
        self.container_services = INFRA.copy()
        for name in INFRA:
            self.start(name, self.compose + ["logs", "--follow", "--no-color", "--tail", "all", name])
        self.wait_for("PostgreSQL and Kafka health checks", self.infrastructure_ready)
        # Create topics before listeners start, avoiding topic-not-found races.
        topics = ["order.created", "order.status.changed", "inventory.stock.updated",
                  "inventory.low", "inventory.out", "warehouse.capacity"]
        for topic in topics:
            self.command("kafka-topics", self.compose + ["exec", "-T", "kafka", "kafka-topics",
                         "--bootstrap-server", "kafka:29092", "--create", "--if-not-exists", "--topic", topic,
                         "--partitions", "3", "--replication-factor", "1"])
        self.phase = "Java services"
        for name, port, database, db_port in JAVA:
            self.launch_java(name, port, database, db_port)
        self.wait_http("auth-service", 8081, "/auth/login", expected=405)
        self.wait_http("company-service", 8082, "/companies")
        self.wait_http("warehouse-service", 8084, "/warehouses")
        self.wait_http("inventory-service", 8086, "/inventory")
        self.wait_for("inventory gRPC", lambda: tcp_ready(9090))
        self.phase = ".NET services"
        self.launch_dotnet()
        self.phase = "Node services and gateways"
        self.start("notification-service", ["npm", "run", "dev"], self.root / "backend/services/notification-service", {
            "PORT": "8088", "WS_PORT": "9091", "WS_REQUIRE_AUTH": "true",
            "DB_HOST": "localhost", "DB_PORT": "5439", "DB_NAME": "notifications",
            "DB_USER": self.env["NOVO_DB_USER"], "DB_PASSWORD": self.env["NOVO_DB_PASSWORD"],
        })
        ai_env = {"PORT": "8089"}
        if not self.args.azure:
            ai_env |= {"AZURE_OPENAI_ENDPOINT": "", "AZURE_OPENAI_API_KEY": "", "AZURE_OPENAI_DEPLOYMENT": ""}
        self.start("ai-service", ["npm", "run", "dev"], self.root / "backend/services/ai-service", ai_env)
        self.wait_http("notification-service", 8088, "/health", contains=b'"ok"')
        self.wait_for("notification WebSocket", lambda: tcp_ready(9091))
        self.wait_http("ai-service", 8089, "/health", contains=b'"ok"')
        self.launch_java("web-gateway", 8080)
        self.start("mobile-gateway", ["npm", "run", "dev"], self.root / "backend/gateways/mobile-gateway", {"PORT": "8090"})
        self.wait_http("web-gateway", 8080, "/companies", expected=401)
        self.wait_http("mobile-gateway", 8090, "/health", contains=b'"ok"')
        if not self.args.backend_only:
            self.launch_web()
        if self.args.mobile:
            host = self.args.mobile_host
            mobile_env = {"EXPO_NO_TELEMETRY": "1"}
            if host:
                mobile_env |= {"REACT_NATIVE_PACKAGER_HOSTNAME": host,
                               "EXPO_PUBLIC_API_URL": f"http://{host}:8090",
                               "EXPO_PUBLIC_WS_URL": f"ws://{host}:8090/ws"}
            self.start("expo", ["npm", "run", "start", "--workspace=@erp/mobile", "--",
                                "--port", "8100", "--lan" if host else "--localhost"],
                       self.root / "frontend", mobile_env)
            self.wait_http("Expo Metro", 8100, "/status", contains=b"packager-status:running")
        self.containers_ok()
        self.phase = "ready"
        self.say("STACK READY — services responded to readiness checks. Business flows still need testing.")
        self.urls()
        self.help()
        while True:
            self.pump(0.1)
            if time.monotonic() - self.last_monitor > 10:
                self.containers_ok()
                self.last_monitor = time.monotonic()

    def shutdown(self) -> bool:
        self.phase = "stopping"
        self.say("Stopping this run's process groups and containers; keeping databases and documents.")
        for child in reversed(self.children):
            signal_group(child.process.pid, signal.SIGTERM)
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            for child in self.children:
                child.process.poll()  # Reap parents while waiting for descendants.
            if not any(group_alive(c.process.pid) for c in self.children):
                break
            self.pump(0.05, stopping=True)
        for child in self.children:
            if group_alive(child.process.pid):
                signal_group(child.process.pid, signal.SIGKILL)
            child.process.wait()
            child.reader.join(timeout=1)
        success = True
        if self.compose_owned:
            # Do not pass --volumes. Do not clean another Compose project.
            child = self.start("shutdown", self.compose + ["down", "--timeout", "10"], persistent=False)
            deadline = time.monotonic() + 90
            while child.process.poll() is None and time.monotonic() < deadline:
                self.pump(0.05, stopping=True)
            if child.process.poll() is None:
                signal_group(child.process.pid, signal.SIGKILL)
                child.process.wait()
            child.reader.join(timeout=2)
            if child.process.returncode:
                success = False
                self.say("Docker cleanup failed. Check shutdown.log and use the recovery command in docs/LOCAL_DEVELOPMENT.md.")
        self.pump(0, stopping=True)
        if self.lock_file:
            self.lock_file.close()
        self.say(("Stopped. " if success else "Host processes stopped; Docker cleanup needs attention. ") +
                 f"Logs retained at {self.log_dir}")
        return success


def parse_compose_ps(raw: str) -> list[dict]:
    """Compose versions emit either a JSON array or one object per line."""
    if not raw.strip():
        return []
    if raw.lstrip().startswith("["):
        return json.loads(raw)
    return [json.loads(line) for line in raw.splitlines() if line.strip()]


def tempfile_output(state: Path):
    import tempfile
    return tempfile.TemporaryFile(dir=state)


def arguments(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="check tools, Docker, configuration and ports; do not install/start")
    parser.add_argument("--dotnet", choices=["auto", "host", "docker"], default="auto", help="default: host .NET 9 if installed, otherwise Docker")
    parser.add_argument("--backend-only", action="store_true", help="omit the web shell and remotes")
    parser.add_argument("--mobile", action="store_true", help="also start Expo/Metro on port 8100")
    parser.add_argument("--mobile-host", help="LAN IPv4/hostname reachable by a physical phone; implies --mobile")
    parser.add_argument("--azure", action="store_true", help="allow AI service to use configured Azure credentials instead of templates")
    install = parser.add_mutually_exclusive_group()
    install.add_argument("--no-install", action="store_true", help="use existing node_modules without installing")
    install.add_argument("--reinstall", action="store_true", help="rerun npm ci even when the dependency fingerprint matches")
    parser.add_argument("--startup-timeout", type=int, default=300, help="seconds to wait for each readiness check (default: 300)")
    parser.add_argument("--setup-timeout", type=int, default=1800, help="seconds allowed per install/build (default: 1800)")
    args = parser.parse_args(argv)
    if args.startup_timeout <= 0 or args.setup_timeout <= 0:
        parser.error("timeouts must be positive")
    if args.mobile_host:
        if not re.fullmatch(r"[a-zA-Z0-9.-]+", args.mobile_host):
            parser.error("--mobile-host takes an IPv4 address or hostname, without scheme/port")
        args.mobile = True
    return args


def main(argv=None) -> int:
    os.umask(0o077)
    app = Supervisor(arguments(argv))
    result = 0
    def request_stop(_signal, _frame):
        app.stop = True
    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        signal.signal(sig, request_stop)
    try:
        app.acquire()
        with app.terminal:
            app.help()
            try:
                app.run()
            except StopRequested:
                app.say("Stop requested.")
            except (LaunchError, OSError, ValueError) as error:
                app.say(f"ERROR: {error}")
                result = 1
            finally:
                if not app.shutdown():
                    result = 1
    except (LaunchError, OSError) as error:
        print(f"[launcher] ERROR: {error}", file=sys.stderr)
        result = 1
    return result


if __name__ == "__main__":
    raise SystemExit(main())
