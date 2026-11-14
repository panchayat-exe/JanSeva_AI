export function calculateSpatialRisk(incident, infrastructureStats, infrastructureItems) {
  let score = 0;
  const reasons = [];

  // Base score from incident severity
  const severity = (incident.severity || '').toLowerCase();
  if (severity === 'critical') {
    score += 40;
    reasons.push("Incident severity is CRITICAL");
  } else if (severity === 'high') {
    score += 30;
    reasons.push("Incident severity is HIGH");
  } else if (severity === 'medium') {
    score += 15;
    reasons.push("Incident severity is MEDIUM");
  }

  // Exposure of critical facilities inside impact zone
  if (infrastructureStats.inImpactZone > 0) {
    const criticalInZone = infrastructureItems.filter(item => item.critical && item.inImpactZone);
    
    if (criticalInZone.length > 0) {
      score += Math.min(criticalInZone.length * 10, 40);
      reasons.push(`${criticalInZone.length} critical facilities within impact zone`);
      
      // Specifically call out nearest hospital/school if in zone
      const nearestHospital = criticalInZone.find(i => i.category === 'Healthcare');
      if (nearestHospital) {
        reasons.push(`Healthcare facility within ${nearestHospital.distanceMeters}m`);
        score += 10;
      }
      
      const nearestSchool = criticalInZone.find(i => i.category === 'Education');
      if (nearestSchool) {
        reasons.push(`School within ${nearestSchool.distanceMeters}m`);
        score += 10;
      }
    }
  }

  // Related complaints
  const complaintCount = incident.complaints?.length || incident.complaint_count || 0;
  if (complaintCount > 0) {
    score += Math.min(complaintCount * 5, 20);
    reasons.push(`${complaintCount} related complaints mapped`);
  }

  // Determine final risk level
  let level = 'LOW';
  if (score >= 70) level = 'CRITICAL';
  else if (score >= 45) level = 'HIGH';
  else if (score >= 20) level = 'MEDIUM';

  if (reasons.length === 0) {
    reasons.push("No significant spatial exposure detected");
  }

  return { level, score, reasons };
}
