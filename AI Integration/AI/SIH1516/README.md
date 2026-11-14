# SIH1516 AI Grievance Engine

AI-powered grievance processing engine for SIH1516.

## Features

The engine performs:

- Complaint classification
- Subcategory detection
- Category detection
- Department routing
- Confidence scoring
- Priority detection
- Critical/high-risk indicator detection
- Duplicate complaint detection
- Location-aware duplicate checking
- Complaint storage
- Complaint assignment
- Complaint status tracking
- Complaint history
- Dashboard statistics

---

## Setup

### 1. Open project

```powershell
cd "D:\SIH 2026\SIH1516"
```

### 2. Create virtual environment

```powershell
python -m venv venv
```

### 3. Activate virtual environment

```powershell
.\venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```powershell
pip install -r requirements.txt
```

### 5. Start API server

```powershell
python -m uvicorn api.main:app --reload
```

Server:

`http://127.0.0.1:8000`

Swagger documentation:

`http://127.0.0.1:8000/docs`

---

# API Endpoints

## Analyze Complaint

`POST /analyze`

Example request:

```json
{
  "complaint": "live electric wire fallen on road, person injured",
  "latitude": 22.3050,
  "longitude": 73.1900
}
```

The engine returns classification, department, confidence,
priority, risk indicators and duplicate information.

---

## Get Complaints

`GET /complaints`

Optional filters:

- status
- priority
- department

Example:

`GET /complaints?priority=CRITICAL`

---

## Get Complaint

`GET /complaints/{complaint_id}`

---

## Assign Complaint

`POST /complaints/{complaint_id}/assign`

Used to assign a complaint to a responsible team.

---

## Update Status

`PATCH /complaints/{complaint_id}/status`

Complaint lifecycle:

`SUBMITTED → ASSIGNED → IN_PROGRESS → RESOLVED`

---

## Complaint History

`GET /complaints/{complaint_id}/history`

Returns the lifecycle/history of a complaint.

---

## Dashboard Statistics

`GET /dashboard/stats`

Returns complaint counts by status and priority.

---

# Main Project Structure

```text
SIH1516/
│
├── api/
│   └── main.py
│
├── Src/
│   ├── analyzer.py
│   ├── predict.py
│   ├── priority.py
│   └── duplicate.py
│
├── Models/
│   ├── complaint_classifier.pkl
│   └── tfidf_vectorizer.pkl
│
├── database/
│   ├── database.py
│   └── complaints.db
│
├── requirements.txt
└── README.md
```

---

# Integration Flow

Frontend / Application

↓

Backend

↓

SIH1516 Grievance API

↓

AI Analysis

↓

Classification + Priority + Duplicate Detection + Routing

↓

Complaint Database

↓

Assignment → Progress → Resolution