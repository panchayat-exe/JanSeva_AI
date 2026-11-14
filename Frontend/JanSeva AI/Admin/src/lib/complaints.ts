export type Status = "Pending" | "Assigned" | "In Progress" | "Resolved";
export type Priority = "High" | "Medium" | "Low";

export type Complaint = {
  id: string;
  category: string;
  location: string;
  priority: Priority;
  status: Status;
  reportedOn: string;
  reportedBy: string;
  mobile: string;
  description: string;
  address: string;
  lat: string;
  lng: string;
  landmark: string;
  nearestRoad: string;
};

export const complaints: Complaint[] = [
  {
    id: "CMP-2026-1256",
    category: "Water Supply",
    location: "Ward 5, Sector 12",
    priority: "High",
    status: "Pending",
    reportedOn: "03 Aug 2026, 10:15 AM",
    reportedBy: "Citizen",
    mobile: "98XXXXXX23",
    description:
      "There is no water supply in our area from the last 3 days. People are facing a lot of problems. Please take necessary action.",
    address: "Andheri West, Mumbai, Maharashtra - 400053",
    lat: "19.1361",
    lng: "72.8296",
    landmark: "Andheri Metro Station (200 m)",
    nearestRoad: "SV Road (150 m)",
  },
  {
    id: "CMP-2026-1255",
    category: "Roads & Potholes",
    location: "Connaught Place",
    priority: "Medium",
    status: "In Progress",
    reportedOn: "03 Aug 2026, 09:42 AM",
    reportedBy: "Citizen",
    mobile: "97XXXXXX11",
    description: "Large pothole on the main road causing accidents during rain.",
    address: "Connaught Place, New Delhi - 110001",
    lat: "28.6315",
    lng: "77.2167",
    landmark: "Rajiv Chowk Metro (80 m)",
    nearestRoad: "Janpath Road (80 m)",
  },
  {
    id: "CMP-2026-1254",
    category: "Garbage Collection",
    location: "Koramangala",
    priority: "Medium",
    status: "In Progress",
    reportedOn: "03 Aug 2026, 09:10 AM",
    reportedBy: "Citizen",
    mobile: "99XXXXXX40",
    description: "Garbage has not been collected for a week near the market area.",
    address: "Koramangala 4th Block, Bengaluru, Karnataka - 560034",
    lat: "12.9352",
    lng: "77.6245",
    landmark: "Forum Mall (60 m)",
    nearestRoad: "80 Feet Road (40 m)",
  },
  {
    id: "CMP-2026-1253",
    category: "Street Lights",
    location: "T Nagar",
    priority: "Low",
    status: "Assigned",
    reportedOn: "02 Aug 2026, 08:35 PM",
    reportedBy: "Citizen",
    mobile: "96XXXXXX08",
    description: "Street lights are not working on the entire lane after 7 PM.",
    address: "T Nagar, Chennai, Tamil Nadu - 600017",
    lat: "13.0418",
    lng: "80.2341",
    landmark: "Panagal Park (90 m)",
    nearestRoad: "Usman Road (30 m)",
  },
  {
    id: "CMP-2026-1252",
    category: "Water Supply",
    location: "Park Street",
    priority: "High",
    status: "Pending",
    reportedOn: "02 Aug 2026, 07:20 PM",
    reportedBy: "Citizen",
    mobile: "95XXXXXX77",
    description: "Contaminated water supply reported by multiple households.",
    address: "Park Street, Kolkata, West Bengal - 700016",
    lat: "22.5523",
    lng: "88.3516",
    landmark: "Park Street Metro (250 m)",
    nearestRoad: "Park Street (50 m)",
  },
  {
    id: "CMP-2026-1251",
    category: "Tree Maintenance",
    location: "Banjara Hills",
    priority: "Low",
    status: "Resolved",
    reportedOn: "02 Aug 2026, 05:55 PM",
    reportedBy: "Citizen",
    mobile: "94XXXXXX32",
    description: "Overgrown tree branches blocking the footpath.",
    address: "Banjara Hills Road No. 12, Hyderabad, Telangana - 500034",
    lat: "17.4156",
    lng: "78.4347",
    landmark: "GVK One Mall (10 m)",
    nearestRoad: "Road No. 12 (20 m)",
  },
  {
    id: "CMP-2026-1249",
    category: "Drainage Issue",
    location: "Vastrapur",
    priority: "Medium",
    status: "Pending",
    reportedOn: "01 Aug 2026, 04:30 PM",
    reportedBy: "Citizen",
    mobile: "93XXXXXX19",
    description: "Open drain overflowing near residential buildings.",
    address: "Vastrapur, Ahmedabad, Gujarat - 380015",
    lat: "23.0375",
    lng: "72.5278",
    landmark: "Vastrapur Lake (100 m)",
    nearestRoad: "Drive-in Road (45 m)",
  },
  {
    id: "CMP-2026-1248",
    category: "Electricity",
    location: "Aundh",
    priority: "High",
    status: "In Progress",
    reportedOn: "01 Aug 2026, 03:10 PM",
    reportedBy: "Citizen",
    mobile: "92XXXXXX55",
    description: "Power outage since last night affecting the whole street.",
    address: "Aundh, Pune, Maharashtra - 411007",
    lat: "18.5590",
    lng: "73.8077",
    landmark: "Aundh Market (70 m)",
    nearestRoad: "ITI Road (30 m)",
  },
  {
    id: "CMP-2026-1247",
    category: "Roads & Potholes",
    location: "Mansarovar",
    priority: "High",
    status: "Pending",
    reportedOn: "01 Aug 2026, 11:00 AM",
    reportedBy: "Citizen",
    mobile: "91XXXXXX88",
    description: "Road completely broken after monsoon, no action taken.",
    address: "Mansarovar, Jaipur, Rajasthan - 302020",
    lat: "26.8535",
    lng: "75.7524",
    landmark: "Mansarovar Metro (150 m)",
    nearestRoad: "JLN Marg (60 m)",
  },
  {
    id: "CMP-2026-1246",
    category: "Garbage Collection",
    location: "Alambagh",
    priority: "Medium",
    status: "Resolved",
    reportedOn: "31 Jul 2026, 09:00 AM",
    reportedBy: "Citizen",
    mobile: "90XXXXXX44",
    description: "Dumping near bus stand causing health hazard.",
    address: "Alambagh, Lucknow, Uttar Pradesh - 226005",
    lat: "26.8006",
    lng: "80.9146",
    landmark: "Alambagh Bus Stand (30 m)",
    nearestRoad: "Kanpur Road (20 m)",
  },
  {
    id: "CMP-2026-1245",
    category: "Street Lights",
    location: "Arera Colony",
    priority: "Low",
    status: "Assigned",
    reportedOn: "30 Jul 2026, 06:00 PM",
    reportedBy: "Citizen",
    mobile: "89XXXXXX21",
    description: "Entire sector 10 without streetlights for 2 weeks.",
    address: "Arera Colony, Bhopal, Madhya Pradesh - 462016",
    lat: "23.2115",
    lng: "77.4350",
    landmark: "Arera Colony Market (50 m)",
    nearestRoad: "Zone-1 Road (25 m)",
  },
  {
    id: "CMP-2026-1244",
    category: "Water Supply",
    location: "Ashok Nagar",
    priority: "High",
    status: "Pending",
    reportedOn: "30 Jul 2026, 10:30 AM",
    reportedBy: "Citizen",
    mobile: "88XXXXXX66",
    description: "Water pipeline burst — road flooded, supply disrupted.",
    address: "Ashok Nagar, Patna, Bihar - 800020",
    lat: "25.6093",
    lng: "85.1376",
    landmark: "Gandhi Maidan (400 m)",
    nearestRoad: "Bailey Road (80 m)",
  },
];

