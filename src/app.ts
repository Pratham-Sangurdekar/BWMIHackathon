import { bookingMeaning, checkBookingStatus, duplicateAttempt, login, maxBookingDate, search, stationLabel, stationsFor, startBooking, today, validateBookingDate } from "./api.js";
import { BOOKING_WINDOW_MONTHS } from "./data.js";
import { getState, setState, subscribe } from "./store.js";
import type { Availability, BookingAttempt, JourneyResult, Language, Quota, ResultFilters, Scenario, SearchQuery, Station, TrainClass } from "./types.js";

const app = document.querySelector<HTMLDivElement>("#app")!;

// Ensure a persistent top-time element exists outside render cycles to avoid flicker
let topTimeEl = document.getElementById("top-time") as HTMLDivElement | null;
if (!topTimeEl) {
  topTimeEl = document.createElement("div");
  topTimeEl.id = "top-time";
  topTimeEl.className = "top-time";
  document.body.appendChild(topTimeEl);
}
let route = location.hash.replace("#", "") || "/book";
let results: JourneyResult[] = [];
let activeAttempt: BookingAttempt | undefined;
let lastQuery: SearchQuery | undefined;
let detailJourney: JourneyResult | undefined;
let loading = "";
let message = "";
let duplicateNotice = "";
let page = 1;
let calendarOffset = 0;
let sortBy: "recommended" | "depart" | "arrive" | "duration" | "fare" | "availability" = "recommended";
let filters: ResultFilters = { journeyType: "all", departure: "all", arrival: "all", availability: "all", maxDuration: 72 * 60, maxFare: 12000, via: "", classCode: "all", quota: "all" };
let tripsFilter: "upcoming" | "completed" | "cancelled" = "upcoming";

const t = {
  en: { choose: "Choose your language", book: "Book Ticket", trips: "My Trips", pnr: "PNR", help: "Help", account: "Account", signIn: "Sign in", logout: "Logout" },
  hi: { choose: "अपनी भाषा चुनें", book: "टिकट बुक करें", trips: "मेरी यात्राएं", pnr: "PNR", help: "सहायता", account: "खाता", signIn: "साइन इन", logout: "लॉग आउट" }
};

