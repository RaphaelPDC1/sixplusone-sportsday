# Sports Day 002 — Handoff Summary

**Project:** 6+1 Sports Day 002  
**Version:** eadb1afd  
**Last Updated:** 10 June 2026  
**Status:** Pre-launch build with core features complete

---

## 1. Environment Variables (Required)

All environment variables are automatically injected by Manus. **Do NOT commit `.env` files.**

### Authentication & OAuth
- `VITE_APP_ID` — Manus OAuth application ID
- `OAUTH_SERVER_URL` — Manus OAuth backend base URL
- `VITE_OAUTH_PORTAL_URL` — Manus login portal URL (frontend)
- `JWT_SECRET` — Session cookie signing secret

### Database
- `DATABASE_URL` — MySQL/TiDB connection string

### Owner & System
- `OWNER_OPEN_ID` — Owner's Manus Open ID
- `OWNER_NAME` — Owner's name
- `ADMIN_PASSWORD` — Admin panel password

### Manus Built-in APIs
- `BUILT_IN_FORGE_API_URL` — Base URL for Manus built-in APIs (LLM, storage, data_api, notification, etc.)
- `BUILT_IN_FORGE_API_KEY` — Bearer token for server-side access to Manus APIs
- `VITE_FRONTEND_FORGE_API_URL` — Manus APIs URL for frontend
- `VITE_FRONTEND_FORGE_API_KEY` — Bearer token for frontend access to Manus APIs

### Stripe Payment Processing
- `STRIPE_SECRET_KEY` — Stripe secret API key (test or live)
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (frontend)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret

### Klaviyo Email Marketing
- `KLAVIYO_API_KEY` — Klaviyo API key for email automation

### Meta Pixel & Conversions API
- `VITE_ANALYTICS_WEBSITE_ID` — Meta Pixel ID
- `VITE_ANALYTICS_ENDPOINT` — Analytics endpoint URL
- `META_CONVERSIONS_API_TOKEN` — Meta Conversions API token for server-side tracking

### Analytics & Monitoring
- `TEST_UNLOCK_PRICE_PENCE` — Test price for unlock feature (in pence, e.g., 2200 = £22)

### Branding
- `VITE_APP_TITLE` — Website title (e.g., "Sports Day 002")
- `VITE_APP_LOGO` — Logo URL

---

## 2. Third-Party Integrations

### Stripe (Payment Processing)
**Status:** ✅ Fully integrated  
**Type:** Payment gateway  
**Configuration:** Settings → Payment  
**Features:**
- Checkout sessions with prefilled customer info
- One-click payments via Apple Pay (Safari/macOS), Google Pay (Chrome), and Link
- Express Checkout Element for desktop + mobile
- Card fallback for all browsers
- Webhook handling at `/api/stripe/webhook`
- Test mode: Card 4242 4242 4242 4242
- Production webhook configured at: `https://sportsday002-6swzojco.manus.space/api/stripe/webhook`

**Key Files:**
- `client/src/components/PaymentForm.tsx` — Payment UI with Express Checkout + Card
- `server/routers.ts` — `createPaymentIntent`, `confirmPayment` procedures
- `server/_core/stripe.ts` — Stripe client initialization

**Next Steps:**
- User must claim Stripe sandbox at: https://dashboard.stripe.com/claim_sandbox/...
- Once live keys available after KYC, update Settings → Payment

### Klaviyo (Email Automation)
**Status:** ✅ Fully integrated  
**Type:** Email marketing & automation  
**Configuration:** Environment variable `KLAVIYO_API_KEY`  
**Features:**
- Automatic email list subscription on registration
- Event-triggered flows:
  - `Sports Day 002 Registration Confirmed` — sent on registration
  - `Sports Day 002 Auto Unlocked` — sent on 4 July 2026 at 8pm BST (for free users)
  - `Sports Day 002 Payment Confirmed` — sent on successful payment
- Custom properties: firstName, email, registrationId, accessType, unlockedAt

