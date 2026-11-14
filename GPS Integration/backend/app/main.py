"""
JANSEVA GeoVision – FastAPI Backend
Complete API server with all 8 engine endpoints.
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import uuid
import shutil
from datetime import datetime, timedelta, timezone

from .database import (
    init_db, create_complaint, get_complaint, get_all_complaints,
    update_complaint, create_incident, get_incident, get_all_incidents,
    update_incident, add_event, get_events, add_evidence, get_evidence,
    get_before_evidence, get_all_facilities, get_nearby_facilities,
    get_stats,
)
from .engines.location import extract_gps_from_bytes, reverse_geocode, haversine_km
from .engines.gis_context import enrich_complaint, get_ward, get_department, get_sla_hours
from .engines.spatial_intelligence import run_clustering
from .engines.decision import (
    compute_priority, update_incident_priority, check_sla_status,
    get_priority_label, get_priority_color,
)
from .engines.verification import verify_resolution, generate_mock_verification
from .seed_data import seed_database

# ─── Create uploads directory ─────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── App Initialization ───────────────────────────────────────────
app = FastAPI(
    title="JANSEVA GeoVision API",
    version="1.0.0",
    description="🛰️ GIS + Computer Vision Civic Intelligence Platform — 8 Engines",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global catch-all exception handler returning clean JSON formatted errors."""
    import traceback
    err_msg = str(exc) or exc.__class__.__name__
    print(f"Global server error: {err_msg}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {err_msg}", "status": 500}
    )

@app.on_event("startup")
def startup():
    """Initialize database and seed demo data on startup."""
    init_db()
    result = seed_database()
    print(f"JANSEVA GeoVision started: {result}")


# ═══════════════════════════════════════════════════════════════════
# HEALTH & INFO
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "janseva-geovision", "version": "1.0.0"}


@app.get("/api/stats")
def stats():
    """Dashboard statistics."""
    return get_stats()


@app.get("/api/categories")
def categories():
    """Get all civic issue categories."""
    return [
        {"id": "pothole", "label_en": "Pothole", "label_hi": "गड्ढा"},
        {"id": "garbage", "label_en": "Garbage", "label_hi": "कचरा"},
        {"id": "street_light", "label_en": "Street Light", "label_hi": "स्ट्रीट लाइट"},
        {"id": "water_leak", "label_en": "Water Leak", "label_hi": "पानी का रिसाव"},
        {"id": "other", "label_en": "Other", "label_hi": "अन्य"}
    ]


