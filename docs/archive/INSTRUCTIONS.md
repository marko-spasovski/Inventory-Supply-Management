# Frontend Monorepo — Build Playbook

A human-driven, step-by-step plan for taking the `Inventory-Supply-Management-Frontend`
repo from "two folders copied side by side" to a wired npm-workspaces monorepo where the
mobile app and the web micro-frontends are multilingual, visually aligned, and at feature
parity.

**How to use this document.** Each step has a short rationale, a copy-paste **PROMPT** you
hand to your coding agent, and a **VERIFY** gate you complete *yourself* before moving on.
Do not skip the verify gates — they exist because several steps build on each other and one
silent failure early (a broken install, a bad Metro config) will corrupt everything after it.
Run the steps in order. Do not run two steps in one agent session.

---

## Current state (where you're starting)

```
Inventory-Supply-Management-Frontend/
├── mobile/        Expo / React Native app (its own package.json + lockfile)
└── web/           8 Vite micro-frontends, each its own package.json + lockfile:
                   shell, auth-mf, companies-mf, fleet-mf, inventory-mf,
                   orders-mf, products-mf, warehouses-mf
```

This is **not yet a workspace** — it's nine isolated projects in one folder. There is no
root `package.json`, no shared `packages/`, no git repo. The backend lives in a sibling repo
`../Inventory-Supply-Management-Backend` (notably `mobile-gateway/`, the BFF the mobile app
must route through).

## Target state (where you'll end up)

```
Inventory-Supply-Management-Frontend/
├── package.json            workspace root (manifest)
├── tsconfig.base.json      shared compiler options + @erp/* path aliases
├── .gitignore
├── packages/               shared, framework-agnostic code
│   ├── api-types/          @erp/api-types  — TYPES ONLY (no runtime values)
│   ├── i18n/               @erp/i18n       — bilingual SL/EN dictionary (pure data)
│   └── domain/             @erp/domain     — roles, order status-flow, query keys
├── mobile/                 @erp/mobile
└── web/                    @erp/shell, @erp/auth-mf, … (8 workspaces)
```

---

## Guardrails that apply to EVERY step

Paste these into any prompt where they're relevant; they're the rules that keep the work safe.

- **Mobile's extra features are sacred.** The AI feature, barcode scanner, push
  notifications, and offline handling exist only on mobile and are intentional. "Parity"
  means mobile *gains* what web has — it never means mobile *loses* its additions.
- **Mobile routes through `mobile-gateway`.** Every mobile API call must resolve to a
  `mobile-gateway` route. If a feature needs a backend route the gateway doesn't expose,
  STOP and report it — never point mobile directly at a service or the web gateway.
- **Shared packages stay framework-agnostic.** No React, no Angular, no Expo, no DOM in
  `packages/*`. Pure TypeScript only.
- **`@erp/api-types` is types-only.** `interface` / `type` / const-enum only. No classes,
  no runtime objects, no schemas-with-code. Types compile away to nothing and are safe
  across the Module Federation boundary; runtime values are NOT — they cause the classic
  cross-MF shared-singleton breakage.
- **One reviewable change at a time.** Never batch unrelated work into one diff.
- **Trust code over docs.** The older docs (`FEATURE_MATRIX`, `MOBILE_VS_WEB_PARITY`,
  `ROLE_MATRIX`) were found stale in the audit. `PARITY_AUDIT.md` is the current ground truth.

---

## Step 1 — Scaffold the workspace (PREREQUISITE — do this first)

**Why first:** nothing else can happen until there's a workspace and a `packages/` home.
The multilingual dictionary, the shared types, the domain logic — they all need a place to
live. This step builds the skeleton and **moves no real code yet**. Keeping extraction out
of this step means if the install or Metro config breaks, you know it's the scaffold, not a
refactor.

### PROMPT

```
You are turning an existing folder into an npm-workspaces monorepo. Create ONLY the
workspace skeleton — do NOT move or extract any real source code yet. Work in
Inventory-Supply-Management-Frontend/, which contains mobile/ and web/ (8 Vite MFs:
shell, auth-mf, companies-mf, fleet-mf, inventory-mf, orders-mf, products-mf,
warehouses-mf).

DO:
1. Create a root package.json:
   { "name": "inventory-frontend", "private": true,
     "workspaces": ["mobile", "web/*", "packages/*"],
     "scripts": {
       "mobile": "npm run start --workspace=@erp/mobile",
       "shell":  "npm run dev   --workspace=@erp/shell"
     } }
   (Note "web/*" — each MF is its own workspace.)
2. Create tsconfig.base.json at the root with baseUrl "." and paths aliases:
   @erp/api-types -> packages/api-types/src
   @erp/i18n      -> packages/i18n/src
   @erp/domain    -> packages/domain/src
3. Create a root .gitignore (node_modules, dist, .expo, Vite/Angular build output, etc.).
4. Create THREE empty shared packages, each with a minimal package.json
   (private, main+types -> src/index.ts) and an empty src/index.ts:
     packages/api-types  -> name "@erp/api-types"
     packages/i18n       -> name "@erp/i18n"
     packages/domain     -> name "@erp/domain"
5. Set the name field in each existing app's package.json:
     mobile -> "@erp/mobile"
     web/shell -> "@erp/shell", web/auth-mf -> "@erp/auth-mf", … one per MF.
   Change ONLY the name; leave their deps and config alone.
6. Make each app's tsconfig extend ../../tsconfig.base.json (web/<mf>) or
   ../tsconfig.base.json as appropriate, without breaking their existing options.
7. Add mobile/metro.config.js that extends expo/metro-config getDefaultConfig, sets
   watchFolders to the workspace root, and adds nodeModulesPaths for both the app and
   the workspace-root node_modules.
8. Delete the now-redundant per-app package-lock.json files (the root lockfile becomes
   the single source of truth).
9. Run `npm install` at the root.

DO NOT extract roles, types, i18n strings, or any logic into the packages yet — leave
src/index.ts files empty. That is a later step.

REPORT: every file created/edited, and the result of `npm install`. Then STOP.
```

