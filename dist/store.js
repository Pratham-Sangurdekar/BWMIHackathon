const key = "railvishwas-state-v1";
const initial = { liteMode: false, gridDensity: "comfortable", resultsPerPage: 50, trips: [], attempts: [] };
export function loadState() {
    try {
        return { ...initial, ...JSON.parse(localStorage.getItem(key) || "{}") };
    }
    catch {
        return initial;
    }
}
let state = loadState();
const listeners = new Set();
export function getState() {
    return state;
}
export function setState(next) {
    state = { ...state, ...next };
    localStorage.setItem(key, JSON.stringify(state));
    listeners.forEach((listener) => listener());
}
export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