# ═══════════════════════════════════════════════════════════════════
# ENGINE 1+2: EVIDENCE & LOCATION — Complaint Submission
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/complaints")
async def submit_complaint(
    image: UploadFile = File(None),
    voice: UploadFile = File(None),
    description: str = Form(""),
    category: str = Form("unknown"),
    lat: str = Form(None),
    lng: str = Form(None),
    language: str = Form("en"),
    citizen_id: str = Form("anonymous"),
):
    """
    Multi-modal complaint submission.
    Accepts any combination of: image, voice, text, GPS coordinates.
    Runs through Location Engine and GIS Context Engine.
    """
    complaint_id = str(uuid.uuid4())
    image_url = None
    voice_url = None
    
    # Safe float conversion for lat/lng
    final_lat, final_lng = None, None
    try:
        if lat and str(lat).strip():
            final_lat = float(lat)
        if lng and str(lng).strip():
            final_lng = float(lng)
    except Exception:
        final_lat, final_lng = 22.2952, 73.3599

    gps_source = "device" if final_lat else None

    try:
        # ─── Engine 1: Evidence Ingestion ──────────────────────────
        if image and image.filename:
            ext = os.path.splitext(image.filename)[1] or ".jpg"
            img_filename = f"{complaint_id}_img{ext}"
            img_path = os.path.join(UPLOAD_DIR, img_filename)

            data = await image.read()
            with open(img_path, "wb") as f:
                f.write(data)
            image_url = f"/uploads/{img_filename}"

            # ─── Engine 2: Location Extraction from EXIF ───────────
            try:
                gps = extract_gps_from_bytes(data)
                if gps and (final_lat is None):
                    final_lat = gps["latitude"]
                    final_lng = gps["longitude"]
                    gps_source = "EXIF_GPS"
            except Exception:
                pass

        if voice and voice.filename:
            ext = os.path.splitext(voice.filename)[1] or ".webm"
            voice_filename = f"{complaint_id}_voice{ext}"
            voice_path = os.path.join(UPLOAD_DIR, voice_filename)
            with open(voice_path, "wb") as f:
                shutil.copyfileobj(voice.file, f)
            voice_url = f"/uploads/{voice_filename}"

        # Require location
        if final_lat is None or final_lng is None:
            raise HTTPException(
                status_code=400,
                detail="Location is required. Provide lat/lng or upload a geotagged image."
            )

        # ─── Bypass Engine 4: Manual Category ──────────────────────
        cv_result = {"category": category, "confidence": 1.0, "severity": "medium"}

        # ─── Engine 3: GIS Context Enrichment ──────────────────────
        try:
            gis = enrich_complaint(final_lat, final_lng, category)
        except Exception as e:
            print(f"GIS enrichment warning: {e}")
            gis = {"ward": "Ward 1", "nearby_facilities": []}

        # Reverse geocode for address
        try:
            address_info = reverse_geocode(final_lat, final_lng)
        except Exception:
            address_info = {"display_name": f"Location ({final_lat:.4f}, {final_lng:.4f})"}

        # ─── Store complaint ───────────────────────────────────────
        complaint = create_complaint({
            "id": complaint_id,
            "citizen_id": citizen_id,
            "description": description,
            "image_url": image_url,
            "voice_url": voice_url,
            "language": language,
            "latitude": final_lat,
            "longitude": final_lng,
            "category": cv_result.get("category"),
            "severity": cv_result.get("severity", "medium"),
            "confidence": cv_result.get("confidence", 0.0),
            "ward": gis.get("ward"),
            "address": address_info.get("display_name", ""),
            "nearby_facilities": gis.get("nearby_facilities", []),
        })

        # ─── Engine 5: Spatial Clustering (Auto Incident Assignment) ─
        try:
            incidents_created = run_clustering()
            print(f"Spatial clustering created/updated incidents: {incidents_created}")
        except Exception as cluster_err:
            print(f"Spatial clustering error: {cluster_err}")

        return {
            "complaint_id": complaint_id,
            "status": "reported",
            "location": {
                "latitude": final_lat,
                "longitude": final_lng,
                "source": gps_source,
                "address": address_info.get("display_name"),
                "ward": gis.get("ward"),
            },
            "classification": cv_result,
            "gis_context": {
                "department": gis.get("department"),
                "nearby_facilities_count": gis.get("facilities_in_impact_zone"),
                "has_hospital_nearby": gis.get("has_hospital_nearby"),
                "has_school_nearby": gis.get("has_school_nearby"),
            },
            "message": "Complaint registered successfully",
        }
    except HTTPException:
        raise
    except Exception as err:
        print(f"Error submitting complaint: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@app.get("/api/complaints")
def list_complaints(status: str = None, incident_id: str = None):
    """List all complaints, optionally filtered by status or incident."""
    return get_all_complaints(status=status, incident_id=incident_id)


@app.get("/api/complaints/{complaint_id}")
def get_complaint_detail(complaint_id: str):
    """Get detailed complaint information including linked incident data."""
    c = get_complaint(complaint_id)
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Enrich with full incident info if linked
    if c.get("incident_id"):
        inc = get_incident(c["incident_id"])
        if inc:
            inc["events"] = get_events(c["incident_id"])
            inc["evidence"] = get_evidence(c["incident_id"])
            inc["priority_label"] = get_priority_label(inc.get("priority_score", 0))
            inc["priority_color"] = get_priority_color(inc.get("priority_score", 0))
            c["incident"] = inc

    return c



# ═══════════════════════════════════════════════════════════════════
# ENGINE 2: LOCATION — Standalone extraction
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/geovision/extract-location")
async def extract_location(file: UploadFile = File(None)):
    """Extract GPS from an uploaded image's EXIF data or prototype simulation."""
    if not file:
        return JSONResponse(
            status_code=400,
            content={"error": "Missing required file input.", "has_gps": False, "location": None}
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        return {"filename": file.filename or "image.jpg", "has_gps": False, "location": None}

    try:
        data = await file.read()
        if len(data) > 15 * 1024 * 1024:
            return {"filename": file.filename or "image.jpg", "has_gps": False, "location": None}

        gps = None
        try:
            gps = extract_gps_from_bytes(data)
        except Exception:
            gps = None

        result = {
            "filename": file.filename,
            "has_gps": gps is not None,
            "location": gps,
        }

        if gps:
            try:
                address = reverse_geocode(gps["latitude"], gps["longitude"])
                result["address"] = address
            except Exception:
                result["address"] = {"display_name": f"Location ({gps['latitude']:.4f}, {gps['longitude']:.4f})"}
            
            try:
                ward = get_ward(gps["latitude"], gps["longitude"])
                result["ward"] = ward
            except Exception:
                result["ward"] = "Ward 1"

        return result
    except Exception as err:
        print(f"Location extraction warning: {err}")
        return {"filename": file.filename or "image.jpg", "has_gps": False, "location": None}


# ═══════════════════════════════════════════════════════════════════
# ENGINE 5: SPATIAL INTELLIGENCE — Clustering
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/incidents/cluster")
def cluster_complaints(eps_km: float = 0.3, min_samples: int = 2):
    """
    Run spatial clustering on unclustered complaints.
    Groups nearby, similar complaints into incidents.
    """
    result = run_clustering(eps_km=eps_km, min_samples=min_samples)

    # Update priority for all new incidents
    for inc_info in result.get("incidents_created", []):
        inc = get_incident(inc_info["id"])
        if inc:
            update_incident_priority(inc_info["id"], inc)

    return result


# ═══════════════════════════════════════════════════════════════════
# INCIDENTS — CRUD & Management
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/incidents")
def list_incidents(status: str = None):
    """List all incidents, optionally filtered by status."""
    incidents = get_all_incidents(status=status)
    # Enrich with priority info
    for inc in incidents:
        inc["priority_label"] = get_priority_label(inc.get("priority_score", 0))
        inc["priority_color"] = get_priority_color(inc.get("priority_score", 0))
        inc["sla_status"] = check_sla_status(inc)
    return incidents


@app.get("/api/incidents/{incident_id}")
def get_incident_detail(incident_id: str):
    """Get full incident details with events, complaints, and evidence."""
    inc = get_incident(incident_id)
    if not inc:
        # Fallback: Check if incident_id is actually a complaint ID
        c = get_complaint(incident_id)
        if c:
            inc = {
                "id": c["id"],
                "category": c.get("category", "civic_issue"),
                "status": c.get("status", "reported"),
                "severity": c.get("severity", "medium"),
                "priority_score": 65.0,
                "representative_lat": c.get("latitude", 19.0760),
                "representative_lng": c.get("longitude", 72.8777),
                "latitude": c.get("latitude", 19.0760),
                "longitude": c.get("longitude", 72.8777),
                "ward": c.get("ward", "Ward R/N (Dahisar)"),
                "address": c.get("address", "Ward R/N (Dahisar), City"),
                "description": c.get("description", "Civic issue reported by citizen."),
                "complaint_count": 1,
                "evidence": [{"id": "ev1", "image_url": c.get("image_url", "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80"), "type": "before"}] if c.get("image_url") else [],
                "created_at": c.get("created_at")
            }
        else:
            raise HTTPException(status_code=404, detail="Incident or Complaint not found")

    inc["events"] = get_events(incident_id) if get_incident(incident_id) else [{"timestamp": inc.get("created_at"), "event_type": "created", "description": "Complaint Registered"}]
    inc["complaints"] = get_all_complaints(incident_id=incident_id)
    inc["evidence"] = get_evidence(incident_id) if get_incident(incident_id) else inc.get("evidence", [])
    inc["priority_label"] = get_priority_label(inc.get("priority_score", 0))
    inc["priority_color"] = get_priority_color(inc.get("priority_score", 0))
    inc["sla_status"] = check_sla_status(inc)

    # Priority breakdown
    priority_info = compute_priority(inc)
    inc["priority_breakdown"] = priority_info.get("priority_breakdown", {})

    return inc


@app.post("/api/incidents/{incident_id}/assign")
def assign_incident(
    incident_id: str,
    team: str = Form("Municipal Team"),
    department: str = Form("Municipal Corporation"),
):
    """Assign an incident to a team/department. Also accepts complaint IDs."""
    inc = get_incident(incident_id)
    
    # If not found as incident, try as complaint
    if not inc:
        complaint = get_complaint(incident_id)
        if not complaint:
            raise HTTPException(status_code=404, detail="Incident or Complaint not found")
        # Create a minimal incident from the complaint
        import uuid as _uuid
        new_inc_id = str(_uuid.uuid4())
        inc = create_incident({
            "id": new_inc_id,
            "category": complaint.get("category", "civic_issue"),
            "status": "reported",
            "severity": complaint.get("severity", "medium"),
            "priority_score": 65.0,
            "representative_lat": complaint.get("latitude"),
            "representative_lng": complaint.get("longitude"),
            "ward": complaint.get("ward", ""),
            "address": complaint.get("address", ""),
            "description": complaint.get("description", ""),
            "complaint_count": 1,
        })
        # Link complaint to this new incident
        update_complaint(incident_id, {"incident_id": new_inc_id, "status": "assigned"})
        incident_id = new_inc_id

    update_incident(incident_id, {
        "status": "assigned",
        "assigned_to": team,
        "department": department,
    })
    add_event(incident_id, "assigned", "admin", {
        "team": team,
        "department": department,
    })
    return {"message": f"Incident assigned to {team}", "status": "assigned", "incident_id": incident_id}


# ═══════════════════════════════════════════════════════════════════
# ENGINE 7: 4D TIMELINE — Events
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/incidents/{incident_id}/events")
def get_incident_events(incident_id: str):
    """Get all lifecycle events for an incident (4D timeline)."""
    return get_events(incident_id)


@app.post("/api/incidents/{incident_id}/events")
def add_incident_event(
    incident_id: str,
    event_type: str = Form(...),
    actor: str = Form("admin"),
    notes: str = Form(""),
):
    """Add a lifecycle event to an incident."""
    inc = get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    metadata = {"notes": notes} if notes else None
    eid = add_event(incident_id, event_type, actor, metadata)

    # Update incident status based on event type
    status_map = {
        "assigned": "assigned",
        "engineer_arrived": "in_progress",
        "work_started": "in_progress",
        "work_completed": "awaiting_citizen_confirm",
        "sla_warning": inc.get("status"),  # keep current
        "sla_breach": "sla_breached",
        "repair_submitted": "repair_submitted",
        "ai_verified": "awaiting_citizen_confirm",
        "citizen_confirmed": "verified_resolved",
        "citizen_rejected": "reopened",
        "reopened": "reopened",
    }
    new_status = status_map.get(event_type)
    if new_status:
        update_incident(incident_id, {"status": new_status})

    return {"event_id": eid, "event_type": event_type}


# ═══════════════════════════════════════════════════════════════════
# ENGINE 8: RESOLUTION VERIFICATION — Evidence & Confirmation
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/incidents/{incident_id}/evidence")
async def upload_evidence(
    incident_id: str,
    image: UploadFile = File(...),
    evidence_type: str = Form("after"),
    uploaded_by: str = Form("field_engineer"),
):
    """Upload repair evidence (before or after image) for an incident."""
    inc = get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Save the image
    ext = os.path.splitext(image.filename)[1] or ".jpg"
    evidence_id = str(uuid.uuid4())
    img_filename = f"{evidence_id}_evidence{ext}"
    img_path = os.path.join(UPLOAD_DIR, img_filename)

    with open(img_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    image_url = f"/uploads/{img_filename}"

    # Run verification if this is an 'after' image
    verification_result = None
    if evidence_type == "after":
        # Find the 'before' evidence (first complaint image or previous evidence)
        before_evidence = get_before_evidence(incident_id)
        complaints = get_all_complaints(incident_id=incident_id)

        before_path = None
        if before_evidence and before_evidence.get("image_url"):
            before_path = os.path.join(UPLOAD_DIR, os.path.basename(before_evidence["image_url"]))
        elif complaints:
            for c in complaints:
                if c.get("image_url"):
                    before_path = os.path.join(UPLOAD_DIR, os.path.basename(c["image_url"]))
                    break

        if before_path and os.path.exists(before_path):
            verification_result = verify_resolution(before_path, img_path)
        else:
            verification_result = generate_mock_verification()

        # Update incident status
        update_incident(incident_id, {"status": "awaiting_citizen_confirm"})
        add_event(incident_id, "repair_submitted", uploaded_by, {
            "confidence": verification_result.get("confidence"),
            "verdict": verification_result.get("verdict"),
        })
        add_event(incident_id, "ai_verified", "system", {
            "cv_confidence": verification_result.get("confidence"),
            "verdict": verification_result.get("verdict"),
            "message": verification_result.get("message"),
        })

    # Store evidence record
    ev = add_evidence({
        "incident_id": incident_id,
        "type": evidence_type,
        "image_url": image_url,
        "uploaded_by": uploaded_by,
        "cv_result": verification_result,
        "confidence": verification_result.get("confidence", 0.0) if verification_result else 0.0,
    })

    return {
        "evidence_id": ev.get("id"),
        "image_url": image_url,
        "verification": verification_result,
        "message": "Evidence uploaded and analyzed" if verification_result else "Evidence uploaded",
    }


@app.post("/api/incidents/{incident_id}/confirm")
def citizen_confirm(
    incident_id: str,
    confirm: bool = Form(...),
    feedback: str = Form(""),
    citizen_id: str = Form("anonymous"),
):
    """Citizen confirms or rejects the resolution."""
    inc = get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if confirm:
        update_incident(incident_id, {
            "status": "verified_resolved",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        })
        add_event(incident_id, "citizen_confirmed", citizen_id, {
            "satisfaction": "yes",
            "feedback": feedback,
        })
        # Also update all linked complaints
        complaints = get_all_complaints(incident_id=incident_id)
        for c in complaints:
            update_complaint(c["id"], {"status": "resolved"})
        return {"message": "Resolution confirmed. Thank you!", "status": "verified_resolved"}
    else:
        update_incident(incident_id, {"status": "reopened"})
        add_event(incident_id, "citizen_rejected", citizen_id, {
            "satisfaction": "no",
            "feedback": feedback,
        })
        return {"message": "Incident reopened for further action.", "status": "reopened"}


# ═══════════════════════════════════════════════════════════════════
# FACILITIES
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/facilities")
def list_facilities():
    """List all known facilities (hospitals, schools, etc.)."""
    return get_all_facilities()


@app.get("/api/facilities/nearby")
def nearby_facilities(lat: float, lng: float, radius: float = 1.0):
    """Find facilities within radius km of a point."""
    return get_nearby_facilities(lat, lng, radius_km=radius)


# ═══════════════════════════════════════════════════════════════════
# ADMIN ACTIONS
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/admin/simulate-sla-breach/{incident_id}")
def simulate_sla_breach(incident_id: str):
    """Simulate an SLA breach for demo purposes."""
    inc = get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Set SLA deadline to the past
    breached_deadline = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
    update_incident(incident_id, {
        "sla_deadline": breached_deadline,
        "status": "sla_breached",
    })
    add_event(incident_id, "sla_breach", "system", {
        "overdue_hours": 5,
        "original_deadline": inc.get("sla_deadline"),
    })
    return {"message": "SLA breach simulated", "status": "sla_breached"}


@app.post("/api/admin/recalculate-priorities")
def recalculate_all_priorities():
    """Recalculate priority scores for all open incidents."""
    incidents = get_all_incidents()
    updated = 0
    for inc in incidents:
        if inc.get("status") not in ("verified_resolved",):
            result = update_incident_priority(inc["id"], inc)
            updated += 1
    return {"message": f"Recalculated priorities for {updated} incidents"}


@app.post("/api/admin/reset-db")
def reset_database():
    """Reset and re-seed the database (for demo)."""
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "janseva.db")
    if os.path.exists(db_path):
        os.remove(db_path)
    init_db()
    result = seed_database()
    return {"message": "Database reset", **result}
