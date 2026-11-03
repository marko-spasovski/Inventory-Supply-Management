#!/usr/bin/env bash
# Seed script: companies, warehouses, vehicles, drivers, categories, products
# Calls the web-gateway at localhost:8080 (same routing the shell uses)

set -e
BASE="http://localhost:8080"
COOKIE_JAR=$(mktemp)

echo "==> Logging in..."
LOGIN=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}')
echo "    $LOGIN"

post() {
  local path=$1
  local body=$2
  curl -s -b "$COOKIE_JAR" -X POST "$BASE$path" \
    -H "Content-Type: application/json" \
    -d "$body"
}

# ── Companies ────────────────────────────────────────────────
echo ""
echo "==> Creating companies..."

COMP1=$(post /companies '{"name":"Alpha Logistics","email":"info@alpha.com","phone":"+38971111111","contact":"Ana Petrova"}')
COMP1_ID=$(echo "$COMP1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "    [1] Alpha Logistics → $COMP1_ID"

COMP2=$(post /companies '{"name":"Beta Transport","email":"info@beta.com","phone":"+38971222222","contact":"Bojan Iliev"}')
COMP2_ID=$(echo "$COMP2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "    [2] Beta Transport  → $COMP2_ID"

COMP3=$(post /companies '{"name":"Gamma Freight","email":"info@gamma.com","phone":"+38971333333","contact":"Goran Stojan"}')
COMP3_ID=$(echo "$COMP3" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "    [3] Gamma Freight   → $COMP3_ID"

# ── Warehouses ───────────────────────────────────────────────
echo ""
echo "==> Creating warehouses..."

post /warehouses '{"name":"Skopje Central","country":"MACEDONIA","city":"SKOPJE","totalCapacity":5000}' > /dev/null
echo "    [1] Skopje Central"

post /warehouses '{"name":"Kumanovo North","country":"MACEDONIA","city":"KUMANOVO","totalCapacity":3000}' > /dev/null
echo "    [2] Kumanovo North"

post /warehouses '{"name":"Ljubljana Hub","country":"SLOVENIA","city":"LJUBLJANA","totalCapacity":8000}' > /dev/null
echo "    [3] Ljubljana Hub"

post /warehouses '{"name":"Maribor East","country":"SLOVENIA","city":"MARIBOR","totalCapacity":4000}' > /dev/null
echo "    [4] Maribor East"

# ── Vehicles ─────────────────────────────────────────────────
echo ""
echo "==> Creating vehicles..."

VEH1=$(post /vehicles '{"registrationPlate":"SK-1234-AB"}')
VEH1_ID=$(echo "$VEH1" | grep -o '"[Ii]d":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "    [1] SK-1234-AB → $VEH1_ID"

VEH2=$(post /vehicles '{"registrationPlate":"SK-5678-CD"}')
VEH2_ID=$(echo "$VEH2" | grep -o '"[Ii]d":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "    [2] SK-5678-CD → $VEH2_ID"

VEH3=$(post /vehicles '{"registrationPlate":"LJ-9999-EF"}')
VEH3_ID=$(echo "$VEH3" | grep -o '"[Ii]d":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "    [3] LJ-9999-EF → $VEH3_ID"

VEH4=$(post /vehicles '{"registrationPlate":"MB-4321-GH"}')
VEH4_ID=$(echo "$VEH4" | grep -o '"[Ii]d":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "    [4] MB-4321-GH → $VEH4_ID"

# ── Drivers (need vehicleId + companyId) ─────────────────────
echo ""
echo "==> Creating drivers..."

post /drivers "{\"name\":\"Marko Jovanovic\",\"phone\":\"+38970100001\",\"email\":\"marko.j@alpha.com\",\"vehicleId\":\"$VEH1_ID\",\"companyId\":\"$COMP1_ID\"}" > /dev/null
echo "    [1] Marko Jovanovic (Alpha, $VEH1_ID)"

post /drivers "{\"name\":\"Stefan Dimov\",\"phone\":\"+38970100002\",\"email\":\"stefan.d@alpha.com\",\"vehicleId\":\"$VEH2_ID\",\"companyId\":\"$COMP1_ID\"}" > /dev/null
echo "    [2] Stefan Dimov (Alpha, $VEH2_ID)"

post /drivers "{\"name\":\"Nikola Petreski\",\"phone\":\"+38970100003\",\"email\":\"nikola.p@beta.com\",\"vehicleId\":\"$VEH3_ID\",\"companyId\":\"$COMP2_ID\"}" > /dev/null
echo "    [3] Nikola Petreski (Beta, $VEH3_ID)"

post /drivers "{\"name\":\"Luka Novak\",\"phone\":\"+38640100004\",\"email\":\"luka.n@gamma.com\",\"vehicleId\":\"$VEH4_ID\",\"companyId\":\"$COMP3_ID\"}" > /dev/null
echo "    [4] Luka Novak (Gamma, $VEH4_ID)"

# ── Categories ───────────────────────────────────────────────
echo ""
echo "==> Creating categories..."

post /categories '{"name":"Electronics","description":"Electronic components and devices"}' > /dev/null
echo "    [1] Electronics"
post /categories '{"name":"Furniture","description":"Office and warehouse furniture"}' > /dev/null
echo "    [2] Furniture"
post /categories '{"name":"Automotive Parts","description":"Vehicle spare parts and accessories"}' > /dev/null
echo "    [3] Automotive Parts"
post /categories '{"name":"Packaging","description":"Boxes, pallets and packaging materials"}' > /dev/null
echo "    [4] Packaging"

# Fetch IDs since the create endpoint returns no body
CATS=$(curl -s -b "$COOKIE_JAR" "$BASE/categories")
get_cat_id() { echo "$CATS" | grep -o "\"id\":\"[^\"]*\",\"name\":\"$1\"" | cut -d'"' -f4; }
CAT1_ID=$(get_cat_id "Electronics")
CAT2_ID=$(get_cat_id "Furniture")
CAT3_ID=$(get_cat_id "Automotive Parts")
CAT4_ID=$(get_cat_id "Packaging")

# ── Products (need categoryId) ────────────────────────────────
echo ""
echo "==> Creating products..."

post /products "{\"name\":\"Laptop Dell XPS 15\",\"sku\":\"ELEC-001\",\"description\":\"15-inch business laptop\",\"weight\":1.8,\"categoryId\":\"$CAT1_ID\"}" > /dev/null
echo "    [1] Laptop Dell XPS 15"
post /products "{\"name\":\"Monitor 27 4K\",\"sku\":\"ELEC-002\",\"description\":\"4K UHD display monitor\",\"weight\":4.5,\"categoryId\":\"$CAT1_ID\"}" > /dev/null
echo "    [2] Monitor 27 4K"
post /products "{\"name\":\"USB-C Hub 7-in-1\",\"sku\":\"ELEC-003\",\"description\":\"Multi-port USB-C hub\",\"weight\":0.2,\"categoryId\":\"$CAT1_ID\"}" > /dev/null
echo "    [3] USB-C Hub"
post /products "{\"name\":\"Office Desk 160cm\",\"sku\":\"FURN-001\",\"description\":\"Adjustable standing desk\",\"weight\":35.0,\"categoryId\":\"$CAT2_ID\"}" > /dev/null
echo "    [4] Office Desk"
post /products "{\"name\":\"Ergonomic Chair\",\"sku\":\"FURN-002\",\"description\":\"Lumbar support office chair\",\"weight\":12.0,\"categoryId\":\"$CAT2_ID\"}" > /dev/null
echo "    [5] Ergonomic Chair"
post /products "{\"name\":\"Brake Pad Set\",\"sku\":\"AUTO-001\",\"description\":\"Front brake pads universal fit\",\"weight\":1.2,\"categoryId\":\"$CAT3_ID\"}" > /dev/null
echo "    [6] Brake Pad Set"
post /products "{\"name\":\"Engine Oil Filter\",\"sku\":\"AUTO-002\",\"description\":\"Standard oil filter\",\"weight\":0.3,\"categoryId\":\"$CAT3_ID\"}" > /dev/null
echo "    [7] Engine Oil Filter"
post /products "{\"name\":\"Cardboard Box Large\",\"sku\":\"PACK-001\",\"description\":\"60x40x40cm shipping box\",\"weight\":0.5,\"categoryId\":\"$CAT4_ID\"}" > /dev/null
echo "    [8] Cardboard Box Large"
post /products "{\"name\":\"Pallet 120x80cm\",\"sku\":\"PACK-002\",\"description\":\"Standard Euro pallet\",\"weight\":22.0,\"categoryId\":\"$CAT4_ID\"}" > /dev/null
echo "    [9] Pallet"

rm -f "$COOKIE_JAR"
echo ""
echo "Done! Seeded: 3 companies, 4 warehouses, 4 vehicles, 4 drivers, 4 categories, 9 products."