function html(strings: TemplateStringsArray, ...values: unknown[]) { return strings.map((s, i) => s + (values[i] ?? "")).join(""); }
function label(key: keyof typeof t.en) { return t[getState().language || "en"][key]; }
function option(value: string, text: string, selected?: boolean) { return `<option value="${value}" ${selected ? "selected" : ""}>${text}</option>`; }
function mins(value: number) { return `${Math.floor(value / 60)}h ${value % 60}m`; }
function dateLabel(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function quotaLabel(code: Quota | "all") { return ({ all: "All quotas", GN: "General", TQ: "Tatkal", PT: "Premium Tatkal", LD: "Ladies", SS: "Senior Citizen" } as Record<Quota | "all", string>)[code]; }
function classLabel(code: TrainClass | "all") { return code === "all" ? "All classes" : code; }
function availabilityScore(value: Availability) { return ({ AVAILABLE: 4, RAC: 3, WL: 2, NOT_AVAILABLE: 1 } as Record<Availability, number>)[value]; }
function timeBucket(time: string) {
  const hour = Number(time.slice(0, 2));
  if (hour < 6) return "early";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function requireAuth() { if (!getState().user && route !== "/account") route = "/account"; }

function layout(content: string) {
  const state = getState();
  app.className = state.liteMode ? "lite app-shell" : "app-shell";
  app.innerHTML = html`
    <header class="topbar">
      <a class="brand" href="#/book"><img class="brand-logo" src="/image.png" alt="RailVishwas logo"/><span><strong>RailVishwas</strong><small>Know your booking. Know what to do next.</small></span></a>
      <nav aria-label="Primary">
        <a class="${route === "/book" ? "active" : ""}" href="#/book">${label("book")}</a>
        <div class="dropdown-parent ${route === "/trains" || route.startsWith("/trains") ? "active" : ""}">
          <a href="#/trains">TRAINS</a>
          <div class="dropdown" role="menu">
            <a role="menuitem" href="#/trains/book">Book Ticket</a>
            <a role="menuitem" href="#/trains/foreign">Foreign Tourist Booking</a>
            <a role="menuitem" href="#/trains/connecting">Connecting Journey Booking</a>
            <a role="menuitem" href="#/trains/irctc">IRCTC TRAINS</a>
            <a role="menuitem" href="#/trains/cancel">Cancel E-Ticket</a>
            <a role="menuitem" href="#/pnr">PNR Enquiry</a>
            <a role="menuitem" href="#/trains/schedule">Train Schedule</a>
            <a role="menuitem" href="#/trains/track">Track Your Train</a>
            <a role="menuitem" href="#/trains/ftr">FTR Coach/Train Booking</a>
            <a role="menuitem" href="#/trains/luggage">Luggage Booking</a>
            <a role="menuitem" href="#/trains/pets">Dogs/Cats Booking</a>
            <a role="menuitem" href="#/trains/link-aadhaar">Link Your Aadhaar</a>
            <a role="menuitem" href="#/trains/counter-cancel">Counter Ticket Cancellation</a>
            <a role="menuitem" href="#/trains/counter-change">Counter Ticket Boarding Point Change</a>
            <a role="menuitem" href="#/trains/apps">IRCTC Official Mobile Apps</a>
          </div>
        </div>
        <a class="${route === "/trips" ? "active" : ""}" href="#/trips">${label("trips")}</a>
        <a class="${route === "/pnr" ? "active" : ""}" href="#/pnr">${label("pnr")}</a>
        <a class="${route === "/help" ? "active" : ""}" href="#/help">${label("help")}</a>
        <a class="${route === "/account" ? "active" : ""}" href="#/account">${label("account")}</a>
      </nav>
      <div class="header-actions">
        <select id="language-control" aria-label="Change language">${option("en", "English", state.language === "en")}${option("hi", "हिन्दी", state.language === "hi")}</select>
      </div>
    </header>
    <main id="main" tabindex="-1">${content}</main>
    <footer>Prototype — railway, payment and refund data are simulated. Do not enter real payment, OTP, Aadhaar, or IRCTC credentials.</footer>`;
  document.querySelector<HTMLSelectElement>("#language-control")?.addEventListener("change", (e) => setState({ language: (e.target as HTMLSelectElement).value as Language }));
}

// Update top-time element with India time every second
function startIndiaTime() {
  // Always schedule updates; the element may be created later during render.
  function update() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (5.5 * 60 * 60 * 1000));
    if (topTimeEl) {
      // update text without forcing extra layout thrash
      topTimeEl.textContent = ist.toLocaleString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  update();
  setInterval(update, 1000);
}

function languageGate() {
  app.className = "app-shell";
  app.innerHTML = `<main class="language-screen" id="main"><section class="language-panel"><span class="rail-mark">RV</span><h1>${t.en.choose}</h1><p>RailVishwas / रेलविश्वास</p><div class="language-actions"><button data-lang="en">English</button><button data-lang="hi">हिन्दी</button></div></section></main>`;
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((button) => button.addEventListener("click", () => setState({ language: button.dataset.lang as Language })));
}

function loginView() {
  layout(`<section class="panel narrow"><h1>${label("signIn")}</h1><p class="muted">Use demo credentials: <strong>demo@railvishwas.in</strong> / <strong>demo1234</strong></p><form id="login-form" class="form"><label>Email address<input id="email" name="email" autocomplete="email" /></label><label>Password<input id="password" name="password" type="password" autocomplete="current-password" /></label><p class="error" role="alert">${message}</p><button type="submit">${label("signIn")}</button></form></section>`);
  document.querySelector("#login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    try { setState({ user: await login(String(form.get("email")), String(form.get("password"))) }); route = "/book"; location.hash = route; }
    catch (err) { message = err instanceof Error ? err.message : "We could not sign you in. Please check the details and try again."; render(); }
  });
}

function stationInput(id: "from" | "to", title: string, selected: string) {
  // visible text input + hidden value input + suggestions container
  return `<label class="station-field">${title}<input class="station-search" data-target="${id}" placeholder="${id === "from" ? "From station" : "To station"}" value="${stationLabel(selected)}" aria-describedby="${id}-hint" autocomplete="off"/><input type="hidden" id="${id}" name="${id}" value="${selected}" /><div class="station-suggestions" data-target="${id}" role="listbox" aria-label="${title} station suggestions"></div><small id="${id}-hint">Type city, station, code, or alias. Use arrow keys and Enter to select.</small></label>`;
}

function calendar(selected: string) {
  const nowDate = new Date();
  const visible = new Date(nowDate.getFullYear(), nowDate.getMonth() + calendarOffset, 1);
  const first = new Date(visible.getFullYear(), visible.getMonth(), 1);
  const days = new Date(visible.getFullYear(), visible.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: first.getDay() }, () => `<span class="day empty"></span>`);
  for (let day = 1; day <= days; day += 1) {
    const iso = new Date(visible.getFullYear(), visible.getMonth(), day).toISOString().slice(0, 10);
    const disabled = Boolean(validateBookingDate(iso));
    cells.push(`<button type="button" class="day ${iso === today() ? "today" : ""} ${iso === selected ? "selected" : ""}" data-date="${iso}" ${disabled ? "disabled" : ""}>${day}</button>`);
  }
  return `<div class="calendar-field"><span>DATE</span><input type="hidden" name="date" value="${selected}" /><div class="calendar"><div class="calendar-nav"><button type="button" id="prev-month" ${calendarOffset === 0 ? "disabled" : ""}>Previous Month</button><strong>${visible.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong><button type="button" id="next-month" ${calendarOffset >= 2 ? "disabled" : ""}>Next Month</button></div><div class="weekday"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="calendar-grid">${cells.join("")}</div><small>Bookings are available for this month and the next two months.</small></div></div>`;
}

function searchSubHeader() {
  if (!lastQuery) return "";
  return `<section class="journey-subheader"><button data-edit-search="from">${stationLabel(lastQuery.from)}</button><span>→</span><button data-edit-search="to">${stationLabel(lastQuery.to)}</button><button data-edit-search="date">${dateLabel(lastQuery.date)}</button><button data-edit-search="passengers">${lastQuery.passengers} passenger${lastQuery.passengers > 1 ? "s" : ""}</button><button data-edit-search="class">${lastQuery.classCode}</button><button data-edit-search="quota">${quotaLabel(lastQuery.quota)}</button><button id="modify-search">Modify Search</button></section>`;
}

