import { prisma } from '../../config/database';

// ─── Constants ──────────────────────────────────────────────

const IMPACT_RADIUS: Record<string, number> = {
  CRITICAL: 1500,
  HIGH: 1000,
  MEDIUM: 500,
  LOW: 250,
};

const DEPT_MAP: Record<string, string> = {
  WATER_SUPPLY: 'Water Supply Department',
  ELECTRICITY: 'Electricity Department',
  GARBAGE_SANITATION: 'Sanitation Department',
  ROADS_INFRASTRUCTURE: 'Public Works / Roads Department',
  DRAINAGE_SEWAGE: 'Drainage & Public Works Department',
  STREET_LIGHTS: 'Municipal Lighting Department',
  PARKS_RECREATION: 'Parks & Recreation Department',
  BUILDING_PERMITS: 'Building & Planning Department',
  NOISE_POLLUTION: 'Environment & Noise Control Department',
  AIR_POLLUTION: 'Pollution Control Department',
  PUBLIC_TRANSPORT: 'Transport Department',
  LAW_AND_ORDER: 'Police Department',
  HEALTH_SERVICES: 'Health Department',
  EDUCATION: 'Education Department',
  OTHER: 'Municipal Corporation',
};

const PRIORITY_MAP: Record<string, string> = {
  CRITICAL: 'P1',
  HIGH: 'P1',
  MEDIUM: 'P2',
  LOW: 'P3',
};

const WMO_CODES: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

const INFRA_BY_CATEGORY: Record<string, string> = {
  WATER_SUPPLY:
    'node["man_made"~"water_tower|water_works"];way["waterway"];node["amenity"="water_point"];',
  ELECTRICITY:
    'node["power"~"substation|tower|pole"];way["power"~"line|cable"];',
  ROADS_INFRASTRUCTURE:
    'way["highway"~"primary|secondary|tertiary|residential"];node["highway"="traffic_signals"];way["bridge"="yes"];',
  DRAINAGE_SEWAGE:
    'node["man_made"~"sewer|manhole"];way["waterway"~"drain|ditch"];',
  STREET_LIGHTS:
    'node["highway"="street_lamp"];',
  GARBAGE_SANITATION:
    'node["amenity"~"waste_disposal|recycling|waste_basket"];',
  OTHER: '',
};

const GENERAL_INFRA = `
  node["amenity"~"hospital|clinic"](around:RADIUS,LAT,LNG);
  node["amenity"~"school|college"](around:RADIUS,LAT,LNG);
  node["amenity"~"police|fire_station"](around:RADIUS,LAT,LNG);
  way["building"~"hospital|school|government"](around:RADIUS,LAT,LNG);
`;

// ─── Sub-functions ───────────────────────────────────────────

async function getNearbyComplaints(
  lat: number,
  lng: number,
  radiusM: number,
  excludeId: string,
  category: string,
) {
  const radiusKm = radiusM / 1000;

  // Table mapped to "complaints" per @@map in schema. latitude/longitude are Float? — no cast needed.
  const allNearby: Array<{
    id: string;
    category: string;
    priority: string;
    status: string;
    createdAt: Date;
  }> = await prisma.$queryRaw`
    SELECT id, category, priority, status, "createdAt"
    FROM complaints
    WHERE id != ${excludeId}
      AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND (
        6371 * acos(
          LEAST(1, cos(radians(${lat})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(latitude)))
        )
      ) <= ${radiusKm}
  `;

  const sameCat = allNearby.filter((c) => c.category === category);
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const recurring = allNearby.some(
    (c) => new Date(c.createdAt) >= twelveMonthsAgo && c.category === category,
  );

  return {
    total: allNearby.length,
    sameCategoryCount: sameCat.length,
    recurring,
    concentration:
      allNearby.length === 0 ? 'LOW' : allNearby.length <= 3 ? 'MODERATE' : 'HIGH',
  };
}

async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'JanSevaAI/1.0' },
  });
  if (!res.ok) throw new Error('Nominatim failed');
  const data = (await res.json()) as {
    address?: Record<string, string>;
    display_name?: string;
  };
  const a = data.address ?? {};
  const road = a['road'] || a['pedestrian'] || a['footway'] || '';
  const locality =
    a['suburb'] || a['neighbourhood'] || a['quarter'] || a['village'] || '';
  const city =
    a['city'] || a['town'] || a['municipality'] || a['village'] || '';
  const state = a['state'] || '';
  const postcode = a['postcode'] || '';
  const parts = [road, locality, city, state, postcode].filter(Boolean);
  return {
    road,
    locality,
    city,
    state,
    postcode,
    formattedAddress: parts.join(', ') || data.display_name || '',
  };
}

async function getWeather(lat: number, lng: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open-Meteo failed');
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; time?: string };
  };
  const temp = data.current?.temperature_2m;
  const code = data.current?.weather_code ?? -1;
  const condition = WMO_CODES[code] ?? `Code ${code}`;
  return {
    temperature: temp != null ? `${temp} °C` : null,
    condition,
    observedAt: data.current?.time ?? new Date().toISOString(),
    source: 'Open-Meteo',
  };
}