### VERIFY (you do this — do not proceed until all pass)

- `npm install` at the root completed without errors.
- A single root `package-lock.json` now exists; the per-app ones are gone.
- `npm run mobile` starts the Expo dev server (Metro resolves from the workspace).
- At least one MF builds/serves: `npm run shell` (or its build command).
- `git init`, then commit this skeleton as your first commit (clean rollback point).

> If anything here fails, fix it before Step 2. Do **not** layer extraction on a broken
> workspace.

---

## Step 2 — Extract shared code into `packages/` (one package at a time)

**Why now, why separately:** with the skeleton verified, you fill the packages — but do it
package-by-package so a broken import is easy to trace. Extraction order: `domain` first
(it has tests that prove correctness), then `api-types`, then leave `i18n` mostly for Step 3
(the multilingual work fills it properly).

### PROMPT

```
The workspace skeleton exists and is verified. Now extract shared code into the empty
packages, ONE package at a time, running typecheck/tests after each. Read code, don't
trust the stale docs.

Package A — @erp/domain (do first):
  Move from mobile: constants/roles.ts, constants/queryKeys.ts, lib/orders/statusFlow.ts,
  and their tests (__tests__/roles.test.ts, __tests__/orderStatusFlow.test.ts).
  Re-export from packages/domain/src/index.ts. Update mobile imports.
  Then find the MFs' equivalents (roles / order-status logic / query keys). If they match
  in shape, replace the MF copies with imports from @erp/domain. If they DIVERGE in shape,
  do NOT force them — report the divergence and leave the MF copy in place for my decision.
  Run mobile tests; the moved tests must pass. STOP and report.

Package B — @erp/api-types (after A approved):
  Move mobile's types/api.ts into packages/api-types/src. TYPES ONLY — if anything in that
  file is a runtime value (class, const object, schema), leave it in mobile and tell me.
  Consolidate the MFs' DTO/model types into the same package where shapes match; flag
  mismatches instead of forcing them. Update imports on both sides. Typecheck. STOP.

Do NOT do i18n yet — that's handled in the multilingual step with full SL/EN extraction.

RULES: framework-agnostic packages only. Anything touching React/Expo/web runtime stays in
its app. Report files touched per package, and STOP between packages.
```

### VERIFY

- Mobile tests pass (the moved `roles` / `orderStatusFlow` tests especially).
- Both mobile and the MFs still typecheck after each package.
- Any reported shape-divergences: **you** decide whether to reconcile them or keep separate
  copies. Don't let the agent guess.
- Commit after each package extracts cleanly.

---

## Step 3 — Multilingual (Slovenian + English), BOTH sides

**Why before features:** if you build missing features first, you hardcode a fresh batch of
strings that then need re-extracting. Strings-first means every feature built afterward reads
from the shared dictionary from day one. The goal is **not** "translate mobile to match web"
— it's "both apps localized from one shared bilingual source, with a language toggle."

### PROMPT

```
Make BOTH the web MFs and the mobile app fully support English and Slovenian, reading
user-facing strings from ONE shared bilingual dictionary in @erp/i18n. The target is NOT
"translate one app to match the other" — it is "both apps localized from a shared source."

First, report the current i18n state of EACH side: does each use an i18n framework with
keyed lookups, or are strings hardcoded? (This determines effort — report before changing.)

Then:
1. Build the shared dictionary in packages/i18n/src as the single source of truth: keyed
   entries with { en, sl } values for all shared user-facing strings (entity names,
   statuses, actions, validation messages, labels). Pure data — no runtime framework code.
2. Extract hardcoded user-facing strings on BOTH sides into keys in that dictionary.
   Supply BOTH the English and Slovenian value for each. Where only one language currently
   exists, provide the translation for the other — but FLAG any domain term you're unsure
   of for my review. Do not invent terminology.
3. Wire each app's OWN i18n runtime to read from the shared dictionary. Mobile keeps its RN
   i18n setup; the MFs keep their web i18n library. Only the string SOURCE is shared.
4. Ensure a working language toggle exists in BOTH the shell (covering the MFs) and mobile.
   Add one where missing.

VERIFY-IN-PROMPT: switch languages in mobile and in the shell; confirm strings change and
nothing renders a raw key. Report all untranslated/uncertain terms. STOP.
```