function bookView() {
  const selectedDate = lastQuery?.date || today();
  layout(searchSubHeader() + `
    <section class="search-band">
      <div><h1>Book with certainty</h1><p>Search trains, review fare and availability, and get a clear answer if booking confirmation is delayed.</p></div>
      <form id="search-form" class="search-form" novalidate>
        ${stationInput("from", "FROM", lastQuery?.from || "MMCT")}
        <button type="button" id="swap" class="icon-button" aria-label="Swap FROM and TO">⇄</button>
        ${stationInput("to", "TO", lastQuery?.to || "NDLS")}
        ${calendar(selectedDate)}
        <label>CLASS<select name="classCode">${["SL","3A","2A","1A","CC","EC","2S"].map((c) => option(c, c, c === (lastQuery?.classCode || "3A"))).join("")}</select></label>
        <label>QUOTA<select name="quota">${["GN","TQ","PT","LD","SS"].map((q) => option(q, quotaLabel(q as Quota), q === (lastQuery?.quota || "GN"))).join("")}</select></label>
        <label>PASSENGERS<input name="passengers" type="number" min="1" max="6" value="${lastQuery?.passengers || 1}" /></label>
        <label class="check"><input name="flexible" type="checkbox" ${lastQuery?.flexible ? "checked" : ""}/> Flexible with date</label>
        <label class="check"><input name="disability" type="checkbox" ${lastQuery?.disability ? "checked" : ""}/> Person with disability concession</label>
        <label>Mock disability ID<input name="disabilityId" value="${lastQuery?.disabilityId || ""}" /></label>
        <label class="check"><input name="railPass" type="checkbox" ${lastQuery?.railPass ? "checked" : ""}/> Railway pass concession</label>
        <label>Mock pass number<input name="passNumber" value="${lastQuery?.passNumber || ""}" /></label>
        <label>DEMO SCENARIO<select name="scenario">${option("normal","Normal successful booking", lastQuery?.scenario === "normal" || !lastQuery)}${option("unknownBooked","Payment success → unknown → booked", lastQuery?.scenario === "unknownBooked")}${option("unknownNotBooked","Payment success → unknown → refund", lastQuery?.scenario === "unknownNotBooked")}${option("paymentFailed","Payment failed → safe retry", lastQuery?.scenario === "paymentFailed")}</select></label>
        <p id="search-error" class="error" role="alert">${message && !results.length ? message : ""}</p>
        <button type="submit">Search trains</button>
      </form>
      <p class="rule">Calendar window: current month + next two months (${BOOKING_WINDOW_MONTHS} calendar months).</p>
    </section>
    ${statusPanel()}${detailJourney ? detailView(detailJourney) : resultsShell()}`);
  wireSearch();
}

function readQuery(form: HTMLFormElement): SearchQuery {
  const data = new FormData(form);
  return { from: String(data.get("from")), to: String(data.get("to")), date: String(data.get("date")), classCode: String(data.get("classCode")) as TrainClass, quota: String(data.get("quota")) as Quota, passengers: Number(data.get("passengers") || 1), flexible: data.has("flexible"), disability: data.has("disability"), disabilityId: String(data.get("disabilityId") || ""), railPass: data.has("railPass"), passNumber: String(data.get("passNumber") || ""), scenario: String(data.get("scenario") || "normal") as Scenario };
}

function wireSearch() {
  // Autocomplete: render suggestion rows into the suggestions container and handle keyboard
  document.querySelectorAll<HTMLInputElement>(".station-search").forEach((input) => {
    const target = String(input.dataset.target);
    const suggestions = document.querySelector<HTMLDivElement>(`.station-suggestions[data-target="${target}"]`)!;
    let active = -1;
    const render = (items: Station[]) => {
      suggestions.innerHTML = items.map((s, i) => `
        <div role="option" tabindex="-1" class="station-suggestion" data-code="${s.code}" data-index="${i}">
          <div class="station-suggestion-name">${s.name}</div>
          <div class="station-suggestion-meta">${s.city}, ${s.state} • ${s.code}</div>
        </div>
      `).join("");
      active = -1;
    };
    const update = () => {
      const items = stationsFor(input.value).slice(0, 12);
      render(items);
    };
    input.addEventListener("input", () => update());
    input.addEventListener("keydown", (e) => {
      const opts = Array.from(suggestions.querySelectorAll<HTMLDivElement>(".station-suggestion"));
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, opts.length - 1); opts.forEach((o,i)=>o.classList.toggle('active', i===active)); opts[active]?.scrollIntoView({block:'nearest'}); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); opts.forEach((o,i)=>o.classList.toggle('active', i===active)); opts[active]?.scrollIntoView({block:'nearest'}); }
      else if (e.key === "Enter") { if (active >= 0 && opts[active]) { e.preventDefault(); opts[active].click(); } }
      else if (e.key === "Escape") { suggestions.innerHTML = ""; active = -1; }
    });
    suggestions.addEventListener("click", (ev) => {
      const el = (ev.target as HTMLElement).closest('.station-suggestion') as HTMLDivElement | null;
      if (!el) return;
      const code = el.dataset.code!;
      const hidden = document.querySelector<HTMLInputElement>(`#${target}`)!;
      hidden.value = code;
      input.value = stationLabel(code);
      suggestions.innerHTML = "";
      input.focus();
    });
    // close suggestions when clicking outside
    document.addEventListener('click', (ev) => { if (!input.contains(ev.target as Node) && !suggestions.contains(ev.target as Node)) suggestions.innerHTML = ""; });
  });
  // removed <select> change handler; hidden inputs updated when suggestion chosen
  document.querySelector("#swap")?.addEventListener("click", () => {
    const fromHidden = document.querySelector<HTMLInputElement>('#from')!;
    const toHidden = document.querySelector<HTMLInputElement>('#to')!;
    const fromInput = document.querySelector<HTMLInputElement>('input[data-target="from"]')!;
    const toInput = document.querySelector<HTMLInputElement>('input[data-target="to"]')!;
    const a = fromHidden.value; const b = toHidden.value;
    fromHidden.value = b; toHidden.value = a;
    fromInput.value = stationLabel(fromHidden.value);
    toInput.value = stationLabel(toHidden.value);
    render();
  });
  document.querySelector("#prev-month")?.addEventListener("click", () => { calendarOffset = Math.max(0, calendarOffset - 1); render(); });
  document.querySelector("#next-month")?.addEventListener("click", () => { calendarOffset = Math.min(2, calendarOffset + 1); render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-date]").forEach((button) => button.addEventListener("click", () => { if (button.dataset.date) { if (lastQuery) lastQuery.date = button.dataset.date; const hidden = document.querySelector<HTMLInputElement>('input[name="date"]'); if (hidden) hidden.value = button.dataset.date; render(); } }));
  document.querySelectorAll<HTMLButtonElement>("[data-edit-search], #modify-search").forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.editSearch;
    const target = key === "from" ? "#from" : key === "to" ? "#to" : key === "class" ? 'select[name="classCode"]' : key === "quota" ? 'select[name="quota"]' : key === "passengers" ? 'input[name="passengers"]' : ".calendar";
    document.querySelector(".search-band")?.scrollIntoView({ block: "start" });
    document.querySelector<HTMLElement>(target)?.focus();
  }));
  document.querySelector("#search-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = readQuery(e.target as HTMLFormElement);
    if (query.from === query.to) { message = "Choose different stations for your journey."; render(); return; }
    const dateError = validateBookingDate(query.date);
    if (dateError) { message = dateError; render(); return; }
    void performSearch(query);
  });
}