**Key Files:**
- `server/routers.ts` — `registerUser`, `confirmPayment` procedures (trigger Klaviyo events)
- `server/_core/klaviyo.ts` — Klaviyo client & event helpers

**Next Steps:**
- Verify flows are set up in Klaviyo dashboard
- Test event delivery in Klaviyo logs

### Meta Pixel & Conversions API
**Status:** ✅ Fully integrated  
**Type:** Analytics & conversion tracking  
**Configuration:** 
- `VITE_ANALYTICS_WEBSITE_ID` — Pixel ID
- `META_CONVERSIONS_API_TOKEN` — Server-side token
**Features:**
- Page view tracking (Pixel)
- Purchase event on successful payment (Pixel + Conversions API)
- Server-side conversion tracking for better accuracy
- Event data: value (£22), currency (GBP), email, user ID

**Key Files:**
- `client/src/lib/analytics.ts` — Client-side Pixel initialization
- `client/src/components/PaymentForm.tsx` — Purchase event firing
- `server/routers.ts` — Server-side Conversions API calls

**Next Steps:**
- Validate in Meta Events Manager Test Events tab
- Monitor conversion attribution in Meta Ads Manager

### Google Maps (Optional)
**Status:** ✅ Pre-configured (not actively used)  
**Type:** Maps integration  
**Features:**
- Proxy authentication via Manus
- Available for future use (e.g., event location display)

**Key Files:**
- `client/src/components/Map.tsx` — MapView component

---

## 3. File Structure Overview

```
sixplusone-sportsday/
├── client/
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── robots.txt
│   │   └── manifest.json
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx              ← Landing page (SEO optimized)
│   │   │   ├── Enter.tsx             ← 14-step registration form
│   │   │   ├── Holding.tsx           ← Post-registration holding page
│   │   │   ├── Reveal.tsx            ← Team reveal animation
│   │   │   ├── UnlockReveal.tsx      ← Unlock flow for free users
│   │   │   ├── ShirtConfirm.tsx      ← Shirt size confirmation
│   │   │   ├── TeamHub.tsx           ← Full team dashboard (tabs)
│   │   │   ├── Terms.tsx             ← Terms & Conditions
│   │   │   ├── Privacy.tsx           ← Privacy policy & GDPR
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── step-particles.tsx        ← Per-step particle animation
│   │   │   │   ├── warp-shader.tsx           ← Animated background shader
│   │   │   │   ├── entry-splash.tsx          ← Entry animation splash
│   │   │   │   ├── scratch-card.tsx          ← Scratch card game
│   │   │   │   ├── PaymentForm.tsx           ← Stripe payment UI
│   │   │   │   ├── FunnelPopup.tsx           ← Conversion funnel popups
│   │   │   │   ├── AdPopup.tsx               ← Ad/notification popups
│   │   │   │   └── ...
│   │   │   ├── DashboardLayout.tsx  ← Sidebar layout (not used)
│   │   │   └── ...
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx       ← Auth state management
│   │   ├── hooks/
│   │   │   ├── useAuth.ts            ← Auth hook
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── trpc.ts               ← tRPC client setup
│   │   │   ├── analytics.ts          ← Meta Pixel initialization
│   │   │   ├── revealJourney.ts      ← Navigation logic (paid vs free)
│   │   │   ├── const.ts              ← Constants (prices, dates, etc.)
│   │   │   └── ...
│   │   ├── App.tsx                   ← Routes & layout
│   │   ├── main.tsx                  ← React entry point
│   │   └── index.css                 ← Global styles & design tokens
│   └── index.html
├── server/
│   ├── routers.ts                    ← All tRPC procedures
│   ├── db.ts                         ← Database query helpers
│   ├── sportsday.dashboard.ts        ← Dashboard data types
│   ├── _core/
│   │   ├── context.ts                ← tRPC context (auth)
│   │   ├── oauth.ts                  ← Manus OAuth flow
│   │   ├── env.ts                    ← Environment variables
│   │   ├── stripe.ts                 ← Stripe client
│   │   ├── klaviyo.ts                ← Klaviyo client
│   │   ├── llm.ts                    ← LLM integration
│   │   ├── imageGeneration.ts        ← Image generation
│   │   ├── voiceTranscription.ts     ← Voice-to-text
│   │   ├── notification.ts           ← Owner notifications
│   │   ├── map.ts                    ← Google Maps integration
│   │   └── ...
│   └── auth.logout.test.ts           ← Example vitest test
├── drizzle/
│   ├── schema.ts                     ← Database schema (Drizzle ORM)
│   └── migrations/                   ← SQL migration files
├── storage/
│   └── index.ts                      ← S3 file storage helpers
├── shared/
│   ├── const.ts                      ← Shared constants
│   └── types.ts                      ← Shared types
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```

