export const BOOKING_WINDOW_MONTHS = 3;
export const stations = [
    ["MMCT", "Mumbai Central", "Mumbai", "West"], ["CSMT", "CSM Terminus", "Mumbai", "West"], ["LTT", "Lokmanya Tilak Terminus", "Mumbai", "West"], ["BDTS", "Bandra Terminus", "Mumbai", "West"],
    ["NDLS", "New Delhi", "Delhi", "North"], ["NZM", "Hazrat Nizamuddin", "Delhi", "North"], ["ANVT", "Anand Vihar Terminal", "Delhi", "North"],
    ["HWH", "Howrah Junction", "Kolkata", "East"], ["SDAH", "Sealdah", "Kolkata", "East"], ["MAS", "Chennai Central", "Chennai", "South"], ["SBC", "Bengaluru City", "Bengaluru", "South"],
    ["SC", "Secunderabad Junction", "Hyderabad", "South"], ["PUNE", "Pune Junction", "Pune", "West"], ["ADI", "Ahmedabad Junction", "Ahmedabad", "West"], ["JP", "Jaipur Junction", "Jaipur", "North"],
    ["LKO", "Lucknow NR", "Lucknow", "North"], ["BSB", "Varanasi Junction", "Varanasi", "North"], ["PNBE", "Patna Junction", "Patna", "East"], ["BPL", "Bhopal Junction", "Bhopal", "Central"],
    ["INDB", "Indore Junction", "Indore", "Central"], ["NGP", "Nagpur Junction", "Nagpur", "Central"], ["DDN", "Dehradun", "Dehradun", "North"], ["CDG", "Chandigarh", "Chandigarh", "North"],
    ["ASR", "Amritsar Junction", "Amritsar", "North"], ["JAT", "Jammu Tawi", "Jammu", "North"], ["GHY", "Guwahati", "Guwahati", "East"], ["BBS", "Bhubaneswar", "Bhubaneswar", "East"],
    ["ERS", "Ernakulam Junction", "Kochi", "South"], ["TVC", "Thiruvananthapuram Central", "Thiruvananthapuram", "South"], ["CBE", "Coimbatore Junction", "Coimbatore", "South"],
    ["MDU", "Madurai Junction", "Madurai", "South"], ["RNC", "Ranchi Junction", "Ranchi", "East"], ["R", "Raipur Junction", "Raipur", "Central"], ["ST", "Surat", "Surat", "West"],
    ["BRC", "Vadodara Junction", "Vadodara", "West"], ["CNB", "Kanpur Central", "Kanpur", "North"], ["PRYJ", "Prayagraj Junction", "Prayagraj", "North"], ["AGC", "Agra Cantt", "Agra", "North"],
    ["MTJ", "Mathura Junction", "Mathura", "North"], ["HW", "Haridwar", "Haridwar", "North"], ["RK", "Roorkee", "Roorkee", "North"], ["MTC", "Meerut City", "Meerut", "North"], ["GZB", "Ghaziabad", "Ghaziabad", "North"]
].map(([code, name, city, region]) => ({ code, name, city, region, nearby: [] }));
function cls(base, availability = "AVAILABLE") {
    return [
        { classCode: "SL", fare: Math.round(base * 0.55), availability, seats: availability === "AVAILABLE" ? 42 : 0 },
        { classCode: "3A", fare: base, availability, seats: availability === "AVAILABLE" ? 18 : 0 },
        { classCode: "2A", fare: Math.round(base * 1.45), availability: availability === "AVAILABLE" ? "RAC" : availability, seats: 6 },
        { classCode: "1A", fare: Math.round(base * 2.2), availability: "WL", seats: 0 }
    ];
}
const trainRows = [
    ["12951", "Mumbai Rajdhani Express", "MMCT", "NDLS", "16:55", "08:35", 940, cls(2650)], ["12953", "August Kranti Rajdhani", "MMCT", "NZM", "17:10", "10:55", 1065, cls(2450)],
    ["12017", "Dehradun Shatabdi", "NDLS", "DDN", "06:45", "12:55", 370, [{ classCode: "CC", fare: 900, availability: "AVAILABLE", seats: 28 }, { classCode: "EC", fare: 1710, availability: "RAC", seats: 4 }]],
    ["22691", "Rajdhani Express", "SBC", "NZM", "20:00", "05:55", 2035, cls(3100)], ["12627", "Karnataka Express", "SBC", "NDLS", "19:20", "10:50", 2370, cls(1850)],
    ["12295", "Sanghamitra Express", "SBC", "PNBE", "09:10", "07:40", 2790, cls(1780)], ["12840", "Chennai Howrah Mail", "MAS", "HWH", "19:20", "03:55", 1955, cls(1670)],
    ["12859", "Gitanjali Express", "CSMT", "HWH", "06:00", "13:05", 1865, cls(1980)], ["12262", "Howrah Duronto", "HWH", "CSMT", "08:20", "11:25", 1625, cls(2200)],
    ["12723", "Telangana Express", "SC", "NDLS", "06:25", "07:40", 1515, cls(1750)], ["12957", "Swarna Jayanti Rajdhani", "ADI", "NDLS", "17:45", "07:30", 825, cls(2100)],
    ["12915", "Ashram Express", "ADI", "DLI", "19:00", "10:10", 910, cls(1200)], ["12985", "Double Decker", "JP", "NDLS", "06:00", "10:25", 265, [{ classCode: "CC", fare: 650, availability: "AVAILABLE", seats: 54 }]],
    ["12559", "Shiv Ganga Express", "BSB", "NDLS", "22:15", "08:25", 610, cls(1120)], ["12309", "Rajendra Nagar Tejas", "PNBE", "NDLS", "19:10", "07:40", 750, cls(1650)],
    ["12155", "Bhopal Express", "BPL", "NZM", "21:05", "07:50", 645, cls(1100)], ["12919", "Malwa Express", "INDB", "JAT", "12:15", "16:10", 1675, cls(1520)],
    ["12617", "Mangala Lakshadweep", "ERS", "NZM", "13:25", "13:15", 2870, cls(2600)], ["12423", "Dibrugarh Rajdhani", "NDLS", "GHY", "16:20", "19:25", 1625, cls(2850)],
    ["12801", "Purushottam Express", "PURI", "NDLS", "21:45", "04:00", 1815, cls(1620)], ["12129", "Azad Hind Express", "PUNE", "HWH", "18:35", "03:55", 2000, cls(1650)],
    ["12137", "Punjab Mail", "CSMT", "FZR", "19:35", "05:10", 2015, cls(1580)], ["12029", "Swarna Shatabdi", "NDLS", "ASR", "07:20", "13:30", 370, [{ classCode: "CC", fare: 880, availability: "AVAILABLE", seats: 32 }, { classCode: "EC", fare: 1640, availability: "AVAILABLE", seats: 7 }]],
    ["19019", "Dehradun Express", "BDTS", "HW", "00:05", "15:55", 2390, cls(1350, "WL")], ["22917", "Haridwar SF Express", "BDTS", "HW", "12:45", "14:40", 1555, cls(1720)]
];
export const trains = trainRows.map(([number, name, from, to, depart, arrive, durationMins, classes]) => ({ number, name, from, to, depart, arrive, durationMins, days: [0, 1, 2, 3, 4, 5, 6], classes }));
export function station(code) {
    const found = stations.find((s) => s.code === code);
    if (!found)
        throw new Error(`Missing mock station ${code}`);
    return found;
}
export function searchStations(term) {
    const q = term.trim().toLowerCase();
    if (!q)
        return stations.slice(0, 8);
    return stations.filter((s) => `${s.city} ${s.name} ${s.code}`.toLowerCase().includes(q)).slice(0, 8);
}
function fareFor(t, query) {
    const info = t.classes.find((c) => c.classCode === query.classCode) || t.classes[0];
    let fare = info.fare * query.passengers;
    if (query.disability)
        fare *= 0.75;
    if (query.railPass)
        fare *= 0.85;
    if (query.quota === "TQ")
        fare *= 1.25;
    return Math.round(fare);
}
function availabilityFor(legs, query) {
    const states = legs.map((leg) => (leg.train.classes.find((c) => c.classCode === query.classCode) || leg.train.classes[0]).availability);
    if (states.includes("NOT_AVAILABLE"))
        return "NOT_AVAILABLE";
    if (states.includes("WL"))
        return "WL";
    if (states.includes("RAC"))
        return "RAC";
    return "AVAILABLE";
}
export function searchJourneys(query) {
    const direct = trains.filter((t) => t.from === query.from && t.to === query.to);
    const directResults = direct.map((train) => {
        const legs = [{ train, from: station(train.from), to: station(train.to) }];
        return { id: `${query.date}-${train.number}`, date: query.date, kind: "direct", legs, totalFare: fareFor(train, query), availability: availabilityFor(legs, query), durationMins: train.durationMins };
    });
    if (directResults.length)
        return directResults;
    const connecting = [];
    for (const first of trains.filter((t) => t.from === query.from)) {
        for (const second of trains.filter((t) => t.from === first.to && t.to === query.to)) {
            const transferMins = 135;
            const legs = [{ train: first, from: station(first.from), to: station(first.to) }, { train: second, from: station(second.from), to: station(second.to) }];
            connecting.push({ id: `${query.date}-${first.number}-${second.number}`, date: query.date, kind: "connecting", legs, totalFare: fareFor(first, query) + fareFor(second, query), availability: availabilityFor(legs, query), durationMins: first.durationMins + second.durationMins + transferMins, transferMins });
        }
    }
    return connecting.slice(0, 5);
}
