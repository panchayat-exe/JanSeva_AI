import { classifyOSMTags } from './infrastructureClassifier';
import { calculateDistanceMeters, checkImpactZone } from './spatialAnalysis';

// ── Simple in-memory cache to avoid redundant OSM queries ──────
const queryCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(lat, lng, radius) {
  // Round to ~100m precision to increase cache hits
  return `${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}`;
}

class OSMProvider {
  constructor() {
    this.endpoint = 'https://overpass-api.de/api/interpreter';
  }

  async fetchInfrastructure(lat, lng, radius, impactRadius, signal) {
    // Cap search radius to 500m max to keep queries fast
    const searchRadius = Math.min(Math.max(impactRadius, 250), 500);

    // Check cache first
    const cacheKey = getCacheKey(lat, lng, searchRadius);
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return cached.data;
    }

    // Lean query: only critical civic amenities (no buildings, highways, waterways)
    const query = `
      [out:json][timeout:10];
      (
        node["amenity"~"hospital|clinic|pharmacy|doctors|police|fire_station|ambulance_station|school|college|bus_station|townhall"](around:${searchRadius},${lat},${lng});
        way["amenity"~"hospital|clinic|police|fire_station|school"](around:${searchRadius},${lat},${lng});
      );
      out center 50;
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const usedSignal = signal || controller.signal;

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: usedSignal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

      const data = await response.json();
      const result = this._processOSMData(data.elements, lat, lng, impactRadius);

      // Store in cache
      queryCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('OSM query timed out — returning empty fallback instantly.');
      } else {
        console.warn('OSM Context Fetch Failed:', error.message);
      }
      return { items: [], stats: { total: 0, criticalCount: 0, inImpactZone: 0, categories: {} } };
    }
  }

  _processOSMData(elements, originLat, originLng, impactRadius) {
    const results = [];
    const stats = { total: 0, criticalCount: 0, inImpactZone: 0, categories: {} };

    if (!elements) return { items: results, stats };

    elements.forEach(el => {
      const tags = el.tags;
      if (!tags) return;

      const classification = classifyOSMTags(tags);
      if (!classification) return;

      const objLat = el.lat || (el.center && el.center.lat);
      const objLng = el.lon || (el.center && el.center.lon);
      if (!objLat || !objLng) return;

      const distance = calculateDistanceMeters(originLat, originLng, objLat, objLng);
      const inImpactZone = checkImpactZone(distance, impactRadius);

      results.push({
        id: `${el.type}_${el.id}`,
        name: tags.name || `Unnamed ${classification.type.replace('_', ' ')}`,
        category: classification.category,
        type: classification.type,
        critical: classification.critical,
        lat: objLat,
        lng: objLng,
        distanceMeters: distance,
        inImpactZone,
        source: 'OpenStreetMap',
      });

      stats.total++;
      if (classification.critical) stats.criticalCount++;
      if (inImpactZone) stats.inImpactZone++;
      stats.categories[classification.category] = (stats.categories[classification.category] || 0) + 1;
    });

    results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return { items: results, stats };
  }
}

export const osmProvider = new OSMProvider();