async function performSearch(query: SearchQuery) {
  loading = "Searching railway routes... Checking direct trains... Checking connecting routes... Preparing availability...";
  message = ""; detailJourney = undefined; page = 1; render();
  try { lastQuery = query; results = await search(query); message = results.length ? "" : "No trains found for this combination."; loading = ""; render(); }
  catch (err) { loading = ""; message = err instanceof Error ? err.message : "We could not complete the search. Please review your journey details."; render(); }
}

function resultsShell() {
  if (!lastQuery && !loading && !message && !results.length) return "";
  return `<section class="results-layout">${results.length ? filtersView() : ""}<div class="results-main">${resultsView()}</div></section>`;
}

function filtersView() {
  return `<aside class="filters" aria-label="Search result filters"><h2>Filters</h2>
    <label>Journey type<select id="filter-kind">${option("all","All", filters.journeyType === "all")}${option("direct","Direct", filters.journeyType === "direct")}${option("connecting","Connecting", filters.journeyType === "connecting")}</select></label>
    <label>Departure<select id="filter-depart">${["all","early","morning","afternoon","evening","night"].map((v) => option(v, v, filters.departure === v)).join("")}</select></label>
    <label>Arrival<select id="filter-arrive">${["all","early","morning","afternoon","evening","night"].map((v) => option(v, v, filters.arrival === v)).join("")}</select></label>
    <label>Availability<select id="filter-avail">${["all","AVAILABLE","RAC","WL","NOT_AVAILABLE"].map((v) => option(v, v === "WL" ? "Waitlist" : v, filters.availability === v)).join("")}</select></label>
    <label>Class<select id="filter-class">${["all","1A","2A","3A","SL","CC","EC","2S"].map((v) => option(v, classLabel(v as TrainClass | "all"), filters.classCode === v)).join("")}</select></label>
    <label>Quota<select id="filter-quota">${["all","GN","TQ","PT","LD","SS"].map((v) => option(v, quotaLabel(v as Quota | "all"), filters.quota === v)).join("")}</select></label>
    <label>Max duration<input id="filter-duration" type="range" min="2" max="72" value="${Math.round(filters.maxDuration / 60)}"/><small>${Math.round(filters.maxDuration / 60)} hours</small></label>
    <label>Max fare<input id="filter-fare" type="range" min="500" max="12000" step="500" value="${filters.maxFare}"/><small>₹${filters.maxFare}</small></label>
    <label>Via station<input id="filter-via" placeholder="Station or code" value="${filters.via}"/></label>
  </aside>`;
}

function filteredResults() {
  return results.filter((r) => {
    const first = r.legs[0].train;
    const last = r.legs[r.legs.length - 1].train;
    const via = r.legs.slice(0, -1).map((leg) => `${leg.to.name} ${leg.to.code} ${leg.to.city}`.toLowerCase()).join(" ");
    if (filters.journeyType !== "all" && r.kind !== filters.journeyType) return false;
    if (filters.departure !== "all" && timeBucket(first.depart) !== filters.departure) return false;
    if (filters.arrival !== "all" && timeBucket(last.arrive) !== filters.arrival) return false;
    if (filters.availability !== "all" && r.availability !== filters.availability) return false;
    if (filters.classCode !== "all" && !r.legs.every((leg) => leg.train.classes.some((c) => c.classCode === filters.classCode))) return false;
    if (filters.quota !== "all" && lastQuery?.quota !== filters.quota) return false;
    if (r.durationMins > filters.maxDuration || r.totalFare > filters.maxFare) return false;
    if (filters.via.trim() && !via.includes(filters.via.trim().toLowerCase())) return false;
    return true;
  });
}

function sortedResults(rows: JourneyResult[]) {
  return [...rows].sort((a, b) => {
    if (sortBy === "depart") return a.legs[0].train.depart.localeCompare(b.legs[0].train.depart);
    if (sortBy === "arrive") return a.legs.at(-1)!.train.arrive.localeCompare(b.legs.at(-1)!.train.arrive);
    if (sortBy === "duration") return a.durationMins - b.durationMins;
    if (sortBy === "fare") return a.totalFare - b.totalFare;
    if (sortBy === "availability") return availabilityScore(b.availability) - availabilityScore(a.availability);
    return (a.kind === "direct" ? 0 : 1) - (b.kind === "direct" ? 0 : 1) || availabilityScore(b.availability) - availabilityScore(a.availability) || a.durationMins - b.durationMins || a.totalFare - b.totalFare;
  });
}

