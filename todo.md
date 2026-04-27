# 6+1 Sports Day 002 — TODO

## Phase 2: Database & Design System
- [x] Upload 6+1 logo to static assets
- [x] Update Drizzle schema with sports_day_registrations and group_codes tables
- [x] Run migration and apply SQL
- [x] Configure design system (CSS variables, Bebas Neue + DM Mono fonts, dark theme)

## Phase 3: Backend API
- [x] Registration endpoint (sportsday.register)
- [x] Team assignment logic (load-balanced random across 4 teams)
- [x] Referral code generation (name prefix + random suffix)
- [x] Klaviyo tags JSON storage
- [x] Shopify webhook handler (POST /api/shopify/webhook)
- [x] User status endpoint (sportsday.getUserStatus)
- [x] Admin procedures (stats, user list, health notes)
- [x] Group code create/join logic (sportsday.verifyGroupCode)
- [x] Profile + tagline generation (15 archetypes)

## Phase 4: Landing Page & Registration Form
- [x] Landing page with 6+1 logo, animated dot grid, bold headline, ENTER THE SYSTEM → CTA
- [x] 14-step multi-step form with horizontal slide transitions
- [x] Orange progress bar
- [x] Auto-advance on single-select answers
- [x] All form fields: name, email, instagram, attended before, solo/group, dates, competitiveness, teammate type, strongest event, fear, motivation, captain vote, shirt size/fit, health notes, content consent
- [x] Group code create/join sub-step
- [x] Inline validation and error states
- [x] Form submission → API → redirect to holding page

## Phase 5: Holding Page
- [x] Personalised greeting (YOU'RE IN, [NAME])
- [x] Identity tagline from personality combo lookup
- [x] Sports Day Profile Badge (role card)
- [x] Status block: Registered / Team Assigned Hidden / Reveal Pending
- [x] "YOUR TEAM IS WAITING." locked block
- [x] Unlock CTA: "UNLOCK MY TEAM →" with £10 Priority Player Pass details
- [x] Referral block with copy link functionality
- [x] LocalStorage session management

## Phase 6: Payment Flow
- [x] Shopify checkout redirect with user email pre-fill
- [x] /unlock/success route (verify payment, trigger reveal)
- [x] Shopify webhook handler
- [x] Update user record on payment confirmation (paymentStatus, revealStatus, accessType)

## Phase 7: Team Reveal Animations
- [x] Red team: roulette wheel spin animation (canvas)
- [x] Blue team: arcade claw machine animation
- [x] Pink team: slot machine animation
- [x] Orange team: chaotic wheel animation (canvas)
- [x] Final reveal frame (full-screen team colour + confetti)
- [x] Post-reveal share feature (canvas PNG 1080×1920 + Web Share API + download fallback)
- [x] Share card: team colour, Bebas Neue, 6+1 logo, "I'M TEAM [COLOUR]"

## Phase 8: Admin Dashboard (/admin)
- [x] Role-gated admin access (requires admin role via Manus OAuth)
- [x] Summary stats cards (total, paid/free, team distribution, referrals)
- [x] Full filterable user table with all fields
- [x] Filters: team, payment status, shirt size, content consent, search
- [x] Health notes tab (name + email + note only, confidential warning)
- [x] CSV export button

## Phase 9: Tests & Polish
- [x] Vitest tests for team assignment load-balancing (4 tests)
- [x] Vitest tests for profile generation archetypes (4 tests)
- [x] Vitest tests for referral code generation (4 tests)
- [x] Vitest tests for Klaviyo tag builder (6 tests)
- [x] Auth logout test (1 test)
- [x] All 20 tests passing
- [x] TypeScript compiles clean (0 errors)
- [x] Logo uploaded to webdev static assets

## Pending / Future
- [ ] Add SHOPIFY_WEBHOOK_SECRET env var for HMAC webhook verification
- [ ] Add KLAVIYO_API_KEY env var for live Klaviyo integration
- [ ] Add VITE_SHOPIFY_STORE_URL and VITE_SHOPIFY_VARIANT_ID env vars for live checkout
- [ ] Email confirmation on registration
