"""
JANSEVA GeoVision – Seed Data
Pre-populates the database with realistic demo data for Mumbai.
Includes complaints, facilities, incidents, and timeline events.
"""
import uuid
from datetime import datetime, timedelta, timezone
from .database import (
    init_db, get_db, create_complaint, create_incident, update_complaint,
    add_event, add_evidence, add_facility, get_all_complaints, get_all_incidents,
    update_incident,
)


# ─── Mumbai Facilities ────────────────────────────────────────────

FACILITIES = [
    ("KEM Hospital", "hospital", 19.0005, 72.8416),
    ("Lilavati Hospital", "hospital", 19.0509, 72.8283),
    ("Hinduja Hospital", "hospital", 19.0375, 72.8342),
    ("Sion Hospital", "hospital", 19.0413, 72.8628),
    ("Nair Hospital", "hospital", 18.9855, 72.8310),
    ("Cooper Hospital", "hospital", 19.1025, 72.8373),
    ("Mumbai University", "school", 18.9296, 72.8313),
    ("IIT Bombay", "school", 19.1334, 72.9133),
    ("St. Xavier's College", "school", 18.9393, 72.8316),
    ("Bombay Scottish School", "school", 19.0479, 72.8332),
    ("NMIMS University", "school", 19.1079, 72.8370),
    ("Andheri Fire Station", "fire_station", 19.1192, 72.8466),
    ("Bandra Fire Station", "fire_station", 19.0555, 72.8357),
    ("Bandra Police Station", "police_station", 19.0543, 72.8340),
    ("Andheri Station Bus Stop", "bus_stop", 19.1195, 72.8469),
    ("Bandra Station Bus Stop", "bus_stop", 19.0548, 72.8401),
    ("Crawford Market", "market", 18.9472, 72.8340),
    ("Linking Road Market", "market", 19.0644, 72.8338),
]

# ─── Pre-seeded Complaints ────────────────────────────────────────

