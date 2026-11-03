# Hosting on a VPS (k3s)

One VPS running k3s (single-node Kubernetes). It uses the same manifests as the local cluster, with
the `vps` overlay (ADR 010). Measured footprint: about 2.3 GB RAM for the whole stack, plus about 0.7 GB
for k3s, Traefik and cert-manager, so a **4 vCPU / 8 GB / 80 GB SSD** VPS leaves plenty of room.

```text
Internet ─443─▶ Traefik (k3s) ─┬─ app.<domain> ─▶ web (shell + 7 remotes) ─▶ /api web-gateway, /ws notifications
                               └─ api.<domain> ─▶ mobile-gateway (+ /ws)
Nothing else is reachable from outside: PostgreSQL, Kafka and the services are ClusterIP only.
```

## 1. Prepare the server (Ubuntu 24.04)

```bash
adduser deploy && usermod -aG sudo deploy          # then log in as deploy with an SSH key
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
sudo apt-get update && sudo apt-get install -y unattended-upgrades fail2ban
```

## 2. DNS

Create two A records pointing at the VPS: `app.<domain>` and `api.<domain>`.

## 3. Install k3s and cert-manager

```bash
curl -sfL https://get.k3s.io | sh -                                   # includes Traefik and local-path storage
mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown "$USER" ~/.kube/config
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.18.2/cert-manager.yaml
kubectl -n cert-manager wait --for=condition=available deployment --all --timeout=5m
```

## 4. Configure and deploy

```bash
git clone https://github.com/marko-spasovski/Inventory-Supply-Management.git && cd Inventory-Supply-Management
cd deploy/k8s/overlays/vps
cp secrets.env.example secrets.env                  # fill every value: openssl rand -base64 48
sed -i 's/example.com/<your-domain>/g' ingress.yaml
sed -i 's/you@example.com/<your-email>/' cluster-issuer.yaml
kubectl apply -f cluster-issuer.yaml
kubectl apply -k .
kubectl -n novo wait --for=condition=available deployment --all --timeout=15m
```

Images come from GHCR, built by `.github/workflows/release.yml` on every push to `main`. The packages
are private by default: make them public on GitHub (Packages → each image → Settings → Change visibility),
or create an image pull secret.

Open `https://app.<domain>` and log in with the bootstrap admin from `secrets.env`. For the mobile app,
set `EXPO_PUBLIC_API_URL=https://api.<domain>` and `EXPO_PUBLIC_WS_URL=wss://api.<domain>/ws`.

## 5. Update, roll back

```bash
git pull && kubectl apply -k deploy/k8s/overlays/vps                  # new manifests
kubectl -n novo rollout restart deployment                            # pull new :latest images
kubectl -n novo rollout undo deployment/order-service                 # roll one service back
```

For reproducible deploys, pin `newTag` in `overlays/vps/kustomization.yaml` to a commit SHA tag from the
release run.

## 6. Backups

```bash
# Every database, nightly (crontab on the VPS), kept 14 days. Copy the folder off the server too.
kubectl -n novo exec statefulset/postgres -- sh -c 'pg_dumpall -U postgres' | gzip > ~/backups/novo-$(date +%F).sql.gz
find ~/backups -name 'novo-*.sql.gz' -mtime +14 -delete
# Restore into a fresh stack: gunzip -c novo-<date>.sql.gz | kubectl -n novo exec -i statefulset/postgres -- psql -U postgres
```

Documents live in the `order-documents` and `inventory-documents` volumes
(`/var/lib/rancher/k3s/storage/` on the host); include that folder in the off-site copy.

## 7. Monitoring

- `kubectl -n novo get pods` and `kubectl top pods -n novo` (metrics-server ships with k3s).
- An external uptime check on `https://app.<domain>/` and `https://api.<domain>/livez`.
- Prometheus and Grafana are in BACKLOG.md; they fit in the remaining RAM if needed.
