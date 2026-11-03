# Kubernetes

Kustomize manifests for the whole system (ADR 010): PostgreSQL and Kafka (KRaft) as StatefulSets,
all 11 services and the web image as Deployments, probes on `/livez` and `/readyz`, non-root containers
with dropped capabilities, resource limits, persistent volumes for data and documents, and
NetworkPolicies that only let the ingress controller reach the edge (web and the two gateways).

```text
base/                 everything, image names novo-<service>:latest
overlays/local/       kind (or any local cluster): local-only secrets
overlays/vps/         k3s on a VPS: GHCR images, Traefik ingress + Let's Encrypt, secrets from secrets.env
```

## Local cluster (kind)

```bash
docker compose build                       # builds the novo-<service>:latest images
kind create cluster --name novo
for s in auth-service company-service warehouse-service inventory-service fleet-service product-service \
         order-service notification-service ai-service web-gateway mobile-gateway web; do
  kind load docker-image --name novo "novo-$s:latest"
done
kubectl apply -k deploy/k8s/overlays/local
kubectl -n novo wait --for=condition=available deployment --all --timeout=15m
kubectl -n novo port-forward svc/web 3000:8080 &            # http://localhost:3000
kubectl -n novo port-forward svc/mobile-gateway 8090:8090 & # mobile API
```

Log in as `admin@novo.local` / `admin-local-only` (local overlay only).

## VPS (k3s)

See [docs/operations/vps.md](../../docs/operations/vps.md).

## Regenerating

The service manifests share one shape. When adding a service, copy an existing file of the same stack
and keep the probes, `securityContext` and resource limits.
