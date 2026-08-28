import { bookingMeaning, checkBookingStatus, duplicateAttempt, login, maxBookingDate, search, startBooking, stationLabel, stationsFor, today, validateBookingDate } from "./api.js";
import { BOOKING_WINDOW_MONTHS } from "./data.js";
import { getState, setState, subscribe } from "./store.js";
const app = document.querySelector("#app");
let route = location.hash.replace("#", "") || "/book";
let results = [];
let activeAttempt;
let lastQuery;
let loading = "";
let message = "";
let duplicateNotice = "";
let tripsFilter = "upcoming";
const t = {
    en: { choose: "Choose your language", continue: "Continue", book: "Book", trips: "My Trips", pnr: "PNR", help: "Help", account: "Account", signIn: "Sign in", logout: "Logout" },
    hi: { choose: "अपनी भाषा चुनें", continue: "जारी रखें", book: "बुक करें", trips: "मेरी यात्राएं", pnr: "PNR", help: "सहायता", account: "खाता", signIn: "साइन इन", logout: "लॉग आउट" }
};
function label(key) {
    return t[getState().language || "en"][key];
}
function html(strings, ...values) {
    return strings.map((s, i) => s + (values[i] ?? "")).join("");
}
function option(value, text, selected) {
    return `<option value="${value}" ${selected ? "selected" : ""}>${text}</option>`;
}
function mins(value) {
    const h = Math.floor(value / 60);
    const m = value % 60;
    return `${h}h ${m}m`;
}
function requireAuth() {
    if (!getState().user && route !== "/account")
        route = "/account";
}
function layout(content) {
    const state = getState();
    app.className = state.liteMode ? "lite" : "";
    app.innerHTML = html `
    <header class="topbar">
      <a class="brand" href="#/book" aria-label="RailVishwas home">
        <span class="rail-mark">RV</span>
        <span><strong>RailVishwas</strong><small>Know your booking. Know what to do next.</small></span>
      </a>
      <nav aria-label="Primary">
        <a class="${route === "/book" ? "active" : ""}" href="#/book">${label("book")}</a>
        <a class="${route === "/trips" ? "active" : ""}" href="#/trips">${label("trips")}</a>
        <a class="${route === "/pnr" ? "active" : ""}" href="#/pnr">${label("pnr")}</a>
        <a class="${route === "/help" ? "active" : ""}" href="#/help">${label("help")}</a>
        <a class="${route === "/account" ? "active" : ""}" href="#/account">${label("account")}</a>
      </nav>
      <div class="header-actions">
        <select id="language-control" aria-label="Change language">
          ${option("en", "English", state.language === "en")}${option("hi", "हिन्दी", state.language === "hi")}
        </select>
        <label class="toggle"><input id="lite" type="checkbox" ${state.liteMode ? "checked" : ""}/> Lite</label>
      </div>
    </header>
    <main id="main" tabindex="-1">${content}</main>
    <footer>Prototype — railway, payment and refund data are simulated. Do not enter real payment, OTP, Aadhaar, or IRCTC credentials.</footer>
  `;
    document.querySelector("#language-control")?.addEventListener("change", (e) => setState({ language: e.target.value }));
    document.querySelector("#lite")?.addEventListener("change", (e) => setState({ liteMode: e.target.checked }));
}
function languageGate() {
    app.innerHTML = html `
    <main class="language-screen" id="main">
      <section class="language-panel" aria-labelledby="language-title">
        <span class="rail-mark">RV</span>
        <h1 id="language-title">${t.en.choose}</h1>
        <p>RailVishwas / रेलविश्वास</p>
        <div class="language-actions">
          <button data-lang="en">English</button>
          <button data-lang="hi">हिन्दी</button>
        </div>
      </section>
    </main>`;
    document.querySelectorAll("[data-lang]").forEach((button) => button.addEventListener("click", () => setState({ language: button.dataset.lang })));
}
function loginView() {
    layout(html `
    <section class="narrow">
      <h1>${label("signIn")}</h1>
      <p class="muted">Use demo credentials: <strong>demo@railvishwas.in</strong> / <strong>demo1234</strong></p>
      <form id="login-form" class="form">
        <label>Email address<input id="email" name="email" autocomplete="email" /></label>
        <label>Password<input id="password" name="password" type="password" autocomplete="current-password" /></label>
        <p id="login-error" class="error" role="alert">${message}</p>
        <button type="submit">${label("signIn")}</button>
      </form>
    </section>`);
    document.querySelector("#login-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        message = "";
        const form = new FormData(e.target);
        try {
            setState({ user: await login(String(form.get("email")), String(form.get("password"))) });
            route = "/book";
            location.hash = route;
        }
        catch (err) {
            message = err instanceof Error ? err.message : "We could not sign you in. Please check the details and try again.";
            render();
        }
    });
}
function stationInput(id, title, selected) {
    const items = stationsFor(selected || "").map((s) => option(s.code, `${s.city} — ${s.name} (${s.code})`, s.code === selected)).join("");
    return `<label>${title}<input class="station-search" data-target="${id}" placeholder="City, station or code" value="${selected || ""}" aria-describedby="${id}-hint"/><select id="${id}" name="${id}" aria-label="${title} station">${items}</select><small id="${id}-hint">Search by city, station name, or code.</small></label>`;
}
function bookView() {
    const date = lastQuery?.date || today();
    const form = html `
    <section class="search-band">
      <div>
        <h1>Book with certainty</h1>
        <p>Search trains, review the fare, and get a clear answer if payment or booking confirmation is delayed.</p>
      </div>
      <form id="search-form" class="search-form" novalidate>
        ${stationInput("from", "FROM", lastQuery?.from || "MMCT")}
        <button type="button" id="swap" class="icon-button" aria-label="Swap FROM and TO">⇄</button>
        ${stationInput("to", "TO", lastQuery?.to || "NDLS")}
        <label>DATE<input name="date" type="date" min="${today()}" max="${maxBookingDate()}" value="${date}" /></label>
        <label>CLASS<select name="classCode">${["SL", "3A", "2A", "1A", "CC", "EC"].map((c) => option(c, c, c === (lastQuery?.classCode || "3A"))).join("")}</select></label>
        <label>QUOTA<select name="quota">${option("GN", "General", lastQuery?.quota === "GN" || !lastQuery)}${option("TQ", "Tatkal", lastQuery?.quota === "TQ")}${option("LD", "Ladies", lastQuery?.quota === "LD")}${option("SS", "Senior Citizen", lastQuery?.quota === "SS")}</select></label>
        <label>PASSENGERS<input name="passengers" type="number" min="1" max="6" value="${lastQuery?.passengers || 1}" /></label>
        <label class="check"><input name="flexible" type="checkbox" ${lastQuery?.flexible ? "checked" : ""}/> Flexible with date</label>
        <label class="check"><input id="disability" name="disability" type="checkbox" ${lastQuery?.disability ? "checked" : ""}/> Person with disability concession</label>
        <label class="conditional">Mock disability ID<input name="disabilityId" value="${lastQuery?.disabilityId || ""}" /></label>
        <label class="check"><input id="railPass" name="railPass" type="checkbox" ${lastQuery?.railPass ? "checked" : ""}/> Railway pass concession</label>
        <label class="conditional">Mock pass number<input name="passNumber" value="${lastQuery?.passNumber || ""}" /></label>
        <label>DEMO SCENARIO<select name="scenario">${option("normal", "Normal successful booking", lastQuery?.scenario === "normal" || !lastQuery)}${option("unknownBooked", "Payment success → unknown → booked", lastQuery?.scenario === "unknownBooked")}${option("unknownNotBooked", "Payment success → unknown → refund", lastQuery?.scenario === "unknownNotBooked")}${option("paymentFailed", "Payment failed → safe retry", lastQuery?.scenario === "paymentFailed")}</select></label>
        <button type="submit">Search trains</button>
      </form>
      <p class="rule">Bookings are available from ${today()} to ${maxBookingDate()} (${BOOKING_WINDOW_MONTHS} months).</p>
    </section>`;
    layout(form + statusPanel() + resultsView());
    wireSearch();
}
function readQuery(form) {
    const data = new FormData(form);
    return {
        from: String(data.get("from")), to: String(data.get("to")), date: String(data.get("date")), classCode: String(data.get("classCode")),
        quota: String(data.get("quota")), passengers: Number(data.get("passengers") || 1), flexible: data.has("flexible"),
        disability: data.has("disability"), disabilityId: String(data.get("disabilityId") || ""), railPass: data.has("railPass"), passNumber: String(data.get("passNumber") || ""),
        scenario: String(data.get("scenario") || "normal")
    };
}
function wireSearch() {
    document.querySelectorAll(".station-search").forEach((input) => input.addEventListener("input", () => {
        const select = document.querySelector(`#${input.dataset.target}`);
        if (!select)
            return;
        select.innerHTML = stationsFor(input.value).map((s) => option(s.code, `${s.city} — ${s.name} (${s.code})`)).join("");
    }));
    document.querySelector("#swap")?.addEventListener("click", () => {
        const from = document.querySelector("#from");
        const to = document.querySelector("#to");
        [from.value, to.value] = [to.value, from.value];
    });
    document.querySelector("#search-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const query = readQuery(e.target);
        const dateError = validateBookingDate(query.date);
        if (dateError) {
            message = dateError;
            render();
            return;
        }
        loading = "Checking available trains for your route... Comparing direct and connecting journeys...";
        message = "";
        render();
        try {
            lastQuery = query;
            results = await search(query);
            message = results.length ? "" : "No trains found for this combination.";
            loading = "";
            render();
        }
        catch (err) {
            loading = "";
            message = err instanceof Error ? err.message : "We could not complete the search. Please review your journey details.";
            render();
        }
    });
}
function resultsView() {
    if (loading)
        return `<section class="panel" aria-live="polite"><h2>Searching</h2><p>${loading}</p></section>`;
    if (message && !activeAttempt)
        return `<section class="panel error-state" role="alert"><h2>${message}</h2><div class="actions"><button id="prev-day">Try previous day</button><button id="next-day">Try next day</button><button id="flex-search">Search nearby dates</button><button id="other-station">Try another station</button><button id="nearby">Show nearby stations</button></div></section>`;
    if (!results.length)
        return "";
    const hasDirect = results.some((r) => r.kind === "direct");
    return html `
    <section class="results">
      <h2>${hasDirect ? "Available trains" : "No direct trains found. Here are connecting journeys you can book."}</h2>
      ${groupResults(results).map(([date, rows]) => `<div class="date-group"><h3>${date}</h3>${rows.map(resultCard).join("")}</div>`).join("")}
    </section>`;
}
function groupResults(rows) {
    const grouped = new Map();
    for (const row of rows)
        grouped.set(row.date, [...(grouped.get(row.date) || []), row]);
    return [...grouped.entries()];
}
function resultCard(result) {
    const legs = result.legs.map((leg) => `<li><strong>${leg.train.number} ${leg.train.name}</strong><span>${leg.from.name} → ${leg.to.name}</span><span>${leg.train.depart} → ${leg.train.arrive}</span></li>`).join("");
    return html `
    <article class="result-card ${result.kind}">
      <div><strong>${result.kind === "direct" ? "Direct journey" : "Connecting journey"}</strong><p>${result.legs.length} leg${result.legs.length > 1 ? "s" : ""}${result.transferMins ? ` • ${mins(result.transferMins)} transfer` : ""}</p></div>
      <ul class="legs">${legs}</ul>
      <dl><div><dt>Duration</dt><dd>${mins(result.durationMins)}</dd></div><div><dt>Availability</dt><dd>${result.availability}</dd></div><div><dt>Fare</dt><dd>₹${result.totalFare}</dd></div></dl>
      <button data-book="${result.id}">Review before payment</button>
    </article>`;
}
function statusPanel() {
    if (!activeAttempt)
        return "";
    const meaning = bookingMeaning(activeAttempt.state);
    const leg = activeAttempt.journey.legs[0];
    return html `
    <section class="status ${meaning.citizenState.toLowerCase().replace(/\s+/g, "-")}" aria-live="polite">
      <h2>${meaning.citizenState}</h2>
      ${duplicateNotice ? `<div class="warning"><strong>You already have a booking attempt for this journey.</strong><br/>${duplicateNotice}</div>` : ""}
      <p><strong>${meaning.next}</strong></p>
      <div class="four-part"><p>${meaning.money}</p><p>${meaning.ticket}</p></div>
      ${activeAttempt.state === "BOOKING_UNKNOWN" ? `<div class="warning">DO NOT PAY AGAIN</div>` : ""}
      <div class="actions">
        ${(activeAttempt.state === "BOOKING_UNKNOWN" || activeAttempt.state === "REFUND_PENDING") ? `<button id="check-status">Check booking status</button>` : ""}
        ${activeAttempt.state === "BOOKED" ? `<button id="view-ticket">View ticket</button><button id="download-ticket">Download ticket</button><button id="add-trip">Add to trips</button><button id="pnr-status">Check PNR status</button>` : ""}
        ${activeAttempt.retryAllowed ? `<button id="safe-retry">Safe to try another booking</button>` : ""}
      </div>
      <details open><summary>Booking timeline</summary>${activeAttempt.timeline.map((item) => `<p><time>${item.time}</time> ${item.label}</p>`).join("")}</details>
      <p class="muted">Attempt ${activeAttempt.id} • ${leg.train.name} • ${activeAttempt.query.date}</p>
    </section>`;
}
function wireGlobal() {
    document.querySelectorAll("[data-book]").forEach((button) => button.addEventListener("click", async () => {
        const journey = results.find((item) => item.id === button.dataset.book);
        if (!journey || !lastQuery)
            return;
        const duplicate = duplicateAttempt(journey, lastQuery);
        if (duplicate) {
            activeAttempt = duplicate;
            duplicateNotice = `Payment status: ${bookingMeaning(duplicate.state).money} Booking status: ${duplicate.state}. Attempt ID: ${duplicate.id}. We recommend checking the previous booking before paying again.`;
            render();
            return;
        }
        duplicateNotice = "";
        loading = "Sending your booking request... Confirming your payment...";
        render();
        activeAttempt = await startBooking(journey, lastQuery);
        loading = "";
        render();
    }));
    document.querySelector("#check-status")?.addEventListener("click", async () => {
        if (!activeAttempt)
            return;
        loading = "Payment received. Checking whether the railway reservation was created...";
        render();
        activeAttempt = await checkBookingStatus(activeAttempt.id);
        loading = "";
        render();
    });
    document.querySelector("#view-ticket")?.addEventListener("click", () => { route = "/pnr"; location.hash = route; });
    document.querySelector("#download-ticket")?.addEventListener("click", () => alert("Prototype ticket downloaded as a text receipt."));
    document.querySelector("#add-trip")?.addEventListener("click", () => alert("Trip is saved in My Trips."));
    document.querySelector("#pnr-status")?.addEventListener("click", () => { route = "/pnr"; location.hash = route; });
    document.querySelector("#safe-retry")?.addEventListener("click", () => { activeAttempt = undefined; render(); });
    document.querySelectorAll("[data-trip-filter]").forEach((button) => button.addEventListener("click", () => {
        tripsFilter = button.dataset.tripFilter;
        render();
    }));
    document.querySelector("#prev-day")?.addEventListener("click", () => shiftDate(-1));
    document.querySelector("#next-day")?.addEventListener("click", () => shiftDate(1));
    document.querySelector("#flex-search")?.addEventListener("click", () => { if (lastQuery) {
        lastQuery.flexible = true;
        render();
    } });
    document.querySelector("#other-station")?.addEventListener("click", () => document.querySelector(".station-search")?.focus());
    document.querySelector("#nearby")?.addEventListener("click", () => alert("Nearby stations are shown in station search suggestions for the selected city."));
}
function shiftDate(days) {
    if (!lastQuery)
        return;
    const d = new Date(`${lastQuery.date}T00:00:00`);
    d.setDate(d.getDate() + days);
    lastQuery.date = d.toISOString().slice(0, 10);
    render();
}
function tripsView() {
    const saved = getState().trips;
    const trips = tripsFilter === "upcoming" ? saved : [];
    layout(`<section class="panel"><h1>My Trips</h1><div class="tabs"><button data-trip-filter="upcoming" class="${tripsFilter === "upcoming" ? "selected" : ""}">Upcoming</button><button data-trip-filter="completed" class="${tripsFilter === "completed" ? "selected" : ""}">Completed</button><button data-trip-filter="cancelled" class="${tripsFilter === "cancelled" ? "selected" : ""}">Cancelled</button></div>${trips.length ? trips.map(ticket).join("") : `<p>No ${tripsFilter} trips yet.</p>`}</section>`);
}
function ticket(attempt) {
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
    if (!user)
        return loginView();
    layout(`<section class="panel narrow"><h1>Account</h1><p>Signed in as <strong>${user.name}</strong> (${user.email}).</p><button id="logout">${label("logout")}</button></section>`);
    document.querySelector("#logout")?.addEventListener("click", () => { setState({ user: undefined }); route = "/account"; location.hash = route; });
}
function render() {
    if (!getState().language)
        return languageGate();
    requireAuth();
    if (route === "/trips")
        tripsView();
    else if (route === "/pnr")
        pnrView();
    else if (route === "/help")
        helpView();
    else if (route === "/account")
        accountView();
    else
        bookView();
    wireGlobal();
}
window.addEventListener("hashchange", () => { route = location.hash.replace("#", "") || "/book"; message = ""; render(); });
subscribe(render);
render();
