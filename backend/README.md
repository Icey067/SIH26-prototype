# Samanvay-AI: Central Backend & AI Optimization Engine
**Problem ID:** SIH-26027  
**Title:** AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways

---

## 1. Overview
The **Samanvay-AI** backend is the central operational brain connecting the React Control Room Dashboard and the Field Engineer Mobile App (`IronSentinel`). It unifies maintenance backlogs from legacy Indian Railways systems:
- **TMS** (Track Management System - Civil / Engineering)
- **SMMS** (Signal Maintenance Management System - S&T)
- **TDMS** (Traction Distribution Management System - Electrical / OHE)
- **COA** (Control Office Application - Passenger & Freight Timetable Schedules)

It uses **Google OR-Tools (CP-SAT constraint programming)** to bundle multi-department maintenance requests into optimal timetable gaps, minimizing train delays and preventing block bursts.

---

## 2. Directory Structure

```text
backend/
├── app/
│   ├── main.py                     # FastAPI application entrypoint & CORS
│   ├── core/
│   │   ├── config.py               # Pydantic Settings & environment config
│   │   └── database.py             # SQLAlchemy engine & session factory
│   ├── models/
│   │   ├── user.py                 # Section Controller & Field Engineer accounts
│   │   ├── track_section.py        # Indian Railways corridor segments & lines
│   │   ├── defect.py               # TMS, SMMS, TDMS defects & criticality
│   │   ├── timetable.py            # COA train paths, priorities & transit slots
│   │   └── block.py                # Maintenance blocks, bundles & PTW exchange
│   ├── schemas/
│   │   ├── common.py               # Enums (Department, Severity, BlockStatus)
│   │   ├── defect.py               # Defect request/response validation
│   │   ├── block.py                # Block creation, approval, execution schemas
│   │   ├── timetable.py            # Timetable and traffic gap models
│   │   └── sync.py                 # Offline mobile downstream/upstream contracts
│   ├── api/
│   │   └── v1/
│   │       ├── api_router.py       # Consolidated API router
│   │       ├── defects.py          # Defect CRUD & scoring endpoints
│   │       ├── blocks.py           # Block planning & OR-Tools CP-SAT generator
│   │       ├── timetable.py        # Timetable gap analysis
│   │       └── sync.py             # Mobile delta sync (downstream & upstream)
│   └── services/
│       ├── defect_scorer.py        # ML Criticality Scoring Engine (0-100)
│       └── block_optimizer.py      # Google OR-Tools CP-SAT timetable bundler
├── data/
│   └── seed_data.py                # Synthetic seeder (Prayagraj/NCR Golden Corridor)
├── tests/
│   ├── conftest.py                 # Pytest session fixtures
│   ├── test_api.py                 # Endpoints & optimization test suite
│   └── test_sync.py                # Mobile synchronization test suite
├── .env.example
├── requirements.txt
└── Dockerfile
```

---

## 3. Quickstart Guide

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Seed the Database with Indian Railways Corridor Data
Populates the Prayagraj Division (NCR) Ghaziabad-Tundla-Kanpur high-density corridor, Vande Bharat/Rajdhani/Freight timetables, and multi-department defects:
```bash
python data/seed_data.py
```

### Step 3: Run the FastAPI Server
```bash
uvicorn app.main:app --reload --port 8000
```
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Alternative ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`

### Step 4: Run Automated Tests
```bash
pytest -v
```

---

## 4. Key Endpoints & API Highlights

### A. Mobile Offline Synchronization
- **Downstream Sync (`GET /api/v1/sync/downstream`)**:
  Fetches approved blocks, active TSRs, and open defects for local Room/SQLite caching in `IronSentinel`.
- **Upstream Sync (`POST /api/v1/sync/upstream`)**:
  Idempotent batch ingestion for offline-queued field defects, block demands, and protocol updates.

### B. Defect Criticality Scoring (`GET /api/v1/defects`)
Evaluates composite risk (0-100) considering:
- Base severity (CRITICAL P1, MAJOR P2, MINOR P3)
- Speed restriction severity (e.g. 30 kmph TSR = +25 pts)
- System risk factor (TMS rail cracks carry direct derailment risk)
- Aging backlog penalty

### C. Google OR-Tools Constraint Optimizer (`POST /api/v1/blocks/optimize/generate`)
- Scans train transit schedules across the corridor line.
- Identifies natural traffic gaps (e.g., 105–135 minute intervals between express trains).
- Clusters cross-department defects (Track + Signal + OHE) within spatial threshold (e.g. 8 km).
- Maximizes total criticality score resolved while guaranteeing no block burst or timetable collision.
