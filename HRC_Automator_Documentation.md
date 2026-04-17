# HRC Job Card Automator — System Documentation

> **Version:** April 2026  
> **Stack:** HTML · JavaScript · Node.js · Express · MySQL  
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
5. [API Reference](#5-api-reference)
6. [Known Coordinates & PDF Mapping](#6-known-coordinates--pdf-mapping)
7. [Deployment & Environment Variables](#7-deployment--environment-variables)

---

## 1. What is the HRC Automator?

The **HRC Job Card Automator** is a private, login-protected web application built for internal use at HRC. It is designed to digitally replace the manual, paper-based process of creating and tracking automotive service job cards and invoices.

The system allows staff to:
- Maintain a **client and vehicle database** without needing to create a job first
- Generate **numbered Job Cards** with all relevant customer and vehicle data, printed directly onto a pre-designed PDF template
- **Invoice** specific job cards with a dynamic line-item table, real-time totals, optional VAT, and persistent storage
- **Review** the full history of job cards and invoices
- **Correct** any record by overwriting and reprinting it

---

## 2. How the System is Structured

The application is split into two distinct layers:

### Frontend (Browser)
A single HTML file (`public/index.html`) handles everything the user sees and interacts with. It uses:
- **TailwindCSS** (loaded from CDN) for styling
- **pdf-lib** (loaded from CDN) to fill and generate PDF files entirely inside the browser — no server round-trip needed for PDF creation
- Plain **JavaScript** for all interactivity, API calls, and dynamic page behaviour

All "pages" in the app are actually hidden `<div>` sections inside a single HTML file. Navigation is handled by JavaScript showing and hiding these sections — this is why the browser URL never changes.

### Backend (Server)
A Node.js server (`api/index.js`) built with **Express** handles:
- **Authentication** (login / logout with encrypted sessions)
- **All database reads and writes** (customers, vehicles, job cards, invoices, invoice line items)
- **Serving the static files** (the HTML page and PDF templates in `public/resources/`)

### Database
A **MySQL** database (`hrc_automator`) stores all permanent records. It is hosted on a managed provider (Aiven). The connection is configured via environment variables in the `.env` file.

---

## 3. The Database — What Gets Stored

The system uses five tables:

### `users`
Stores login credentials. Passwords are stored as **bcrypt hashes** (never as plain text).

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
| `oil_card_no` | VARCHAR | Optional oil card reference |

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

## 4. Feature Reference

### 4.1 Login & Session Security

**What it does:**  
Protects the entire application. Only authorised users can access any feature.

**How to use:**  
Enter your username and password on the login screen and click **Enter System**.

**How it works (technical):**
- A `POST /api/login` request is sent to the server with the entered credentials
- The server queries the `users` table and uses `bcrypt.compare()` to verify the password against the stored hash — the plain-text password is never stored anywhere
- If valid, Express creates a **session cookie** in the browser. All subsequent API calls include this cookie automatically, and the server rejects calls from anyone without a valid session with a `401 Unauthorized` response
- Sessions expire after **24 hours** automatically

---

### 4.2 Dashboard — Customer Overview

**What it does:**  
The main hub of the application. Displays a live, searchable list of all customers and their registered vehicles.

**How to use:**  
After logging in, the dashboard loads automatically. Use the search bar to filter by customer name, phone number, or plate number in real time — no page reload needed.

Each row in the table represents one **customer-vehicle pair**. Customers with multiple vehicles appear on multiple rows (one per vehicle).

**Action buttons on each row:**
- **Create Job →** — pre-fills the Job Card form with this customer and specific vehicle's details
- **Edit** — opens the Edit Record form pre-filled with this customer/vehicle's details

**Header buttons:**
- **+ Customer/Vehicle** — opens form to add a new customer or vehicle without creating a job card
- **+ Job Card** — opens a blank Job Card form
- **Invoices Engine** — navigates to the Job Cards / Invoices history view
- **DELETE LAST JOB CARD** — safe-deletes the most recently created job card (see 4.7)
- **OVERWRITE JOB CARD** — prompts for a job card number to overwrite and reprint
- **Logout** — ends your session

**How it works (technical):**
- On show, `GET /api/all-clients` is called — this performs a `LEFT JOIN` between `clients` and `vehicles`, returning one row per client-vehicle pair
- The search filter runs entirely client-side using `.includes()` on the rendered table rows — no API call is made per keystroke
- The **Create Job** button passes both the `phone_no` and `vin_no` to `selectCustomer()`, which then calls `GET /api/search-client/:phone?vin=:vin` to fetch the exact record for that specific vehicle

---

### 4.3 Add Customer / Vehicle Record

**What it does:**  
Allows creating a new customer profile and/or registering a new vehicle under an existing customer — without needing to generate a job card. New records appear immediately on the Dashboard.

**How to use:**  
Click **+ Customer/Vehicle** on the Dashboard.
- To add a **brand-new customer with a vehicle**: fill in all fields and click Save Record
- To add a **new vehicle to an existing customer**: use the "Search existing by Phone No" field, click Search, and the customer details will auto-fill. Then enter the new vehicle details below and save
- Vehicle fields are **optional** — you can save a customer profile without a vehicle

**How it works (technical):**
- `POST /api/add-customer-record` is called with all form data
- Server logic:
  1. Checks if a client with the given `phone_no` already exists
  2. If yes — reuses their `customer_id`; if no — inserts a new row into `clients`
  3. If `vin_no` is provided, checks if that vehicle already exists; if not — inserts into `vehicles` linked to the resolved `customer_id`
  4. No row is written to `job_cards`

---

### 4.4 Edit Customer / Vehicle Record

**What it does:**  
Allows correcting or updating an existing customer's name, phone number, oil card, or their vehicle's details. Also provides the ability to delete a customer profile or a specific vehicle.

**How to use:**  
Click **Edit** on any row in the Dashboard table. Make changes and click **Update Record**.

> [!WARNING]
> **Delete Client Profile** permanently deletes the customer record. **Delete Vehicle** permanently deletes that specific vehicle. These actions cannot be undone.

> [!NOTE]
> The VIN number is shown as read-only in the edit form. VINs are the permanent unique key for a vehicle and cannot be changed after creation.

**How it works (technical):**
- The Edit button stores the entire row's data as a JSON attribute (`data-customer`) on the button element, encoded with `encodeURIComponent`. On click, this is decoded and populated into the form fields — no extra API call needed to open the form
- On submit, `PUT /api/update-record` is called with the `customer_id` and updated fields
- The server runs two separate `UPDATE` queries — one for `clients`, one for `vehicles`
- Delete buttons call `DELETE /api/delete-customer/:id` or `DELETE /api/delete-vehicle/:vin` respectively

---

### 4.5 Create Job Card

**What it does:**  
Creates a new, sequentially numbered job card record in the database and generates a filled PDF ready for printing, stamped with all customer, vehicle, and job details.

**How to use:**  
Click **+ Job Card** on the Dashboard (or use **Create Job →** on a specific row to pre-fill the form).

Fill in or verify:
- **Client Details:** Name, Phone, Oil Card No. (optional)
- **Vehicle Details:** VIN, Make, Model, Year, Colour, Plate No.
- **Job Details:** Date In, Mileage

Click **Generate Job Card**. A PDF preview will appear. Click **Download & Print** to save the file.

**How it works (technical):**
- The "Next Job Card" number displayed at the top is fetched from `GET /api/next-job-no`, which runs `SELECT MAX(job_no)` on the `job_cards` table and adds 1
- On submit, `POST /api/create-job-card` is called. Server logic:
  1. Resolves or creates the client (same logic as Add Customer)
  2. Resolves or creates the vehicle (same logic as Add Customer)
  3. Inserts a new row into `job_cards`
  4. Returns the confirmed `job_no` from the database
- The PDF is then generated **client-side** using pdf-lib, filling the coordinates mapped onto `TEMPLATE.pdf` (stored in `public/resources/`)

---

### 4.6 Overwrite & Reprint a Job Card

**What it does:**  
Allows correcting the details on an already-created job card and reprinting an updated PDF. The existing job card number is preserved.

**How to use:**  
Click **OVERWRITE JOB CARD** on the Dashboard, enter the job card number when prompted, edit any fields, and click **Overwrite & Print**.

**How it works (technical):**
- `GET /api/job-card/:job_no` fetches the existing record with customer and vehicle data joined
- On submit, `PUT /api/update-job-card/:job_no` runs:
  1. Resolves the client (by phone — creates if new)
  2. Resolves the vehicle (by VIN — creates if new)
  3. `UPDATE job_cards SET ...` re-links the job to the resolved client and vehicle
- The updated PDF is then generated and shown in the same preview modal

---

### 4.7 Delete Last Job Card (Dashboard)

**What it does:**  
Permanently removes the most recently created job card and ensures the next job card created will take its number — keeping the sequence clean.

**How to use:**  
Click **DELETE LAST JOB CARD** in the Dashboard search bar area. A confirmation dialog appears showing the exact job card number, customer name, vehicle, and date. Confirm to proceed.

**How it works (technical):**
- `GET /api/last-job-card` fetches the record with the highest `job_no` to populate the confirmation message
- On confirm, `DELETE /api/delete-job-card/:job_no` runs:
  1. Deletes the row from `job_cards`
  2. Immediately runs `ALTER TABLE job_cards AUTO_INCREMENT = [new max + 1]` to reset the MySQL sequence counter, preventing number gaps on the very next insert
- On every server **startup**, the same `AUTO_INCREMENT` correction also runs automatically to heal any gaps inherited from a previous session

---

### 4.8 Invoices Engine — Tabbed History View

**What it does:**  
Provides a full history of all job cards and all invoices, accessible in one place via two tabs that swap the content in view.

**How to use:**  
Click **Invoices Engine** on the Dashboard. The view opens on the **Job Cards** tab by default. Click the **Invoices** tab to switch.

**Tab: Job Cards**
- Lists every job card ordered from newest to oldest
- Each row shows the job number, date in, customer name, and vehicle
- The **Invoice** button on each row opens the Invoice creation form pre-filled for that job

**Tab: Invoices**
- Lists every saved invoice ordered from newest to oldest
- Shows invoice number, date, customer, vehicle + plate, linked job card number, and grand total
- A `+VAT` badge appears next to totals where VAT was applied

**Context-aware action buttons (header):**
- When on Job Cards tab: **DELETE LAST JOB CARD** is visible
- When on Invoices tab: **DELETE LAST INVOICE** and **OVERWRITE INVOICE** appear instead

**How it works (technical):**
- `switchEngineTab('job-cards' | 'invoices')` handles all tab logic:
  - Shows/hides the two table `<div>` elements
  - Shows/hides the correct header action buttons
  - Updates the active tab underline styling
  - Fetches the appropriate data (`GET /api/all-job-cards` or `GET /api/all-invoices`) and renders it fresh into the table body

---

### 4.9 Generate Invoice

**What it does:**  
Creates a numbered invoice linked to a specific job card, with a dynamic table of services/items, real-time cost calculations, optional VAT, and a filled PDF output. All data is saved persistently to the database.

**How to use:**  
From the **Job Cards** tab in the Invoices Engine, click **Invoice** on any job card row. The Generate Invoice form opens pre-filled with the job card's customer and vehicle details.

1. Verify or adjust the **Invoice Date** and **Customer Name** (editable)
2. In the **Services / Items** table:
   - One empty row is provided by default; click **+ Add Row** for more
   - Type a description or select from the dropdown suggestions (Minor Service, Oil Change, etc.) — you can also type anything custom
   - Enter quantity, unit price, and optional discount percentage
   - The **Total** column for each row calculates instantly as you type: `qty × price × (1 − disc%)`
3. Watch the **Subtotal** update automatically as rows are filled
4. Tick **Apply 5% VAT** to add VAT — the VAT amount and **Grand Total** update in real time
5. Click **Generate & Print Invoice** to save and preview the PDF

**How it works (technical):**
- Row calculations are driven by `recalculateTotals()`, called on every `oninput` event on numeric fields
- VAT is calculated by `calculateGrandTotal()`, triggered by the checkbox `onchange`
- On submit:
  1. All rows with a non-empty description are collected into an `items` array
  2. `POST /api/create-invoice` is called with the full payload including `items`, `subtotal`, `vat_applied`, `grand_total`
  3. Server inserts into `invoices` and then loops through `items`, inserting each into `invoice_items`
  4. The PDF is generated client-side using the saved data

---

### 4.10 Overwrite Invoice

**What it does:**  
Loads an existing invoice back into the invoice form — with all its original line items, VAT setting, and totals — and allows editing and reprinting. The existing invoice number is preserved.

**How to use:**  
On the **Invoices Engine** page (either tab), click **OVERWRITE INVOICE**. Enter the invoice number when prompted. All fields and line items pre-fill. Make changes and click **Generate & Print Invoice** again.

**How it works (technical):**
- `GET /api/invoice/:invoice_no` returns the invoice header data (joined with job card, client, and vehicle) plus its full `items` array from `invoice_items`
- The form's `data-mode` attribute is set to `'overwrite'`
- On submit, the handler detects this mode and calls `PUT /api/update-invoice/:invoice_no` instead of `POST /api/create-invoice`
- The update route: deletes all existing `invoice_items` for that invoice, then re-inserts the new set — ensuring a clean, complete replacement

---

### 4.11 Delete Last Job Card / Invoice (Engine)

**What it does:**  
The same safe-delete pattern as the dashboard button, but context-aware — it automatically targets the correct record type based on which tab is currently active.

**How to use:**  
On the **Job Cards** tab: click **DELETE LAST JOB CARD**  
On the **Invoices** tab: click **DELETE LAST INVOICE**

In both cases, a confirmation dialog shows the record number, customer name, vehicle, and date before you confirm.

**How it works (technical):**
- A single function `promptDeleteLastEngineRecord()` checks which tab is active by reading whether the job cards `<div>` is hidden or not
- It then fetches from `GET /api/last-job-card` or `GET /api/last-invoice` accordingly
- On confirm, sends `DELETE /api/delete-job-card/:job_no` or `DELETE /api/delete-invoice/:invoice_no`
- Invoice deletion uses MySQL's **CASCADE** foreign key — deleting an invoice automatically removes all its `invoice_items` rows
- Both routes correct the `AUTO_INCREMENT` counter after deletion

---

### 4.12 PDF Generation — Job Cards

**Template file:** `public/resources/TEMPLATE.pdf`

The job card PDF is generated entirely in the browser using [pdf-lib](https://pdf-lib.js.org/). The template PDF file is fetched, loaded into memory, and text is drawn at specific X/Y coordinates onto the first page.

**Current coordinate mappings:**

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

> [!TIP]
> To adjust field positions, edit the `draw(value, x, y)` calls inside the `generatePDF()` function in `public/index.html`. The origin (0,0) is at the **bottom-left** of the page in pdf-lib's coordinate system.

The downloaded file is named: `[JobNo] [CustomerName] [Make] [Model] [PlateNo].pdf`

---

### 4.13 PDF Generation — Invoices

**Template file:** `public/resources/INVOICE_TEMPLATE.pdf`

The invoice PDF follows the same client-side pdf-lib approach. After the header fields are drawn, the function loops through the `items` array and draws each row at a decreasing Y position (`startY - i × 12.25`).

**Current coordinate mappings (header fields):**

| Field | X | Y |
|---|---|---|
| Customer Name (Mr./Ms.) | 120 | 666 |
| Phone | 120 | 654 |
| Date In | 120 | 642 |
| Vehicle Brand / Year | 380 | 666 |
| Plate No. | 380 | 654 |
| Invoice No. | 380 | 642 |
| VIN / Mileage | 380 | 630 |

**Line items (per row, starting at Y = 572):**

| Column | X |
|---|---|
| Order No. | 50 |
| Description | 100 |
| Quantity | 325 |
| Unit Price | 395 |
| Discount (if >0) | 440 |
| Row Total | 500 |

**Totals (fixed positions):**

| Field | X | Y |
|---|---|---|
| Subtotal | 490 | 323 (startY − 249) |
| VAT Amount | 490 | 310.75 (startY − 261.25) |
| Grand Total | 490 | 298.5 (startY − 273.5) |

The downloaded file is named: `Invoice_[InvoiceNo]_[CustomerName].pdf`

---

### 4.14 Logout

**What it does:**  
Ends your login session securely and returns to the login screen.

**How to use:**  
Click **Logout** in the top-right of the Dashboard.

**How it works (technical):**
- `POST /api/logout` is called, which runs `req.session.destroy()` on the server — invalidating the session cookie
- The browser then calls `window.location.reload()`, clearing all in-memory state and re-rendering the login view

---

## 5. API Reference

All routes (except `/api/health` and `/api/login`) require an active authenticated session. Unauthorised requests return `401 Unauthorized`.

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
| `DELETE` | `/api/delete-invoice/:invoice_no` | Delete an invoice (cascades to items) and reset AUTO_INCREMENT |

---

## 6. Known Coordinates & PDF Mapping

See sections [4.12](#412-pdf-generation--job-cards) and [4.13](#413-pdf-generation--invoices) for the complete tables of current text placement coordinates for both PDF templates.

All coordinates use pdf-lib's coordinate system where **(0, 0) is the bottom-left corner** of the page. Increasing X moves right; increasing Y moves up.

---

## 7. Deployment & Environment Variables

The application requires a `.env` file in the root directory with the following variables:

```env
DB_HOST=        # MySQL host address
DB_PORT=        # MySQL port (default: 3306)
DB_USER=        # MySQL username
DB_PASS=        # MySQL password
DB_NAME=        # Database name (hrc_automator)
SESSION_SECRET= # A strong secret string for session encryption
NODE_ENV=       # Set to "production" on Render, omit or set "development" locally
PORT=           # Port number (Render sets this automatically)
```

### Running Locally
```bash
npm install
npm start
# Server starts on http://localhost:3000
```

### PDF Templates
Both PDF templates must exist at:
```
public/resources/TEMPLATE.pdf
public/resources/INVOICE_TEMPLATE.pdf
```

These files are served as static assets. The app fetches them from `/resources/TEMPLATE.pdf` and `/resources/INVOICE_TEMPLATE.pdf` in the browser.

### Session Security Notes
- Session cookies are set to `httpOnly: true` (JavaScript in the page cannot read them)
- In production, cookies use `secure: true` (HTTPS only) and `sameSite: 'none'` to support cross-origin requests to Render
- Sessions expire after 24 hours
