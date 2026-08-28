import type { Station } from "./types.js";

const majorRows: Array<[string, string, string, string, string, string, string[]]> = [
  ["MMCT", "Mumbai Central", "Mumbai", "Maharashtra", "West", "Western", ["bombay", "mumbai central"]],
  ["CSMT", "CSM Terminus", "Mumbai", "Maharashtra", "West", "Central", ["cst", "vt", "shivaji terminus"]],
  ["LTT", "Lokmanya Tilak Terminus", "Mumbai", "Maharashtra", "West", "Central", ["kurla"]],
  ["BDTS", "Bandra Terminus", "Mumbai", "Maharashtra", "West", "Western", ["bandra"]],
  ["NDLS", "New Delhi", "New Delhi", "Delhi", "North", "Northern", ["delhi", "new delhi railway station"]],
  ["DLI", "Delhi Junction", "Delhi", "Delhi", "North", "Northern", ["old delhi"]],
  ["NZM", "Hazrat Nizamuddin", "Delhi", "Delhi", "North", "Northern", ["nizamuddin", "h nizamuddin"]],
  ["ANVT", "Anand Vihar Terminal", "Delhi", "Delhi", "North", "Northern", ["anand vihar"]],
  ["HWH", "Howrah Junction", "Kolkata", "West Bengal", "East", "Eastern", ["howrah", "kolkata"]],
  ["SDAH", "Sealdah", "Kolkata", "West Bengal", "East", "Eastern", ["sealdah", "kolkata"]],
  ["MAS", "Chennai Central", "Chennai", "Tamil Nadu", "South", "Southern", ["madras central", "chennai"]],
  ["MS", "Chennai Egmore", "Chennai", "Tamil Nadu", "South", "Southern", ["egmore"]],
  ["SBC", "Bengaluru City", "Bengaluru", "Karnataka", "South", "South Western", ["bangalore", "ksr bengaluru"]],
  ["YPR", "Yesvantpur Junction", "Bengaluru", "Karnataka", "South", "South Western", ["yeshwanthpur"]],
  ["SC", "Secunderabad Junction", "Hyderabad", "Telangana", "South", "South Central", ["hyderabad", "secunderabad"]],
  ["HYB", "Hyderabad Deccan", "Hyderabad", "Telangana", "South", "South Central", ["nampally"]],
  ["PUNE", "Pune Junction", "Pune", "Maharashtra", "West", "Central", ["poona"]],
  ["ADI", "Ahmedabad Junction", "Ahmedabad", "Gujarat", "West", "Western", ["amdavad"]],
  ["JP", "Jaipur Junction", "Jaipur", "Rajasthan", "North-West", "North Western", ["jaipur"]],
  ["LKO", "Lucknow NR", "Lucknow", "Uttar Pradesh", "North", "Northern", ["lucknow"]],
  ["BSB", "Varanasi Junction", "Varanasi", "Uttar Pradesh", "North", "North Eastern", ["banaras", "kashi"]],
  ["PNBE", "Patna Junction", "Patna", "Bihar", "East", "East Central", ["patna"]],
  ["BPL", "Bhopal Junction", "Bhopal", "Madhya Pradesh", "Central", "West Central", ["bhopal"]],
  ["INDB", "Indore Junction", "Indore", "Madhya Pradesh", "Central", "Western", ["indore"]],
  ["NGP", "Nagpur Junction", "Nagpur", "Maharashtra", "Central", "Central", ["nagpur"]],
  ["MAO", "Madgaon Junction", "Goa", "Goa", "West", "Konkan", ["goa", "madgaon"]],
  ["DDN", "Dehradun", "Dehradun", "Uttarakhand", "North", "Northern", ["dehra dun"]],
  ["CDG", "Chandigarh", "Chandigarh", "Chandigarh", "North", "Northern", ["chandigarh"]],
  ["ASR", "Amritsar Junction", "Amritsar", "Punjab", "North", "Northern", ["amritsar"]],
  ["JAT", "Jammu Tawi", "Jammu", "Jammu and Kashmir", "North", "Northern", ["jammu"]],
  ["GHY", "Guwahati", "Guwahati", "Assam", "North-East", "Northeast Frontier", ["gauhati"]],
  ["BBS", "Bhubaneswar", "Bhubaneswar", "Odisha", "East", "East Coast", ["bhubaneshwar"]],
  ["ERS", "Ernakulam Junction", "Kochi", "Kerala", "South", "Southern", ["kochi", "ernakulam"]],
  ["TVC", "Thiruvananthapuram Central", "Thiruvananthapuram", "Kerala", "South", "Southern", ["trivandrum"]],
  ["CBE", "Coimbatore Junction", "Coimbatore", "Tamil Nadu", "South", "Southern", ["coimbatore"]],
  ["MDU", "Madurai Junction", "Madurai", "Tamil Nadu", "South", "Southern", ["madurai"]],
  ["RNC", "Ranchi Junction", "Ranchi", "Jharkhand", "East", "South Eastern", ["ranchi"]],
  ["R", "Raipur Junction", "Raipur", "Chhattisgarh", "Central", "South East Central", ["raipur"]],
  ["ST", "Surat", "Surat", "Gujarat", "West", "Western", ["surat"]],
  ["BRC", "Vadodara Junction", "Vadodara", "Gujarat", "West", "Western", ["baroda"]],
  ["CNB", "Kanpur Central", "Kanpur", "Uttar Pradesh", "North", "North Central", ["kanpur"]],
  ["PRYJ", "Prayagraj Junction", "Prayagraj", "Uttar Pradesh", "North", "North Central", ["allahabad"]],
  ["AGC", "Agra Cantt", "Agra", "Uttar Pradesh", "North", "North Central", ["agra"]],
  ["MTJ", "Mathura Junction", "Mathura", "Uttar Pradesh", "North", "North Central", ["mathura"]],
  ["HW", "Haridwar", "Haridwar", "Uttarakhand", "North", "Northern", ["hardwar"]],
  ["RK", "Roorkee", "Roorkee", "Uttarakhand", "North", "Northern", ["roorkee"]],
  ["MTC", "Meerut City", "Meerut", "Uttar Pradesh", "North", "Northern", ["meerut"]],
  ["GZB", "Ghaziabad", "Ghaziabad", "Uttar Pradesh", "North", "Northern", ["ghaziabad"]],
  ["AII", "Ajmer Junction", "Ajmer", "Rajasthan", "North-West", "North Western", ["ajmer"]],
  ["JU", "Jodhpur Junction", "Jodhpur", "Rajasthan", "North-West", "North Western", ["jodhpur"]],
  ["UDZ", "Udaipur City", "Udaipur", "Rajasthan", "North-West", "North Western", ["udaipur"]],
  ["KOTA", "Kota Junction", "Kota", "Rajasthan", "Central", "West Central", ["kota"]],
  ["VSKP", "Visakhapatnam", "Visakhapatnam", "Andhra Pradesh", "South", "East Coast", ["vizag"]],
  ["BZA", "Vijayawada Junction", "Vijayawada", "Andhra Pradesh", "South", "South Central", ["vijayawada"]],
  ["TPTY", "Tirupati", "Tirupati", "Andhra Pradesh", "South", "South Central", ["tirupati"]]
];

