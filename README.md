# RailVishwas

RailVishwas is a production-quality hackathon prototype focused on one citizen problem: reducing uncertainty after railway booking payment.

Tagline: "Know your booking. Know what to do next."

## Run

```bash
npm run build
npm run dev
```

Open http://localhost:4173.

Demo login:

- Email: `demo@railvishwas.in`
- Password: `demo1234`

## What Is Implemented

- First-visit language selection persisted in local storage.
- Mock authentication with persisted session and specific validation errors.
- Searchable synthetic station and train data across major Indian railway stations.
- Frontend and mock backend booking-window validation, configured by `BOOKING_WINDOW_MONTHS` in `src/data.ts`.
- Functional FROM/TO station search, swap, date, class, quota, passenger count, flexible dates, disability concession, and railway pass concession.
- Direct train results first, connecting journeys when no direct train exists, and useful actions when no journeys exist.
- Deterministic demo scenarios:
  - normal successful booking
  - payment success to booking unknown to booked
  - payment success to booking unknown to not booked/refunding/refunded
  - payment failed and safe retry
  - no direct train fallback
  - no journeys fallback
- Transaction state machine with citizen-facing meanings and `retryAllowed` safety logic.
- Duplicate booking protection for unresolved identical booking attempts.
- Booking timeline from actual state events.
- Confirmed ticket, PNR explanation, My Trips, Account, Help, and persisted Lite mode.

## Prototype Boundaries

Railway, payment, booking, ticket, refund, and PNR data are synthetic. The app does not connect to IRCTC or any live payment service, and it must not be used with real credentials or payment details.
