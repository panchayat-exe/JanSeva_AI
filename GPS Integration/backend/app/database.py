"""
JANSEVA GeoVision – Database Layer
SQLite-based storage with full schema for the 8-engine civic intelligence platform.
"""
import sqlite3
import json
import uuid
import os
from datetime import datetime, timedelta, timezone
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "janseva.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create all tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS complaints (
                id TEXT PRIMARY KEY,
                citizen_id TEXT DEFAULT 'anonymous',
                description TEXT,
                image_url TEXT,
                voice_url TEXT,
                language TEXT DEFAULT 'en',
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                timestamp TEXT DEFAULT (datetime('now')),
                category TEXT,
                severity TEXT DEFAULT 'medium',
                confidence REAL DEFAULT 0.0,
                status TEXT DEFAULT 'reported',
                incident_id TEXT,
                ward TEXT,
                address TEXT,
                nearby_facilities TEXT,
                FOREIGN KEY (incident_id) REFERENCES incidents(id)
            );

            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                category TEXT,
                description TEXT,
                representative_lat REAL,
                representative_lng REAL,
                ward TEXT,
                department TEXT DEFAULT 'Municipal Corporation',
                severity TEXT DEFAULT 'medium',
                priority_score INTEGER DEFAULT 0,
                impact_radius REAL DEFAULT 500,
                status TEXT DEFAULT 'open',
                complaint_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                sla_deadline TEXT,
                resolved_at TEXT,
                assigned_to TEXT
            );

            CREATE TABLE IF NOT EXISTS incident_events (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                timestamp TEXT DEFAULT (datetime('now')),
                actor TEXT DEFAULT 'system',
                metadata TEXT,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS evidence (
                id TEXT PRIMARY KEY,
                incident_id TEXT,
                complaint_id TEXT,
                type TEXT CHECK (type IN ('before','after')),
                image_url TEXT,
                uploaded_by TEXT DEFAULT 'system',
                cv_result TEXT,
                confidence REAL DEFAULT 0.0,
                timestamp TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (incident_id) REFERENCES incidents(id)
            );

            CREATE TABLE IF NOT EXISTS facilities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL
            );
        """)


# ─── Complaint CRUD ───────────────────────────────────────────────

def create_complaint(data: dict) -> dict:
    cid = data.get("id", str(uuid.uuid4()))
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute("""
            INSERT INTO complaints (id, citizen_id, description, image_url, voice_url,
                language, latitude, longitude, timestamp, category, severity,
                confidence, status, ward, address, nearby_facilities)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cid,
            data.get("citizen_id", "anonymous"),
            data.get("description", ""),
            data.get("image_url"),
            data.get("voice_url"),
            data.get("language", "en"),
            data["latitude"],
            data["longitude"],
            now,
            data.get("category"),
            data.get("severity", "medium"),
            data.get("confidence", 0.0),
            data.get("status", "reported"),
            data.get("ward"),
            data.get("address"),
            json.dumps(data.get("nearby_facilities", [])) if data.get("nearby_facilities") else None,
        ))
    return get_complaint(cid)


def get_complaint(complaint_id: str) -> dict | None:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
        if row:
            d = dict(row)
            if d.get("nearby_facilities"):
                try:
                    d["nearby_facilities"] = json.loads(d["nearby_facilities"])
                except Exception:
                    pass
            return d
    return None


def get_all_complaints(status: str = None, incident_id: str = None) -> list:
    with get_db() as conn:
        query = "SELECT * FROM complaints"
        params = []
        conditions = []
        if status:
            conditions.append("status = ?")
            params.append(status)
        if incident_id:
            conditions.append("incident_id = ?")
            params.append(incident_id)
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY timestamp DESC"
        rows = conn.execute(query, params).fetchall()
        results = []
        for row in rows:
            d = dict(row)
            if d.get("nearby_facilities"):
                try:
                    d["nearby_facilities"] = json.loads(d["nearby_facilities"])
                except Exception:
                    pass
            results.append(d)
        return results


def get_unclustered_complaints() -> list:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM complaints WHERE incident_id IS NULL ORDER BY timestamp DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def update_complaint(complaint_id: str, data: dict):
    with get_db() as conn:
        sets = []
        vals = []
        for key, val in data.items():
            if key == "id":
                continue
            if key == "nearby_facilities" and isinstance(val, list):
                val = json.dumps(val)
            sets.append(f"{key} = ?")
            vals.append(val)
        vals.append(complaint_id)
        conn.execute(
            f"UPDATE complaints SET {', '.join(sets)} WHERE id = ?",
            vals,
        )


# ─── Incident CRUD ────────────────────────────────────────────────

