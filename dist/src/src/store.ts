import type { AppState } from "./types.js";

const key = "railvishwas-state-v1";

const initial: AppState = { liteMode: false, gridDensity: "comfortable", resultsPerPage: 50, trips: [], attempts: [] };

export function loadState(): AppState {
  try {
    return { ...initial, ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch {
    return initial;
  }
}

let state = loadState();
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(next: Partial<AppState>) {
  state = { ...state, ...next };
  localStorage.setItem(key, JSON.stringify(state));
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