DEMO_COMPLAINTS = [
    # Cluster 1: Potholes near Bandra West (3 complaints, should cluster)
    {
        "description": "Large pothole on Turner Road near Lucky Restaurant. Very dangerous for two-wheelers.",
        "latitude": 19.0589, "longitude": 72.8310,
        "category": "pothole", "severity": "high", "confidence": 0.89,
        "language": "en", "ward": "Ward H/W (Bandra West)",
    },
    {
        "description": "Road broken near Bandra Bandstand. Multiple potholes after last night's rain.",
        "latitude": 19.0575, "longitude": 72.8295,
        "category": "pothole", "severity": "high", "confidence": 0.91,
        "language": "en", "ward": "Ward H/W (Bandra West)",
    },
    {
        "description": "बांद्रा लिंकिंग रोड पर बड़ा गड्ढा। बारिश के बाद और बड़ा हो गया है।",
        "latitude": 19.0598, "longitude": 72.8325,
        "category": "pothole", "severity": "critical", "confidence": 0.87,
        "language": "hi", "ward": "Ward H/W (Bandra West)",
    },
    # Cluster 2: Garbage near Andheri West (2 complaints)
    {
        "description": "Garbage pile near Andheri station west side. Very bad smell, rats everywhere.",
        "latitude": 19.1197, "longitude": 72.8453,
        "category": "garbage", "severity": "medium", "confidence": 0.85,
        "language": "en", "ward": "Ward K/W (Andheri West)",
    },
    {
        "description": "अंधेरी स्टेशन के पास कचरे का ढेर। कई दिनों से सफाई नहीं हुई।",
        "latitude": 19.1185, "longitude": 72.8440,
        "category": "garbage", "severity": "high", "confidence": 0.82,
        "language": "hi", "ward": "Ward K/W (Andheri West)",
    },
    # Cluster 3: Water leak in Dadar (2 complaints)
    {
        "description": "Major water pipeline burst on Dadar TT Road. Water flooding the street since morning.",
        "latitude": 19.0188, "longitude": 72.8437,
        "category": "water_leak", "severity": "critical", "confidence": 0.93,
        "language": "en", "ward": "Ward G/N (Dadar)",
    },
    {
        "description": "Pipe leaking near Dadar station. Road is flooded, traffic jammed.",
        "latitude": 19.0195, "longitude": 72.8445,
        "category": "water_leak", "severity": "critical", "confidence": 0.90,
        "language": "en", "ward": "Ward G/N (Dadar)",
    },
    # Solo complaints (various categories)
    {
        "description": "Streetlight broken on SV Road near Malad. Area completely dark at night.",
        "latitude": 19.1865, "longitude": 72.8485,
        "category": "streetlight", "severity": "medium", "confidence": 0.88,
        "language": "en", "ward": "Ward P/N (Malad)",
    },
    {
        "description": "Heavy waterlogging near Kurla station. Knee-deep water blocking pedestrians.",
        "latitude": 19.0726, "longitude": 72.8794,
        "category": "flooding", "severity": "critical", "confidence": 0.95,
        "language": "en", "ward": "Ward L (Kurla)",
    },
    {
        "description": "Footpath tiles completely broken near Chembur station. Senior citizens falling.",
        "latitude": 19.0620, "longitude": 72.8966,
        "category": "footpath", "severity": "medium", "confidence": 0.79,
        "language": "en", "ward": "Ward M/E (Chembur)",
    },
    {
        "description": "नाला ओवरफ्लो हो रहा है मुलुंड में। गंदा पानी सड़क पर आ रहा है।",
        "latitude": 19.1710, "longitude": 72.9510,
        "category": "drain", "severity": "high", "confidence": 0.86,
        "language": "hi", "ward": "Ward T (Mulund)",
    },
    {
        "description": "कूड़ा डंप हो रहा है बोरीवली नेशनल पार्क गेट के पास। पर्यावरण के लिए खतरा।",
        "latitude": 19.2290, "longitude": 72.8565,
        "category": "garbage", "severity": "high", "confidence": 0.84,
        "language": "hi", "ward": "Ward S (Borivali)",
    },
    {
        "description": "Large sinkhole forming on the road near Ghatkopar metro station.",
        "latitude": 19.0866, "longitude": 72.9081,
        "category": "pothole", "severity": "critical", "confidence": 0.92,
        "language": "en", "ward": "Ward N (Ghatkopar)",
    },
    {
        "description": "Open drain near Fort area. Children playing nearby, very dangerous.",
        "latitude": 18.9320, "longitude": 72.8350,
        "category": "drain", "severity": "critical", "confidence": 0.88,
        "language": "en", "ward": "Ward A (Fort/Colaba)",
    },
    {
        "description": "Multiple streetlights not working on Western Express Highway near Kandivali.",
        "latitude": 19.2050, "longitude": 72.8520,
        "category": "streetlight", "severity": "high", "confidence": 0.86,
        "language": "en", "ward": "Ward R/S (Kandivali)",
    },
    {
        "description": "Water tanker mafia blocking pipeline. No water supply for 3 days in Bandra East.",
        "latitude": 19.0610, "longitude": 72.8450,
        "category": "water_leak", "severity": "critical", "confidence": 0.78,
        "language": "en", "ward": "Ward H/E (Bandra East)",
    },
]