function resultsView() {
  if (loading) return `<section class="panel" aria-live="polite"><h2>Searching</h2><p>${loading}</p></section>`;
  if (message && !activeAttempt) return `<section class="panel error-state" role="alert"><h2>${message}</h2><div class="actions"><button id="prev-day">Try previous date</button><button id="next-day">Try next date</button><button id="flex-search">Search nearby dates</button><button id="nearby">Try nearby stations</button><button id="change-class">Change class</button><button id="show-connections">Show connecting journeys</button></div></section>`;
  if (!results.length) return "";
  const visible = sortedResults(filteredResults());
  const perPage = getState().resultsPerPage;
  const totalPages = Math.max(1, Math.ceil(visible.length / perPage));
  page = Math.min(page, totalPages);
  const start = (page - 1) * perPage;
  const rows = visible.slice(start, start + perPage);
  const hasDirect = results.some((r) => r.kind === "direct");
  return `<section class="results"><h2>${hasDirect ? "Direct trains first, with connecting alternatives" : "No direct train found. Here are connecting journeys that can get you there."}</h2><div class="result-toolbar"><span>Showing ${visible.length ? start + 1 : 0}-${Math.min(start + perPage, visible.length)} of ${visible.length} trains</span><label>Sort by<select id="sort">${["recommended","depart","arrive","duration","fare","availability"].map((s) => option(s, s === "depart" ? "Departure time" : s === "arrive" ? "Arrival time" : s === "fare" ? "Lowest fare" : s === "availability" ? "Highest availability" : "Recommended", sortBy === s)).join("")}</select></label><label>Results per page<select id="per-page">${[25,50,100].map((n) => option(String(n), String(n), getState().resultsPerPage === n)).join("")}</select></label><label>View<select id="density">${option("comfortable","3 columns", getState().gridDensity === "comfortable")}${option("compact","4 columns", getState().gridDensity === "compact")}</select></label></div><div class="result-grid ${getState().gridDensity}">${rows.map(resultCard).join("")}</div><div class="pagination"><button id="page-prev" ${page === 1 ? "disabled" : ""}>Previous</button><span>Page ${page} of ${totalPages}</span><button id="page-next" ${page === totalPages ? "disabled" : ""}>Next</button></div></section>`;
}

function resultCard(result: JourneyResult) {
  const first = result.legs[0];
  const last = result.legs[result.legs.length - 1];
  const classInfo = first.train.classes.find((c) => c.classCode === lastQuery?.classCode) || first.train.classes[0];
  const routeText = result.kind === "direct" ? `${first.from.code} → ${last.to.code}` : `${first.from.code} → ${first.to.code} → ${last.to.code}`;
  return `<article class="result-card ${result.kind}"><div class="train-kicker">${first.train.number}</div><h3>${first.train.name}</h3><div class="card-route"><strong>${routeText}</strong><span>${first.train.depart} → ${last.train.arrive}</span></div><p>${mins(result.durationMins)} • ${result.kind === "direct" ? "Direct" : `${result.legs.length} trains, ${result.legs.length - 1} transfer`}</p>${result.kind === "connecting" ? `<p class="transfer">Transfer at ${first.to.name} • wait ${mins(result.transferMins || 0)}</p>` : ""}<dl><div><dt>Class</dt><dd>${classInfo.classCode}</dd></div><div><dt>Availability</dt><dd>${result.availability}${classInfo.seats ? ` ${classInfo.seats} seats` : ""}</dd></div><div><dt>Fare</dt><dd>₹${result.totalFare}</dd></div></dl><button data-detail="${result.id}">View journey</button></article>`;
}

function detailView(result: JourneyResult) {
  const legs = result.legs.map((leg, index) => `<li><strong>${leg.train.number} ${leg.train.name}</strong><span>${leg.from.name} (${leg.from.code}) ${leg.train.depart} → ${leg.to.name} (${leg.to.code}) ${leg.train.arrive}</span><span>${mins(leg.train.durationMins)} • runs ${leg.train.days.map((d) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")} • ${leg.train.classes.map((c) => `${c.classCode} ₹${c.fare} ${c.availability}`).join(" | ")}</span>${index === 0 && result.transferMins ? `<em>Transfer wait: ${mins(result.transferMins)}</em>` : ""}</li>`).join("");
  return `<section class="panel journey-detail"><button id="back-results">Back to results</button><h2>${result.kind === "direct" ? "Direct journey details" : "Connecting journey details"}</h2><ul class="legs detail">${legs}</ul><p><strong>Total:</strong> ${mins(result.durationMins)} • ${result.availability} • ₹${result.totalFare} • ${lastQuery ? quotaLabel(lastQuery.quota) : ""}</p><button data-book="${result.id}">Continue to passenger details</button></section>`;
}

