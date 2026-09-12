# Nexora Health — Hospital Operations & Bed Management Platform

<p align="center">
  <img src="frontend/src/assets/hero.png" alt="Nexora Health Hero" width="160" />
</p>

<p align="center">
  <strong>An enterprise-grade, real-time hospital management and patient flow optimization platform engineered for high-acuity patient tracking, concurrency-safe bed reservation lifecycles, and cross-departmental operations.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.0-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-18+-green?logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.19-lightgrey?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-black?logo=socket.io" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Tests-22%2F22%20Passed-brightgreen" alt="Tests Passed" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Security & RBAC Controls](#-security--rbac-controls)
- [Core Workflows & Concurrency](#-core-workflows--concurrency)
  - [1. Concurrency-Safe Bed Reservation](#1-concurrency-safe-bed-reservation)
  - [2. Dynamic Inpatient Stay Billing](#2-dynamic-inpatient-stay-billing)
  - [3. Nurse Triage & Clinical Intake](#3-nurse-triage--clinical-intake)
  - [4. Pharmacy Inventory Auto-Decrement](#4-pharmacy-inventory-auto-decrement)
  - [5. Public Patient Self-Registration](#5-public-patient-self-registration)
- [Role-Based Portals](#-role-based-portals)
- [Real-Time WebSocket Architecture](#-real-time-websocket-architecture)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Docker Deployment](#docker-deployment)
- [Automated Testing](#-automated-testing)
- [Demo Credentials](#-demo-credentials)
- [Project Directory Structure](#-project-directory-structure)
- [License](#-license)

---

## 🏥 Overview

**Nexora Health** is a centralized full-stack clinical platform designed to optimize patient flow and eliminate coordination bottlenecks between hospital departments. From initial outpatient reception, triage vitals, and physician consultations to diagnostic scan queues, inpatient ward transfers, bed reservation, pharmacy dispensation, and cashier checkout, Nexora provides unified real-time operations across 9 distinct hospital roles.

---

## ✨ Key Features

- **Concurrency-Safe Bed Management**:
  - Lock-free atomic bed reservation engine (`findOneAndUpdate({ _id, status: 'AVAILABLE' })`).
  - Strict 5-state lifecycle: `AVAILABLE` &rarr; `RESERVED` &rarr; `OCCUPIED` &rarr; `CLEANING` &rarr; `AVAILABLE` (plus `BLOCKED` and `MAINTENANCE`).
  - Guaranteed double-booking prevention returning explicit `409 Conflict`.
- **Dynamic Inpatient Billing Engine**:
  - Length of stay calculation based on actual admission/discharge timestamps.
  - Tiered ward daily rates (General, Semi-Private, Private, ICU, Emergency).
  - Itemized `Invoice` records tracking stay charges, pharmacy, unpaid lab scans, 5% GST, and initial admission deposit deductions.
- **Nurse Clinical Intake & Triage**:
  - Pre-consultation vitals recording (BP, Pulse, Temperature, SpO2, Respiratory Rate, Weight, Triage Priority, Nursing Notes).
  - Real-time vitals card display inside the Doctor's Consultation view.
- **Pharmaceutical Inventory Management**:
  - `MedicineInventory` schema tracking batch numbers, stock levels, and unit pricing.
  - Atomic stock decrement upon pharmacist dispensation with negative stock protection.
- **Secure Real-Time WebSockets**:
  - Authenticated Socket.IO gateway with handshake JWT verification.
  - Role-scoped and user-scoped rooms (`room:role_*`, `room:user_*`, `room:patient_*`).
- **Interactive Patient Journey Portal**:
  - Visual 6-step journey map: *Registration &rarr; Consultation &rarr; Diagnostics &rarr; Admission &rarr; Inpatient Stay &rarr; Discharge*.
  - Live ward bed location badge, timeline audit trail, and printable invoices.

---

## 🏛️ System Architecture

```mermaid
graph TD
    Client[React 19 + Tailwind Client]
    WS[Socket.IO Gateway with JWT Auth]
    API[Express REST API with Service Layer]
    BedSvc[BedService - Concurrency & State Machine]
    BillSvc[BillingService - Dynamic Stay Invoicing]
    DB[(MongoDB Atlas / Replica Set)]

    Client <-->|Secure WS Events (Role Scoped)| WS
    Client <-->|REST Endpoints + Bearer JWT| API
    API --> BedSvc
    API --> BillSvc
    BedSvc <-->|Atomic Conditional Updates| DB
    BillSvc <-->|Aggregations & Invoices| DB
    WS <-->|Room Broadcasts| Client
```

---

## 🔒 Security & RBAC Controls

1. **Authentication**:
   - Industry-standard bcrypt password hashing (cost factor 10).
   - Stateless JWT authentication signed with environment secrets (`JWT_SECRET`).
   - Token payload carries user identity, role, and assigned credentials.
2. **Strict Role-Based Access Control (RBAC)**:
   - Protected endpoints enforced via `requireRole(...)` middleware.
   - Bed status changes restricted to `ADMIN`, `RECEPTION`, `WARD_STAFF`, and `NURSE`.
   - Consultation status restricted to clinical staff (`DOCTOR`, `NURSE`).
   - Admin routes strictly isolated to `ADMIN`.
3. **IDOR & Object-Level Authorization**:
   - `requireOwnershipOrStaff()` ensures patient users can only read their own records, timeline, prescriptions, diagnostic results, and invoices.
4. **Public Self-Registration**:
   - Open `/api/patients/self-register` route allows new patients to register without administrative pre-authentication.
   - Atomic collision-free sequence generator (`Counter` model) generates sequential IDs (`P1001`, `P1002`, ...).

---

## 🔄 Core Workflows & Concurrency

### 1. Concurrency-Safe Bed Reservation
Two simultaneous users attempting to book the same bed are evaluated atomically at the database level:
```typescript
const bed = await Bed.findOneAndUpdate(
  { _id: bedId, status: 'AVAILABLE' },
  { $set: { status: 'RESERVED', currentPatientId, currentAdmissionId, reservedTime: new Date() } },
  { new: true }
);
if (!bed) {
  throw new Error('CONCURRENCY_CONFLICT: Bed is no longer available or was reserved by another user.');
}
```
If two requests arrive at the exact same millisecond, MongoDB guarantees exactly one update operation succeeds; the second receives a `409 Conflict` and is prompted to pick an alternative bed.

### 2. Dynamic Inpatient Stay Billing
Eliminates arbitrary hardcoded discharge fees. Total discharge bills are computed from actual clinical duration:
$$\text{Total Stay Charge} = \max(1, \lceil \text{hours} / 24 \rceil) \times \text{Ward Daily Rate}$$
$$\text{Net Balance Due} = (\text{Stay Charges} + \text{Unpaid Labs} + \text{Unpaid Rx} + \text{GST}) - \text{Deposit Paid}$$

### 3. Nurse Triage & Clinical Intake
Outpatient consultations start in `WAITING`. Nurses record vital signs and triage urgency (`ROUTINE`, `URGENT`, `EMERGENCY`), automatically moving status to `RECEIVED`. The consulting doctor sees this live in their portal.

### 4. Pharmacy Inventory Auto-Decrement
When a pharmacist clicks **Dispense**, the system executes:
```typescript
await MedicineInventory.findOneAndUpdate(
  { name: item.name, stockQuantity: { $gte: item.quantity } },
  { $inc: { stockQuantity: -item.quantity } },
  { new: true }
);
```
Dispensing fails safely if stock is insufficient.

### 5. Public Patient Self-Registration
Outpatients can register their profile independently. The backend automatically creates both a `Patient` document and a corresponding `User` account with role `PATIENT` and default credentials for immediate portal access.

---

## 👥 Role-Based Portals

| Portal | Route | Description |
|---|---|---|
| **System Admin** | `/admin/dashboard` | Executive KPIs, real-time analytics aggregation, staff directory, hospital taxonomy builder, and bed controller. |
| **Reception Desk** | `/reception/dashboard` | Patient registration, doctor appointments, concurrency-safe bed reservations, and initial deposit cashiering. |
| **Physician / Doctor** | `/doctor/dashboard` | Consultation queue, nurse triage vitals banner, clinical notes, e-prescriptions, diagnostic orders, and ward change requests. |
| **Nurse Station** | `/nurse/dashboard` | Clinical intake vitals logging (BP, Pulse, SpO2, Temp), triage classification, and inpatient monitoring. |
| **Ward Staff** | `/ward/dashboard` | Inpatient census board, physical bed arrival confirmation (`OCCUPIED`), bed cleaning transitions, and ward transfers. |
| **Diagnostics / Labs** | `/diagnostics/dashboard` | Radiology, pathology, cardiology, and MRI test queues; check-in verification, technician processing, and report completion. |
| **Pharmacy Counter** | `/pharmacy/dashboard` | Prescription verification queue, inventory stock validation, atomic stock decrement, and medication dispensation. |
| **Cashier / Billing** | `/billing/dashboard` | Dynamic discharge invoicing, itemized line items, multi-match patient search, cash tender calculator, and deposit settlement. |
| **Patient Portal** | `/patient/dashboard` | Self-service journey stepper, assigned bed badge, consultation history, e-prescriptions, diagnostic reports, and printable invoices. |

---

## 📡 Real-Time WebSocket Architecture

Socket.IO connections are authenticated during handshake:
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('AUTHENTICATION_REQUIRED'));
  const decoded = jwt.verify(token, JWT_SECRET);
  socket.data.user = decoded;
  next();
});
```
Upon connection, sockets automatically join scoped communication channels:
- `room:role_<ROLE>` (e.g., `room:role_DOCTOR`, `room:role_WARD_STAFF`)
- `room:user_<USER_ID>` (Personal notifications)
- `room:patient_<PATIENT_ID>` (Patient portal real-time journey updates)

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS & Vanilla CSS Design Tokens
- **Icons**: Lucide React
- **Networking**: Axios & Socket.IO Client

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript (`ts-node-dev`)
- **Database**: MongoDB with Mongoose 8 ODM
- **Real-Time**: Socket.IO with JWT Handshake Auth
- **Security**: JSON Web Tokens (JWT), bcryptjs password hashing, CORS, input sanitization

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas URI)
- Git

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file from the provided example:
   ```bash
   cp .env.example .env
   ```
4. Seed the database with hospital structure, demo staff, and inventory:
   ```bash
   npm run seed
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will run at `http://localhost:5000`.*

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will run at `http://localhost:5173`.*

---

### Docker Deployment

To launch the entire platform (MongoDB, Backend, and Frontend NGINX) with a single command:
```bash
docker-compose up --build
```
Access the application at `http://localhost` (Frontend) and `http://localhost:5000` (Backend API).

---

## 🧪 Automated Testing

Nexora Health includes an automated integration and concurrency race condition test suite.

Run the tests:
```bash
cd backend
npm test
```

### Test Coverage Highlights (22 Automated Tests Across 16 Specialized Suites):
- **Suite 1: Authentication & Atomic Sequences**: Sequential Patient ID collision prevention, JWT signing and verification.
- **Suite 2: Bed Concurrency Race Condition**: Simulates simultaneous asynchronous reservation requests; verifies atomic lock and `409 Conflict`.
- **Suite 3: Bed Lifecycle State Machine**: Full progression (`AVAILABLE` &rarr; `RESERVED` &rarr; `OCCUPIED` &rarr; `CLEANING` &rarr; `AVAILABLE`) and rejection of illegal direct jumps (`CLEANING` &rarr; `OCCUPIED`).
- **Suite 4: Dynamic Inpatient Billing**: Validates timestamp-based length of stay calculations and ward daily rates.
- **Suite 5: Pharmacy Inventory**: Verifies atomic stock quantity decrement upon dispensation.
- **Suite 6: Nurse Clinical Intake**: Verifies vital sign logging and triage classification.
- **Suite 7: RBAC & IDOR Object-Level Authorization**: Enforces role gates and cross-user ownership guards (`requireOwnershipOrStaff`).
- **Suite 8: Diagnostics Lab Order Progression**: Full scan lifecycle progression (`REQUESTED` &rarr; `QUEUED` &rarr; `RECEIVED` &rarr; `IN_PROGRESS` &rarr; `COMPLETED`).
- **Suite 9: Ward Change Workflow**: Doctor ward change request creation, review, and approval flow.
- **Suite 10: Authentication Zero Bypass & Account Lockout**: Complete removal of backdoors; enforces 5-failure lockout.
- **Suite 11: Cryptographic Password Reset**: Validates secure SHA-256 tokens, 15-minute expiration, and single-use token destruction.
- **Suite 12: Discharge Billing Settlement Chain**: Ensures invoice payment settlement atomically updates `Admission.paymentStatus` to `PAID`.
- **Suite 13: Diagnostics Payment Integrity**: Blocks unpaid tests from entering `RECEIVED` state (`PAYMENT_REQUIRED`).
- **Suite 14: Pharmacy Inventory Idempotency & Safety**: Prevents duplicate decrementing on repeated dispensation requests and blocks expired medicines.
- **Suite 15: Bed Domain State Machine Single Source of Truth**: Centralized `BedService` gatekeeping all administrative bed status changes.
- **Suite 16: Consultation State Machine & Role Validation**: Enforces linear consultation progression and clinical role authorization.

---

## 🔑 Demo Credentials

All test accounts are pre-seeded and ready for immediate evaluation:

### 👥 Clinical & Administrative Staff

| Role | Username | Password | Notes / Specialty |
|---|---|---|---|
| **System Admin** | `admin` | `admin123` | Full hospital configuration & KPIs |
| **Receptionist** | `reception` | `reception123` | Patient check-in & bed reservations |
| **Doctor (Internal Medicine)** | `doctor1` | `doctor123` | Dr. John Smith (`/doctor/dashboard` & `/doctor/admissions`) |
| **Doctor (Cardiology)** | `doctor2` | `doctor123` | Dr. Sarah Connor |
| **Doctor (Orthopedics)** | `doctor3` | `doctor123` | Dr. David Tennant |
| **Staff Nurse** | `nurse` | `nurse123` | Triage vitals & clinical intake |
| **Ward Staff** | `ward` | `ward123` | Ward bed stays & physical arrival |
| **Pharmacist** | `pharmacy` | `pharmacy123` | Dispensary & inventory reconciliation |
| **Cashier / Billing Officer** | `billing` | `billing123` | Dynamic invoices & cashier desk |
| **Patient** | `P1001` | `12051990` | John Doe (DOB: 12/05/1990) |

### 🔬 Specialized Diagnostic Lab Desks

| Diagnostic Lab Desk | User ID | Password | Dedicated Route | Modality Scope |
|---|---|---|---|---|
| **🩻 X-Ray Lab Desk** | `xray` | `Password@123` | `/diagnostics/xray` | Extremity, bone, PA view, chest X-rays |
| **⚡ CT Scan Imaging Desk** | `ctscan` | `Password@123` | `/diagnostics/ctscan` | CT brain, CT chest, tomography |
| **🩸 Pathology & Blood Lab** | `pathology` | `Password@123` | `/diagnostics/pathology` | Blood CBC, LFT, KFT/RFT, sugar, lipid profiles |
| **❤️ Cardiology & ECG Lab** | `ecg` | `Password@123` | `/diagnostics/cardiology` | ECG, 2D Echocardiogram, cardiac tests |
| **🧲 MRI Scan Suite Desk** | `mri` | `Password@123` | `/diagnostics/mri` | MRI brain, MRI lumbar/cervical spine |
| **🌐 All Labs Supervisor** | `diagnostics` | `Password@123` | `/diagnostics/dashboard` | Bob Ross — Full oversight across all labs |

---

## 📁 Project Directory Structure

```text
Nexora-Health/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & authenticated Socket.IO setup
│   │   ├── controllers/     # Express route handlers
│   │   ├── middleware/      # Auth & RBAC role guards (requireRole, requireOwnershipOrStaff)
│   │   ├── models/          # Mongoose schema definitions (Counter, Invoice, MedicineInventory, ...)
│   │   ├── routes/          # REST endpoints
│   │   ├── scripts/         # Database seeding utilities
│   │   ├── services/        # Business logic layer (BedService, BillingService, AnalyticsService, ...)
│   │   ├── tests/           # Automated integration & concurrency test suite
│   │   └── index.ts         # Main HTTP & WebSocket server entry
│   ├── .env.example         # Environment template
│   ├── Dockerfile           # Multi-stage production container definition
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/              # Static assets & icons
│   ├── src/
│   │   ├── assets/          # Logos & visual branding
│   │   ├── components/      # Shared layout, UI primitives, modals, & tables
│   │   ├── context/         # AuthContext & SocketContext providers
│   │   ├── pages/           # 9 Role-based operational dashboards
│   │   ├── services/        # Centralized HTTP request helper
│   │   ├── App.tsx          # Client-side protected routing
│   │   ├── index.css        # Custom CSS tokens & animation classes
│   │   └── main.tsx         # React root entry point
│   ├── .env.example
│   ├── Dockerfile           # Multi-stage Nginx container definition
│   ├── package.json
│   ├── tailwind.config.js   # Healthcare theme tokens
│   └── vite.config.ts
├── .gitignore               # Root git ignore rules
├── docker-compose.yml       # Complete stack orchestration (DB + API + Frontend)
└── README.md                # Comprehensive documentation
```

---

## 📄 License

This project was developed as an S5 Mini Project prototype for modern digital healthcare infrastructure. Distributed under the MIT License.
