#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "${SCRIPT_DIR}/seed.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "${SCRIPT_DIR}/seed.env"
  set +a
fi

COMPANY_URL="${COMPANY_URL:-http://localhost:8082/companies}"
FLEET_BASE_URL="${FLEET_BASE_URL:-http://localhost:8083}"
WAREHOUSE_URL="${WAREHOUSE_URL:-http://localhost:8084/warehouses}"
PRODUCT_BASE_URL="${PRODUCT_BASE_URL:-http://localhost:8085}"
INVENTORY_URL="${INVENTORY_URL:-http://localhost:8086/inventory}"
ORDER_URL="${ORDER_URL:-http://localhost:8087/orders}"
NOTIFICATION_URL="${NOTIFICATION_URL:-http://localhost:8088/notifications}"

CATEGORY_URL="${PRODUCT_BASE_URL}/categories"
PRODUCT_URL="${PRODUCT_BASE_URL}/products"
VEHICLE_URL="${FLEET_BASE_URL}/vehicles"
DRIVER_URL="${FLEET_BASE_URL}/drivers"

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

get_json() {
  local url="$1"
  curl -fsS "$url"
}

post_json() {
  local url="$1"
  local body="$2"
  curl -fsS \
    -H 'Content-Type: application/json' \
    -d "$body" \
    "$url"
}

put_json() {
  local url="$1"
  local body="$2"
  curl -fsS \
    -X PUT \
    -H 'Content-Type: application/json' \
    -d "$body" \
    "$url"
}

first_or_empty() {
  local value="$1"
  if [[ "$value" == "null" ]]; then
    printf ''
  else
    printf '%s' "$value"
  fi
}

ensure_service_reachable() {
  local name="$1"
  local url="$2"
  curl -fsS "$url" >/dev/null
  printf 'OK   %s -> %s\n' "$name" "$url"
}

find_company_id() {
  local name="$1"
  get_json "$COMPANY_URL" | jq -r --arg name "$name" '.[] | select(.name == $name) | .id' | head -n1
}

ensure_company() {
  local name="$1"
  local email="$2"
  local phone="$3"
  local contact="$4"

  local id
  id="$(find_company_id "$name")"
  if [[ -n "$id" ]]; then
    printf '%s' "$id"
    return
  fi

  post_json "$COMPANY_URL" "$(jq -nc \
    --arg name "$name" \
    --arg email "$email" \
    --arg phone "$phone" \
    --arg contact "$contact" \
    '{name: $name, email: $email, phone: $phone, contact: $contact}')" \
    | jq -r '.id'
}

find_warehouse_id() {
  local name="$1"
  get_json "$WAREHOUSE_URL" | jq -r --arg name "$name" '.[] | select(.name == $name) | .id' | head -n1
}

ensure_warehouse() {
  local name="$1"
  local country="$2"
  local city="$3"
  local total_capacity="$4"

  local id
  id="$(find_warehouse_id "$name")"
  if [[ -n "$id" ]]; then
    printf '%s' "$id"
    return
  fi

  post_json "$WAREHOUSE_URL" "$(jq -nc \
    --arg name "$name" \
    --arg country "$country" \
    --arg city "$city" \
    --argjson totalCapacity "$total_capacity" \
    '{name: $name, country: $country, city: $city, totalCapacity: $totalCapacity}')" \
    | jq -r '.id'
}

find_category_id() {
  local name="$1"
  get_json "$CATEGORY_URL" | jq -r --arg name "$name" '.[] | select(.name == $name) | .id' | head -n1
}

ensure_category() {
  local name="$1"
  local description="$2"

  local id
  id="$(find_category_id "$name")"
  if [[ -n "$id" ]]; then
    printf '%s' "$id"
    return
  fi

  post_json "$CATEGORY_URL" "$(jq -nc \
    --arg name "$name" \
    --arg description "$description" \
    '{name: $name, description: $description}')" >/dev/null

  find_category_id "$name"
}

find_product_id() {
  local sku="$1"
  get_json "$PRODUCT_URL" | jq -r --arg sku "$sku" '.[] | select(.sku == $sku) | .id' | head -n1
}