### VERIFY

- Toggle EN↔SL in mobile: strings change, no raw keys (`orders.title` etc.) leak to screen.
- Toggle EN↔SL in the shell: same.
- Review the agent's list of uncertain Slovenian terms — **you** confirm the domain
  vocabulary; the agent shouldn't be the authority on your business terms.
- `@erp/i18n` contains pure `{ en, sl }` data only — no React/runtime code crept in.
- Commit.

---

## Step 4 — Design / color alignment (mobile → match the MFs)

**Why:** mobile should share the MFs' visual *language* — colors, status semantics, naming —
even though native layout patterns differ (mobile shouldn't look like a web page). The audit
flagged divergences including a hardcoded `#ef4444` and mismatched order-status / low-stock
colors.

### PROMPT

```
Align the mobile app's visual language to the web MFs. Native interaction patterns are fine;
colors, status→color semantics, and naming must MATCH the MFs.

1. Derive the MFs' design tokens from their styling: color palette, status→color mapping,
   spacing scale, typography intent. List them.
2. Replace mobile's divergent/hardcoded styling (e.g. the hardcoded #ef4444 the audit
   flagged) with those tokens, centralized in mobile/constants/colors.ts. Leave NO hardcoded
   colors in components.
3. Align shared semantic UI — status badges, order-status colors, low-stock indicators —
   so they mean the same thing and look consistent with web.

Do not restyle into a web look; keep it native. Typecheck + build. Spot-check the screens
the audit named as divergent. Report files touched. STOP.
```

### VERIFY

- The audit's named-divergent screens now match the MFs' color/status semantics.
- No hardcoded colors remain in mobile components (grep for `#` hex values).
- Mobile still builds; the app still looks native, not like a ported web page.
- Commit.

---

## Step 5 — Feature parity (mobile gains what web has), one chunk at a time

**Why last:** features built now read strings from Step 3's dictionary and colors from
Step 4's tokens — no fresh hardcoding. Implement the parity gaps from `PARITY_AUDIT.md`
respecting its dependency ordering, **one chunk per agent session.**

### PROMPT (run once per chunk — name the chunk each time)

```
Implement ONE parity gap from mobile/docs/PARITY_AUDIT.md: <NAME THE CHUNK>.

Rules:
- Match the web MF's FUNCTIONALITY and user-facing behavior; implement it native-correct
  for RN (you need not copy web code verbatim).
- All new user-facing strings come from @erp/i18n (add SL+EN keys if missing); all colors
  from the mobile design tokens. NO new hardcoded strings or colors.
- The feature must route through mobile-gateway. If it needs a backend route the gateway
  doesn't expose, STOP and tell me — do not bypass the gateway.
- Do not touch mobile's existing extra features (AI, scanner, push, offline).
Implement → confirm gateway routing → typecheck/test → report files touched → STOP.
Do not start another chunk.
```

### VERIFY (per chunk)

- The new feature behaves like its web counterpart.
- New strings are bilingual (toggle to check); no hardcoded colors.
- Confirm the network calls hit a `mobile-gateway` route (not a service directly).
- Mobile's AI/scanner/push/offline features still work — nothing regressed.
- Commit per chunk. Move to the next chunk only when this one is verified.

---

## Order summary & rationale

1. **Scaffold workspace** — foundation; everything needs a `packages/` home.
2. **Extract shared code** — `domain`, then `api-types`; tests prove correctness.
3. **Multilingual** — before features, so features don't hardcode strings to re-extract.
4. **Design alignment** — before features, so features inherit correct tokens.
5. **Feature parity** — last, chunk by chunk, reading from the shared layers above.

The whole sequence is ordered cheap-to-expensive-to-undo. The one genuinely irreversible
moment is string extraction across nine frontends (Step 3) — which is exactly why it sits
behind a verified workspace and gets its own checkpoint.

## Known open questions to resolve as you go

- **Workspace not yet wired** — Step 1 addresses this; nothing before it will work.
- **Shape divergences** between MF and mobile types/roles — *you* decide reconcile vs.
  keep-separate when the agent flags them (Step 2).
- **Slovenian domain terminology** — you are the authority; confirm the agent's uncertain
  translations (Step 3).
- **Backend visibility** — run the parity/gateway checks from a location where the agent can
  reach `../Inventory-Supply-Management-Backend/mobile-gateway/`, or gateway verification is
  half-blind.
- **Feature-coverage vs the deleted Angular app** — confirm the MF set actually covers every
  screen you need before relying on parity-to-web as your definition of complete.
