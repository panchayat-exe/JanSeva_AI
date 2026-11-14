"""
JANSEVA GeoVision – Engine 3: GIS Context Engine
Converts coordinates into ward, zone, nearby facilities, and address.
Uses pre-defined ward boundary polygons for Mumbai.
"""
import math
from ..database import get_nearby_facilities


# ─── Ward Boundaries (simplified polygons for Mumbai) ──────────────
# Each ward is defined as a bounding box: (min_lat, min_lng, max_lat, max_lng)
# In production, use proper GeoJSON shapefiles. For demo, bounding boxes work.

WARD_BOUNDARIES = {
    "Ward A (Fort/Colaba)": (18.900, 72.800, 18.940, 72.840),
    "Ward B (Sandhurst Road)": (18.940, 72.825, 18.960, 72.845),
    "Ward C (Marine Lines)": (18.935, 72.810, 18.955, 72.830),
    "Ward D (Grant Road)": (18.955, 72.810, 18.975, 72.835),
    "Ward E (Byculla)": (18.970, 72.825, 18.990, 72.845),
    "Ward F/N (Matunga)": (19.010, 72.840, 19.030, 72.870),
    "Ward G/N (Dadar)": (19.015, 72.835, 19.035, 72.855),
    "Ward H/E (Bandra East)": (19.050, 72.830, 19.070, 72.860),
    "Ward H/W (Bandra West)": (19.050, 72.810, 19.070, 72.835),
    "Ward K/E (Andheri East)": (19.100, 72.845, 19.130, 72.880),
    "Ward K/W (Andheri West)": (19.110, 72.820, 19.140, 72.850),
    "Ward L (Kurla)": (19.060, 72.865, 19.090, 72.895),
    "Ward M/E (Chembur)": (19.040, 72.880, 19.080, 72.920),
    "Ward N (Ghatkopar)": (19.070, 72.895, 19.100, 72.930),
    "Ward P/N (Malad)": (19.155, 72.830, 19.195, 72.870),
    "Ward R/N (Dahisar)": (19.230, 72.835, 19.265, 72.870),
    "Ward R/S (Kandivali)": (19.195, 72.835, 19.235, 72.870),
    "Ward S (Borivali)": (19.215, 72.830, 19.260, 72.870),
    "Ward T (Mulund)": (19.155, 72.930, 19.185, 72.970),
}

DEPARTMENT_MAP = {
    "pothole": "Road & Infrastructure Dept.",
    "garbage": "Solid Waste Management Dept.",
    "water leak": "Water Supply & Sewerage Dept.",
    "streetlight": "Electrical Maintenance Dept.",
    "flooding": "Storm Water Drain Dept.",
    "footpath": "Road & Infrastructure Dept.",
    "drain": "Storm Water Drain Dept.",
    "default": "Municipal Corporation",
}

SEVERITY_SLA = {
    "critical": 24,   # hours
    "high": 48,
    "medium": 72,
    "low": 120,
}


def get_ward(lat: float, lng: float) -> str:
    """Determine which ward a point falls in using bounding box check."""
    for ward_name, (min_lat, min_lng, max_lat, max_lng) in WARD_BOUNDARIES.items():
        if min_lat <= lat <= max_lat and min_lng <= lng <= max_lng:
            return ward_name
    # Fallback: find closest ward centre
    best_ward = "Unknown Ward"
    best_dist = float("inf")
    for ward_name, (min_lat, min_lng, max_lat, max_lng) in WARD_BOUNDARIES.items():
        centre_lat = (min_lat + max_lat) / 2
        centre_lng = (min_lng + max_lng) / 2
        dist = math.sqrt((lat - centre_lat) ** 2 + (lng - centre_lng) ** 2)
        if dist < best_dist:
            best_dist = dist
            best_ward = ward_name
    return best_ward


def get_department(category: str) -> str:
    """Map issue category to responsible municipal department."""
    if not category:
        return DEPARTMENT_MAP["default"]
    cat_lower = category.lower()
    for key, dept in DEPARTMENT_MAP.items():
        if key in cat_lower:
            return dept
    return DEPARTMENT_MAP["default"]


def get_sla_hours(severity: str) -> int:
    """Get SLA deadline in hours based on severity."""
    return SEVERITY_SLA.get(severity, 72)


def enrich_complaint(lat: float, lng: float, category: str = None) -> dict:
    """
    Full GIS context enrichment for a complaint location.
    Returns ward, department, nearby facilities, and SLA info.
    """
    ward = get_ward(lat, lng)
    department = get_department(category)
    facilities = get_nearby_facilities(lat, lng, radius_km=1.0)

    return {
        "ward": ward,
        "department": department,
        "nearby_facilities": facilities,
        "facilities_in_impact_zone": len(facilities),
        "has_hospital_nearby": any(f["type"] == "hospital" for f in facilities),
        "has_school_nearby": any(f["type"] == "school" for f in facilities),
    }
