# SG Accounting (Singapore, services)

Simple accounting app for Singapore professional-services companies (no inventory).

## Stack

- **Frontend**: React + Vite + TypeScript + Ant Design (`frontend/`)
- **Backend**: Spring Boot + Maven (`backend/`)
- **Database**: MySQL 8 (Docker)

## Features

- **Clients**: CRUD clients (name, address, point of contact, email, contact number)
- **Invoices**:
  - CRUD invoices
  - Invoice **line items** and **cost items**
  - Invoice customer details are driven by **client selection**
- **Expenses**: CRUD expenses
- **Reports**: Business Income summary (YA year)
- **Dashboard**: invoice / cost / expense totals
- **Invoice print**:
  - **From**: company profile loaded from JSON (see below)
  - **Bill To**: full client details

## Company profile (for invoice “From”)

The company/owner profile is stored as a JSON file on disk (no DB table).

- **API**: `GET /api/company-profile`, `PUT /api/company-profile`
- **Config**: `backend/src/main/resources/application.yml`

```yaml
sg:
  accounting:
    company-profile-file: data/company-profile.json
```

This file is written by the app via the **Business profile** page.

## Local development

### 1) Start MySQL

From repo root:

```bash
cd Accounting
docker compose up -d
```

MySQL defaults (see `docker-compose.yml`):

- DB: `sg_accounting`
- User: `sg_accounting`
- Password: `sg_accounting`
- Port: `3307` (host) → `3306` (container)

### 2) Start backend

```bash
cd Accounting/backend
mvn spring-boot:run
```

Backend runs at `http://localhost:8080`.

### 3) Start frontend

```bash
cd Accounting/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Key APIs

- **Clients**: `/api/clients`
- **Invoices**: `/api/invoices`
  - Lines: `/api/invoices/{id}/lines`
  - Costs: `/api/invoices/{id}/costs`
- **Expenses**: `/api/expenses`
- **Dashboard**: `/api/dashboard/summary?year=YYYY`
- **Business income**: `/api/reports/business-income?year=YYYY`
- **Company profile (JSON)**: `/api/company-profile`

