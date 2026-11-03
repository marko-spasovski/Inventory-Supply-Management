# Product

## What it is
An inventory and supply ERP for one organisation that runs warehouses and its own delivery fleet.
It replaces spreadsheets and phone calls for three questions: *what do we have, where is it, and what
is on its way.*

## Who uses it

| Person | Main job in the app | Client |
|---|---|---|
| Manager | keeps master data (companies, warehouses, products, fleet), creates and approves supply orders, watches stock levels | web, mobile |
| Warehouse worker | receives deliveries (closes orders with the delivery note), consumes stock for internal use, adjusts thresholds | web, mobile (scanner) |
| Driver | sees assigned deliveries, marks them delivered, uploads the signed delivery note | mobile |
| Admin | everything a manager does, plus users and roles | web |

## Core journey: a supply order

1. A manager creates an order: which **product**, from which **supplier company**, into which
   **warehouse**, carried by which **driver**, how many units, by when.
2. The manager **approves** it (the system checks that the warehouse has room) or rejects it.
3. The driver collects the goods and marks the order **delivered**.
4. A warehouse worker checks the goods and uploads the signed delivery note. Closing the order
   is the **goods receipt**: stock increases and warehouse capacity updates.
5. Everyone involved gets a **notification** at each step. Low stock and nearly full warehouses
   raise notifications too.

## Other features
- **Stock**: per product and warehouse, with min/max thresholds and low/out-of-stock warnings.
- **Consumption**: issue stock for internal use, with an optional PDF record.
- **Analytics**: inventory summary and reorder suggestions, optionally explained in plain language
  by Azure OpenAI (ADMIN, MANAGER).
- **Mobile**: barcode/QR scanner for SKU lookup, push notifications, offline read cache.
- **Languages**: Slovenian (default) and English.

## Out of scope (see BACKLOG.md)
Multi-tenancy, offline writes, weight/volume capacity, invoicing and payments, customer orders.
