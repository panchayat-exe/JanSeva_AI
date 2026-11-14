import * as Cesium from 'cesium';

/**
 * GeoVisionCameraController — Local-first deterministic camera positioning.
 * 
 * KEY PRINCIPLES:
 * 1. Camera always starts NEAR the target (no globe fly-over)
 * 2. setView() places camera directly above the incident
 * 3. Short flyTo() for the final isometric approach (≤1.5s)
 * 4. Coordinates comparison prevents duplicate positioning
 * 5. React state changes NEVER trigger camera movement
 */
export class GeoVisionCameraController {
  constructor(viewer) {
    this.viewer = viewer;
    this.isFlying = false;
    this.lastLat = null;
    this.lastLng = null;
    this.lastRadius = null;
  }

  /**
   * Position camera for an incident. Only moves if coordinates genuinely changed.
   * @param {Object} incident - Must have representative_lat, representative_lng, impact_radius
   * @param {boolean} force - Force reposition even if coordinates haven't changed (for recenter)
   */
  positionCameraForIncident(incident, force = false) {
    if (!this.viewer || this.viewer.isDestroyed() || !incident) return;

    const lat = incident.representative_lat || incident.latitude;
    const lng = incident.representative_lng || incident.longitude;
    if (!lat || !lng) return;

    // Guard: skip if coordinates haven't changed (unless forced/recenter)
    if (!force && this.lastLat === lat && this.lastLng === lng) return;
    
    // Guard: don't interrupt an in-progress flight
    if (this.isFlying && !force) return;

    // Cancel any current flight
    if (this.isFlying) {
      this.viewer.camera.cancelFlight();
      this.isFlying = false;
    }

    this.lastLat = lat;
    this.lastLng = lng;
    this.lastRadius = incident.impact_radius || 500;

    const radius = this.lastRadius;
    // Altitude: scale with impact radius but clamp to a tight local range.
    // Even a 1200m radius incident should not show the entire globe.
    const targetAltitude = Math.max(400, Math.min(radius * 2, 3000));
    const isometricOffset = targetAltitude * 0.7;

    // STEP 1: Immediately place camera directly above the target area.
    // Start at 1.2x target altitude — close enough to see local terrain,
    // never high enough to show the full globe.
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, targetAltitude * 1.2),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90), // looking straight down
        roll: 0
      }
    });

    // STEP 2: Short smooth fly to the final isometric view.
    // Camera is already near the target, so this is a local movement only.
    this.isFlying = true;

    const center = Cesium.Cartesian3.fromDegrees(lng, lat, 0);
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
    const cameraOffset = new Cesium.Cartesian3(0.0, -isometricOffset, targetAltitude);
    const destination = Cesium.Matrix4.multiplyByPoint(
      transform, cameraOffset, new Cesium.Cartesian3()
    );

    const pitchAngle = Math.atan2(-targetAltitude, isometricOffset);

    this.viewer.camera.flyTo({
      destination: destination,
      orientation: {
        heading: 0,
        pitch: pitchAngle,
        roll: 0
      },
      duration: 0.8,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      complete: () => { this.isFlying = false; },
      cancel: () => { this.isFlying = false; }
    });
  }

  /**
   * Reset internal state so next positionCameraForIncident will always move.
   */
  reset() {
    this.lastLat = null;
    this.lastLng = null;
    this.lastRadius = null;
    this.isFlying = false;
  }
}