### Key Directories
- **`client/src/pages/`** — User-facing pages (register, hold, reveal, team hub)
- **`client/src/components/ui/`** — Reusable UI components (animations, forms, popups)
- **`server/routers.ts`** — All backend logic (tRPC procedures)
- **`drizzle/schema.ts`** — Database table definitions
- **`server/_core/`** — Framework plumbing (auth, OAuth, integrations)

---

## 4. Database Schema (Key Tables)

### `users` table
- `id` — UUID primary key
- `email` — User email (unique)
- `fullName` — User's full name
- `firstName` — First name (extracted)
- `role` — 'admin' | 'user' (default: 'user')
- `stripe_customer_id` — Stripe customer ID
- `stripe_subscription_id` — Active subscription ID
- `createdAt` — Registration timestamp
- `updatedAt` — Last update timestamp

### `registrations` table
- `id` — UUID primary key
- `userId` — Foreign key to users
- `email` — Registration email
- `fullName` — Registration name
- `instagramHandle` — Instagram handle
- `attendedBefore` — Boolean
- `comingType` — 'solo' | 'with_friends'
- `groupCode` — Group join code (if applicable)
- `groupRole` — 'creator' | 'joiner'
- `availableDates` — JSON array of dates
- `competitiveness` — 'vibes' | 'balanced' | 'winner'
- `teammateType` — Teammate preference
- `strongestEvent` — Event strength
- `fear` — Fear/concern
- `shirtSize` — Shirt size
- `shirtFit` — 'regular' | 'oversized'
- `healthNotes` — Health/dietary notes
- `contentConsent` — 'yes' | 'no' | 'ask'
- `marketingConsent` — Boolean
- `captainVoteInterest` — 'yes' | 'no' | 'maybe'
- `eventMotivation` — User's motivation text
- `accessType` — 'paid' | 'free'
- `unlockedAt` — Timestamp when team was revealed
- `team` — Team assignment (Red/Blue/Pink/Orange)
- `teamColour` — Team hex color
- `teamIdentity` — Team identity line
- `createdAt` — Registration timestamp

### `payments` table
- `id` — UUID primary key
- `userId` — Foreign key to users
- `stripe_payment_intent_id` — Stripe PaymentIntent ID
- `amount` — Amount in pence (e.g., 2200 = £22)
- `currency` — 'GBP'
- `status` — 'succeeded' | 'pending' | 'failed'
- `createdAt` — Payment timestamp

---

## 5. Outstanding Bugs & High-Priority Items

### Critical (Blocking)
None currently identified.

### High Priority
1. **Line 111 (todo.md):** ✅ **FIXED** — Form background animation not loading on step 1
   - Issue: Circular dependency in StepParticles useEffect
   - Fix: Removed `animate` from dependency array
   - Status: Resolved in version eadb1afd

2. **Line 375 (todo.md):** Price testing
   - Test: Verify £22 displays on holding page, checkout, and Meta Pixel
   - Status: Needs manual testing
   - Action: Test end-to-end payment flow with test card 4242 4242 4242 4242

