# Run the whole project locally

From the project root:

```bash
./run-local.sh
```

The launcher checks tools and ports, installs missing Node dependencies, starts Docker infrastructure, starts the services and gateways, builds/serves all seven web remotes, and starts the web shell. Once it says **STACK READY**, open **http://localhost:3000**.

**Press `q` at any time to stop the run. No Enter is needed in an interactive terminal.** Ctrl+C, SIGTERM, and normal startup errors use the same cleanup. It terminates the processes it started, including their child processes, and removes this launcher's containers/network. **Database, Kafka, and document volumes are preserved.** It never kills an existing process just because it uses a port.

This launcher starts the implementation as it exists. It does not fix the authorization/stock/notification business issues described in [the project review](PROJECT_REVIEW_AND_DOCUMENTATION.md).

## What runs where

| Host processes | Docker containers |
|---|---|
| Auth, company, warehouse, inventory (Java) | Eight PostgreSQL databases |
| Spring web gateway | Kafka and ZooKeeper, with persistent volumes |
| Mobile gateway, notification, AI (Node) | Fleet/product/order only when .NET 9 is unavailable or `--dotnet docker` is selected |
| Fleet, product, order when .NET 9 is installed | Dedicated Compose project: `novo-local` |
| Web shell and seven built web remotes | Uses `deploy/local/compose.yaml`, not the older `deploy/docker/compose.yaml` |
| Expo/Metro when requested | |

The .NET fallback is automatic. Its dedicated Dockerfile builds from the current local source. The original C# project files, SDK pins, application code, and old Compose file are not rewritten. Host .NET uses a launcher-owned SDK-selection directory; Docker uses its .NET 9 SDK image.

## Prerequisites

- Linux, macOS, or WSL2 with Bash and Python **3.10+**.
- Docker Engine/Desktop running, Docker Compose with profiles, and permission to use the Docker daemon. Run the launcher as your normal user, not with `sudo`.
- Node **24 LTS** (`.nvmrc`; `nvm use`). The launcher refuses anything older than 20.19.4, the frontend lockfile's React Native/Metro minimum, but CI and the images use Node 24.
- A Java **21+ JDK**, including `javac`. Maven is downloaded through the checked-in wrappers when needed.
- Optional: .NET **9 SDK**. Without it, the three C# services run in Docker.
- Internet access on the first run for images, Maven/NuGet, and npm packages.
- Enough memory for several JVMs, web processes, and database containers. If startup is slow on a constrained machine, begin with `--backend-only` and increase the timeout.

Check without installing or starting anything:

```bash
./run-local.sh --check
```

The check creates only launcher logs/state. It checks Docker access, configuration, installed tools, and port availability. It cannot certify that uncached dependencies download or application source compiles successfully.

## Interactive controls

| Key | Action |
|---|---|
| `q` | Stop the stack and exit; preserve data |
| `s` | Show current phase and supervised process status |
| `u` | Show useful URLs |
| `l` | Cycle through service-specific log views |
| `a` | Show all logs |
| `e` | Show only lines containing error/fail/exception/warn |
| `p` | Pause/resume terminal output; processes and file logging continue |
| `h` | Show controls |

Controls work during installs, builds, and readiness waits. When stdin is a pipe instead of a terminal, send `q` through the pipe or stop with SIGTERM. EOF alone does not stop a headless run.

Every line has a timestamp/service label. Logs are saved to:

```text
.local-run/logs/<timestamp>-<pid>/all.log
.local-run/logs/<timestamp>-<pid>/<service>.log
```

Filtering/pausing affects only display. If output is exceptionally busy, screen lines may be dropped to keep controls responsive; the files keep the complete log stream. Node and Maven child output is included. Docker service logs are followed separately. The launcher monitors unexpected process exits and container failure and stops the remaining stack instead of silently leaving a partial run.

## Useful options

```bash
./run-local.sh --backend-only             # All business services and both gateways
./run-local.sh --mobile                   # Default stack + local Expo/Metro
./run-local.sh --mobile-host 192.168.1.20  # Default stack + Expo for a physical phone
./run-local.sh --dotnet docker            # Always run C# services in Docker
./run-local.sh --dotnet host              # Require .NET 9 on the host
./run-local.sh --no-install               # Reuse existing dependencies without npm ci
./run-local.sh --reinstall                # Refresh Node installations from lockfiles
./run-local.sh --startup-timeout 600       # Allow slower service startup
./run-local.sh --setup-timeout 3600        # Allow longer dependency/image builds
./run-local.sh --help
```

Default startup timeout is 300 seconds per readiness check; default setup timeout is 1800 seconds per install/build. First startup is slower because it downloads/builds dependencies. Later launches reuse Docker/Maven/NuGet caches and Node installations whose manifest fingerprint is unchanged.

Frontend installation uses `npm ci --legacy-peer-deps` (also set in `frontend/.npmrc`). Web and mobile share one React version (19.1), so the workspace has a single React. Backend Node installations use ordinary `npm ci`. Existing lockfiles are not rewritten. `--reinstall` replaces `node_modules`, not application source or data. Do not change dependencies or run another installer in the same checkout while this launcher is installing.

## Web development

The shell runs on **3000**, remotes on **3001–3007**. The launcher builds federation bundles before serving them, rather than assuming a Vite dev remote supplies `remoteEntry.js`. The shell's `/api` proxy points at the Spring gateway on **8080**. Live notifications use **9091**.

The shell has Vite hot reload. The remote apps are built snapshots: **restart the launcher after editing a remote** to rebuild it. Host C# uses `dotnet run`; restart after C# edits. Docker fallback images are built again on startup with Docker layer caching. Node services use their existing development scripts, and Java uses the existing Spring development configuration.

