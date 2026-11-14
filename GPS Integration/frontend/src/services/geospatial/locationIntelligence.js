import { calculateDistanceMeters, checkImpactZone } from './spatialAnalysis';
import { weatherProvider } from './weatherProvider';
import { calculateSpatialRisk } from './riskEngine';

// Cache: keyed by "incidentId_lat_lng"
const analysisCache = new Map();
const ANALYSIS_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

class LocationIntelligenceService {
  constructor() {
    this.abortController = null;
  }

  cancelActiveAnalysis() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async analyzeLocation(incident, selectedCoords, onProgress) {
    this.cancelActiveAnalysis();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const incidentLat = incident.representative_lat || incident.latitude;
    const incidentLng = incident.representative_lng || incident.longitude;
    const impactRadius = incident.impact_radius || 500;

    if (!incidentLat || !incidentLng) {
      throw new Error("Incident missing coordinates");
    }

    // 1. Determine target coordinates for spatial analysis (click re-analysis support)
    const lat = selectedCoords ? selectedCoords.lat : incidentLat;
    const lng = selectedCoords ? selectedCoords.lng : incidentLng;
    
    const isCustomLocation = !!selectedCoords && (lat !== incidentLat || lng !== incidentLng);
    const distanceFromIncident = isCustomLocation ? calculateDistanceMeters(incidentLat, incidentLng, lat, lng) : 0;

    // ── Check analysis cache ────────────────────────────────────
    const cacheKey = `${incident.id}_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const cached = analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < ANALYSIS_CACHE_TTL_MS) {
      onProgress({ stage: 'complete', result: cached.result });
      return cached.result;
    }

    onProgress({ stage: 'started', message: 'Analyzing coordinates...' });

    try {
      onProgress({ stage: 'fetching_data', message: 'Querying real geographic & environmental data...' });
      
      const currentTime = new Date().toISOString();
      const currentLabel = new Date().toLocaleTimeString();
      
      // 2 & 3. Fetch OSM infrastructure AND weather in PARALLEL (saves ~1-2 seconds)
      const { osmProvider } = await import('./osmProvider');
      const [osmResult, weather] = await Promise.all([
        osmProvider.fetchInfrastructure(lat, lng, 1000, impactRadius, signal).catch(e => {
          if (e.name !== 'AbortError') console.error("OSM Facilities Error:", e);
          return { items: [], stats: { total: 0, criticalCount: 0, inImpactZone: 0, categories: {} } };
        }),
        weatherProvider.fetchCurrentConditions(lat, lng, signal).catch(e => {
          if (e.name !== 'AbortError') console.error("Weather Error:", e);
          return null;
        }),
      ]);

      if (signal.aborted) return null;

      let facilities = osmResult.items.map(f => ({
        ...f,
        source: 'OPENSTREETMAP',
        retrievedAt: currentLabel,
        impactLevel: f.distanceMeters <= 100 ? 'CRITICAL' : f.distanceMeters <= 300 ? 'HIGH' : f.distanceMeters <= 600 ? 'MEDIUM' : 'LOW'
      }));
      let stats = osmResult.stats;

      if (weather) {
        weather.source = 'OPEN-METEO';
        weather.retrievedAt = currentLabel;
      }

      if (signal.aborted) return null;

      onProgress({ stage: 'analyzing', message: 'Calculating spatial risk and patterns...' });

      // 4. Complaint & Hotspot Analysis (around TARGET coordinates)
      const relatedComplaints = [];
      let complaintWithin1km = 0;
      
      if (incident.complaints && incident.complaints.length > 0) {
        incident.complaints.forEach(c => {
          if (c.latitude && c.longitude && c.id !== incident.id) {
            const dist = calculateDistanceMeters(lat, lng, c.latitude, c.longitude);
            relatedComplaints.push({ ...c, distanceMeters: dist });
            if (dist <= 1000) complaintWithin1km++;
          }
        });
        relatedComplaints.sort((a,b) => a.distanceMeters - b.distanceMeters);
      }

      let hotspotLevel = 'Insufficient spatial data for density analysis.';
      if (complaintWithin1km > 5) hotspotLevel = `CRITICAL CONCENTRATION: ${complaintWithin1km} complaints within 1km`;
      else if (complaintWithin1km > 2) hotspotLevel = `HIGH CONCENTRATION: ${complaintWithin1km} complaints within 1km`;
      else if (complaintWithin1km > 0) hotspotLevel = `MODERATE CONCENTRATION: ${complaintWithin1km} complaints within 1km`;

      let historical = {
        similar: relatedComplaints.length,
        period: "Last 12 months",
        recurring: relatedComplaints.length > 0 ? "YES" : "NO",
        source: 'JANSEVA DATABASE',
        retrievedAt: currentLabel
      };

      // 5. Evidence Spatial Verification (Always calculated against INCIDENT origin, not target offset)
      const evidenceVerification = this.verifyEvidence(incident, incidentLat, incidentLng);

      // 6. Risk Engine
      const risk = calculateSpatialRisk(incident, stats, facilities);
      if (complaintWithin1km > 2 && risk.score < 70) {
         risk.score += 20;
         risk.reasons.push("High spatial concentration of similar complaints");
         if (risk.score >= 70) risk.level = 'CRITICAL';
         else if (risk.score >= 45) risk.level = 'HIGH';
      }

      // 7. Generate Recommendations & Briefs
      const recommendation = this.generateRecommendation(incident, risk, stats);
      const osmData = { items: facilities, stats };
      const brief = this.generateDepartmentBrief(incident, {lat, lng, isCustomLocation, distanceFromIncident}, osmData, risk, relatedComplaints, historical, recommendation, weather, evidenceVerification);

      const result = {
        target: { lat, lng, isCustomLocation, distanceFromIncident },
        infrastructure: facilities,
        stats,
        weather,
        risk,
        brief,
        relatedComplaints,
        hotspotLevel,
        historical,
        recommendation,
        evidenceVerification,
        retrievedAt: currentTime
      };

      // Store in cache
      analysisCache.set(cacheKey, { result, timestamp: Date.now() });

      onProgress({ stage: 'complete', result });
      return result;

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Location Analysis failed:", error);
        onProgress({ stage: 'error', error });
      }
      return null;
    }
  }

  verifyEvidence(incident, incidentLat, incidentLng) {
    if (!incident.evidence || incident.evidence.length === 0) {
      return { status: 'UNVERIFIED — GPS METADATA UNAVAILABLE', message: 'No field evidence attached' };
    }

    let bestMatch = null;
    let minDistance = Infinity;

    incident.evidence.forEach(ev => {
      if (ev.latitude && ev.longitude) {
        const dist = calculateDistanceMeters(incidentLat, incidentLng, ev.latitude, ev.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = ev;
        }
      }
    });

    if (!bestMatch) {
      return { 
        status: 'UNVERIFIED — GPS METADATA UNAVAILABLE', 
        message: 'Images lack GPS EXIF metadata', 
        source: 'EXIF Extractor'
      };
    }

    if (minDistance <= 100) {
      return { status: 'GPS VERIFIED', message: `High spatial consistency (${Math.round(minDistance)}m deviation)`, distance: minDistance };
    } else {
      return { status: 'GPS MISMATCH', message: `Low spatial consistency (${Math.round(minDistance)}m deviation)`, distance: minDistance };
    }
  }

  generateRecommendation(incident, risk, stats) {
    let department = incident.department || 'Municipal Corporation';
    let priority = incident.priority_score >= 80 ? 'P0' : incident.priority_score >= 50 ? 'P1' : 'P2';
    let action = 'Standard field inspection required.';
    let reasons = [];

    const categoryStr = (incident.category || '').toLowerCase();
    
    if (categoryStr.includes('water') || categoryStr.includes('leak') || categoryStr.includes('flood')) {
      department = 'Water Supply Department';
      action = 'Inspect drainage inlet / pipeline zone, assess water accumulation, protect nearby access routes, and dispatch drainage response team.';
      reasons.push('Incident category maps to Water infrastructure.');
    } else if (categoryStr.includes('road') || categoryStr.includes('pothole') || categoryStr.includes('footpath')) {
      department = 'Public Works / Roads Department';
      action = 'Inspect road surface, establish temporary barricading if severe, estimate affected road segment, and dispatch roads team.';
      reasons.push('Incident category maps to Road network.');
    } else if (categoryStr.includes('light') || categoryStr.includes('electric')) {
      department = 'Electrical Department';
      action = 'Dispatch electrical repair crew, isolate live wires, and secure perimeter.';
      reasons.push('Incident category maps to Electrical grid.');
    } else if (categoryStr.includes('garbage') || categoryStr.includes('waste')) {
      department = 'Sanitation Department';
      action = 'Schedule clearance and sanitation of affected zone.';
      reasons.push('Incident category maps to Sanitation.');
    } else if (categoryStr.includes('drain')) {
      department = 'Stormwater Drains Department';
      action = 'Inspect for blockage and clear drain.';
      reasons.push('Incident category maps to Drainage.');
    }

    if (risk.level === 'CRITICAL') {
      priority = 'P0';
      reasons.push('Overall Spatial Risk is CRITICAL due to proximity to sensitive areas.');
      action = 'EMERGENCY RESPONSE: ' + action;
    }
    
    if (stats.criticalCount > 0) {
      reasons.push(`Exposure to ${stats.criticalCount} critical facilities requires urgent handling.`);
    }
    
    if (reasons.length === 0) {
      reasons.push('Standard categorization fallback applied.');
    }

    return {
      department,
      priority,
      action,
      reasons
    };
  }

  generateDepartmentBrief(incident, targetInfo, osmData, risk, relatedComplaints, historical, recommendation, weather, evidenceVerification) {
    const ts = new Date().toLocaleString();
    const items = osmData.items;
    const critInZone = items.filter(i => i.critical && i.inImpactZone).map(i => i.name).join(', ') || 'None';
    
    return `---------------------------------------
JANSEVA FIELD ACTION BRIEF
---------------------------------------
Incident ID: ${incident.id || 'N/A'}
Category: ${incident.category?.toUpperCase() || 'Unknown'}
Severity: ${(incident.severity || 'UNKNOWN').toUpperCase()}
Coordinates: ${targetInfo.lat?.toFixed(6)}, ${targetInfo.lng?.toFixed(6)}
Ward/address: ${incident.ward || incident.address || 'Unknown'}
Impact radius: ${incident.impact_radius || 500}m

NEARBY SPATIAL CONTEXT:
Nearby critical infrastructure: ${critInZone}
Related complaints: ${relatedComplaints.length} within vicinity
Weather context: ${weather ? `${weather.condition}, ${weather.temperature}°C` : 'Unavailable'}

EVIDENCE AND RISK:
Evidence status: ${evidenceVerification.status}
Spatial risk: ${risk.level} (Score: ${risk.score})
Risk reasons: ${risk.reasons.join(' | ')}

DISPATCH INSTRUCTIONS:
Recommended department: ${recommendation.department}
Priority: ${recommendation.priority}
Field instruction: ${recommendation.action}

Data sources: JANSEVA DATABASE, OPENSTREETMAP, OPEN-METEO
Timestamp: ${ts}
---------------------------------------`;
  }
}

export const locationIntelligence = new LocationIntelligenceService();
