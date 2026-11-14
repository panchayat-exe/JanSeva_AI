/**
 * KartaViewProvider — Street-level imagery from KartaView (OpenStreetCam).
 * 
 * Supports:
 * - Progressive radius search (50m → 100m → 250m → 500m → 1000m)
 * - AbortController for cancellable searches
 * - onRadiusChange callback for UI progress updates
 * - Provider metadata for future extensibility
 */

/**
 * Haversine formula — distance in meters between two geographic points.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const KartaViewProvider = {
  name: 'KartaView',
  displayName: 'KartaView (OpenStreetCam)',

  /**
   * Search for nearby street-level imagery using KartaView API v2.
   * Progressively expands search radius.
   * 
   * @param {number} lat
   * @param {number} lng
   * @param {Object} options
   * @param {number} options.maxRadius - Maximum search radius in meters (default 1000)
   * @param {AbortSignal} options.signal - AbortController signal for cancellation
   * @param {function} options.onRadiusChange - Callback when search radius changes: (radius) => void
   * @returns {Promise<Object>} Search result
   */
  async searchNearbyImagery(lat, lng, options = {}) {
    const { maxRadius = 1000, signal = null, onRadiusChange = null } = options;
    const radii = [50, 100, 250, 500, maxRadius];

    for (const radius of radii) {
      // Check for cancellation
      if (signal && signal.aborted) {
        return { found: false, cancelled: true };
      }

      // Notify UI of current search radius
      if (onRadiusChange) {
        onRadiusChange(radius);
      }

      try {
        const url = `https://api.openstreetcam.org/2.0/photo/?lat=${lat}&lng=${lng}&radius=${radius}`;
        
        const fetchOptions = { method: 'GET' };
        if (signal) fetchOptions.signal = signal;

        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
          console.warn(`KartaView: HTTP ${response.status} at radius ${radius}m`);
          continue;
        }

        const data = await response.json();

        // KartaView v2 response structure
        const photos = data?.result?.data || data?.data || [];

        if (photos.length > 0) {
          const formattedPhotos = photos.map(p => ({
            id: p.id,
            sequenceId: p.sequence_id || p.sequenceId,
            sequenceIndex: p.sequence_index || p.sequenceIndex || 0,
            lat: parseFloat(p.lat),
            lng: parseFloat(p.lng),
            url: p.fileurlLq || p.fileurl || p.fileurl_lq || p.fileurl_orig || '',
            urlHighRes: p.fileurl || p.fileurl_orig || p.fileurlLq || '',
            shotDate: p.shot_date || p.shotDate || null,
            heading: p.heading || null,
            distance: calculateDistance(lat, lng, parseFloat(p.lat), parseFloat(p.lng))
          })).filter(p => p.url); // Only include photos with valid URLs

          if (formattedPhotos.length === 0) continue;

          // Sort by closest distance
          formattedPhotos.sort((a, b) => a.distance - b.distance);

          const closestPhoto = formattedPhotos[0];

          // Build sequence from the closest photo's sequence for navigation
          const sequencePhotos = formattedPhotos
            .filter(p => p.sequenceId && p.sequenceId === closestPhoto.sequenceId)
            .sort((a, b) => a.sequenceIndex - b.sequenceIndex);

          // If no sequence match, just use the sorted photos
          const navigationPhotos = sequencePhotos.length > 1 ? sequencePhotos : formattedPhotos;

          return {
            found: true,
            provider: 'kartaview',
            closestPhoto,
            sequencePhotos: navigationPhotos,
            radiusUsed: radius,
            totalFound: formattedPhotos.length
          };
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return { found: false, cancelled: true };
        }
        console.warn(`KartaView search failed at radius ${radius}m:`, err.message);
      }
    }

    return {
      found: false,
      cancelled: false,
      provider: 'kartaview',
      searchedUpTo: maxRadius
    };
  }
};
