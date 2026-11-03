# Test baseline

The state of every existing test suite when the repository became the monorepo (phase 0 of the
[remediation plan](../plans/remediation-plan.md)). It records what passed, what failed and why, so
later phases can be measured against it. No assertion was weakened to make a suite pass.

- Date: 2026-11-03
- First CI run: PR #1, run `41560949992` (11 of 13 jobs green; e2e is manual-only)

## Results

| Suite | Tests | First run | After phase 0 | Notes |
|---|---:|---|---|---|
| auth-service (JUnit) | — | ✅ | ✅ | |
| company-service (JUnit) | — | ✅ | ✅ | |
| warehouse-service (JUnit) | — | ✅ | ✅ | |
| inventory-service (JUnit) | — | ✅ | ✅ | |
| web-gateway (JUnit) | 1 | ✅ | ✅ | Only a context-load test. Real tests arrive in phase 3. |
| fleet-service (xUnit) | — | ✅ | ✅ | |
| product-service (xUnit) | — | ✅ | ✅ | |
| order-service (xUnit) | 23 | ❌ 1 failed | ✅ 22 passed, 1 skipped | See "Quarantined" below |
| notification-service (Jest) | — | ✅ | ✅ | |
| ai-service (Jest) | — | ✅ | ✅ | |
| mobile-gateway (Jest) | — | ✅ | ✅ | |
| frontend mobile (jest-expo) | 20 | ✅ | ✅ | |
| frontend web: shell + 7 remotes (Vitest) | 33 → 36 | ❌ 18 failed | ✅ 36 passed | See "Fixed test defects" below |
| frontend web builds (Vite, 8 apps) | — | not reached | ✅ | The step never ran, because the tests failed first |
| e2e (Playwright API) | 2 | skipped | skipped | Manual-only: the compose file has no Java/.NET services (R08). Replaced in phase 8. |

Counts shown as "—" are reported per job in CI. The phase 7 coverage report replaces this table
with exact numbers.

## Fixed test defects (finding R19)

These were defects in the tests, not in the application:

1. **Locale.** 15 web tests asserted English copy, but the app default is Slovenian
   (`DEFAULT_LOCALE = 'sl'`). The tests now set `erp_locale=en` explicitly in each app's
   `test-setup.ts`, and again in test files that clear `localStorage`. A new shell test
   (`i18n.test.ts`) asserts that the default stays Slovenian and that unknown values fall back to it.
2. **Stale copy.** Three tests asserted text the UI no longer shows: "Fleet Management" (now "Fleet"),
   "Stock / Inventory" (now "Stock"), and the raw role `MANAGER` (now its label "Manager"). The two
   heading tests now find the `h1` by role and name, which is stricter than the old text match.

## Quarantined

| Test | Why | Re-enabled by |
|---|---|---|
| `OrderServiceTest.UpdateStatusAsync_WhenStatusIsClosed_CallsGrpcClient` | It asserts the approved behaviour (decision D1: stock is received on **Close**). The code still adds stock on **Approve** (finding R04). The test is correct and the code is wrong. | Phase 4, `feat/goods-receipt` |

A quarantined test uses `Skip` with a reason, so it shows as skipped in every run. It is never deleted.