function statusPanel() {
  if (!activeAttempt) return "";
  const meaning = bookingMeaning(activeAttempt.state);
  const leg = activeAttempt.journey.legs[0];
  return `<section class="status ${meaning.citizenState.toLowerCase().replace(/\s+/g, "-")}" aria-live="polite"><h2>${meaning.citizenState}</h2>${duplicateNotice ? `<div class="warning"><strong>You already have a booking attempt for this journey.</strong><br/>${duplicateNotice}</div>` : ""}<p><strong>${meaning.next}</strong></p><div class="four-part"><p>${meaning.money}</p><p>${meaning.ticket}</p></div>${activeAttempt.state === "BOOKING_UNKNOWN" ? `<div class="warning">DO NOT PAY AGAIN</div>` : ""}<div class="actions">${(activeAttempt.state === "BOOKING_UNKNOWN" || activeAttempt.state === "REFUND_PENDING") ? `<button id="check-status">Check booking status</button>` : ""}${activeAttempt.state === "BOOKED" ? `<button id="view-ticket">View ticket</button><button id="download-ticket">Download ticket</button><button id="add-trip">Add to trips</button><button id="pnr-status">Check PNR status</button>` : ""}${activeAttempt.retryAllowed ? `<button id="safe-retry">Safe to try another booking</button>` : ""}</div><details open><summary>Booking timeline</summary>${activeAttempt.timeline.map((item) => `<p><time>${item.time}</time> ${item.label}</p>`).join("")}</details><p class="muted">Attempt ${activeAttempt.id} • ${leg.train.name} • ${activeAttempt.query.date}</p></section>`;
}

function wireGlobal() {
  document.querySelectorAll<HTMLButtonElement>("[data-detail]").forEach((button) => button.addEventListener("click", () => { detailJourney = results.find((item) => item.id === button.dataset.detail); render(); }));
  document.querySelector("#back-results")?.addEventListener("click", () => { detailJourney = undefined; render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-book]").forEach((button) => button.addEventListener("click", async () => {
    const journey = results.find((item) => item.id === button.dataset.book);
    if (!journey || !lastQuery) return;
    const duplicate = duplicateAttempt(journey, lastQuery);
    if (duplicate) { activeAttempt = duplicate; duplicateNotice = `Payment status: ${bookingMeaning(duplicate.state).money} Booking status: ${duplicate.state}. Attempt ID: ${duplicate.id}. We recommend checking the previous booking before paying again.`; detailJourney = undefined; render(); return; }
    duplicateNotice = ""; loading = "Sending your booking request... Confirming your payment..."; render();
    activeAttempt = await startBooking(journey, lastQuery); loading = ""; detailJourney = undefined; render();
  }));
  document.querySelector("#check-status")?.addEventListener("click", async () => { if (!activeAttempt) return; loading = "Payment received. Checking whether the railway reservation was created..."; render(); activeAttempt = await checkBookingStatus(activeAttempt.id); loading = ""; render(); });
  document.querySelector("#view-ticket")?.addEventListener("click", () => { route = "/pnr"; location.hash = route; });
  document.querySelector("#download-ticket")?.addEventListener("click", () => alert("Prototype ticket downloaded as a text receipt."));
  document.querySelector("#add-trip")?.addEventListener("click", () => alert("Trip is saved in My Trips."));
  document.querySelector("#pnr-status")?.addEventListener("click", () => { route = "/pnr"; location.hash = route; });
  document.querySelector("#safe-retry")?.addEventListener("click", () => { activeAttempt = undefined; render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-trip-filter]").forEach((button) => button.addEventListener("click", () => { tripsFilter = button.dataset.tripFilter as typeof tripsFilter; render(); }));
  document.querySelector("#prev-day")?.addEventListener("click", () => shiftAndSearch(-1));
  document.querySelector("#next-day")?.addEventListener("click", () => shiftAndSearch(1));
  document.querySelector("#flex-search")?.addEventListener("click", () => { if (lastQuery) void performSearch({ ...lastQuery, flexible: true }); });
  document.querySelector("#nearby")?.addEventListener("click", () => { if (lastQuery) void performSearch({ ...lastQuery, to: "NDLS" }); });
  document.querySelector("#change-class")?.addEventListener("click", () => { if (lastQuery) void performSearch({ ...lastQuery, classCode: lastQuery.classCode === "3A" ? "SL" : "3A" }); });
  document.querySelector("#show-connections")?.addEventListener("click", () => { filters = { ...filters, journeyType: "connecting" }; render(); });
  document.querySelector("#sort")?.addEventListener("change", (e) => { sortBy = (e.target as HTMLSelectElement).value as typeof sortBy; page = 1; render(); });
  document.querySelector("#per-page")?.addEventListener("change", (e) => { setState({ resultsPerPage: Number((e.target as HTMLSelectElement).value) as 25 | 50 | 100 }); page = 1; });
  document.querySelector("#density")?.addEventListener("change", (e) => setState({ gridDensity: (e.target as HTMLSelectElement).value as "comfortable" | "compact" }));
  document.querySelector("#page-prev")?.addEventListener("click", () => { page = Math.max(1, page - 1); render(); });
  document.querySelector("#page-next")?.addEventListener("click", () => { page += 1; render(); });
  [["#filter-kind","journeyType"],["#filter-depart","departure"],["#filter-arrive","arrival"],["#filter-avail","availability"],["#filter-class","classCode"],["#filter-quota","quota"]].forEach(([selector, key]) => document.querySelector(selector)?.addEventListener("change", (e) => { filters = { ...filters, [key]: (e.target as HTMLSelectElement).value }; page = 1; render(); }));
  document.querySelector("#filter-duration")?.addEventListener("input", (e) => { filters = { ...filters, maxDuration: Number((e.target as HTMLInputElement).value) * 60 }; page = 1; render(); });
  document.querySelector("#filter-fare")?.addEventListener("input", (e) => { filters = { ...filters, maxFare: Number((e.target as HTMLInputElement).value) }; page = 1; render(); });
  document.querySelector("#filter-via")?.addEventListener("input", (e) => { filters = { ...filters, via: (e.target as HTMLInputElement).value }; page = 1; render(); });
}

