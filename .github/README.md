# CI/CD setup

`workflows/images.yml` builds + pushes every container image (12 total: 9 services, 2 gateways,
1 combined web frontend) to Docker Hub on every push to `main`. Used by the
OpenShift deployment flow in `deploy/openshift/` (see `frontend/mobile/naloga8-guidelines.md`).

`workflows/ci.yml` builds and tests every backend service, both gateways and the
frontend workspace on every push/PR; the Playwright e2e job is manual-only.

## One-time setup

1. **Create a Docker Hub access token**
   <https://hub.docker.com/settings/security> → New Access Token → name it
   `gh-actions` → copy the token (you won't see it again).

2. **Add two repository secrets**
   GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `DOCKERHUB_USERNAME` → your Docker Hub username (e.g. `marko`)
   - `DOCKERHUB_TOKEN`    → the access token from step 1

3. **Make sure Docker Hub repos exist + are public.**
   The workflow pushes to `docker.io/<DOCKERHUB_USERNAME>/<image-name>`.
   First push auto-creates each repo as **private** by default. Either
   pre-create them as Public on Docker Hub, or open each one after the
   first push and flip Visibility to Public. OpenShift Sandbox needs them
   public to pull without an imagePullSecret.

## What it does on push

For every push to `main` that touches `backend/services/**`, `backend/gateways/**`,
`frontend/web/**`, `frontend/packages/**` or `frontend/package*.json`:

- 12 parallel matrix jobs build each image with Buildx (linux/amd64 target).
- Each image is pushed with three tags:
  - `latest`           — always overwritten with the newest main build
  - `<short-sha>`      — immutable, e.g. `a1b2c3d` — **use this in OpenShift Deployments**
  - `<branch>`         — convenient for short-lived feature branches
- A summary table appears under the workflow run's **Summary** tab with
  ready-to-paste `docker.io/<user>/<service>:<sha>` references.

## Manual trigger

You can also fire it from **Actions → build-images → Run workflow** any
time — useful after rotating the Docker Hub token, or to rebuild without
making a commit.

## Cost / minutes note

A full rebuild of all 12 components takes ~12–15 GitHub-minutes when caches
are cold and ~4–6 minutes with the buildx GHA cache populated. Free tier
gives you 2000 minutes/month for private repos and unlimited for public —
plenty of headroom for thesis-pace iteration.

## Mobile app

The Expo app lives in `frontend/mobile` and its tests run in the `frontend` job of
`ci.yml`. It is distributed via Expo, not as a container image. (The standalone
`Expo-Erp-System` repo is an older copy of this app.)
