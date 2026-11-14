from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


# ============================================================
# PATH SETUP
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

SRC_DIR = BASE_DIR / "src"
DATABASE_DIR = BASE_DIR / "database"

sys.path.insert(0, str(SRC_DIR))
sys.path.insert(0, str(DATABASE_DIR))


# ============================================================
# IMPORT AI + DATABASE
# ============================================================

from analyzer import analyze

from database import (
    initialize_database,
    get_existing_complaints,
    save_complaint,
    get_all_complaints,
    get_complaint_by_id,
    update_complaint_status,
    assign_complaint,
    get_complaint_history,
    get_dashboard_stats,
    VALID_STATUSES
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SIH1516 AI Grievance Engine",
    description=(
        "AI-powered grievance classification, department routing, "
        "priority analysis, duplicate detection, assignment and "
        "complaint tracking"
    ),
    version="3.1.0"
)


# Initialize database and run migrations
initialize_database()


# ============================================================
# REQUEST MODELS
# ============================================================

class ComplaintRequest(BaseModel):
    complaint: str
    latitude: float | None = None
    longitude: float | None = None


class StatusUpdateRequest(BaseModel):
    status: str


class AssignmentRequest(BaseModel):
    assigned_to: str


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "service": "SIH1516 AI Grievance Engine",
        "version": "3.1.0"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# ============================================================
# ANALYZE + SAVE NEW COMPLAINT
# ============================================================

@app.post("/analyze")
def analyze_grievance(request: ComplaintRequest):

    # Get previously stored complaints
    # for duplicate detection
    existing_complaints = get_existing_complaints()

    # Run complete AI grievance engine
    result = analyze(
        request.complaint,
        existing_complaints,
        request.latitude,
        request.longitude
    )

    # Save complaint and AI analysis
    complaint_id = save_complaint(
        request.complaint,
        request.latitude,
        request.longitude,
        result
    )

    return {
        "success": True,
        "complaint_id": complaint_id,
        "status": "SUBMITTED",
        "analysis": result
    }


# ============================================================
# GET ALL COMPLAINTS
# ============================================================

@app.get("/complaints")
def complaints(
    status: str | None = None,
    priority: str | None = None,
    department: str | None = None
):

    data = get_all_complaints(
        status=status,
        priority=priority,
        department=department
    )

    return {
        "success": True,
        "count": len(data),

        "filters": {
            "status": status,
            "priority": priority,
            "department": department
        },

        "complaints": data
    }


# ============================================================
# GET ONE COMPLAINT
# ============================================================

@app.get("/complaints/{complaint_id}")
def complaint_details(
    complaint_id: int
):

    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:

        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    return {
        "success": True,
        "complaint": complaint
    }


# ============================================================
# UPDATE COMPLAINT STATUS
# ============================================================

@app.patch("/complaints/{complaint_id}/status")
def change_complaint_status(
    complaint_id: int,
    request: StatusUpdateRequest
):

    new_status = request.status.upper()

    # Validate requested status
    if new_status not in VALID_STATUSES:

        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid complaint status",
                "allowed_statuses": VALID_STATUSES
            }
        )

    # Check complaint exists
    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:

        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    # Update status
    updated = update_complaint_status(
        complaint_id,
        new_status
    )

    if not updated:

        raise HTTPException(
            status_code=500,
            detail="Unable to update complaint"
        )

    # Return updated complaint
    updated_complaint = get_complaint_by_id(
        complaint_id
    )

    return {
        "success": True,
        "message": "Complaint status updated",
        "complaint": updated_complaint
    }


# ============================================================
# ASSIGN COMPLAINT TO OFFICER / TEAM
# ============================================================

@app.post("/complaints/{complaint_id}/assign")
def assign_complaint_endpoint(
    complaint_id: int,
    request: AssignmentRequest
):

    # --------------------------------------------------------
    # CHECK COMPLAINT EXISTS
    # --------------------------------------------------------

    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:

        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )


    # --------------------------------------------------------
    # VALIDATE ASSIGNMENT
    # --------------------------------------------------------

    assigned_to = request.assigned_to.strip()

    if not assigned_to:

        raise HTTPException(
            status_code=400,
            detail="assigned_to cannot be empty"
        )


    # --------------------------------------------------------
    # ASSIGN COMPLAINT
    # --------------------------------------------------------

    updated = assign_complaint(
        complaint_id,
        assigned_to
    )

    if not updated:

        raise HTTPException(
            status_code=500,
            detail="Unable to assign complaint"
        )


    # --------------------------------------------------------
    # GET UPDATED COMPLAINT
    # --------------------------------------------------------

    updated_complaint = get_complaint_by_id(
        complaint_id
    )


    return {
        "success": True,
        "message": "Complaint assigned successfully",
        "complaint": updated_complaint
    }

# ============================================================
# GET COMPLAINT HISTORY
# ============================================================

@app.get("/complaints/{complaint_id}/history")
def complaint_history(
    complaint_id: int
):

    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:

        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    history = get_complaint_history(
        complaint_id
    )

    return {
        "success": True,
        "complaint_id": complaint_id,
        "current_status": complaint["status"],
        "history": history
    }


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@app.get("/dashboard/stats")
def dashboard_stats():

    stats = get_dashboard_stats()

    return {
        "success": True,
        "stats": stats
    }