function shiftAndSearch(days: number) {
  if (!lastQuery) return;
  const d = new Date(`${lastQuery.date}T00:00:00`); d.setDate(d.getDate() + days);
  const query = { ...lastQuery, date: d.toISOString().slice(0, 10) };
  if (!validateBookingDate(query.date)) void performSearch(query);
}

function tripsView() {
  const saved = getState().trips;
  const trips = tripsFilter === "upcoming" ? saved : [];
  layout(`<section class="panel"><h1>My Trips</h1><div class="tabs"><button data-trip-filter="upcoming" class="${tripsFilter === "upcoming" ? "selected" : ""}">Upcoming</button><button data-trip-filter="completed" class="${tripsFilter === "completed" ? "selected" : ""}">Completed</button><button data-trip-filter="cancelled" class="${tripsFilter === "cancelled" ? "selected" : ""}">Cancelled</button></div>${trips.length ? trips.map(ticket).join("") : `<p>No ${tripsFilter} trips yet.</p>`}</section>`);
}

function ticket(attempt: BookingAttempt) {
  const leg = attempt.journey.legs[0];
  return `<article class="ticket"><h2>BOOKING CONFIRMED</h2><strong>PNR ${attempt.pnr}</strong><p>${stationLabel(attempt.query.from)} → ${stationLabel(attempt.query.to)}</p><p>${leg.train.number} ${leg.train.name} • ${attempt.query.date}</p><dl><div><dt>Passenger</dt><dd>${getState().user?.name || "Demo Citizen"}</dd></div><div><dt>Class</dt><dd>${attempt.query.classCode}</dd></div><div><dt>Coach</dt><dd>${attempt.coach}</dd></div><div><dt>Seat</dt><dd>${attempt.seat}</dd></div></dl></article>`;
}

function pnrView() {
  const booked = activeAttempt?.state === "BOOKED" ? activeAttempt : getState().trips.at(-1);
  layout(`<section class="panel"><h1>PNR status</h1>${booked ? ticket(booked) : "<p>No confirmed PNR found in this prototype session.</p>"}<details><summary>Explain PNR terms</summary><p>CNF means confirmed. RAC means you can board with a reservation, but a full berth may not yet be assigned. WL means waitlisted. GNWL and RLWL are waitlist categories used by the railway.</p></details></section>`);
}

function helpView() {
  layout(`<section class="panel"><h1>Help</h1><h2>What should I do if payment succeeded but booking is unclear?</h2><p>Do not pay again. Open the booking attempt and use Check booking status. RailVishwas will show whether money was taken, whether a ticket exists, and whether retry is safe.</p><h2>Is this live railway data?</h2><p>No. This hackathon prototype uses synthetic railway, payment, and refund data.</p></section>`);
}

function accountView() {
  const user = getState().user;
  if (!user) return loginView();
  // Editable profile form
  layout(`<section class="panel narrow"><h1>Update Profile</h1>
    <div class="profile-block"><h3>My Profile</h3>
      <form id="profile-form" class="form">
        <label>Full name<input name="name" value="${user.name || ""}" /></label>
        <label>Gender<input name="gender" value="${(user as any).gender || ""}" /></label>
        <label>Date Of Birth<input name="dob" value="${(user as any).dob || ""}" /></label>
        <label>ISD-Mobile<input name="mobile" value="${(user as any).mobile || ""}" /></label>
        <label>Country<input name="country" value="${(user as any).country || "India"}" /></label>
        <label>Email<input name="email" value="${user.email}" /></label>
        <label>Residential Address<textarea name="residentialAddress">${(user as any).residentialAddress || ""}</textarea></label>
        <div style="display:flex;gap:8px;"><button type="submit">Save profile</button><button type="button" id="logout">${label("logout")}</button></div>
      </form>
    </div>
    <div class="panel"><h3>PASSWORDS</h3><p>Change Login Password</p><button id="change-password">Change</button></div>
    <div class="panel"><h3>IRCTC e-Wallet</h3><p><button id="wallet">REGISTER/REACTIVATE</button></p></div>
    <div class="panel"><h3>AADHAAR KYC</h3><p><span id="aadhaar-status">Not Verified</span> <button id="start-kyc">Start KYC</button></p></div>
  </section>`);

  document.querySelector<HTMLFormElement>("#profile-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const updated = { email: String(data.get("email") || user.email), name: String(data.get("name") || user.name), gender: String(data.get("gender") || ""), dob: String(data.get("dob") || ""), mobile: String(data.get("mobile") || ""), country: String(data.get("country") || ""), residentialAddress: String(data.get("residentialAddress") || "") };
    setState({ user: updated });
    message = "Profile saved"; render();
  });
  document.querySelector("#logout")?.addEventListener("click", () => { setState({ user: undefined }); route = "/account"; location.hash = route; });
  document.querySelector("#change-password")?.addEventListener("click", () => alert("Password change flow is a prototype."));
  document.querySelector("#wallet")?.addEventListener("click", () => alert("e-Wallet registration simulated."));
  document.querySelector("#start-kyc")?.addEventListener("click", () => { (document.querySelector("#aadhaar-status") as HTMLElement).textContent = "Verification in progress"; setTimeout(() => { (document.querySelector("#aadhaar-status") as HTMLElement).textContent = "Verified"; }, 1200); });
}

function trainsView() {
  layout(`<section class="panel"><h1>Trains</h1><p>Choose a train feature:</p><div class="actions"><button id="live-train">Live train by number</button><button id="train-status">Train status (route)</button><button id="pnr-enquiry">PNR enquiry</button></div><div id="trains-content"></div></section>`);
  document.querySelector("#live-train")?.addEventListener("click", () => { route = "/trains/live"; location.hash = route; });
  document.querySelector("#train-status")?.addEventListener("click", () => { route = "/trains/status"; location.hash = route; });
  document.querySelector("#pnr-enquiry")?.addEventListener("click", () => { route = "/pnr"; location.hash = route; });
}

