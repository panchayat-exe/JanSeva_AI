import * as Cesium from 'cesium';

/**
 * GeoVisionImageryManager — Safe asynchronous imagery layer management.
 * 
 * FIXES the getDerivedResource error by:
 * 1. Using an operation counter to detect stale async completions
 * 2. Never calling removeAll() before the replacement is ready
 * 3. Checking viewer.isDestroyed() at every async boundary
 * 4. Initializing satellite imagery eagerly during construction
 */
export class GeoVisionImageryManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.currentMode = null;
    this.operationId = 0; // Increment for each async op to detect stale completions
    this.initialized = false;
  }

  /**
   * Initialize with satellite imagery. Call immediately after viewer creation.
   */
  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    await this.setMode('SATELLITE');
  }

  /**
   * Switch imagery mode safely.
   * @param {'SATELLITE'|'MAP'} mode
   */
  async setMode(mode) {
    if (this.currentMode === mode) return;
    if (!this.viewer || this.viewer.isDestroyed()) return;

    // Increment operation counter — any earlier async completion becomes stale
    const thisOp = ++this.operationId;

    try {
      let newProvider = null;

      if (mode === 'SATELLITE') {
        try {
          // Use Cesium's highly stable default World Imagery
          newProvider = await Cesium.createWorldImageryAsync({
            style: Cesium.IonWorldImageryStyle.AERIAL
          });
        } catch (e) {
          console.warn('Satellite imagery provider failed, falling back to OSM map:', e);
          // Fall back to MAP mode instead
          if (this.operationId === thisOp && this.viewer && !this.viewer.isDestroyed()) {
            await this.setMode('MAP');
          }
          return;
        }
      } else {
        // MAP mode — use stable OSM template
        newProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          credit: '© OpenStreetMap contributors'
        });
      }

      // ── CRITICAL SAFETY CHECK ──
      // Before touching the viewer, verify:
      //   1. The viewer still exists and is not destroyed
      //   2. This is still the latest operation (not stale)
      if (this.operationId !== thisOp) return; // Stale operation
      if (!this.viewer || this.viewer.isDestroyed()) return; // Viewer gone

      // Add new provider first, THEN remove old ones
      // This avoids the brief "no imagery" flash
      if (newProvider) {
        const layers = this.viewer.imageryLayers;
        const newLayer = layers.addImageryProvider(newProvider);

        // Remove all previous layers (they're below the new one)
        // Work backwards to avoid index shifts
        const layerCount = layers.length;
        for (let i = layerCount - 2; i >= 0; i--) {
          try {
            layers.remove(layers.get(i), true);
          } catch (removeErr) {
            // Layer may already be gone — non-fatal
            console.warn('Layer removal warning (non-fatal):', removeErr);
          }
        }

        this.currentMode = mode;
      }
    } catch (e) {
      console.error('GeoVisionImageryManager.setMode error:', e);
      // Don't crash — the viewer will just show whatever imagery it already has
    }
  }

  /**
   * Reset internal state (for viewer recreation scenarios).
   */
  reset() {
    this.currentMode = null;
    this.operationId++;
    this.initialized = false;
  }
}