ensure_product() {
  local name="$1"
  local sku="$2"
  local description="$3"
  local weight="$4"
  local category_id="$5"

  local id
  id="$(find_product_id "$sku")"
  if [[ -n "$id" ]]; then
    printf '%s' "$id"
    return
  fi

  post_json "$PRODUCT_URL" "$(jq -nc \
    --arg name "$name" \
    --arg sku "$sku" \
    --arg description "$description" \
    --argjson weight "$weight" \
    --arg categoryId "$category_id" \
    '{name: $name, sku: $sku, description: $description, weight: $weight, categoryId: $categoryId}')" >/dev/null

  find_product_id "$sku"
}

find_vehicle_id() {
  local plate="$1"
  get_json "$VEHICLE_URL" | jq -r --arg plate "$plate" '.[] | select(.registrationPlate == $plate) | .id' | head -n1
}

ensure_vehicle() {
  local registration_plate="$1"

  local id
  id="$(find_vehicle_id "$registration_plate")"
  if [[ -n "$id" ]]; then
    printf '%s' "$id"
    return
  fi

  post_json "$VEHICLE_URL" "$(jq -nc \
    --arg registrationPlate "$registration_plate" \
    '{registrationPlate: $registrationPlate}')" \
    | jq -r '.id'
}

find_driver_id() {
  local email="$1"
  get_json "$DRIVER_URL" | jq -r --arg email "$email" '.[] | select(.email == $email) | .id' | head -n1
}

ensure_driver() {
  local name="$1"
  local phone="$2"
  local email="$3"
  local vehicle_id="$4"
  local company_id="$5"

  local id
  id="$(find_driver_id "$email")"
  if [[ -n "$id" ]]; then
    printf '%s' "$id"
    return
  fi

  post_json "$DRIVER_URL" "$(jq -nc \
    --arg name "$name" \
    --arg phone "$phone" \
    --arg email "$email" \
    --arg vehicleId "$vehicle_id" \
    --arg companyId "$company_id" \
    '{name: $name, phone: $phone, email: $email, vehicleId: $vehicleId, companyId: $companyId}')" \
    | jq -r '.id'
}

inventory_entry_exists() {
  local warehouse_id="$1"
  local product_id="$2"
  local existing
  existing="$(get_json "${INVENTORY_URL}/${warehouse_id}" | jq -r --arg productId "$product_id" '.[] | select(.productId == $productId) | .id' | head -n1)"
  [[ -n "$existing" ]]
}

ensure_inventory() {
  local warehouse_id="$1"
  local product_id="$2"
  local quantity="$3"

  if inventory_entry_exists "$warehouse_id" "$product_id"; then
    return
  fi

  post_json "$INVENTORY_URL" "$(jq -nc \
    --arg warehouseId "$warehouse_id" \
    --arg productId "$product_id" \
    --argjson quantity "$quantity" \
    '{warehouseId: $warehouseId, productId: $productId, quantity: $quantity}')" >/dev/null
}