function bookTicketView() {
  layout(`<section class="panel"><h1>Book Ticket</h1><p>This opens the standard booking flow.</p><a href="#/book">Open booking</a></section>`);
}

function foreignTouristView() {
  layout(`<section class="panel"><h1>Foreign Tourist Booking</h1><p>Special booking path for foreign tourists (prototype).</p></section>`);
}

function connectingJourneyView() {
  layout(`<section class="panel"><h1>Connecting Journey Booking</h1><p>Search connecting journeys and book links.</p></section>`);
}

function irctcTrainsView() {
  layout(`<section class="panel"><h1>IRCTC Trains</h1><p>IRCTC trains and special info.</p></section>`);
}

function cancelTicketView() { layout(`<section class="panel"><h1>Cancel E-Ticket</h1><p>Enter PNR to cancel an e-ticket (prototype).</p></section>`); }
function trainScheduleView() { layout(`<section class="panel"><h1>Train Schedule</h1><p>Search train schedule by number or route.</p></section>`); }
function trackTrainView() { layout(`<section class="panel"><h1>Track Your Train</h1><p>Enter train number to view live movement.</p></section>`); }
function ftrBookingView() { layout(`<section class="panel"><h1>FTR Coach/Train Booking</h1><p>Prototype for FTR bookings.</p></section>`); }
function luggageBookingView() { layout(`<section class="panel"><h1>Luggage Booking</h1><p>Book parcel and luggage services.</p></section>`); }
function petsBookingView() { layout(`<section class="panel"><h1>Dogs/Cats Booking</h1><p>Pet travel booking options.</p></section>`); }
function linkAadhaarView() { layout(`<section class="panel"><h1>Link Your Aadhaar</h1><p>Link Aadhaar to your profile (simulated).</p></section>`); }
function counterCancelView() { layout(`<section class="panel"><h1>Counter Ticket Cancellation</h1><p>Counter cancellation info and form.</p></section>`); }
function counterChangeView() { layout(`<section class="panel"><h1>Counter Ticket Boarding Point Change</h1><p>Change boarding point at counter (prototype).</p></section>`); }
function irctcAppsView() { layout(`<section class="panel"><h1>IRCTC Official Mobile Apps</h1><p>Links to official apps (prototype).</p></section>`); }

function liveTrainView() {
  layout(`<section class="panel narrow"><h1>Live Train</h1><form id="live-form" class="form"><label>Train number<input name="number" /></label><button type="submit">Lookup live position</button></form><div id="live-result"></div></section>`);
  document.querySelector<HTMLFormElement>("#live-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const num = String(new FormData(e.target as HTMLFormElement).get("number") || "");
    const out = document.querySelector<HTMLDivElement>('#live-result')!;
    if (!num) { out.innerHTML = `<p class="error">Enter a train number.</p>`; return; }
    // fake live position
    out.innerHTML = `<p>Train ${num} currently at ${Math.random() > 0.5 ? 'Mumbai Central' : 'Vadodara'} • expected at ${['10:12','13:34','17:05'][Math.floor(Math.random()*3)]}</p>`;
  });
}

function trainStatusView() {
  layout(`<section class="panel narrow"><h1>Train Status</h1><form id="status-form" class="form"><label>Train number<input name="number" /></label><button type="submit">Show route</button></form><div id="status-result"></div></section>`);
  document.querySelector<HTMLFormElement>('#status-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const num = String(new FormData(e.target as HTMLFormElement).get('number') || '');
    const out = document.querySelector('#status-result')! as HTMLElement;
    if (!num) { out.innerHTML = '<p class="error">Enter a train number.</p>'; return; }
    out.innerHTML = `<p>Train ${num} route: NDLS → BPL → MUMBAI CST → CSTM. Status: On time. Last updated ${new Date().toLocaleTimeString()}.</p>`;
  });
}

function render() {
  if (!getState().language) return languageGate();
  requireAuth();
  // Toggle sign-in background class based on route
  if (route === "/account") document.body.classList.add("signin-bg");
  else document.body.classList.remove("signin-bg");
  if (route === "/trips") tripsView();
  else if (route === "/pnr") pnrView();
  else if (route === "/help") helpView();
  else if (route === "/account") accountView();
  else if (route === "/trains") trainsView();
  else if (route === "/trains/live") liveTrainView();
  else if (route === "/trains/status") trainStatusView();
  else if (route === "/trains/book") bookTicketView();
  else if (route === "/trains/foreign") foreignTouristView();
  else if (route === "/trains/connecting") connectingJourneyView();
  else if (route === "/trains/irctc") irctcTrainsView();
  else if (route === "/trains/cancel") cancelTicketView();
  else if (route === "/trains/schedule") trainScheduleView();
  else if (route === "/trains/track") trackTrainView();
  else if (route === "/trains/ftr") ftrBookingView();
  else if (route === "/trains/luggage") luggageBookingView();
  else if (route === "/trains/pets") petsBookingView();
  else if (route === "/trains/link-aadhaar") linkAadhaarView();
  else if (route === "/trains/counter-cancel") counterCancelView();
  else if (route === "/trains/counter-change") counterChangeView();
  else if (route === "/trains/apps") irctcAppsView();
  else bookView();
  wireGlobal();
}

// start India time when app loads
startIndiaTime();

window.addEventListener("hashchange", () => { route = location.hash.replace("#", "") || "/book"; message = ""; render(); });
subscribe(render);
render();
