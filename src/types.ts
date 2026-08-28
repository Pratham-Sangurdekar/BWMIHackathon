export type Language = "en" | "hi";
export type TrainClass = "SL" | "3A" | "2A" | "1A" | "CC" | "EC" | "2S";
export type Quota = "GN" | "TQ" | "PT" | "LD" | "SS";
export type Availability = "AVAILABLE" | "RAC" | "WL" | "NOT_AVAILABLE";
export type TxState = "INITIATED" | "PAYMENT_PENDING" | "PAYMENT_FAILED" | "PAYMENT_SUCCESS" | "BOOKING_PENDING" | "BOOKED" | "BOOKING_UNKNOWN" | "NOT_BOOKED" | "REFUND_PENDING" | "REFUNDED";
export type Scenario = "normal" | "unknownBooked" | "unknownNotBooked" | "paymentFailed";

export interface Station { code: string; name: string; city: string; state: string; region: string; zone: string; category: "major" | "minor"; aliases: string[]; nearby: string[]; }
export interface TrainClassInfo { classCode: TrainClass; fare: number; availability: Availability; seats: number; }
export interface Train {
  number: string; name: string; from: string; to: string; depart: string; arrive: string;
  durationMins: number; days: number[]; classes: TrainClassInfo[];
}
export interface SearchQuery {
  from: string; to: string; date: string; classCode: TrainClass; quota: Quota; passengers: number;
  flexible: boolean; disability: boolean; disabilityId?: string; railPass: boolean; passNumber?: string; scenario: Scenario;
}
export interface JourneyLeg { train: Train; from: Station; to: Station; }
export interface JourneyResult { id: string; date: string; kind: "direct" | "connecting"; legs: JourneyLeg[]; totalFare: number; availability: Availability; durationMins: number; transferMins?: number; }
export interface SearchResponse { directJourneys: JourneyResult[]; connectingJourneys: JourneyResult[]; metadata: { totalResults: number; searchId: string; generatedAt: string; }; }
export interface ResultFilters {
  journeyType: "all" | "direct" | "connecting"; departure: "all" | "early" | "morning" | "afternoon" | "evening" | "night";
  arrival: "all" | "early" | "morning" | "afternoon" | "evening" | "night"; availability: "all" | Availability;
  maxDuration: number; maxFare: number; via: string; classCode: TrainClass | "all"; quota: Quota | "all";
}
export interface User { email: string; name: string; }
export interface TimelineEvent { time: string; label: string; }
export interface BookingAttempt {
  id: string; journey: JourneyResult; query: SearchQuery; state: TxState; retryAllowed: boolean;
  timeline: TimelineEvent[]; createdAt: string; pnr?: string; coach?: string; seat?: string; refundId?: string;
}
export interface AppState {
  language?: Language; user?: User; liteMode: boolean; gridDensity: "comfortable" | "compact"; resultsPerPage: 25 | 50 | 100; trips: BookingAttempt[]; attempts: BookingAttempt[];
}
