# ADR 009: Documents on a persistent volume, with metadata and authenticated download

- Status: Accepted
- Date: 2026-11-03

## Context
Delivery notes and consumption records were written to the container filesystem (`/tmp` in
OpenShift), so they were lost on restart. "PDF" was checked by file name or a client-supplied MIME
type. Responses exposed filesystem paths, and there was no download endpoint (R16).

## Decision
- order-service and inventory-service store documents on their own persistent volume, under
  `<resource-id>/<document-id>.pdf`.
- A `documents` table holds id, owner resource, uploader, size, sha256, content type and time.
- Uploads must be real PDFs (`%PDF-` magic bytes), at most 10 MB, streamed to disk.
- `GET /orders/{id}/documents/{docId}` (and the inventory equivalent) streams the file to callers
  who may read the owning resource.
- Responses return document ids, never paths.

## Alternatives considered
- **S3-compatible object storage (MinIO).** Better for many replicas, but another component and
  about 300 MB RAM on the VPS. Revisit if order-service needs more than one replica (BACKLOG).

## Consequences
- With a ReadWriteOnce volume, order-service and inventory-service run one replica each. That is
  acceptable on a single node.
- Backups include the document volumes.
