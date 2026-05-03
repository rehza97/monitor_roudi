# TECHNOVA — Migration Plan: Docker + FastAPI

## Context

This document outlines the effort and approach required to migrate the current stack (React + Firebase) to a Docker-containerized architecture with a FastAPI (Python) backend.

---

## Current Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript (70 pages, 120+ components) |
| Backend | Firebase Cloud Functions (Node.js, 12 functions) |
| Database | Firestore (17 collections, real-time SDK) |
| Auth | Firebase Auth + custom claims (role-based) |
| Storage | Firebase Storage |
| API | None — frontend talks directly to Firestore SDK |
| CI/CD | None (manual Firebase CLI) |
| Docker | None |

---

## Target Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (unchanged UI) → REST calls to FastAPI |
| Backend | FastAPI (Python) in Docker |
| Database | Firestore (Phase 1) → PostgreSQL (Phase 3, optional) |
| Auth | JWT replacing Firebase Auth |
| Storage | Self-hosted or S3-compatible |
| Docker | docker-compose: frontend (nginx) + backend (FastAPI) + DB |

---

## Key Architectural Decision: Database

**Option A — Keep Firestore, wrap with FastAPI** ✅ Recommended for Phase 1
- FastAPI proxies requests using the `firebase-admin` Python SDK
- Less migration risk, shorter timeline
- Still tied to Google Cloud / Firebase pricing

**Option B — Migrate to PostgreSQL** (Phase 3, optional)
- Full independence from Firebase
- Schema design for 17 collections
- Real-time via WebSocket or SSE from FastAPI
- ~+4 weeks additional effort

---

## Work Breakdown

### Phase 1 — Docker + FastAPI Backend (1 month)

#### 1.1 Docker Setup (~3 days)
- `Dockerfile` for React (multi-stage: build → nginx)
- `Dockerfile` for FastAPI (Python 3.12 + uvicorn)
- `docker-compose.yml` with both services
- `.env` per service, environment variable management

#### 1.2 FastAPI Auth System (~1 week)
- Replace Firebase Auth with JWT (`python-jose` / `FastAPI-users`)
- Endpoints: login, register, token refresh, password reset
- Role-based middleware: `client`, `admin`, `engineer`, `technician`
- Port the `syncUserClaims` Cloud Function logic

#### 1.3 REST API — 17 Routers (~3 weeks)

| Collection | Endpoints |
|---|---|
| users | GET /me, PUT /me, POST register, PATCH role |
| organizations | CRUD |
| deployments | CRUD + metrics ingest |
| orders | CRUD + status transitions |
| catalogProducts | CRUD |
| projects | CRUD |
| supportTickets | CRUD + SLA logic |
| notifications | GET, PATCH read |
| conversations + messages | GET threads, POST message |
| invoices | CRUD + PDF |
| inventory_items | CRUD |
| attachments | POST upload, GET |
| activityEvents | GET audit log |
| engineers | CRUD |
| stackServices | CRUD |
| organizationInvites | POST invite, POST accept |
| tasks | CRUD |

**Total: ~85 endpoints across 17 routers**

#### 1.4 Port Cloud Functions (~1 week)
12 functions → FastAPI endpoints / background tasks:
- `createManagedUser`, `setManagedUserPassword`, `deleteManagedUser`
- `createOrganizationInvite`, `acceptOrganizationInvite`
- `createAttachmentRecord`
- `submitBaridiMobPayment` (Baridi Mob integration)
- `ingestDeploymentMetrics` → HTTP route
- `applySupportTicketSla` → Celery background task
- `writeServerAuditLog` → FastAPI middleware

---

### Phase 2 — Frontend Migration (6–8 weeks)

#### 2.1 Auth Rewrite (~1 week)
- `src/contexts/AuthContext.tsx` — full rewrite
- Replace `signInWithEmailAndPassword()` → `POST /auth/login` (JWT)
- Store JWT in httpOnly cookie or localStorage

#### 2.2 Replace All Firestore SDK Calls (~5–6 weeks)
- 70 pages × avg 3–5 Firestore calls each
- All `onSnapshot()` → WebSocket or polling
- All `addDoc()`, `updateDoc()`, `deleteDoc()` → REST fetch
- Rewrite `src/lib/firebase-firestore.ts` → HTTP client (axios/fetch)
- Rewrite `src/lib/managed-users.ts`, `order-attachments.ts`, `client-payments.ts`

#### 2.3 Real-time Listeners (~1 week)
Currently ~15+ pages use Firestore `onSnapshot()` for live updates.
Replacement options (in order of effort):
1. WebSocket endpoints from FastAPI (best UX)
2. Server-Sent Events (simpler, one-way)
3. Polling (simplest fallback)

#### 2.4 File Uploads (~3 days)
- Replace Firebase Storage → multipart POST to FastAPI
- Update `OrderAttachmentsList` component

---

### Phase 3 — PostgreSQL Migration (optional, ~1 month)

- SQLAlchemy ORM models for all 17 collections
- Alembic migrations
- One-time data export from Firestore → PostgreSQL
- Remove all `firebase-admin` Python SDK dependencies

---

## Effort Summary

| Phase | Work Area | Effort |
|---|---|---|
| 1 | Docker setup | 3 days |
| 1 | FastAPI backend (auth + 85 endpoints + 12 functions) | 4–6 weeks |
| 2 | Real-time (WebSocket/SSE) | 1 week |
| 2 | Frontend migration (auth + 70 pages) | 6–8 weeks |
| 1–2 | Testing & integration | 2–3 weeks |
| 3 | PostgreSQL migration (optional) | 4 weeks |
| | **Total — 1 developer** | **~3–5 months** |
| | **Total — 2 developers in parallel** | **~2–3 months** |

---

## What Does NOT Change

- All UI components (shadcn/ui, Tailwind, layouts, design system)
- React Router structure and page organization
- Business logic already in frontend components
- The SSH terminal / WebSocket bridge

---

## Critical Files

### Full Rewrites
- `src/contexts/AuthContext.tsx`
- `src/lib/firebase-firestore.ts` → becomes HTTP client
- `src/lib/managed-users.ts`
- `src/config/firebase.ts` → removed
- `monitor/functions/index.js` → replaced by FastAPI

### Heavy Modifications
- All 70 files in `src/pages/`
- `src/lib/client-payments.ts`
- `src/lib/order-attachments.ts`

### New Files
```
backend/
├── main.py
├── auth/
├── routers/          (17 router files)
├── models/           (Pydantic models)
└── requirements.txt

Dockerfile            (frontend — nginx)
Dockerfile.backend    (FastAPI)
docker-compose.yml
.env.example
```

---

## Verification (End-to-End Test Plan)

1. `docker compose up` — both services start without errors
2. Login as each of the 4 roles (client, admin, engineer, technician)
3. Real-time: open two tabs, create an order, confirm it appears live in the other
4. File upload: attach a file to an order
5. Payment flow: submit a Baridi Mob payment
6. Admin: create/delete a managed user
7. Metrics ingestion: run the VPS agent, confirm data appears in monitoring dashboard
