import { stations } from "./stations.js";
import type { Availability, JourneyLeg, JourneyResult, Quota, SearchQuery, SearchResponse, Station, Train, TrainClass } from "./types.js";

export { stations };

export const BOOKING_WINDOW_MONTHS = 3;
const hubs = ["NDLS", "NZM", "MMCT", "CSMT", "SBC", "MAS", "HWH", "SC", "ADI", "PUNE", "JP", "BPL", "NGP", "LKO", "BSB", "PNBE", "MAO", "DDN"];
const trainNames = ["Rajdhani Express", "Shatabdi Express", "Duronto Express", "Vande Bharat Express", "Jan Shatabdi", "Sampark Kranti", "Superfast Express", "Intercity Express", "Mail Express", "Humsafar Express", "Garib Rath", "Tejas Express"];
const classes: TrainClass[] = ["1A", "2A", "3A", "SL", "CC", "EC", "2S"];
const availabilityRank: Record<Availability, number> = { AVAILABLE: 4, RAC: 3, WL: 2, NOT_AVAILABLE: 1 };

export function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seed: number) {
  let value = seed || 1;
  return () => {
    value = Math.imul(1664525, value) + 1013904223;
    return (value >>> 0) / 4294967296;
  };
}

export function station(code: string): Station {
  const found = stations.find((s) => s.code === code);
  if (!found) throw new Error(`Missing mock station ${code}`);
  return found;
}

function searchable(s: Station) {
  return `${s.code} ${s.name} ${s.city} ${s.state} ${s.region} ${s.zone} ${s.aliases.join(" ")}`.toLowerCase();
}

