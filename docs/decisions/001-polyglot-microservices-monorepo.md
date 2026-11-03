# ADR 001: Polyglot microservices (9 services + 2 gateways) in one monorepo

- Status: Accepted
- Date: 2026-11-03

## Context
The system grew as separate repositories (backend, web frontend, Expo app) built for a university
course whose goal was to practise service design across Java, .NET and Node. The repositories
drifted: CI pointed at folders that no longer existed, the frontend and backend contracts were
copied by hand, and no single checkout could run the whole system.

## Decision
Keep the nine services and two gateways, and keep the three stacks: Spring Boot (auth, company,
warehouse, inventory, web-gateway), ASP.NET Core (fleet, product, order) and Express/TypeScript
(notification, ai, mobile-gateway). Put everything in one repository: backend, frontend, contracts,
deployment, tests and docs. Each service keeps its own build, Dockerfile, tests, README and CI workflow.

## Alternatives considered
- **Modular monolith in one stack.** Far less to run, and enough for the domain. Rejected because
  practising polyglot service design is part of the project's purpose, and the services already exist.
- **Keep separate repositories.** Rejected: contracts and CI drifted precisely because they were separate.

## Consequences
- One PR can change a contract and every producer and consumer together.
- Three toolchains in CI; reusable workflows per stack keep that manageable.
- Higher runtime cost (four JVMs). ADR 002 and ADR 010 reduce the footprint so it fits on one VPS.
