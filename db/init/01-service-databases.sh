#!/bin/sh
# One PostgreSQL server, one database and one login role per service (ADR 002).
# Runs once, on an empty data volume (docker-entrypoint-initdb.d). A service's role owns only its
# own database and cannot connect to any other: data ownership is enforced by the server.
#
# Password for each role: <SERVICE>_DB_PASSWORD if set (e.g. ORDERS_DB_PASSWORD), otherwise
# SERVICE_DB_PASSWORD. Local development only uses the second; Kubernetes sets one per service.
set -eu

for db in users companies fleet warehouses products inventory orders notifications; do
  role="${db}_svc"
  var="$(echo "$db" | tr '[:lower:]' '[:upper:]')_DB_PASSWORD"
  eval "password=\${$var:-\${SERVICE_DB_PASSWORD:?SERVICE_DB_PASSWORD is required}}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
       -v role="$role" -v db="$db" -v pw="$password" <<'SQL'
CREATE ROLE :"role" LOGIN PASSWORD :'pw';
CREATE DATABASE :"db" OWNER :"role";
REVOKE CONNECT ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO :"role";
SQL
  echo "created database $db with owner $role"
done
