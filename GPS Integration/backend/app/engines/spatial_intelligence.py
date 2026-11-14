"""
JANSEVA GeoVision – Engine 5: Spatial Intelligence Engine
Clusters nearby, semantically similar complaints into civic incidents.
Uses DBSCAN with Haversine distance for geographic clustering.
"""
import math
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone

from ..database import (
    get_unclustered_complaints,
    create_incident,
    update_complaint,
    add_event,
)
from .gis_context import get_ward, get_department, get_sla_hours


def haversine_km(lat1, lon1, lat2, lon2):
    """Haversine formula for distance in km."""
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


def simple_dbscan(points: list, eps_km: float = 0.3, min_samples: int = 2) -> list:
    """
    Simple DBSCAN implementation using Haversine distance.
    No scikit-learn dependency needed.
    
    Args:
        points: list of dicts with 'latitude' and 'longitude'
        eps_km: max distance in km between two points to be neighbors
        min_samples: min points to form a cluster
    
    Returns:
        list of cluster labels (-1 = noise, 0+ = cluster id)
    """
    n = len(points)
    labels = [-1] * n
    visited = [False] * n
    cluster_id = 0

    def region_query(idx):
        """Find all points within eps_km of point idx."""
        neighbors = []
        for j in range(n):
            if j == idx:
                continue
            dist = haversine_km(
                points[idx]["latitude"], points[idx]["longitude"],
                points[j]["latitude"], points[j]["longitude"]
            )
            if dist <= eps_km:
                neighbors.append(j)
        return neighbors

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        neighbors = region_query(i)

        if len(neighbors) < min_samples - 1:
            continue  # noise point

        labels[i] = cluster_id
        seed_set = list(neighbors)

        while seed_set:
            j = seed_set.pop(0)
            if not visited[j]:
                visited[j] = True
                j_neighbors = region_query(j)
                if len(j_neighbors) >= min_samples - 1:
                    seed_set.extend(j_neighbors)
            if labels[j] == -1:
                labels[j] = cluster_id

        cluster_id += 1

    return labels


def run_clustering(eps_km: float = 0.3, min_samples: int = 2) -> dict:
    """
    Run spatial clustering on all unclustered complaints.
    Groups nearby complaints of the same category into incidents.
    
    Returns:
        dict with created incidents and stats
    """
    complaints = get_unclustered_complaints()

    if len(complaints) < min_samples:
        return {
            "message": "Not enough unclustered complaints for clustering",
            "total_unclustered": len(complaints),
            "incidents_created": [],
        }

    # Group by category first, then cluster within each category
    by_category = {}
    for c in complaints:
        cat = c.get("category") or "unknown"
        by_category.setdefault(cat, []).append(c)

    created_incidents = []

    for category, cat_complaints in by_category.items():
        if len(cat_complaints) < min_samples:
            # Single complaint in this category — create a solo incident
            c = cat_complaints[0]
            ward = c.get("ward") or get_ward(c["latitude"], c["longitude"])
            department = get_department(category)
            sla_hours = get_sla_hours(c.get("severity", "medium"))

            inc = create_incident({
                "category": category,
                "description": c.get("description", f"Single report: {category}"),
                "representative_lat": c["latitude"],
                "representative_lng": c["longitude"],
                "ward": ward,
                "severity": c.get("severity", "medium"),
                "priority_score": 15,
                "complaint_count": 1,
                "sla_deadline": (datetime.now(timezone.utc) + timedelta(hours=sla_hours)).isoformat(),
            })
            update_complaint(c["id"], {"incident_id": inc["id"]})
            created_incidents.append({
                "id": inc["id"],
                "category": category,
                "count": 1,
                "type": "solo",
            })
            continue

        # Run DBSCAN clustering
        labels = simple_dbscan(cat_complaints, eps_km=eps_km, min_samples=min_samples)

        # Group complaints by cluster label
        clusters = {}
        noise = []
        for idx, label in enumerate(labels):
            if label == -1:
                noise.append(cat_complaints[idx])
            else:
                clusters.setdefault(label, []).append(cat_complaints[idx])

        # Create incidents from clusters
        for cluster_label, cluster_complaints in clusters.items():
            avg_lat = sum(c["latitude"] for c in cluster_complaints) / len(cluster_complaints)
            avg_lng = sum(c["longitude"] for c in cluster_complaints) / len(cluster_complaints)

            # Determine severity (take the highest)
            severities = [c.get("severity", "medium") for c in cluster_complaints]
            severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
            max_severity = max(severities, key=lambda s: severity_order.get(s, 0))

            ward = get_ward(avg_lat, avg_lng)
            department = get_department(category)
            sla_hours = get_sla_hours(max_severity)

            # Build description from complaint descriptions
            descs = [c.get("description", "") for c in cluster_complaints if c.get("description")]
            desc = f"Cluster of {len(cluster_complaints)} reports. " + " | ".join(descs[:3])

            inc = create_incident({
                "category": category,
                "description": desc[:500],
                "representative_lat": round(avg_lat, 7),
                "representative_lng": round(avg_lng, 7),
                "ward": ward,
                "severity": max_severity,
                "priority_score": min(100, len(cluster_complaints) * 10),
                "complaint_count": len(cluster_complaints),
                "sla_deadline": (datetime.now(timezone.utc) + timedelta(hours=sla_hours)).isoformat(),
            })

            # Link complaints to this incident
            for c in cluster_complaints:
                update_complaint(c["id"], {"incident_id": inc["id"]})

            created_incidents.append({
                "id": inc["id"],
                "category": category,
                "count": len(cluster_complaints),
                "type": "cluster",
            })

        # Create solo incidents for noise points
        for c in noise:
            ward = c.get("ward") or get_ward(c["latitude"], c["longitude"])
            sla_hours = get_sla_hours(c.get("severity", "medium"))

            inc = create_incident({
                "category": category,
                "description": c.get("description", f"Single report: {category}"),
                "representative_lat": c["latitude"],
                "representative_lng": c["longitude"],
                "ward": ward,
                "severity": c.get("severity", "medium"),
                "priority_score": 10,
                "complaint_count": 1,
                "sla_deadline": (datetime.now(timezone.utc) + timedelta(hours=sla_hours)).isoformat(),
            })
            update_complaint(c["id"], {"incident_id": inc["id"]})
            created_incidents.append({
                "id": inc["id"],
                "category": category,
                "count": 1,
                "type": "solo",
            })

    return {
        "message": f"Clustering complete. {len(created_incidents)} incidents created.",
        "total_unclustered": len(complaints),
        "incidents_created": created_incidents,
    }
