# HRC Job Card Automator — System Documentation

> **Version:** May 2026 (Updated: August 2026)  
> **Stack:** ReactJS (Vite) · Tailwind CSS v4 · Lucide Icons · Node.js · Express · MySQL  
> **Hosted on:** Render (production) · can run locally via `npm start`

---

## Table of Contents

1. [What is the HRC Automator?](#1-what-is-the-hrc-automator)
2. [How the System is Structured](#2-how-the-system-is-structured)
3. [The Database — What Gets Stored](#3-the-database--what-gets-stored)
4. [Feature Reference](#4-feature-reference)
   - 4.1 [Login & Session Security](#41-login--session-security)
   - 4.2 [Dashboard — Customer Overview](#42-dashboard--customer-overview)
   - 4.3 [Add Customer / Vehicle Record](#43-add-customer--vehicle-record)
   - 4.4 [Edit Customer / Vehicle Record](#44-edit-customer--vehicle-record)
   - 4.5 [Create Job Card](#45-create-job-card)
   - 4.6 [Overwrite & Reprint a Job Card](#46-overwrite--reprint-a-job-card)
   - 4.7 [Delete Last Job Card (Dashboard)](#47-delete-last-job-card-dashboard)
   - 4.8 [Invoices Engine — Tabbed History View](#48-invoices-engine--tabbed-history-view)
   - 4.9 [Generate Invoice](#49-generate-invoice)
   - 4.10 [Overwrite Invoice](#410-overwrite-invoice)
   - 4.11 [Delete Last Job Card / Invoice (Engine)](#411-delete-last-job-card--invoice-engine)
   - 4.12 [PDF Generation — Job Cards](#412-pdf-generation--job-cards)
   - 4.13 [PDF Generation — Invoices](#413-pdf-generation--invoices)
   - 4.14 [Logout](#414-logout)
   - 4.15 [Loyalty Cards Tracking](#415-loyalty-cards-tracking)
   - 4.16 [Inventory Tracking](#416-inventory-tracking)
5. [API Reference](#5-api-reference)
6. [Known Coordinates & PDF Mapping](#6-known-coordinates--pdf-mapping)
7. [Deployment & Environment Variables](#7-deployment--environment-variables)

---

## 1. What is the HRC Automator?

The **HRC Job Card Automator** is a private, login-protected web application built for internal use at HRC. It is designed to digitally replace the manual, paper-based process of creating and tracking automotive service job cards and invoices.

The system allows staff to:
- Maintain a **client and vehicle database** without needing to create a job first
- Generate **numbered Job Cards** with all relevant customer and vehicle data, printed directly onto a pre-designed PDF template
- **Invoice** specific job cards with a dynamic line-item table, real-time totals, optional 5% VAT, and persistent storage
- **Review** the full history of job cards, invoices, and accounting totals
- **Track** loyalty visits (Oil Cards) separately per vehicle
- **Log and Track** shop inventory records historically over time
- **Correct** any record by overwriting and reprinting it

---

## 2. How the System is Structured

The application is structured as a monorepo containing a frontend React workspace and an Express API:

### Frontend (Client Workspace)
Located in the [frontend/](file:///d:/HRC-Automator/frontend) directory. It uses:
- **ReactJS** for modular, reactive state management and component breakdown
- **Vite** for lightning-fast bundling, hot-module replacement, and developer server proxying
- **Tailwind CSS v4** for clean utility classes and custom layout styling
- **Lucide Icons** (`lucide-react`) for premium vector system icons
- **pdf-lib** for drawing data values directly onto static PDF templates inside the browser (avoiding expensive server round-trips)
- **Custom React Hooks:** A specialized `useTableFilters` engine manages Excel-style column sorting, checking, and exclusion across all major tables.

When built via `npm run build`, the React bundle compiles directly into the root [public/](file:///d:/HRC-Automator/public) folder.

### Backend (Express API)
Located in the [api/](file:///d:/HRC-Automator/api) directory. It handles:
- **Authentication** (login / logout with session management)
- **All database queries** (customers, vehicles, job cards, invoices, invoice line items, inventory)
- **Serving the static files** (serving the compiled React build from the root `public/` directory)

### Database
A **MySQL** database (`hrc_automator`) stores all permanent records. It is hosted on a managed database provider.

---

## 3. The Database — What Gets Stored

The system uses six primary tables:

### `users`
Stores login credentials. Passwords are encrypted as **bcrypt hashes**.

| Column | Type | Description |
|---|---|---|
| `user_id` | INT (PK) | Auto-incrementing ID |
| `username` | VARCHAR | Login username |
| `password_hash` | VARCHAR | Hashed password |

---

### `clients`
Stores one record per unique customer, identified by phone number.

| Column | Type | Description |
|---|---|---|
| `customer_id` | INT (PK) | Auto-incrementing ID |
| `full_name` | VARCHAR | Customer's full name |
| `phone_no` | VARCHAR | Phone number (used as unique identifier in UI lookups) |

---

### `vehicles`
Stores one record per unique vehicle, linked to a client.

| Column | Type | Description |
|---|---|---|
| `vin_no` | VARCHAR (PK) | Vehicle Identification Number — the unique key |
| `make` | VARCHAR | e.g. Nissan |
| `model` | VARCHAR | e.g. Patrol |
| `year` | INT | e.g. 2022 |
| `color` | VARCHAR | Vehicle colour |
| `reg_no` | VARCHAR | Plate number |
| `customer_id` | INT (FK) | Links to `clients` |
| `oil_card_no` | VARCHAR | Loyalty card reference (assigned per vehicle) |
| `loyalty_visits` | INT | Count of loyalty card redemptions |

---

### `job_cards`
Each row is one service visit. Numbering starts at **1091** and increments automatically.

| Column | Type | Description |
|---|---|---|
| `job_no` | INT (PK, AUTO_INCREMENT) | The job card number — actively corrected after deletions |
| `date_in` | DATE | Date the vehicle was brought in |
| `mileage` | INT | Mileage recorded at check-in |
| `vin_no` | VARCHAR (FK) | Links to `vehicles` |
| `customer_id` | INT (FK) | Links to `clients` |

---

### `invoices`
Each row is one invoice, linked to a job card.

| Column | Type | Description |
|---|---|---|
| `invoice_no` | INT (PK, AUTO_INCREMENT) | Invoice number — starts at 3001 |
| `job_no` | INT (FK) | The job card this invoice is for |
| `invoice_date` | DATE | Date the invoice was issued |
| `subtotal` | DECIMAL | Sum of all line items before VAT |
| `vat_applied` | BOOLEAN | Whether 5% VAT was applied |
| `grand_total` | DECIMAL | Final total after VAT |

---

### `invoice_items`
Line items belonging to an invoice. Deleted automatically when their parent invoice is deleted (cascade).

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Auto-incrementing ID |
| `invoice_no` | INT (FK) | Links to `invoices` — cascades on delete |
| `order_no` | INT | Row number (1, 2, 3 ...) |
| `description` | VARCHAR | Service description text |
| `quantity` | INT | Number of units |
| `unit_price` | DECIMAL | Price per unit in AED |
| `discount` | DECIMAL | Discount percentage (0 if none) |
| `total` | DECIMAL | Calculated: `qty × price × (1 - disc%)` |

---

### `inventory_logs`
Historical snapshots of shop supplies and parts, logged by date.

| Column | Type | Description |
|---|---|---|
| `log_date` | DATE (PK) | The date this snapshot was taken |
| `diesel_qty` | INT | Diesel amount in gallons |
| `atf_qty` | INT | ATF amount in gallons |
| `engine_oil_*` | INT | Quantities of various engine oils |
| `coolant_*` | INT | Quantities of coolant (gallons) |
| `...parts` | INT | Quantities of brakes, filters, wiper blades, etc. |

---

### `sales`
Historical log of accounting sales records.

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Auto-incrementing ID |
| `date` | DATE | Date of the sale |
| `description` | VARCHAR | Sales description |
| `aed` | DECIMAL | Price per unit |
| `quantity` | INT | Number of units |
| `total` | DECIMAL | Total value (`aed * quantity`) |

---

### `expenses`
Historical log of accounting expense records.

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Auto-incrementing ID |
| `date` | DATE | Date of the expense |
| `category` | VARCHAR | Expense category (e.g. Parts, Utilities) |
| `description` | VARCHAR | Expense description |
| `aed` | DECIMAL | Price per unit |
| `quantity` | INT | Number of units |
| `total` | DECIMAL | Total value (`aed * quantity`) |

---

## 4. Feature Reference

### 4.1 Login & Session Security
- A `POST /api/login` request is sent with user credentials.
- The server queries the `users` table and uses `bcrypt.compare()` to verify.
- If valid, Express creates a **session cookie** in the browser. Subsequent API calls include this cookie automatically.
- Session expires after **24 hours**.

### 4.2 Dashboard — Customer Overview
- Displays a live, searchable list of all customer-vehicle pairs.
- Searching runs instantly client-side, filtering by Name, Phone, Vehicle, or Plate, with a dynamic active profile counter.
- **Excel-Style Filters:** You can interact with headers to search, select, exclude, or sort specific unique values in a column.
- **Create Job** pre-fills the Job Card form for that specific customer/vehicle.
- **Edit** opens the edit form for customer/vehicle details.
- Header actions let you jump to the Invoices Engine, add new records, delete the last job card, or overwrite a card.

### 4.3 Add Customer / Vehicle Record
- Allows creating customer profiles or adding vehicles to existing clients.
- Search by phone to pre-fill client fields before adding new vehicles.
- Vehicle fields are optional.

### 4.4 Edit Customer / Vehicle Record
- Allows editing name, phone, oil card, or vehicle make, model, year, and plate.
- Provides delete actions for both the vehicle and client profile.
- The VIN field is read-only (immutable key).

### 4.5 Create Job Card
- Sequence number is fetched from `GET /api/next-job-no`.
- Form generates a job card entry and triggers client-side PDF rendering.

### 4.6 Overwrite & Reprint a Job Card
- Allows rewriting details on an existing job card and reprinting a new template while maintaining the original job card number.
- Loyalty "Oil Card" records are attached to vehicle details within this view.

### 4.7 Delete Last Job Card (Dashboard)
- Safe-deletes the highest `job_no` and resets the MySQL auto-increment counter to avoid number gaps.

### 4.8 Invoices Engine & Accounting — History Views
- **Invoices Engine:** Swaps view between active Job Cards history (to select and invoice cards) and Invoice records history (to audit totals).
- **Accounting Tab:** Track Sales and Expenses. Uses inline column filtering to quickly narrow down expense categories, descriptions, or specific years, maintaining month-by-month grouped summary totals.

### 4.9 Generate Invoice
- Input dynamic invoice entries (description, price, quantity, discount) with live calculations.
- Optional 5% VAT checkbox updates subtotal and grand totals dynamically.
- Triggers PDF generation mapped on `INVOICE_TEMPLATE.pdf`.

### 4.10 Overwrite Invoice
- Loads invoice details and rows to rewrite data, replacing existing entries in the database.

### 4.11 Delete Last Job Card / Invoice (Engine)
- Deletes the latest invoice or job card depending on which tab is open and resets sequences.

### 4.12 PDF Generation — Job Cards
- Written in [JobCardForm.jsx](file:///d:/HRC-Automator/frontend/src/components/JobCardForm.jsx) and [OverwriteJobCard.jsx](file:///d:/HRC-Automator/frontend/src/components/OverwriteJobCard.jsx). Mapped coordinates are drawn on `TEMPLATE.pdf`.

### 4.13 PDF Generation — Invoices
- Written in [InvoiceForm.jsx](file:///d:/HRC-Automator/frontend/src/components/InvoiceForm.jsx). Mapped coordinates are drawn on `INVOICE_TEMPLATE.pdf`.

### 4.14 Logout
- Clears the Express session cookie and reloads the viewport.

### 4.15 Loyalty Cards Tracking
- **Dedicated Loyalty Tab**: Groups all loyalty oil cards by customer profile.
- **Per-Car Tracking**: Customers with multiple vehicles have separate loyalty cards tracked per vehicle, ensuring accurate data.
- **Quick Logging**: A single-click `+1 Visit` action automatically saves redemption count increments to the database.

### 4.16 Inventory Tracking
- **Inventory Tab**: Log all shop supplies in custom dated snapshots.
- **Pagination & Highlighting**: Switch between dates easily. Rows intelligently highlight when values hit zero, or when oils/coolants fall below the 4-gallon threshold.

---

## 5. API Reference

All routes (except `/api/health` and `/api/login`) require an active authenticated session.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check — no auth required |
| `POST` | `/api/login` | Authenticate and create a session |
| `POST` | `/api/logout` | Destroy the current session |
| `GET` | `/api/all-clients` | All clients joined with their vehicles |
| `GET` | `/api/search-client/:phone` | Find a client by phone; `?vin=` to narrow to a specific vehicle |
| `POST` | `/api/add-customer-record` | Add a client and/or vehicle without a job card |
| `PUT` | `/api/update-record` | Edit an existing client and/or vehicle |
| `DELETE` | `/api/delete-customer/:customer_id` | Delete a client profile |
| `DELETE` | `/api/delete-vehicle/:vin_no` | Delete a vehicle record |
| `GET` | `/api/next-job-no` | Get the next available job card number |
| `POST` | `/api/create-job-card` | Create a new job card (and client/vehicle if new) |
| `GET` | `/api/job-card/:job_no` | Fetch a specific job card's full details |
| `PUT` | `/api/update-job-card/:job_no` | Overwrite a job card's details |
| `GET` | `/api/last-job-card` | Fetch the most recent job card (for safe-delete) |
| `DELETE` | `/api/delete-job-card/:job_no` | Delete a job card and reset AUTO_INCREMENT |
| `GET` | `/api/all-job-cards` | All job cards ordered newest first |
| `GET` | `/api/next-invoice-no` | Get the next available invoice number |
| `POST` | `/api/create-invoice` | Create a new invoice with line items |
| `GET` | `/api/invoice/:invoice_no` | Fetch a specific invoice with all line items |
| `PUT` | `/api/update-invoice/:invoice_no` | Overwrite invoice and replace all line items |
| `GET` | `/api/all-invoices` | All invoices ordered newest first |
| `GET` | `/api/last-invoice` | Fetch the most recent invoice (for safe-delete) |
| `DELETE` | `/api/delete-invoice/:invoice_no` | Delete an invoice and reset AUTO_INCREMENT |
| `GET` | `/api/loyalty-cards` | Fetch all vehicles with an assigned oil card grouped by client |
| `PUT` | `/api/loyalty-cards/:vin_no/increment` | Increment the loyalty visit count for a specific vehicle |
| `PUT` | `/api/loyalty-cards/:vin_no/update-visits` | Manually overwrite the loyalty visit count |
| `GET` | `/api/inventory/dates` | Get list of logged inventory dates |
| `GET` | `/api/inventory/log/:date` | Fetch inventory numbers for a specific date |
| `POST` | `/api/inventory/log` | Create or update an inventory log |
| `GET` | `/api/sales` | Fetch all sales records |
| `POST` | `/api/sales` | Create a new sales record |
| `DELETE` | `/api/sales/:id` | Delete a specific sales record |
| `GET` | `/api/expenses` | Fetch all expense records |
| `POST` | `/api/expenses` | Create a new expense record |
| `DELETE` | `/api/expenses/:id` | Delete a specific expense record |

---

## 6. Known Coordinates & PDF Mapping

All coordinates use pdf-lib's coordinate system where **(0, 0) is the bottom-left corner** of the page.

### Job Card Template Mappings (`TEMPLATE.pdf`)

| Field | X | Y |
|---|---|---|
| Job No. | 492 | 688 |
| Date In (DD-MM-YYYY) | 492 | 675 |
| Customer Name | 20 | 605 |
| Phone No. | 350 | 605 |
| Make | 20 | 552 |
| Model | 220 | 552 |
| Year | 416 | 552 |
| Colour | 20 | 497 |
| Plate No. | 220 | 497 |
| Mileage | 416 | 497 |
| VIN | 20 | 458 |

### Invoice Template Mappings (`INVOICE_TEMPLATE.pdf`)

| Header Field | X | Y |
|---|---|---|
| Customer Name (Mr./Ms.) | 120 | 666 |
| Phone | 120 | 654 |
| Date In | 120 | 642 |
| Vehicle Brand / Year | 380 | 666 |
| Plate No. | 380 | 654 |
| Invoice No. | 380 | 642 |
| VIN / Mileage | 380 | 630 |

**Line items (per row, starting at Y = 572, offset: `startY - (row_no * 12.25)`):**

| Column | X |
|---|---|
| Order No. | 50 |
| Description | 100 |
| Quantity | 325 |
| Unit Price | 395 |
| Discount (if >0) | 440 |
| Row Total | 500 |

**Totals:**

| Field | X | Y |
|---|---|---|
| Subtotal | 490 | 323 (startY − 249) |
| VAT Amount | 490 | 310.75 (startY − 261.25) |
| Grand Total | 490 | 298.5 (startY − 273.5) |

---

## 7. Deployment & Environment Variables

The application requires a `.env` file in the root directory:

```env
DB_HOST=        # MySQL host address
DB_PORT=        # MySQL port (default: 3306)
DB_USER=        # MySQL username
DB_PASS=        # MySQL password
DB_NAME=        # Database name (hrc_automator)
SESSION_SECRET= # Secret string for session encryption
NODE_ENV=       # Set to "production" on host deployment
PORT=           # Port number (default: 3000)
```

### Local Development

1. **Install Dependencies:**
   Runs a postinstall script to install frontend dependencies automatically:
   ```bash
   npm install
   ```
2. **Run Dev Servers:**
   - Express server starts on `http://localhost:3000`:
     ```bash
     npm run dev:backend
     ```
   - React Vite hot-reloading client starts on `http://localhost:5173`:
     ```bash
     npm run dev:frontend
     ```
3. **Build Frontend Bundle:**
   Compiles React source into root `public/` directory:
   ```bash
   npm run build
   ```