export const CITY_STATE_MAP: Record<string, string> = {
  mumbai: "Maharashtra", pune: "Maharashtra", nagpur: "Maharashtra", nashik: "Maharashtra", aurangabad: "Maharashtra",
  "new delhi": "Delhi", delhi: "Delhi",
  bengaluru: "Karnataka", bangalore: "Karnataka", mysuru: "Karnataka", mysore: "Karnataka",
  hyderabad: "Telangana",
  chennai: "Tamil Nadu", coimbatore: "Tamil Nadu", madurai: "Tamil Nadu",
  kolkata: "West Bengal", howrah: "West Bengal",
  ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat", rajkot: "Gujarat",
  jaipur: "Rajasthan", jodhpur: "Rajasthan", udaipur: "Rajasthan",
  lucknow: "Uttar Pradesh", kanpur: "Uttar Pradesh", agra: "Uttar Pradesh", varanasi: "Uttar Pradesh", meerut: "Uttar Pradesh",
  bhopal: "Madhya Pradesh", indore: "Madhya Pradesh",
  patna: "Bihar", gaya: "Bihar",
  bhubaneswar: "Odisha", cuttack: "Odisha",
  guwahati: "Assam",
  chandigarh: "Chandigarh",
  ludhiana: "Punjab", amritsar: "Punjab",
  dehradun: "Uttarakhand",
  shimla: "Himachal Pradesh",
  ranchi: "Jharkhand",
  raipur: "Chhattisgarh",
  thiruvananthapuram: "Kerala", kochi: "Kerala", kozhikode: "Kerala",
  visakhapatnam: "Andhra Pradesh", vijayawada: "Andhra Pradesh",
  srinagar: "Jammu & Kashmir", jammu: "Jammu & Kashmir",
};

export function resolveLocation(city: string | null | undefined, state: string | null | undefined): string {
  if (!city) return "Unknown, Unknown";
  const resolvedState = state || CITY_STATE_MAP[city.toLowerCase()] || "Unknown";
  return resolvedState ? `${city}, ${resolvedState}` : city;
}

export const CATEGORY_LABELS: Record<string, string> = {
  WATER_SUPPLY: "Water Supply",
  ELECTRICITY: "Electricity",
  GARBAGE_SANITATION: "Garbage & Sanitation",
  ROADS_INFRASTRUCTURE: "Roads & Infrastructure",
  DRAINAGE_SEWAGE: "Drainage & Sewage",
  STREET_LIGHTS: "Street Lights",
  PARKS_RECREATION: "Parks & Recreation",
  BUILDING_PERMITS: "Building Permits",
  NOISE_POLLUTION: "Noise Pollution",
  AIR_POLLUTION: "Air Pollution",
  PUBLIC_TRANSPORT: "Public Transport",
  LAW_AND_ORDER: "Law & Order",
  HEALTH_SERVICES: "Health Services",
  EDUCATION: "Education",
  OTHER: "Other",
};

export const formatCategory = (c: string) =>
  CATEGORY_LABELS[c] ?? c.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");


export const getComplaint = (id: string) =>
  complaints.find((c) => c.id.toLowerCase() === id.toLowerCase());

export const statusTone: Record<Status, string> = {
  Pending: "border-warning/40 bg-warning/10 text-warning",
  Assigned: "border-ashoka/40 bg-ashoka/10 text-ashoka",
  "In Progress": "border-saffron/40 bg-saffron/10 text-saffron",
  Resolved: "border-india-green/40 bg-india-green/10 text-india-green",
};

export const priorityTone: Record<Priority, string> = {
  High: "text-destructive",
  Medium: "text-saffron",
  Low: "text-muted-foreground",
};
