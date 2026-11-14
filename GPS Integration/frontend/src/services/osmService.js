class OSMService {
  constructor() {
    this.cache = new Map();
    this.endpoint = 'https://overpass-api.de/api/interpreter';
    this.DEFAULT_FLOOR_HEIGHT = 3.2; // meters per floor if height is missing
  }

  /**
   * Generates a cache key based on coordinates and radius
   */
  _getCacheKey(lat, lng, radius) {
    // Round to ~10 meters precision to group extremely close queries
    return `${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;
  }

  /**
   * Fetches geographic context (buildings, roads, facilities) from OSM
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in meters
   * @returns {Promise<Object>} Normalized geographic context
   */
  async fetchContext(lat, lng, radius = 500) {
    const cacheKey = this._getCacheKey(lat, lng, radius);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Overpass QL query
    // - Fetches buildings (ways and relations)
    // - Fetches highways (roads)
    // - Fetches specific civic amenities
    // 'out geom;' ensures we get actual coordinates for ways/relations without needing node lookups
    const query = `
      [out:json][timeout:25];
      (
        way["building"](around:${radius},${lat},${lng});
        relation["building"](around:${radius},${lat},${lng});
        way["highway"](around:${radius},${lat},${lng});
        node["amenity"~"hospital|clinic|police|fire_station|school"](around:${radius},${lat},${lng});
      );
      out geom;
    `;

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const normalizedData = this._normalizeOSMData(data.elements);
      
      this.cache.set(cacheKey, normalizedData);
      return normalizedData;
    } catch (error) {
      console.error("OSM Context Fetch Failed:", error);
      throw error;
    }
  }

  /**
   * Normalizes raw OSM elements into usable categories
   */
  _normalizeOSMData(elements) {
    const result = {
      buildings: [],
      roads: [],
      facilities: []
    };

    if (!elements) return result;

    elements.forEach(el => {
      // Handle Civic Facilities (Points)
      if (el.type === 'node' && el.tags && el.tags.amenity) {
        result.facilities.push({
          id: `osm_node_${el.id}`,
          lat: el.lat,
          lng: el.lon,
          type: el.tags.amenity,
          name: el.tags.name || el.tags.amenity
        });
        return;
      }

      // Handle Roads (Lines)
      if (el.tags && el.tags.highway && el.geometry) {
        result.roads.push({
          id: `osm_way_${el.id}`,
          type: el.tags.highway,
          name: el.tags.name || 'Unnamed Road',
          coordinates: el.geometry.map(pt => [pt.lon, pt.lat])
        });
        return;
      }

      // Handle Buildings (Polygons)
      if (el.tags && el.tags.building && el.geometry) {
        // Estimate height
        let height = 0;
        if (el.tags.height) {
          height = parseFloat(el.tags.height.replace(/[^\d.]/g, ''));
        } else if (el.tags['building:levels']) {
          height = parseInt(el.tags['building:levels']) * this.DEFAULT_FLOOR_HEIGHT;
        }

        // Minimal extrusion if no height data exists so it stands out slightly from terrain
        if (isNaN(height) || height === 0) {
          height = 4.0;
        }

        result.buildings.push({
          id: `osm_bldg_${el.id}`,
          height: height,
          type: el.tags.building,
          name: el.tags.name || 'Building',
          coordinates: el.geometry.map(pt => [pt.lon, pt.lat])
        });
      }
    });

    return result;
  }
}

// Export a singleton instance
export const osmService = new OSMService();
