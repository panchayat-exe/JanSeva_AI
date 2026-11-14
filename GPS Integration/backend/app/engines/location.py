"""
JANSEVA GeoVision – Engine 2: Location Engine
Extracts coordinates from EXIF, device GPS, or manual selection.
Provides Haversine distance calculations and reverse geocoding.
"""
import math
import piexif
from PIL import Image
import io
import json
import urllib.request
import urllib.parse


def rational_to_float(value):
    """Convert EXIF rational tuple to float."""
    if isinstance(value, tuple) and len(value) == 2:
        num, den = value
        if den == 0:
            return 0.0
        return num / den
    return float(value)


def dms_to_decimal(dms_tuple, ref: str) -> float:
    """Convert degrees/minutes/seconds to decimal degrees."""
    degrees = rational_to_float(dms_tuple[0])
    minutes = rational_to_float(dms_tuple[1])
    seconds = rational_to_float(dms_tuple[2])
    decimal = degrees + minutes / 60.0 + seconds / 3600.0
    if ref in ("S", "W"):
        decimal *= -1
    return decimal


import random

def get_prototype_random_location():
    """Generate randomized prototype coordinates across city zone."""
    base_lat = 22.28 + random.uniform(-0.04, 0.04)
    base_lng = 73.35 + random.uniform(-0.04, 0.04)
    return {
        "latitude": round(base_lat, 6),
        "longitude": round(base_lng, 6),
        "source": "prototype_random"
    }

def extract_gps_from_bytes(data: bytes) -> dict | None:
    """Extract GPS coordinates from image EXIF data or return randomized prototype coordinates."""
    try:
        exif = piexif.load(data)
    except Exception:
        return get_prototype_random_location()

    gps = exif.get("GPS", {})
    if not gps:
        return get_prototype_random_location()

    lat = gps.get(piexif.GPSIFD.GPSLatitude)
    lat_ref = gps.get(piexif.GPSIFD.GPSLatitudeRef)
    lon = gps.get(piexif.GPSIFD.GPSLongitude)
    lon_ref = gps.get(piexif.GPSIFD.GPSLongitudeRef)

    if not all([lat, lat_ref, lon, lon_ref]):
        return get_prototype_random_location()

    if isinstance(lat_ref, bytes):
        lat_ref = lat_ref.decode(errors="ignore")
    if isinstance(lon_ref, bytes):
        lon_ref = lon_ref.decode(errors="ignore")

    return {
        "latitude": round(dms_to_decimal(lat, lat_ref), 7),
        "longitude": round(dms_to_decimal(lon, lon_ref), 7),
        "source": "EXIF_GPS",
    }


def extract_gps_from_file(file_path: str) -> dict | None:
    """Extract GPS from an image file on disk."""
    try:
        with open(file_path, "rb") as f:
            data = f.read()
        return extract_gps_from_bytes(data)
    except Exception:
        return None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two GPS points using the Haversine formula."""
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


def haversine_meters(lat1, lon1, lat2, lon2) -> float:
    """Distance in meters."""
    return haversine_km(lat1, lon1, lat2, lon2) * 1000


def reverse_geocode(lat: float, lng: float) -> dict:
    """
    Reverse geocode coordinates to an address using OpenStreetMap Nominatim.
    Free, no API key required.
    """
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18&addressdetails=1"
        req = urllib.request.Request(url, headers={"User-Agent": "JANSEVA-GeoVision/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            address = data.get("address", {})
            return {
                "display_name": data.get("display_name", ""),
                "road": address.get("road", ""),
                "suburb": address.get("suburb", ""),
                "city": address.get("city", address.get("town", address.get("village", ""))),
                "state": address.get("state", ""),
                "postcode": address.get("postcode", ""),
                "country": address.get("country", ""),
            }
    except Exception:
        return {
            "display_name": f"Location ({lat:.4f}, {lng:.4f})",
            "road": "",
            "suburb": "",
            "city": "",
            "state": "",
            "postcode": "",
            "country": "India",
        }
