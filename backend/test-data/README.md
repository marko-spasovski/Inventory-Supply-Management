# Test Data

This folder contains a local seed workflow for populating the project with sample business data without touching users.

It seeds data through the running service endpoints instead of writing directly to PostgreSQL tables. That makes it safer against schema changes across Spring Boot and .NET services.

## What It Creates

- companies
- warehouses
- categories
- products
- vehicles
- drivers
- inventory
- orders
- notifications generated indirectly through order and inventory events

## What It Does Not Create

- users
- auth records
- uploaded order documents

## How It Works

The seed script talks directly to service ports, not through the gateway. That means:

- you do not need to log in first
- your existing users stay untouched
- the script can populate the domain data even when gateway auth is enabled

## Prerequisites

- all relevant services running locally
- `curl`
- `jq`

## Usage

1. Start the local stack.
2. Optionally copy `seed.env.example` to `seed.env` and adjust URLs.
3. Run:

```bash
chmod +x test-data/seed-local.sh
./test-data/seed-local.sh
```

## Default Local URLs

- company service: `http://localhost:8082`
- fleet service: `http://localhost:8083`
- warehouse service: `http://localhost:8084`
- product service: `http://localhost:8085`
- inventory service: `http://localhost:8086`
- order service: `http://localhost:8087`
- notification service: `http://localhost:8088`

## Notes

- The script is designed to be rerun. It reuses existing records where possible instead of blindly duplicating everything.
- Some notifications are created by advancing seeded orders through status changes and by closing orders that update inventory.
- If you want a different host or port layout, put overrides in `test-data/seed.env`.
