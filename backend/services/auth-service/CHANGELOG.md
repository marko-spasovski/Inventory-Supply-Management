# auth-service — Changelog

## 2026-05-17 — Refresh tokens + full role set

### Refresh tokens (closes Gap 1)

`JwtService.java`:
- `generateRefreshToken(User)` — issues a JWT carrying `type=refresh` and
  `userId` claims with a 7-day TTL (override via `jwt.refresh-expiration-ms`).
- `validateRefreshAndExtractEmail(token)` — verifies signature + expiry and
  asserts `type=refresh`; throws `MalformedJwtException` for plain access
  tokens so they cannot be used in place of refresh.

`AuthService.java`:
- `generateRefreshToken(LoginRequest)` and `refreshAccessToken(refreshToken)`
  pair. The latter looks up the user by email (subject claim) and re-issues a
  fresh access token. Stateless — no refresh-token store in the DB.

`AuthController.java`:
- `POST /auth/login` now sets two response headers — `X-Auth-Token`
  (access, 24h) **and** `X-Refresh-Token` (long-lived). The existing
  HttpOnly `AUTH_TOKEN` cookie is unchanged for web clients.
- New `POST /auth/refresh` endpoint:
  - Request body: `{ "refreshToken": "<jwt>" }`
  - 200 → `{ "accessToken": "<jwt>" }`
  - 400 if body is missing the field
  - 401 if the refresh token is expired/invalid/not-a-refresh

### Role enum extended (closes Gap 2)

`Role.java` now includes `ADMIN` and `DRIVER` alongside the original
`MANAGER` and `WORKER`. `AuthService.register()` accepts the new lowercase
strings (`"admin"`, `"driver"`) and resolves them to the enum.

### Restart instructions

This service is run via `mvn spring-boot:run` (or `java -jar`) on the host
directly — not in docker-compose. After pulling these changes:

```bash
# from services/auth-service/
mvn clean package -DskipTests
# kill the running auth-service process, then:
java -jar target/auth-service-*.jar
```

### Verification

After restart, with curl against `http://localhost:8081`:

```bash
# 1. Register a manager (token claim "role" comes back as MANAGER)
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke","email":"s@e.local","password":"smoke123","role":"manager"}'

# 2. Login — pick X-Refresh-Token out of -i headers
curl -i -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"s@e.local","password":"smoke123"}'

# 3. Refresh
curl -X POST http://localhost:8081/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<paste from step 2>"}'

# 4. Register an admin (round-trips through the new enum value)
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"a@e.local","password":"admin123","role":"admin"}'
```