export function searchStations(term: string, limit = 12): Station[] {
  const q = term.trim().toLowerCase();
  if (!q) return stations.filter((s) => s.category === "major").slice(0, limit);
  return stations
    .map((s) => {
      const name = s.name.toLowerCase();
      const city = s.city.toLowerCase();
      const code = s.code.toLowerCase();
      const aliases = s.aliases.join(" ").toLowerCase();
      let score = 0;
      if (name === q) score += 1000;
      if (code === q) score += 950;
      if (name.startsWith(q)) score += 800;
      if (code.startsWith(q)) score += 760;
      if (city === q) score += 680;
      if (city.startsWith(q)) score += 620;
      if (aliases.includes(q)) score += 520;
      if (searchable(s).includes(q)) score += 220;
      if (s.category === "major") score += 80;
      return { s, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
    .slice(0, limit)
    .map((item) => item.s);
}

function addMins(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${Math.floor((total % 1440) / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function durationBetween(a: Station, b: Station, random: () => number) {
  const regionGap = a.region === b.region ? 0 : 1;
  const majorBonus = a.category === "major" && b.category === "major" ? -90 : 80;
  return Math.max(110, 250 + regionGap * 520 + Math.floor(random() * 820) + majorBonus);
}

function classInfos(base: number, random: () => number, selected: TrainClass) {
  const availability: Availability[] = ["AVAILABLE", "AVAILABLE", "AVAILABLE", "RAC", "WL", "NOT_AVAILABLE"];
  return classes.map((classCode) => {
    const multiplier: Record<TrainClass, number> = { "2S": 0.25, SL: 0.42, "3A": 1, "2A": 1.45, "1A": 2.35, CC: 0.72, EC: 1.55 };
    const picked = classCode === selected ? availability[Math.floor(random() * 4)] : availability[Math.floor(random() * availability.length)];
    return { classCode, fare: Math.max(90, Math.round(base * multiplier[classCode])), availability: picked, seats: picked === "AVAILABLE" ? 4 + Math.floor(random() * 70) : picked === "RAC" ? 1 + Math.floor(random() * 12) : 0 };
  });
}

function train(from: Station, to: Station, query: SearchQuery, seed: number, serial: number): Train {
  const random = rng(seed + serial * 971);
  const depart = `${Math.floor(random() * 24).toString().padStart(2, "0")}:${(Math.floor(random() * 4) * 15).toString().padStart(2, "0")}`;
  const durationMins = durationBetween(from, to, random);
  const number = `${10000 + ((seed + serial * 137) % 89999)}`;
  const name = `${from.city}-${to.city} ${trainNames[serial % trainNames.length]}`;
  const baseFare = Math.round(450 + durationMins * (0.75 + random()));
  return { number, name, from: from.code, to: to.code, depart, arrive: addMins(depart, durationMins), durationMins, days: [0, 1, 2, 3, 4, 5, 6].filter((d) => (d + serial + seed) % 5 !== 0), classes: classInfos(baseFare, random, query.classCode) };
}

function fareFor(t: Train, query: SearchQuery): number {
  const info = t.classes.find((c) => c.classCode === query.classCode) || t.classes[0];
  let fare = info.fare * query.passengers;
  if (query.disability) fare *= 0.75;
  if (query.railPass) fare *= 0.85;
  if (query.quota === "TQ") fare *= 1.25;
  if (query.quota === "PT") fare *= 1.45;
  return Math.round(fare);
}

function availabilityFor(legs: JourneyLeg[], query: SearchQuery): Availability {
  const states = legs.map((leg) => (leg.train.classes.find((c) => c.classCode === query.classCode) || leg.train.classes[0]).availability);
  return states.sort((a, b) => availabilityRank[a] - availabilityRank[b])[0];
}

function journey(date: string, kind: "direct" | "connecting", legs: JourneyLeg[], query: SearchQuery, id: string, transferMins?: number): JourneyResult {
  return {
    id, date, kind, legs, transferMins,
    totalFare: legs.reduce((sum, leg) => sum + fareFor(leg.train, query), 0),
    availability: availabilityFor(legs, query),
    durationMins: legs.reduce((sum, leg) => sum + leg.train.durationMins, 0) + (transferMins || 0)
  };
}

function routeLikelyNoResult(query: SearchQuery, from: Station, to: Station) {
  if (from.category === "major" || to.category === "major") return false;
  return hashText(`${query.from}-${query.to}-${query.date}-${query.classCode}-${query.quota}`) % 10 === 0;
}

function transferCandidates(from: Station, to: Station, seed: number) {
  const preferred = hubs.map(station).filter((s) => s.code !== from.code && s.code !== to.code);
  const sameRegion = stations.filter((s) => s.category === "major" && (s.region === from.region || s.region === to.region));
  return [...preferred, ...sameRegion].filter((s, i, arr) => arr.findIndex((x) => x.code === s.code) === i).sort((a, b) => (hashText(a.code + seed) % 100) - (hashText(b.code + seed) % 100)).slice(0, 24);
}

export function searchTrains(query: SearchQuery): SearchResponse {
  const from = station(query.from);
  const to = station(query.to);
  const seed = hashText(`${query.from}|${query.to}|${query.date}|${query.classCode}|${query.quota}`);
  if (routeLikelyNoResult(query, from, to)) return { directJourneys: [], connectingJourneys: [], metadata: { totalResults: 0, searchId: `SR-${seed}`, generatedAt: new Date().toISOString() } };
  const directCount = from.region === to.region || from.category === "major" || to.category === "major" ? 12 + (seed % 18) : 0;
  const directJourneys: JourneyResult[] = [];
  for (let i = 0; i < directCount; i += 1) {
    const legTrain = train(from, to, query, seed, i);
    directJourneys.push(journey(query.date, "direct", [{ train: legTrain, from, to }], query, `${query.date}-${legTrain.number}`));
  }
  const connectingJourneys: JourneyResult[] = [];
  const transfers = transferCandidates(from, to, seed);
  for (let i = 0; i < transfers.length && directJourneys.length + connectingJourneys.length < 96; i += 1) {
    const via = transfers[i];
    const first = train(from, via, query, seed, 100 + i);
    const second = train(via, to, query, seed, 200 + i);
    const wait = 55 + ((seed + i * 23) % 210);
    connectingJourneys.push(journey(query.date, "connecting", [{ train: first, from, to: via }, { train: second, from: via, to }], query, `${query.date}-${first.number}-${second.number}`, wait));
  }
  while (directJourneys.length + connectingJourneys.length < 60) {
    const i = connectingJourneys.length + 50;
    const via = transfers[i % transfers.length] || station("NDLS");
    const first = train(from, via, query, seed, 300 + i);
    const second = train(via, to, query, seed, 400 + i);
    connectingJourneys.push(journey(query.date, "connecting", [{ train: first, from, to: via }, { train: second, from: via, to }], query, `${query.date}-${first.number}-${second.number}`, 70 + (i % 180)));
  }
  return { directJourneys, connectingJourneys, metadata: { totalResults: directJourneys.length + connectingJourneys.length, searchId: `SR-${seed}`, generatedAt: new Date().toISOString() } };
}

export function searchJourneys(query: SearchQuery): JourneyResult[] {
  const response = searchTrains(query);
  return [...response.directJourneys, ...response.connectingJourneys];
}