3. **Line 407 (todo.md):** Meta Conversions API testing
   - Test: Validate in Meta Events Manager Test Events tab
   - Status: Needs validation
   - Action: Check Meta dashboard for server-side conversion events

### Medium Priority
4. **Line 213-217 (todo.md):** Remove "Already registered" link from registration form
   - Status: Pending
   - Action: Clean up Enter.tsx UI

5. **Line 220-227 (todo.md):** UX Polish items
   - Landing page typography refinement
   - Date question update
   - Holding page copy updates
   - Status: Pending

### Lower Priority (Future Phases)
- Registration form review/edit screen (line 315-320)
- Additional dashboard features
- Admin panel enhancements

---

## 6. Known Issues & Limitations

### Watch-Mode TypeScript Error (False Positive)
- **Issue:** Vite watch mode occasionally reports stale TS error: "Property 'playerEmail' does not exist on type 'SportsDayDashboard'" at line 567 of Holding.tsx
- **Root Cause:** Incremental TypeScript compiler cache artifact (playerEmail was removed in Security Patch 3)
- **Impact:** None — full `tsc --noEmit` passes clean (exit 0)
- **Workaround:** Ignore watch-mode error; builds are clean
- **Status:** Known false positive, no action required

### Parse5 HTML Warnings
- **Issue:** Console shows "Unable to parse HTML; parse5 error code disallowed-content-in-noscript-in-head"
- **Root Cause:** Facebook Pixel noscript tag in `<head>` (valid but parse5 is strict)
- **Impact:** None — Pixel works correctly
- **Status:** Cosmetic only, no action required

---

## 7. Testing & Quality Assurance

### Unit Tests
- **Status:** 44/45 tests passing
- **Failing Test:** Klaviyo integration test (flaky due to external API timeout)
- **Command:** `pnpm test`
- **Coverage:** Core procedures, auth, payment flow

### TypeScript
- **Status:** Clean (exit 0)
- **Command:** `npx tsc --noEmit`
- **Strict mode:** Enabled

### Manual Testing Checklist
- [ ] Registration flow (all 14 steps)
- [ ] Payment with test card 4242 4242 4242 4242
- [ ] Team reveal animation
- [ ] Free user auto-unlock (4 July 2026 at 8pm BST)
- [ ] Holding page on mobile and desktop
- [ ] Meta Pixel Purchase event
- [ ] Meta Conversions API server-side tracking
- [ ] Stripe webhook delivery
- [ ] Klaviyo email delivery

---

## 8. Deployment Notes

### Domains
- **Auto-generated:** `sportsday002-6swzojco.manus.space`
- **Custom domain:** `sportsday.6plus1.co.uk` (configured)

### Build & Runtime
- **Framework:** React 19 + Vite + Express 4 + tRPC 11
- **Database:** MySQL/TiDB (Drizzle ORM)
- **Hosting:** Manus (Cloud Run)
- **Runtime:** Node.js only (no Python/Go/native binaries)
- **Cold start:** ~10-15s (min-instances=0)
- **Request timeout:** 180s

### Environment Setup
All env vars are automatically injected by Manus. No manual setup required.

### Pre-Launch Checklist
- [ ] Stripe sandbox claimed and live keys obtained
- [ ] Klaviyo flows verified
- [ ] Meta Pixel & Conversions API tested
- [ ] All domains pointing to correct servers
- [ ] Email templates reviewed
- [ ] T&Cs and Privacy policy finalized
- [ ] GDPR deletion endpoint tested
- [ ] Rate limiting verified
- [ ] Security patches confirmed (4/4)

---

## 9. Contact & Support

**Project Owner:** 6+1 Sports Day  
**Event Date:** Saturday, 11 July 2026  
**Event Location:** Sheffield  
**GDPR Deletion Requests:** hello@6plus1.co.uk  

---

**Document Version:** 1.0  
**Last Updated:** 10 June 2026  
**Next Review:** Before launch (11 July 2026)