async function getInfrastructure(
  lat: number,
  lng: number,
  radiusM: number,
  category: string,
) {
  const categoryParts = (
    INFRA_BY_CATEGORY[category] || INFRA_BY_CATEGORY['OTHER'] || ''
  )
    .split(';')
    .filter(Boolean)
    .map((p) => `${p}(around:${radiusM},${lat},${lng});`)
    .join('\n');

  const generalParts = GENERAL_INFRA.replace(/RADIUS/g, String(radiusM))
    .replace(/LAT/g, String(lat))
    .replace(/LNG/g, String(lng));

  const query = `[out:json][timeout:25];(\n${categoryParts}\n${generalParts});out tags;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error('Overpass failed');
  const data = (await res.json()) as {
    elements?: Array<{ tags?: Record<string, string> }>;
  };

  const counts: Record<string, number> = {
    hospital: 0,
    school: 0,
    police: 0,
    fire_station: 0,
    road: 0,
    other: 0,
  };
  const items: string[] = [];

  for (const el of data.elements ?? []) {
    const t = el.tags ?? {};
    const amenity = (t['amenity'] ?? '').toLowerCase();
    const name = t['name'] || '';
    if (amenity === 'hospital' || amenity === 'clinic') {
      counts['hospital']++;
      if (name) items.push(`Hospital: ${name}`);
    } else if (amenity === 'school' || amenity === 'college') {
      counts['school']++;
      if (name) items.push(`School: ${name}`);
    } else if (amenity === 'police') {
      counts['police']++;
      if (name) items.push(`Police: ${name}`);
    } else if (amenity === 'fire_station') {
      counts['fire_station']++;
      if (name) items.push(`Fire Station: ${name}`);
    } else if (t['highway']) {
      counts['road']++;
      if (name) items.push(`Road: ${name}`);
    } else {
      counts['other']++;
    }
  }

  const summary: string[] = [];
  if (counts['hospital'] > 0)
    summary.push(`${counts['hospital']} hospital${counts['hospital'] > 1 ? 's' : ''}`);
  if (counts['school'] > 0)
    summary.push(`${counts['school']} school${counts['school'] > 1 ? 's' : ''}`);
  if (counts['police'] > 0)
    summary.push(`${counts['police']} police station${counts['police'] > 1 ? 's' : ''}`);
  if (counts['fire_station'] > 0)
    summary.push(
      `${counts['fire_station']} fire station${counts['fire_station'] > 1 ? 's' : ''}`,
    );
  if (counts['road'] > 0)
    summary.push(`${counts['road']} road segment${counts['road'] > 1 ? 's' : ''}`);

  return {
    total: data.elements?.length ?? 0,
    counts,
    summary,
    namedItems: items.slice(0, 5),
  };
}

// ─── Risk Calculation ────────────────────────────────────────

function calculateRisk(inputs: {
  priority: string;
  nearbySameCategory: number;
  recurring: boolean;
  hospitalNearby: boolean;
  totalNearby: number;
  hasEvidence: boolean;
}) {
  const scores: Record<string, number> = {};

  scores['severity'] =
    ({ CRITICAL: 40, HIGH: 30, MEDIUM: 15, LOW: 5 } as Record<string, number>)[
      inputs.priority
    ] ?? 15;
  scores['density'] = Math.min(inputs.totalNearby * 3, 20);
  scores['recurrence'] = inputs.recurring ? 15 : 0;
  scores['infrastructure'] = inputs.hospitalNearby ? 10 : 0;
  scores['evidence'] = inputs.hasEvidence ? 5 : 0;

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const level =
    total >= 70
      ? 'CRITICAL'
      : total >= 45
        ? 'HIGH'
        : total >= 20
          ? 'MEDIUM'
          : 'LOW';

  const reasons: string[] = [];
  if (scores['severity'] >= 30)
    reasons.push(`Incident severity is ${inputs.priority}`);
  if (inputs.totalNearby > 0)
    reasons.push(
      `${inputs.totalNearby} related complaint${inputs.totalNearby > 1 ? 's' : ''} mapped nearby`,
    );
  if (inputs.recurring) reasons.push('Recurring issue detected in last 12 months');
  if (inputs.hospitalNearby) reasons.push('Hospital located within impact radius');
  if (inputs.hasEvidence) reasons.push('Evidence uploaded');

  return { level, score: total, breakdown: scores, reasons };
}

// ─── Main Export ─────────────────────────────────────────────

export async function analyzeLocation(complaintId: string) {
  // Step 1: Load complaint from Prisma
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { media: true, department: true },
  });
  if (!complaint) throw new Error('Complaint not found');

  const lat = complaint.latitude;
  const lng = complaint.longitude;
  const hasCoords =
    lat !== null && lat !== undefined && !isNaN(lat) &&
    lng !== null && lng !== undefined && !isNaN(lng);

  // Step 2: Impact radius
  const radiusM = IMPACT_RADIUS[complaint.priority] ?? 500;

  // Step 3: Recommended department
  const recommendedDept =
    complaint.department?.name ||
    DEPT_MAP[complaint.category] ||
    'Municipal Corporation';

  // Step 4: Priority code
  const priority = PRIORITY_MAP[complaint.priority] ?? 'P3';

  // Step 5: Parallel async operations
  const [geoResult, weatherResult, infraResult, nearbyResult] =
    await Promise.allSettled([
      hasCoords
        ? reverseGeocode(lat!, lng!)
        : Promise.reject(new Error('No coordinates')),
      hasCoords
        ? getWeather(lat!, lng!)
        : Promise.reject(new Error('No coordinates')),
      hasCoords
        ? getInfrastructure(lat!, lng!, radiusM, complaint.category)
        : Promise.reject(new Error('No coordinates')),
      hasCoords
        ? getNearbyComplaints(lat!, lng!, 1000, complaintId, complaint.category)
        : Promise.reject(new Error('No coordinates')),
    ]);

  const geo = geoResult.status === 'fulfilled' ? geoResult.value : null;
  const weather =
    weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const infra =
    infraResult.status === 'fulfilled' ? infraResult.value : null;
  const nearby =
    nearbyResult.status === 'fulfilled'
      ? nearbyResult.value
      : { total: 0, sameCategoryCount: 0, recurring: false, concentration: 'LOW' };

  // Step 6: Risk calculation
  const risk = calculateRisk({
    priority: complaint.priority,
    nearbySameCategory: nearby.sameCategoryCount,
    recurring: nearby.recurring,
    hospitalNearby: (infra?.counts?.['hospital'] ?? 0) > 0,
    totalNearby: nearby.total,
    hasEvidence: (complaint.media?.length ?? 0) > 0,
  });

  // Build sources log
  const sources = [
    {
      name: 'NOMINATIM',
      status: geoResult.status === 'fulfilled' ? 'LIVE' : 'UNAVAILABLE',
      fetchedAt: new Date().toISOString(),
    },
    {
      name: 'OPEN-METEO',
      status: weatherResult.status === 'fulfilled' ? 'LIVE' : 'UNAVAILABLE',
      fetchedAt: new Date().toISOString(),
    },
    {
      name: 'OPENSTREETMAP',
      status: infraResult.status === 'fulfilled' ? 'LIVE' : 'UNAVAILABLE',
      fetchedAt: new Date().toISOString(),
    },
    {
      name: 'JANSEVA DATABASE',
      status: 'LIVE',
      fetchedAt: new Date().toISOString(),
    },
  ];

  const reasons = [
    `Incident category maps to ${recommendedDept}.`,
    nearby.sameCategoryCount > 0
      ? `${nearby.sameCategoryCount} similar complaint${nearby.sameCategoryCount > 1 ? 's' : ''} found nearby.`
      : null,
    infra && infra.total > 0
      ? `${infra.total} civic assets within impact radius.`
      : null,
  ].filter((r): r is string => r !== null);

  return {
    complaintId,
    generatedAt: new Date().toISOString(),
    origin: {
      latitude: hasCoords ? lat : null,
      longitude: hasCoords ? lng : null,
      address: geo?.formattedAddress || complaint.address || null,
      locality: geo?.locality || complaint.locality || null,
      city: geo?.city || complaint.city || null,
      state: geo?.state || complaint.state || null,
      postcode: geo?.postcode || complaint.pincode || null,
      road: geo?.road || complaint.nearestRoad || null,
    },
    incident: {
      category: complaint.category,
      priority: complaint.priority,
      impactRadiusMeters: radiusM,
      department: recommendedDept,
    },
    weather: weather
      ? {
          temperature: weather.temperature,
          condition: weather.condition,
          observedAt: weather.observedAt,
          source: weather.source,
          available: true,
        }
      : { available: false },
    infrastructure: infra
      ? {
          total: infra.total,
          counts: infra.counts,
          summary: infra.summary,
          namedItems: infra.namedItems,
          available: true,
        }
      : { available: false, total: 0, counts: {}, summary: [], namedItems: [] },
    relatedComplaints: {
      withinRadius: nearby.total,
      sameCategoryCount: nearby.sameCategoryCount,
      recurring: nearby.recurring,
      concentration: nearby.concentration,
    },
    evidence: {
      count: complaint.media?.length ?? 0,
      status: (complaint.media?.length ?? 0) > 0 ? 'PRESENT' : 'ABSENT',
    },
    risk,
    recommendation: {
      department: recommendedDept,
      priority,
      action: `Dispatch ${recommendedDept} field team to ${geo?.locality || complaint.locality || 'reported location'}.`,
      reasons,
    },
    sources,
  };
}