Web remote URLs are intentionally localhost-based. Open the web UI on the same machine. Physical-phone support below applies to the native Expo client; this launcher does not provision a public HTTPS web deployment.

## Mobile testing

Expo's usual port **8081 is already auth-service's port**, so the launcher uses **8100** for Expo/Metro.

For a physical phone, use your computer's LAN IPv4 address:

```bash
./run-local.sh --mobile-host 192.168.1.20
```

This supplies:

```text
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.20
EXPO_PUBLIC_API_URL=http://192.168.1.20:8090
EXPO_PUBLIC_WS_URL=ws://192.168.1.20:8090/ws
```

Connect Expo Go/a suitable development client to `exp://192.168.1.20:8100`. Your phone must be on a network that can reach the host, and your firewall must allow Metro 8100 and mobile gateway 8090. The launcher does not automatically create a tunnel or modify firewall rules. Without a host argument, Metro is localhost-only and the app retains its existing emulator API defaults.

Expo receives noninteractive stdin because the launcher owns the keyboard. Use the printed Expo URL instead of expecting Expo's own `a`/`i` terminal shortcuts. Starting Metro does not install an emulator or build a native binary; native dependency/Expo SDK mismatches can still require separate repair.

## Data and configuration

- PostgreSQL is bound to loopback at **5432–5439**. Kafka's host listener is **9092**, with a separate Docker-internal listener for C# fallback containers.
- Java inventory gRPC listens on **9090** so a fallback order container can reach it through `host.docker.internal`. On Linux this uses Docker's host-gateway mapping; a restrictive firewall may need to allow that bridge-to-host connection.
- The application API/WS defaults are **8080–8090** and **9091**.
- The launcher uses the existing development JWT key consistently because the current web verifier hardcodes it. It does not claim to fix production secret management.
- `NOVO_DB_USER` and `NOVO_DB_PASSWORD` optionally change this launcher's database credentials. Choose them before the first run: changing environment values does not reset users/passwords in an existing PostgreSQL volume.
- Host order PDFs are under `.local-run/documents/orders/`; consumption PDFs under `.local-run/documents/consumptions/`. Docker order PDFs use the `novo-local_order-documents` named volume. Switching .NET modes does not automatically migrate uploaded files between those stores.
- AI starts in **template mode** by default. To use existing Azure environment configuration, explicitly run `./run-local.sh --azure`. Credentials remain server-side; the launcher does not print their values.
- No sample data, users, or privileged accounts are created automatically.

The old Compose stack uses separate volumes. This launcher does not copy its database contents. Do not run both stacks simultaneously because their host ports overlap.

## Testing a business flow

After **STACK READY**:

1. Open the shell and register/login using development data.
2. Create a company, warehouse, category/product, vehicle, and driver.
3. Create an order referencing those records.
4. Approve it and watch `order-service`, `inventory-service`, `warehouse-service`, and `notification-service` logs.
5. Inspect inventory/capacity, advance delivery, upload a PDF, and close it.
6. Consume inventory and inspect the notifications.
7. Repeat from mobile if enabled; use `s`/`l`/`e` to inspect failures.

Some of these business behaviors have known defects in the review. “Ready” means application endpoints responded, not that the business transaction has been certified correct.

Optional existing API tests, in a **second terminal** while the launcher is running:

```bash
cd "tests/e2e"
npm ci
E2E_BASE_URL=http://localhost:8090 npm test
```

Those tests write test data. They currently cover a smaller onboarding/stock path, not the entire order workflow. Likewise, inspect [the seed guide](../backend/test-data/README.md) before using the separate seed scripts; they are not run automatically.

## Troubleshooting and crash recovery

| Message/symptom | Action |
|---|---|
| Docker permission denied or daemon unavailable | Start Docker and grant your normal user Docker access; rerun `--check`. |
| Port already used | Stop the old stack/process yourself; the launcher refuses to take over unrelated processes. |
| `novo-local` containers already running | Quit the other launcher, or recover a stale run with the command below. |
| Install/build failed | Read the named log; fix the reported dependency/build problem, then rerun. |
| Service did not become ready | Read that service's log; a compile/database failure is different from slow startup. |
| Host .NET SDK unavailable | Use automatic mode or `--dotnet docker`. |
| Order approval cannot reach inventory in Docker mode | Check host gRPC 9090 and Docker bridge/firewall access. |
| No stock/capacity change even though requests succeed | Consult the business-flow findings; the launcher does not rewrite workflow logic. |
| Terminal output seems frozen | Press `p` to resume or `a` to remove a filter. |

If the terminal/launcher was forcibly killed and no launcher is still using the stack, remove leftover containers **without deleting data**:

```bash
docker compose --env-file /dev/null -p novo-local -f deploy/local/compose.yaml --profile dotnet down --timeout 10
```

No process can execute cleanup after SIGKILL or a power loss. For lingering host processes, use the recorded status/PIDs and your OS process tools to inspect them before stopping them. Normal `q`, Ctrl+C, terminal hangup, and handled startup failures perform cleanup automatically. A file lock prevents concurrent launchers in the same checkout.

Do not add `--volumes` unless you intentionally want to erase the local databases, Kafka history, and container-stored documents.

## Launcher tests

```bash
python3 -B -m unittest discover -s scripts/tests -v
bash -n run-local.sh
docker compose --env-file /dev/null -p novo-local -f deploy/local/compose.yaml --profile dotnet config --quiet
```

Supervisor tests exercise real subprocess trees, cancellation, failure propagation, logs, lock ownership, and volume-preserving cleanup. They do not require Docker or business services and are separate from the project's application tests.