const districts = ["Alappuzha","Aligarh","Ambala","Anantapur","Asansol","Aurangabad","Bareilly","Bathinda","Belagavi","Bhagalpur","Bikaner","Bilaspur","Bokaro","Burdwan","Calicut","Chhapra","Cuttack","Dhanbad","Durg","Erode","Faridabad","Gaya","Gorakhpur","Guntur","Gwalior","Hisar","Hubballi","Jabalpur","Jalandhar","Jamnagar","Jhansi","Jorhat","Kakinada","Katni","Kharagpur","Kolhapur","Kollam","Kozhikode","Kurnool","Ludhiana","Mangalore","Moradabad","Muzaffarpur","Mysuru","Nanded","Nashik","Nellore","Palakkad","Panipat","Rajkot","Ratlam","Rewari","Rourkela","Saharanpur","Salem","Sambalpur","Satna","Shimla","Siliguri","Solapur","Thrissur","Tiruchirappalli","Tirunelveli","Tumakuru","Ujjain","Vapi","Warangal","Yavatmal"];
const suffixes = ["Junction","City","Cantt","Road","Town","East","West","North","South","Central","Terminal","Halt","Outer","Market","Fort"];
const states = ["Andhra Pradesh","Assam","Bihar","Chhattisgarh","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal"];
const regions = ["North","South","East","West","Central","North-East","North-West"];
const zones = ["Northern","Southern","Eastern","Western","Central","South Central","South Western","North Western","North Eastern","East Coast","West Central","South Eastern","Northeast Frontier"];

function codeFor(city: string, index: number): string {
  const letters = city.toUpperCase().replace(/[^A-Z]/g, "");
  return `${letters.slice(0, 3)}${index.toString(36).toUpperCase()}`.slice(0, 5);
}

const generated: Station[] = [];
let index = 100;
for (const city of districts) {
  for (const suffix of suffixes) {
    const state = states[index % states.length];
    generated.push({
      code: codeFor(city, index),
      name: `${city} ${suffix}`,
      city,
      state,
      region: regions[index % regions.length],
      zone: zones[index % zones.length],
      category: index % 5 === 0 ? "major" : "minor",
      aliases: [city.toLowerCase(), `${city} railway station`.toLowerCase(), suffix.toLowerCase()],
      nearby: []
    });
    index += 1;
  }
}

export const stations: Station[] = [
  ...majorRows.map(([code, name, city, state, region, zone, aliases]) => ({ code, name, city, state, region, zone, category: "major" as const, aliases, nearby: [] })),
  ...generated
];
