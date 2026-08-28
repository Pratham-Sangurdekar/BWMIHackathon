import { BOOKING_WINDOW_MONTHS, searchJourneys, searchStations, station } from "./data.js";
import { getState, setState } from "./store.js";
const users = [{ email: "pratham@example.com", password: "rail1234", name: "Pratham" }, { email: "demo@railvishwas.in", password: "demo1234", name: "Demo Citizen" }];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const event = (label) => ({ time: now(), label });
export function maxBookingDate() {
    const d = new Date();
    d.setMonth(d.getMonth() + BOOKING_WINDOW_MONTHS);
    return d.toISOString().slice(0, 10);
}
export function today() {
    return new Date().toISOString().slice(0, 10);
}
export function validateBookingDate(date) {
    if (!date)
        return "Please select a journey date.";
    const selected = new Date(`${date}T00:00:00`);
    const min = new Date(`${today()}T00:00:00`);
    const max = new Date(`${maxBookingDate()}T00:00:00`);
    if (selected < min)
        return "Journey date cannot be in the past.";
    if (selected > max)
        return "Bookings are available only up to 3 months in advance.";
    return undefined;
}
export async function login(email, password) {
    await sleep(250);
    if (!email.trim())
        throw new Error("Please enter your email address.");
    if (!/^\S+@\S+\.\S+$/.test(email))
        throw new Error("Please enter a valid email address.");
    const user = users.find((candidate) => candidate.email === email.trim().toLowerCase());
    if (!user)
        throw new Error("Email address is not registered.");
    if (user.password !== password)
        throw new Error("Password is incorrect.");
    return { email: user.email, name: user.name };
}
export async function search(query) {
    await sleep(500);
    const dateError = validateBookingDate(query.date);
    if (dateError)
        throw new Error(dateError);
    if (!query.from || !query.to)
        throw new Error("Please choose both FROM and TO stations.");
    if (query.from === query.to)
        throw new Error("FROM and TO stations cannot be the same.");
    if (query.disability && !query.disabilityId?.trim())
        throw new Error("Please enter the mock disability concession ID.");
    if (query.railPass && !query.passNumber?.trim())
        throw new Error("Please enter the mock railway pass number.");
    const dates = query.flexible ? [-1, 0, 1, 2].map((offset) => {
        const d = new Date(`${query.date}T00:00:00`);
        d.setDate(d.getDate() + offset);
        return d.toISOString().slice(0, 10);
    }).filter((date) => !validateBookingDate(date)) : [query.date];
    return dates.flatMap((date) => searchJourneys({ ...query, date }));
}
export function stationsFor(term) {
    return searchStations(term);
}
export function bookingMeaning(state) {
    const table = {
        INITIATED: { citizenState: "Processing", money: "No payment has been confirmed yet.", ticket: "No ticket exists yet.", next: "Continue to payment.", retryAllowed: false },
        PAYMENT_PENDING: { citizenState: "Processing", money: "Payment is being confirmed.", ticket: "No ticket exists yet.", next: "Do not refresh the payment step.", retryAllowed: false },
        PAYMENT_FAILED: { citizenState: "Not booked", money: "Money was not taken by the mock payment system.", ticket: "No ticket was created.", next: "You can safely try again.", retryAllowed: true },
        PAYMENT_SUCCESS: { citizenState: "Processing", money: "Payment was received.", ticket: "Ticket creation has not finished.", next: "Do not pay again.", retryAllowed: false },
        BOOKING_PENDING: { citizenState: "Processing", money: "Payment was received.", ticket: "Booking confirmation is being checked.", next: "Do not retry. Check status.", retryAllowed: false },
        BOOKING_UNKNOWN: { citizenState: "Processing", money: "Payment was received.", ticket: "We do not yet know whether a ticket was created.", next: "DO NOT PAY AGAIN. Check booking status.", retryAllowed: false },
        BOOKED: { citizenState: "Booked", money: "Payment was received.", ticket: "Your ticket is confirmed.", next: "View or download your ticket.", retryAllowed: false },
        NOT_BOOKED: { citizenState: "Not booked", money: "Payment was received.", ticket: "No ticket was created.", next: "You can safely try another booking.", retryAllowed: true },
        REFUND_PENDING: { citizenState: "Refunding", money: "Your money is being returned.", ticket: "No ticket was created.", next: "You may make a new booking, but the previous amount is still being refunded.", retryAllowed: true },
        REFUNDED: { citizenState: "Refunded", money: "Refund completed in this prototype.", ticket: "No ticket was created.", next: "You can safely book again.", retryAllowed: true }
    };
    return table[state];
}
function saveAttempt(attempt) {
    const state = getState();
    const attempts = state.attempts.filter((item) => item.id !== attempt.id).concat(attempt);
    const trips = attempt.state === "BOOKED" ? state.trips.filter((item) => item.id !== attempt.id).concat(attempt) : state.trips.filter((item) => item.id !== attempt.id);
    setState({ attempts, trips });
}
export function duplicateAttempt(journey, query) {
    return getState().attempts.find((attempt) => attempt.query.from === query.from && attempt.query.to === query.to && attempt.query.date === query.date && attempt.journey.id === journey.id && !attempt.retryAllowed);
}
export async function startBooking(journey, query) {
    const duplicate = duplicateAttempt(journey, query);
    if (duplicate)
        return duplicate;
    const attempt = {
        id: `RV-${Date.now().toString(36).toUpperCase()}`,
        journey, query, state: "INITIATED", retryAllowed: false, createdAt: new Date().toISOString(),
        timeline: [event("Booking started")]
    };
    saveAttempt(attempt);
    await sleep(350);
    attempt.state = "PAYMENT_PENDING";
    attempt.timeline.push(event("Payment confirmation started"));
    saveAttempt(attempt);
    await sleep(550);
    if (query.scenario === "paymentFailed") {
        attempt.state = "PAYMENT_FAILED";
        attempt.retryAllowed = true;
        attempt.timeline.push(event("Payment failed"));
        saveAttempt(attempt);
        return attempt;
    }
    attempt.state = "PAYMENT_SUCCESS";
    attempt.timeline.push(event("Payment received"));
    saveAttempt(attempt);
    await sleep(450);
    attempt.state = query.scenario === "normal" ? "BOOKING_PENDING" : "BOOKING_UNKNOWN";
    attempt.timeline.push(event(query.scenario === "normal" ? "Booking request sent" : "Railway confirmation delayed"));
    saveAttempt(attempt);
    if (query.scenario === "normal")
        return finalizeBooked(attempt);
    return attempt;
}
function finalizeBooked(attempt) {
    attempt.state = "BOOKED";
    attempt.retryAllowed = false;
    attempt.pnr = "2457819364";
    attempt.coach = "B2";
    attempt.seat = "37";
    attempt.timeline.push(event("Booking confirmed"));
    saveAttempt(attempt);
    return attempt;
}
export async function checkBookingStatus(id) {
    await sleep(650);
    const attempt = getState().attempts.find((item) => item.id === id);
    if (!attempt)
        throw new Error("We could not find this booking attempt on this device.");
    if (attempt.state !== "BOOKING_UNKNOWN" && attempt.state !== "BOOKING_PENDING" && attempt.state !== "NOT_BOOKED" && attempt.state !== "REFUND_PENDING")
        return attempt;
    if (attempt.query.scenario === "unknownNotBooked") {
        if (attempt.state === "REFUND_PENDING") {
            attempt.state = "REFUNDED";
            attempt.timeline.push(event("Refund completed"));
            saveAttempt(attempt);
            return attempt;
        }
        attempt.state = "NOT_BOOKED";
        attempt.retryAllowed = true;
        attempt.timeline.push(event("No ticket was created"));
        attempt.state = "REFUND_PENDING";
        attempt.refundId = `RF-${Date.now().toString(36).toUpperCase()}`;
        attempt.timeline.push(event("Refund started"));
        saveAttempt(attempt);
        return attempt;
    }
    return finalizeBooked(attempt);
}
export function stationLabel(code) {
    const s = station(code);
    return `${s.name} (${s.code})`;
}
