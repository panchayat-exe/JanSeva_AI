# 🛰️ JANSEVA GeoVision – v1.0

A real-time, multilingual, multi-modal civic intelligence platform that treats complaints not as tickets, but as **geo-events** with a full lifecycle.

This system combines 8 specialized engines into a unified PWA for both citizens and administrators.

## 🚀 The 8 Engines
1. **Evidence Engine:** Multi-modal ingestion (photo, text, voice).
2. **Location Engine:** EXIF GPS extraction + Haversine math + Reverse Geocoding.
3. **GIS Context Engine:** Polygon-based ward mapping & facility proximity.
4. **Computer Vision Engine:** Keyword & image-metadata based issue classification.
5. **Spatial Intelligence Engine:** DBSCAN clustering to group similar nearby complaints into "incidents".
6. **Decision Engine:** Dynamic priority scoring (0-100) and SLA calculation based on impact radius.
7. **4D Timeline Engine:** Chronological tracking of an incident's lifecycle.
8. **Verification Engine:** Before/after image comparison (Histogram + Pixel diff) to verify repairs.

## 🛠️ Architecture
- **Backend:** FastAPI, SQLite (in-memory spatial math replacing PostGIS to ensure it runs out-of-the-box).
- **Frontend:** React, Vite, CesiumJS (3D Globe), Leaflet (2D fallback), i18next (English & Hindi).
- **Zero External ML Dependencies:** All ML components (CLIP, Wav2Vec) are simulated with robust rule-based logic to allow immediate local execution without heavy downloads or GPU requirements.

## ⚙️ Quick Start

### 1. Start the Backend
Open a terminal and navigate to the `backend` folder:
```bash
cd backend
python -m venv .venv
# Activate venv:
# Windows: .venv\Scripts\Activate
# Mac/Linux: source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*Note: The database is automatically seeded with demo data (complaints, incidents, and timeline events in Mumbai) on startup.*

### 2. Start the Frontend
Open a new terminal and navigate to the `frontend` folder:
```bash
cd frontend
npm install
npm run dev
```

### 3. Open in Browser
- Navigate to the Vite localhost URL (typically `http://localhost:5173`).
- You will see the Landing Page. Choose **Citizen** to report an issue or **Admin** to view the command centre.

## 🗺️ Google 3D Tiles (Optional)
The admin globe uses Cesium World Terrain by default. To enable stunning photorealistic 3D cities:
1. Create `frontend/.env.local`
2. Add your key: `VITE_GOOGLE_3D_TILES_API_KEY=your_key_here`
3. Restart the frontend dev server.
