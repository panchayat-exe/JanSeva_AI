/**
 * Classifies OpenStreetMap tags into specific civic intelligence categories.
 */

export function classifyOSMTags(tags) {
  if (!tags) return null;

  const { amenity, building, landuse, highway, railway, waterway, natural, power, man_made } = tags;

  // Healthcare
  if (['hospital', 'clinic', 'pharmacy', 'doctors'].includes(amenity)) {
    return { category: 'Healthcare', type: amenity, critical: true };
  }

  // Emergency (Police / Fire / Ambulance)
  if (['police', 'fire_station', 'ambulance_station'].includes(amenity)) {
    return { category: 'Emergency', type: amenity, critical: true };
  }

  // Education
  if (['school', 'college', 'university', 'kindergarten'].includes(amenity)) {
    return { category: 'Education', type: amenity, critical: true };
  }

  // Transport
  if (highway || ['station', 'halt'].includes(railway) || ['bus_station', 'parking'].includes(amenity)) {
    const type = highway || railway || amenity;
    // Major roads are critical
    const isMajor = ['motorway', 'trunk', 'primary', 'secondary'].includes(highway);
    return { category: 'Transport', type, critical: isMajor };
  }

  // Government / Public Infrastructure
  if (['townhall', 'public_building', 'community_centre', 'shelter', 'toilets'].includes(amenity)) {
    return { category: 'Government', type: amenity, critical: false };
  }

  // Utilities
  if (power || ['wastewater_plant', 'water_works', 'substation'].includes(man_made)) {
    const type = power || man_made;
    return { category: 'Utilities', type, critical: true };
  }

  // Water Bodies
  if (waterway || natural === 'water') {
    const type = waterway || natural;
    return { category: 'Water Bodies', type, critical: false };
  }

  // Construction
  if (building === 'construction' || landuse === 'construction') {
    return { category: 'Construction', type: 'construction', critical: false };
  }

  return null;
}
