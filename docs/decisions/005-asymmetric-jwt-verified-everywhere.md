# ADR 005: Asymmetric JWTs with JWKS, verified by the gateways and every service

- Status: Accepted
- Date: 2026-11-03

## Context
All components share one HS256 secret. The web gateway has it hard-coded and ignores the configured
value (R03). Role checks in the web gateway are commented out, and most services check no token at
all, so anything that reaches a service port is trusted (R02). Refresh tokens are not revoked on
logout, and access validators accept any signed token (R17).

## Decision
- auth-service signs **access tokens** with ES256 and a key id (`kid`). Claims: `sub`, `email`,
  `role`, `typ=access`, `aud=erp`, `iat`, `exp` (15 minutes, from configuration).
- Public keys are served at `/.well-known/jwks.json` on the internal network only.
- Gateways **and every service** verify the signature, expiry, audience and `typ`, and cache keys
  for 10 minutes (an unknown `kid` triggers a refetch).
- **Refresh tokens** are random, stored hashed, rotate on every use, and are revoked on logout.
  Reuse of a rotated refresh token revokes the whole session.
- Web: tokens in httpOnly, Secure, SameSite=Strict cookies. Mobile: Bearer, kept in the secure store.
- The signing key comes from a Kubernetes Secret (or `.env` locally). There is no default in code.

## Alternatives considered
- **Keep HS256 with an injected secret.** Simpler, but every verifier could also mint tokens. With
  eleven verifiers, that is too many places for a key that can forge any identity.
- **Gateway-only verification with trusted identity headers.** Rejected: one misrouted port bypasses all checks.

## Consequences
- Rotating keys means publishing a new `kid` next to the old one, then retiring the old one
  (runbook in docs/operations).
- Every stack needs a JWKS-capable verifier (Spring Security resource server, ASP.NET JwtBearer, `jose` in Node).