def seed_database():
    """Seed the database with demo data if empty."""
    init_db()

    # Check if data already exists
    existing = get_all_complaints()
    if len(existing) > 5:
        return {"message": "Database already seeded", "complaints": len(existing)}

    # 1. Add facilities
    for name, ftype, lat, lng in FACILITIES:
        add_facility(name, ftype, lat, lng)

    # 2. Add complaints with staggered timestamps
    complaint_ids = []
    base_time = datetime.now(timezone.utc) - timedelta(hours=48)

    for i, data in enumerate(DEMO_COMPLAINTS):
        cid = str(uuid.uuid4())
        data["id"] = cid
        # Stagger timestamps over 48 hours
        offset_hours = i * (48 / len(DEMO_COMPLAINTS))
        data["timestamp"] = (base_time + timedelta(hours=offset_hours)).isoformat()
        create_complaint(data)
        complaint_ids.append(cid)

    # 3. Create pre-clustered incidents for demo
    # Incident 1: Bandra Potholes (linked to first 3 complaints)
    inc1_id = str(uuid.uuid4())
    inc1 = create_incident({
        "id": inc1_id,
        "category": "pothole",
        "description": "Cluster of 3 pothole reports in Bandra West. Turner Road, Bandstand, and Linking Road affected.",
        "representative_lat": 19.0587,
        "representative_lng": 72.8310,
        "ward": "Ward H/W (Bandra West)",
        "severity": "critical",
        "priority_score": 85,
        "impact_radius": 700,
        "complaint_count": 3,
        "status": "assigned",
        "assigned_to": "Road Maintenance Team Alpha",
        "created_at": (base_time + timedelta(hours=6)).isoformat(),
        "sla_deadline": (base_time + timedelta(hours=54)).isoformat(),
    })
    for i in range(3):
        update_complaint(complaint_ids[i], {"incident_id": inc1_id})

    # Add timeline events for this incident
    add_event(inc1_id, "reported", "citizen_001", {"source": "mobile_app"})
    add_event(inc1_id, "assigned", "admin_supervisor", {"team": "Road Maintenance Team Alpha", "department": "Road & Infrastructure Dept."})
    add_event(inc1_id, "sla_warning", "system", {"hours_remaining": 6})

    # Incident 2: Andheri Garbage (linked to complaints 3-4)
    inc2_id = str(uuid.uuid4())
    create_incident({
        "id": inc2_id,
        "category": "garbage",
        "description": "Cluster of 2 garbage reports near Andheri Station West.",
        "representative_lat": 19.1191,
        "representative_lng": 72.8447,
        "ward": "Ward K/W (Andheri West)",
        "severity": "high",
        "priority_score": 62,
        "impact_radius": 500,
        "complaint_count": 2,
        "status": "open",
        "created_at": (base_time + timedelta(hours=12)).isoformat(),
        "sla_deadline": (base_time + timedelta(hours=84)).isoformat(),
    })
    for i in range(3, 5):
        update_complaint(complaint_ids[i], {"incident_id": inc2_id})
    add_event(inc2_id, "reported", "citizen_003")

    # Incident 3: Dadar Water Leak — fully resolved for demo
    inc3_id = str(uuid.uuid4())
    create_incident({
        "id": inc3_id,
        "category": "water_leak",
        "description": "Critical pipeline burst on Dadar TT Road. 2 reports. Resolved and verified.",
        "representative_lat": 19.0192,
        "representative_lng": 72.8441,
        "ward": "Ward G/N (Dadar)",
        "severity": "critical",
        "priority_score": 91,
        "impact_radius": 900,
        "complaint_count": 2,
        "status": "verified_resolved",
        "created_at": (base_time + timedelta(hours=2)).isoformat(),
        "sla_deadline": (base_time + timedelta(hours=26)).isoformat(),
        "resolved_at": (base_time + timedelta(hours=18)).isoformat(),
    })
    for i in range(5, 7):
        update_complaint(complaint_ids[i], {"incident_id": inc3_id, "status": "resolved"})
    add_event(inc3_id, "reported", "citizen_005")
    add_event(inc3_id, "assigned", "admin_supervisor", {"team": "Water Pipeline Emergency Unit"})
    add_event(inc3_id, "repair_submitted", "field_engineer_01", {"confidence": 0.93})
    add_event(inc3_id, "ai_verified", "system", {"cv_confidence": 0.93, "verdict": "likely_resolved"})
    add_event(inc3_id, "citizen_confirmed", "citizen_005", {"satisfaction": "yes"})

    # Incident 4: Kurla Flooding — SLA breached for demo
    inc4_id = str(uuid.uuid4())
    create_incident({
        "id": inc4_id,
        "category": "flooding",
        "description": "Heavy waterlogging near Kurla station. Knee-deep water.",
        "representative_lat": 19.0726,
        "representative_lng": 72.8794,
        "ward": "Ward L (Kurla)",
        "severity": "critical",
        "priority_score": 95,
        "impact_radius": 1200,
        "complaint_count": 1,
        "status": "sla_breached",
        "created_at": (base_time - timedelta(hours=12)).isoformat(),
        "sla_deadline": (base_time - timedelta(hours=2)).isoformat(),
    })
    update_complaint(complaint_ids[8], {"incident_id": inc4_id})
    add_event(inc4_id, "reported", "citizen_008")
    add_event(inc4_id, "sla_warning", "system", {"hours_remaining": 3})
    add_event(inc4_id, "sla_breach", "system", {"overdue_hours": 2})

    return {
        "message": "Database seeded successfully",
        "complaints": len(DEMO_COMPLAINTS),
        "incidents": 4,
        "facilities": len(FACILITIES),
    }
