# Zaramia Pizza, Sport & Fun — Replit Project Notes

## About
Slovak PWA sports booking app for **Bowl center s.r.o.** branded as **Zaramia Pizza, Sport & Fun**.

## Stack
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Replit Auth (Log in with Replit)

## Key Features
- Home tile grid: Badminton, Bowling, Stolný tenis, VR Zóna, 🍕 Menu, Facebook link
- Badminton booking: Kurt 1–3, 30-min slots, 60/90/120 min durations, 12,50 €/hod
- **Besteron payment gateway**: hosted redirect flow (payment intent → redirectUrl → returnUrl → verify)
- QR code access pass after confirmed payment
- Admin dashboard at `/admin` (password protected, default: `zaramia2024`)
- Shelly lighting control (feature-flagged via `ENABLE_SHELLY=true`)
- Slovak language throughout with correct diacritics

## Environment Variables / Secrets
- `BESTERON_API_KEY` — Besteron API key (secret)
- `BESTERON_MERCHANT_ID` — Besteron merchant ID (secret)
- `SESSION_SECRET` — Express session secret (secret)
- `ADMIN_PASSWORD` — Admin panel password (default: `zaramia2024`)
- `ENABLE_SHELLY` — Set to `true` to enable Shelly device control (default: `false`)

## Payment Flow (Besteron)
1. User clicks "Zaplatiť" on `/bookings/:id`
2. Frontend calls `POST /api/bookings/:id/besteron-pay`
3. Backend creates payment intent at `https://api.besteron.com/v1/payment-intent`
4. User is redirected to `data.redirectUrl` (Besteron hosted page)
5. After payment, Besteron redirects to `returnUrl = /bookings/:id?payment=return`
6. Frontend detects `?payment=return` and calls `GET /api/bookings/:id/besteron-verify`
7. Backend calls `GET /api/besteron.com/v1/payment-information/:paymentIntentId`
8. On PAID status → booking marked as `paid`, QR code generated

## Database Schema
- `facilities`: id, name, description, imageUrl, pricePerHour (cents), sportType, courtNumber, isComingSoon
- `bookings`: id, userId, facilityId, startTime, endTime, status, qrCodeData, totalPrice (cents), besteronPaymentId
- `shellySettings`: id, key, value

## Important Notes
- Price format: always use `.toFixed(2).replace('.', ',')` for Slovak number format (12,50 €)
- Stripe was explicitly declined by the user — do NOT add Stripe
- DB is re-seeded on startup if `facilities` table is empty
- Local images in `client/public/images/` (badminton1/2, zaramia_bowling, zaramia_pingpong, zaramia_pizza1/2, zaramia_hall, zaramia_logo)
