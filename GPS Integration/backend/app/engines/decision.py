"""
JANSEVA GeoVision – Engine 6+7: Decision Engine
Priority scoring (0-100) based on complaint count, facility proximity, severity, SLA status.
Impact radius calculation for the 3D visualization.
"""
from datetime import datetime, timezone
from ..database import get_nearby_facilities, update_incident, add_event, get_events


SEVERITY_SCORE = {
    "critical": 40,
    "high": 25,
    "medium": 15,
    "low": 5,
}

FACILITY_WEIGHTS = {
    "hospital": 15,
    "school": 12,
    "fire_station": 10,
    "police_station": 8,
    "bus_stop": 5,
    "market": 4,
}


def compute_priority(incident: dict) -> dict:
    """
    Compute priority score (0-100) for an incident based on:
    - Number of linked complaints
    - Severity level
    - Proximity to critical facilities
    - SLA status (breached = higher priority)
    
    Returns updated incident dict with priority_score and impact_radius.
    """
    score = 0
    details = {}

    # 1. Complaint count contribution (max 30 points)
    complaint_count = incident.get("complaint_count", 1)
    complaint_score = min(30, complaint_count * 6)
    score += complaint_score
    details["complaint_score"] = complaint_score

    # 2. Severity contribution (max 40 points)
    severity = incident.get("severity", "medium")
    severity_score = SEVERITY_SCORE.get(severity, 15)
    score += severity_score
    details["severity_score"] = severity_score

    # 3. Facility proximity contribution (max 20 points)
    lat = incident.get("representative_lat", 0)
    lng = incident.get("representative_lng", 0)
    
    if lat and lng:
        facilities = get_nearby_facilities(lat, lng, radius_km=1.0)
        facility_score = 0
        for f in facilities:
            weight = FACILITY_WEIGHTS.get(f.get("type", ""), 3)
            # Closer facilities get more weight
            dist_factor = max(0.1, 1.0 - f.get("distance_km", 1.0))
            facility_score += weight * dist_factor
        facility_score = min(20, int(facility_score))
        score += facility_score
        details["facility_score"] = facility_score
        details["nearby_facilities_count"] = len(facilities)
    else:
        details["facility_score"] = 0
        details["nearby_facilities_count"] = 0

    # 4. SLA status contribution (max 10 points)
    sla_deadline = incident.get("sla_deadline")
    sla_score = 0
    if sla_deadline:
        try:
            deadline = datetime.fromisoformat(sla_deadline.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            if now > deadline:
                sla_score = 10  # SLA breached
                details["sla_status"] = "breached"
            elif (deadline - now).total_seconds() < 3600 * 6:
                sla_score = 7  # SLA warning (< 6 hours)
                details["sla_status"] = "warning"
            else:
                hours_remaining = (deadline - now).total_seconds() / 3600
                details["sla_status"] = f"{int(hours_remaining)}h remaining"
        except Exception:
            pass
    score += sla_score
    details["sla_score"] = sla_score

    # Final score (cap at 100)
    final_score = min(100, score)
    details["total"] = final_score

    # Compute impact radius based on severity and complaint count
    base_radius = {"critical": 800, "high": 600, "medium": 400, "low": 250}.get(severity, 400)
    impact_radius = min(2000, base_radius + complaint_count * 50)

    return {
        "priority_score": final_score,
        "impact_radius": impact_radius,
        "priority_breakdown": details,
    }


def update_incident_priority(incident_id: str, incident: dict):
    """Compute and persist priority score for an incident."""
    result = compute_priority(incident)
    update_incident(incident_id, {
        "priority_score": result["priority_score"],
        "impact_radius": result["impact_radius"],
    })
    return result


def check_sla_status(incident: dict) -> str:
    """Check if SLA is breached, warning, or on-track."""
    sla_deadline = incident.get("sla_deadline")
    if not sla_deadline:
        return "no_sla"
    try:
        deadline = datetime.fromisoformat(sla_deadline.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if now > deadline:
            return "breached"
        elif (deadline - now).total_seconds() < 3600 * 6:
            return "warning"
        return "on_track"
    except Exception:
        return "unknown"


def get_priority_label(score: int) -> str:
    """Human-readable priority label."""
    if score >= 80:
        return "CRITICAL"
    elif score >= 60:
        return "HIGH"
    elif score >= 35:
        return "MEDIUM"
    return "LOW"


def get_priority_color(score: int) -> str:
    """Hex color for priority visualization."""
    if score >= 80:
        return "#FF1744"  # Red
    elif score >= 60:
        return "#FF9100"  # Orange
    elif score >= 35:
        return "#FFC400"  # Yellow
    return "#00E676"  # Green