def create_incident(data: dict) -> dict:
    iid = data.get("id", str(uuid.uuid4()))
    now = datetime.now(timezone.utc).isoformat()
    # SLA: 48 hours from now
    sla = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()
    with get_db() as conn:
        conn.execute("""
            INSERT INTO incidents (id, category, description, representative_lat,
                representative_lng, ward, severity, priority_score, impact_radius,
                status, complaint_count, created_at, sla_deadline)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            iid,
            data.get("category"),
            data.get("description", ""),
            data.get("representative_lat"),
            data.get("representative_lng"),
            data.get("ward"),
            data.get("severity", "medium"),
            data.get("priority_score", 0),
            data.get("impact_radius", 500),
            data.get("status", "open"),
            data.get("complaint_count", 0),
            data.get("created_at", now),
            data.get("sla_deadline", sla),
        ))
        # Create initial event
        conn.execute("""
            INSERT INTO incident_events (id, incident_id, event_type, timestamp, actor)
            VALUES (?, ?, 'reported', ?, 'system')
        """, (str(uuid.uuid4()), iid, now))
    return get_incident(iid)


def get_incident(incident_id: str) -> dict | None:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
        return dict(row) if row else None


def get_all_incidents(status: str = None) -> list:
    with get_db() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM incidents WHERE status = ? ORDER BY priority_score DESC, created_at DESC",
                (status,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM incidents ORDER BY priority_score DESC, created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]


def update_incident(incident_id: str, data: dict):
    with get_db() as conn:
        sets = []
        vals = []
        for key, val in data.items():
            if key == "id":
                continue
            sets.append(f"{key} = ?")
            vals.append(val)
        vals.append(incident_id)
        conn.execute(
            f"UPDATE incidents SET {', '.join(sets)} WHERE id = ?",
            vals,
        )


# ─── Incident Events ──────────────────────────────────────────────

def add_event(incident_id: str, event_type: str, actor: str = "system", metadata: dict = None):
    eid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute("""
            INSERT INTO incident_events (id, incident_id, event_type, timestamp, actor, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (eid, incident_id, event_type, now, actor, json.dumps(metadata) if metadata else None))
    return eid


def get_events(incident_id: str) -> list:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM incident_events WHERE incident_id = ? ORDER BY timestamp ASC",
            (incident_id,),
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get("metadata"):
                try:
                    d["metadata"] = json.loads(d["metadata"])
                except Exception:
                    pass
            results.append(d)
        return results


# ─── Evidence ──────────────────────────────────────────────────────

def add_evidence(data: dict) -> dict:
    eid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute("""
            INSERT INTO evidence (id, incident_id, complaint_id, type, image_url,
                uploaded_by, cv_result, confidence, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            eid,
            data.get("incident_id"),
            data.get("complaint_id"),
            data.get("type", "before"),
            data.get("image_url"),
            data.get("uploaded_by", "system"),
            json.dumps(data.get("cv_result")) if data.get("cv_result") else None,
            data.get("confidence", 0.0),
            now,
        ))
    return {"id": eid, **data}


def get_evidence(incident_id: str) -> list:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM evidence WHERE incident_id = ? ORDER BY timestamp ASC",
            (incident_id,),
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get("cv_result"):
                try:
                    d["cv_result"] = json.loads(d["cv_result"])
                except Exception:
                    pass
            results.append(d)
        return results


def get_before_evidence(incident_id: str) -> dict | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM evidence WHERE incident_id = ? AND type = 'before' ORDER BY timestamp ASC LIMIT 1",
            (incident_id,),
        ).fetchone()
        return dict(row) if row else None


# ─── Facilities ────────────────────────────────────────────────────

def add_facility(name: str, ftype: str, lat: float, lng: float):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO facilities (name, type, latitude, longitude) VALUES (?, ?, ?, ?)",
            (name, ftype, lat, lng),
        )


def get_all_facilities() -> list:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM facilities").fetchall()
        return [dict(r) for r in rows]


def get_nearby_facilities(lat: float, lng: float, radius_km: float = 1.0) -> list:
    """Get facilities within radius_km of a point using Haversine approximation."""
    import math
    all_facilities = get_all_facilities()
    nearby = []
    for f in all_facilities:
        dist = haversine_km(lat, lng, f["latitude"], f["longitude"])
        if dist <= radius_km:
            nearby.append({**f, "distance_km": round(dist, 3)})
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby


def haversine_km(lat1, lon1, lat2, lon2):
    """Calculate distance in kilometers between two GPS points."""
    import math
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ─── Stats ─────────────────────────────────────────────────────────

def get_stats() -> dict:
    with get_db() as conn:
        total_complaints = conn.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        total_incidents = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
        open_incidents = conn.execute("SELECT COUNT(*) FROM incidents WHERE status = 'open'").fetchone()[0]
        resolved = conn.execute("SELECT COUNT(*) FROM incidents WHERE status IN ('verified_resolved','resolved')").fetchone()[0]
        categories = conn.execute(
            "SELECT category, COUNT(*) as cnt FROM complaints WHERE category IS NOT NULL GROUP BY category ORDER BY cnt DESC"
        ).fetchall()
        severity_dist = conn.execute(
            "SELECT severity, COUNT(*) as cnt FROM incidents WHERE severity IS NOT NULL GROUP BY severity ORDER BY cnt DESC"
        ).fetchall()
        return {
            "total_complaints": total_complaints,
            "total_incidents": total_incidents,
            "open_incidents": open_incidents,
            "resolved_incidents": resolved,
            "categories": [dict(c) for c in categories],
            "severity_distribution": [dict(s) for s in severity_dist],
        }