find_order_id() {
  local product_id="$1"
  local company_id="$2"
  local warehouse_id="$3"
  local driver_id="$4"
  local quantity="$5"
  local delivery_prefix="$6"

  get_json "$ORDER_URL" | jq -r \
    --arg productId "$product_id" \
    --arg companyId "$company_id" \
    --arg warehouseId "$warehouse_id" \
    --arg driverId "$driver_id" \
    --arg quantity "$quantity" \
    --arg deliveryPrefix "$delivery_prefix" \
    '.[] |
      select(.productId == $productId) |
      select(.companyId == $companyId) |
      select(.warehouseId == $warehouseId) |
      select(.driverId == $driverId) |
      select((.quantity | tostring) == $quantity) |
      select((.deliveryDate // "") | startswith($deliveryPrefix)) |
      .id' | head -n1
}

ensure_order() {
  local product_id="$1"
  local company_id="$2"
  local warehouse_id="$3"
  local driver_id="$4"
  local quantity="$5"
  local delivery_date="$6"

  local delivery_prefix
  local id

  delivery_prefix="${delivery_date:0:19}"
  id="$(find_order_id "$product_id" "$company_id" "$warehouse_id" "$driver_id" "$quantity" "$delivery_prefix")"
  if [[ -n "$id" ]]; then
    printf '%s' "$id"
    return
  fi

  post_json "$ORDER_URL" "$(jq -nc \
    --arg productId "$product_id" \
    --arg companyId "$company_id" \
    --arg warehouseId "$warehouse_id" \
    --arg driverId "$driver_id" \
    --argjson quantity "$quantity" \
    --arg deliveryDate "$delivery_date" \
    '{productId: $productId, companyId: $companyId, warehouseId: $warehouseId, driverId: $driverId, quantity: $quantity, deliveryDate: $deliveryDate}')" \
    | jq -r '.id'
}

get_order_status() {
  local order_id="$1"
  get_json "$ORDER_URL" | jq -r --arg orderId "$order_id" '.[] | select(.id == $orderId) | .status' | head -n1
}

ensure_order_status() {
  local order_id="$1"
  local target_status="$2"

  local current_status
  local next_status

  current_status="$(first_or_empty "$(get_order_status "$order_id")")"
  if [[ -z "$current_status" ]]; then
    echo "Unable to find order status for $order_id" >&2
    exit 1
  fi

  while (( current_status < target_status )); do
    next_status=$((current_status + 1))
    put_json "${ORDER_URL}/status" "$(jq -nc \
      --arg orderId "$order_id" \
      --argjson status "$next_status" \
      '{orderId: $orderId, status: $status}')" >/dev/null

    current_status="$(get_order_status "$order_id")"
  done
}

print_section() {
  printf '\n== %s ==\n' "$1"
}

require_command curl
require_command jq

print_section "Checking Services"
ensure_service_reachable "company-service" "$COMPANY_URL"
ensure_service_reachable "fleet-service /vehicles" "$VEHICLE_URL"
ensure_service_reachable "warehouse-service" "$WAREHOUSE_URL"
ensure_service_reachable "product-service /categories" "$CATEGORY_URL"
ensure_service_reachable "inventory-service" "$INVENTORY_URL"
ensure_service_reachable "order-service" "$ORDER_URL"
ensure_service_reachable "notification-service" "$NOTIFICATION_URL"

print_section "Seeding Companies"
company_northwind="$(ensure_company "Northwind Retail" "ops@northwind.local" "+38670111001" "Nina Petrova")"
company_alpine="$(ensure_company "Alpine Market" "hello@alpinemarket.local" "+38670111002" "Luka Videnov")"
company_balkan="$(ensure_company "Balkan Foods" "supply@balkanfoods.local" "+38970111003" "Elena Trajkovska")"
printf 'Northwind Retail -> %s\n' "$company_northwind"
printf 'Alpine Market   -> %s\n' "$company_alpine"
printf 'Balkan Foods    -> %s\n' "$company_balkan"

print_section "Seeding Warehouses"
warehouse_lj="$(ensure_warehouse "Ljubljana Central Hub" "SLOVENIA" "LJUBLJANA" 600)"
warehouse_mb="$(ensure_warehouse "Maribor Overflow Depot" "SLOVENIA" "MARIBOR" 900)"
warehouse_sk="$(ensure_warehouse "Skopje South Hub" "MACEDONIA" "SKOPJE" 450)"
printf 'Ljubljana Central Hub -> %s\n' "$warehouse_lj"
printf 'Maribor Overflow Depot -> %s\n' "$warehouse_mb"
printf 'Skopje South Hub -> %s\n' "$warehouse_sk"

print_section "Seeding Categories"
category_electronics="$(ensure_category "Electronics" "Scanning, printing, and warehouse hardware.")"
category_food="$(ensure_category "Food & Beverage" "Fast-moving packaged food and drinks.")"
category_packaging="$(ensure_category "Packaging" "Boxes, film, and outbound packing materials.")"
printf 'Electronics -> %s\n' "$category_electronics"
printf 'Food & Beverage -> %s\n' "$category_food"
printf 'Packaging -> %s\n' "$category_packaging"

print_section "Seeding Products"
product_scanner="$(ensure_product "Industrial Scanner" "SCN-1001" "Handheld warehouse scanner with extended battery life." 1.4 "$category_electronics")"
product_printer="$(ensure_product "Barcode Printer" "PRT-1001" "Thermal label printer for warehouse workstations." 4.8 "$category_electronics")"
product_water="$(ensure_product "Sparkling Water 500ml" "WTR-5001" "Retail-ready sparkling water bottle." 0.5 "$category_food")"
product_oil="$(ensure_product "Olive Oil 1L" "OIL-1001" "Cold-pressed olive oil bottle." 1.0 "$category_food")"
product_film="$(ensure_product "Stretch Film Roll" "PKG-2001" "Clear pallet wrap for shipment preparation." 2.3 "$category_packaging")"
product_box="$(ensure_product "Carton Box XL" "BOX-XL-01" "Large shipping carton for bulk orders." 0.7 "$category_packaging")"
printf 'Industrial Scanner -> %s\n' "$product_scanner"
printf 'Barcode Printer -> %s\n' "$product_printer"
printf 'Sparkling Water 500ml -> %s\n' "$product_water"
printf 'Olive Oil 1L -> %s\n' "$product_oil"
printf 'Stretch Film Roll -> %s\n' "$product_film"
printf 'Carton Box XL -> %s\n' "$product_box"

print_section "Seeding Vehicles"
vehicle_lj="$(ensure_vehicle "LJ-LOG-101")"
vehicle_mb="$(ensure_vehicle "MB-FLT-204")"
vehicle_sk="$(ensure_vehicle "SK-TRK-301")"
printf 'LJ-LOG-101 -> %s\n' "$vehicle_lj"
printf 'MB-FLT-204 -> %s\n' "$vehicle_mb"
printf 'SK-TRK-301 -> %s\n' "$vehicle_sk"

print_section "Seeding Drivers"
driver_tina="$(ensure_driver "Tina Novak" "+38670999001" "tina.novak@fleet.local" "$vehicle_lj" "$company_northwind")"
driver_luka="$(ensure_driver "Luka Horvat" "+38670999002" "luka.horvat@fleet.local" "$vehicle_mb" "$company_alpine")"
driver_stefan="$(ensure_driver "Stefan Petrov" "+38970999003" "stefan.petrov@fleet.local" "$vehicle_sk" "$company_balkan")"
printf 'Tina Novak -> %s\n' "$driver_tina"
printf 'Luka Horvat -> %s\n' "$driver_luka"
printf 'Stefan Petrov -> %s\n' "$driver_stefan"

print_section "Seeding Direct Inventory"
ensure_inventory "$warehouse_mb" "$product_scanner" 45
ensure_inventory "$warehouse_sk" "$product_printer" 30
printf 'Direct inventory created or already present.\n'

print_section "Seeding Orders"
order_1="$(ensure_order "$product_water" "$company_northwind" "$warehouse_lj" "$driver_tina" 250 "2026-04-10T09:00:00Z")"
order_2="$(ensure_order "$product_film" "$company_alpine" "$warehouse_lj" "$driver_luka" 350 "2026-04-12T11:30:00Z")"
order_3="$(ensure_order "$product_oil" "$company_balkan" "$warehouse_sk" "$driver_stefan" 200 "2026-04-14T08:15:00Z")"
order_4="$(ensure_order "$product_box" "$company_balkan" "$warehouse_mb" "$driver_stefan" 150 "2026-04-16T10:45:00Z")"
order_5="$(ensure_order "$product_scanner" "$company_northwind" "$warehouse_mb" "$driver_tina" 80 "2026-04-18T07:30:00Z")"
order_6="$(ensure_order "$product_printer" "$company_alpine" "$warehouse_mb" "$driver_luka" 60 "2026-04-20T13:00:00Z")"
printf 'Order 1 -> %s\n' "$order_1"
printf 'Order 2 -> %s\n' "$order_2"
printf 'Order 3 -> %s\n' "$order_3"
printf 'Order 4 -> %s\n' "$order_4"
printf 'Order 5 -> %s\n' "$order_5"
printf 'Order 6 -> %s\n' "$order_6"

print_section "Advancing Order Statuses"
ensure_order_status "$order_1" 3
ensure_order_status "$order_2" 3
ensure_order_status "$order_3" 3
ensure_order_status "$order_4" 2
ensure_order_status "$order_5" 1
ensure_order_status "$order_6" 0
printf 'Order statuses synchronized.\n'

print_section "Summary"
printf 'Companies:   %s\n' "$(get_json "$COMPANY_URL" | jq 'length')"
printf 'Warehouses:  %s\n' "$(get_json "$WAREHOUSE_URL" | jq 'length')"
printf 'Categories:  %s\n' "$(get_json "$CATEGORY_URL" | jq 'length')"
printf 'Products:    %s\n' "$(get_json "$PRODUCT_URL" | jq 'length')"
printf 'Vehicles:    %s\n' "$(get_json "$VEHICLE_URL" | jq 'length')"
printf 'Drivers:     %s\n' "$(get_json "$DRIVER_URL" | jq 'length')"
printf 'Inventory:   %s\n' "$(get_json "$INVENTORY_URL" | jq 'length')"
printf 'Orders:      %s\n' "$(get_json "$ORDER_URL" | jq 'length')"
printf 'Notifications: %s\n' "$(get_json "$NOTIFICATION_URL" | jq 'length')"

printf '\nSeed complete. Users were not modified.\n'
